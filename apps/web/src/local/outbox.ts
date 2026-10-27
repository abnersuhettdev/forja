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

/** Aplica o resultado classificado; só a confirmação do servidor remove da fila. */
export async function applyChanges(
  db: LocalDatabase,
  changes: readonly OutboxChange[],
): Promise<void> {
  await db.transaction("rw", db.outbox, async () => {
    for (const change of changes) {
      const query = db.outbox.where("op_id").equals(change.op_id);
      if (change.action === "remove") {
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

/** Operações que ainda não chegaram ao servidor (para RN-052 e avisos). */
export async function countUnsent(db: LocalDatabase): Promise<number> {
  return db.outbox.count();
}
