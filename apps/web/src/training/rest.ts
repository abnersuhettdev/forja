// Descanso entre treinos (TELA-006; RF-055, RN-050, API-007). Configuração do próprio aluno:
// grava no aparelho e entra na fila de saída, inclusive offline; a recomendação usa a cópia
// local na hora (UX-08 §6.1).
import { DEFAULT_REST_HOURS, type RestConfig } from "@forja/domain";
import type { LocalDatabase } from "../local/db.ts";
import { enqueue, REWRITABLE_STATES } from "../local/outbox.ts";

export const REST_UPDATE = "rest.update";
/** Grupo local das alterações de descanso na tela de Sincronização. */
export const REST_GROUP = "descanso";

export interface RestOverride {
  readonly muscle_group_code: string;
  readonly hours: number;
}

/** Registro "current" do depósito local `rest` (gravado por API-R01 e por esta tela). */
export interface StoredRest {
  readonly key: "current";
  readonly student_id: string;
  readonly default_hours: number;
  readonly revision: number;
  readonly overrides?: readonly RestOverride[] | null;
}

export async function readStoredRest(db: LocalDatabase): Promise<StoredRest | undefined> {
  return (await db.table("rest").get("current")) as StoredRest | undefined;
}

export function toRestConfig(stored: StoredRest | undefined): RestConfig {
  if (!stored) return { defaultHours: DEFAULT_REST_HOURS, overrides: {} };
  return {
    defaultHours: stored.default_hours,
    overrides: Object.fromEntries(
      (stored.overrides ?? []).map((o) => [o.muscle_group_code, o.hours] as const),
    ),
  };
}

/**
 * Grava o descanso no aparelho e na fila numa só transação. Uma alteração ainda não enviada é
 * reescrita (uma configuração só tem um valor atual); a revisão-base é a última confirmada.
 */
export async function saveRest(
  db: LocalDatabase,
  ownerUserId: string,
  config: RestConfig,
): Promise<void> {
  const overrides = Object.entries(config.overrides)
    .map(([muscle_group_code, hours]) => ({ muscle_group_code, hours }))
    .sort((a, b) => a.muscle_group_code.localeCompare(b.muscle_group_code));
  const payload = { default_hours: config.defaultHours, overrides };
  await db.transaction("rw", [db.table("rest"), db.outbox], async () => {
    const current = await readStoredRest(db);
    if (!current) throw new Error("Descanso ainda não baixado neste aparelho.");
    await db.table("rest").put({ ...current, default_hours: config.defaultHours, overrides });
    const queued = await db.outbox
      .where("entity_id")
      .equals(current.student_id)
      .filter((op) => op.type === REST_UPDATE && REWRITABLE_STATES.has(op.state))
      .first();
    if (queued?.seq !== undefined) {
      await db.outbox.update(queued.seq, { payload });
      return;
    }
    await enqueue(db, {
      ownerUserId,
      type: REST_UPDATE,
      entityId: current.student_id,
      groupId: REST_GROUP,
      baseRevision: current.revision,
      payload,
    });
  });
}

/** Há alteração de descanso ainda não confirmada pelo servidor (não sobrescrever a cópia). */
export async function hasUnsentRest(db: LocalDatabase): Promise<boolean> {
  return (await db.outbox.filter((op) => op.type === REST_UPDATE).count()) > 0;
}
