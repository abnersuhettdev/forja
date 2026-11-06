// Adiar a reavaliação (TELA-010; RF-085, RN-015; API-022): grava a data no aparelho e envia pela
// fila, inclusive offline; o lembrete some na hora e volta na data escolhida.
import type { ReassessmentInfo } from "@forja/domain";
import { readMeta, writeMeta, type LocalDatabase } from "../local/db.ts";
import { enqueue } from "../local/outbox.ts";
import { REASSESSMENT_KEY } from "../offline/offline.ts";

export async function postponeReassessment(
  db: LocalDatabase,
  owner: string,
  postponeTo: string,
): Promise<void> {
  await db.transaction("rw", [db.sync_meta, db.outbox], async () => {
    const info = await readMeta<ReassessmentInfo | null>(db, REASSESSMENT_KEY);
    if (info) await writeMeta(db, REASSESSMENT_KEY, { ...info, snoozeUntil: postponeTo });
    await enqueue(db, {
      ownerUserId: owner,
      type: "reassessment.postpone",
      entityId: crypto.randomUUID(),
      baseRevision: null,
      payload: { postpone_to: postponeTo },
    });
  });
}
