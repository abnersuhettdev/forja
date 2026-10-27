// Fila de saída no banco local (RN-042, RN-047, ADR-028 L2). Toda operação registra o dono.
import type { OutboxChange, OutboxOperation, OutboxState } from "@forja/domain";
import type { LocalDatabase, StoredOperation } from "./db.ts";

export interface NewOperation {
  readonly ownerUserId: string;
  readonly type: string;
  readonly entityId: string;
  readonly baseRevision: number | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** Acrescenta uma operação à fila. Chame dentro da mesma transação da gravação local. */
export async function enqueue(
  db: LocalDatabase,
  operation: NewOperation,
  now: number = Date.now(),
): Promise<OutboxOperation> {
  const stored: StoredOperation = {
    op_id: crypto.randomUUID(),
    owner_user_id: operation.ownerUserId,
    type: operation.type,
    entity_id: operation.entityId,
    base_revision: operation.baseRevision,
    payload: operation.payload,
    created_at: new Date(now).toISOString(),
    attempts: 0,
    state: "pending",
    next_attempt_at: null,
    last_error: null,
  };
  const seq = await db.outbox.add(stored);
  return { ...stored, seq };
}

export async function listOutbox(db: LocalDatabase): Promise<OutboxOperation[]> {
  const rows = await db.outbox.orderBy("seq").toArray();
  return rows.filter((row): row is OutboxOperation => row.seq !== undefined);
}

export async function markState(
  db: LocalDatabase,
  opIds: readonly string[],
  state: OutboxState,
): Promise<void> {
  await db.outbox
    .where("op_id")
    .anyOf([...opIds])
    .modify({ state });
}

/**
 * Envio interrompido (app fechado durante "enviando") volta a aguardar envio: o servidor
 * reconhece o reenvio pelo mesmo op_id (RN-042).
 */
export async function recoverInterrupted(db: LocalDatabase): Promise<void> {
  await db.outbox.where("state").equals("sending").modify({ state: "pending" });
}

/**
 * Registros cuja cópia local acompanha a revisão confirmada (ADR-053): a próxima alteração
 * feita no aparelho parte dela, e operações seguintes do mesmo registro na fila são
 * rebaseadas, pois foram feitas sobre a alteração recém-confirmada. "current" = registro
 * único do depósito (descanso); "entity" = registro com a chave entity_id.
 */
const REVISION_STORES: Readonly<Record<string, { table: string; key: "current" | "entity" }>> = {
  "rest.update": { table: "rest", key: "current" },
  "session.start": { table: "sessions", key: "entity" },
  "session.complete": { table: "sessions", key: "entity" },
  "session.update": { table: "sessions", key: "entity" },
  "set.upsert": { table: "set_logs", key: "entity" },
  "session_exercise.update": { table: "session_exercises", key: "entity" },
};

/** Operações aguardando nova tentativa ficam prontas já (ex.: a conexão voltou). */
export async function releaseRetries(db: LocalDatabase): Promise<void> {
  await db.outbox.where("state").equals("retry").modify({ next_attempt_at: null });
}

/** Aplica o resultado classificado; só a confirmação do servidor remove da fila. */
export async function applyChanges(
  db: LocalDatabase,
  changes: readonly OutboxChange[],
): Promise<void> {
  const stores = [...new Set(Object.values(REVISION_STORES).map((s) => s.table))].map((name) =>
    db.table(name),
  );
  await db.transaction("rw", [db.outbox, ...stores], async () => {
    for (const change of changes) {
      const query = db.outbox.where("op_id").equals(change.op_id);
      if (change.action === "remove") {
        const op = await query.first();
        const store = op ? REVISION_STORES[op.type] : undefined;
        if (op?.seq !== undefined && store && change.revision !== undefined) {
          const seq = op.seq;
          await db.table(store.table).update(store.key === "current" ? "current" : op.entity_id, {
            revision: change.revision,
          });
          await db.outbox
            .where("entity_id")
            .equals(op.entity_id)
            .filter((other) => (other.seq ?? 0) > seq && other.base_revision !== null)
            .modify({ base_revision: change.revision });
        }
        await query.delete();
      } else {
        await query.modify({
          state: change.state,
          attempts: change.attempts,
          next_attempt_at: change.next_attempt_at,
          last_error: change.last_error,
          ...(change.server_record === undefined ? {} : { server_record: change.server_record }),
        });
      }
    }
  });
}

/** Estados em que a operação ainda pode ser reescrita ou retirada (não está sendo enviada). */
export const REWRITABLE_STATES: ReadonlySet<string> = new Set([
  "pending",
  "retry",
  "awaiting_login",
]);

/** Operações que ainda não chegaram ao servidor (para RN-052 e avisos). */
export async function countUnsent(db: LocalDatabase): Promise<number> {
  return db.outbox.count();
}
