// Registro e exclusão de peso no aparelho (TELA-021/022; RF-080, UXP-01; API-005/006): gravados
// localmente e enviados pela fila, inclusive offline (TELA-022: "salvo no aparelho e enviado
// depois"). Pesos de avaliação não são excluídos aqui (NOT_DELETABLE).
import type { LocalDatabase } from "../local/db.ts";
import { enqueue, REWRITABLE_STATES } from "../local/outbox.ts";
import type { WeightRecord } from "../offline/offline.ts";

export class WeightNotDeletableError extends Error {
  constructor() {
    super("NOT_DELETABLE");
  }
}

export async function saveWeight(
  db: LocalDatabase,
  owner: string,
  entry: { readonly measured_on: string; readonly weight_kg: number },
  now: Date = new Date(),
): Promise<WeightRecord> {
  const weights = db.table<WeightRecord, string>("weights");
  const record: WeightRecord = {
    id: crypto.randomUUID(),
    measured_on: entry.measured_on,
    weight_kg: entry.weight_kg,
    source: "manual",
    created_at: now.toISOString(),
  };
  await db.transaction("rw", [weights, db.outbox], async () => {
    await weights.add(record);
    await enqueue(db, {
      ownerUserId: owner,
      type: "weight.create",
      entityId: record.id,
      baseRevision: null,
      payload: { measured_on: record.measured_on, weight_kg: record.weight_kg },
      groupId: record.id,
    });
  });
  return record;
}

/** Exclui um registro manual; se ele nunca chegou ao servidor, só sai da fila. */
export async function deleteWeight(
  db: LocalDatabase,
  owner: string,
  entry: WeightRecord,
): Promise<void> {
  if (entry.source !== "manual") throw new WeightNotDeletableError();
  const weights = db.table<WeightRecord, string>("weights");
  await db.transaction("rw", [weights, db.outbox], async () => {
    await weights.delete(entry.id);
    const ops = await db.outbox.where("entity_id").equals(entry.id).toArray();
    const removable = ops.filter((op) => REWRITABLE_STATES.has(op.state));
    await db.outbox.bulkDelete(removable.flatMap((op) => (op.seq === undefined ? [] : [op.seq])));
    if (entry.revision !== undefined || removable.length < ops.length) {
      await enqueue(db, {
        ownerUserId: owner,
        type: "weight.delete",
        entityId: entry.id,
        baseRevision: entry.revision ?? 1,
        payload: {},
        groupId: entry.id,
      });
    }
  });
}
