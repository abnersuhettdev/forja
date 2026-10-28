// Histórico de sessões (TELA-018..020; RF-069..072; RN-027, RN-046, RN-049): leitura do
// aparelho com as marcas de "aguardando envio" e a edição de uma sessão concluída, gravada no
// aparelho e enviada pela fila (offline inclusive; conflitos vão para a Sincronização).
import { sessionDurationMinutes } from "@forja/domain";
import type { LocalDatabase } from "../local/db.ts";
import { enqueue, REWRITABLE_STATES } from "../local/outbox.ts";
import {
  readSession,
  type LocalSession,
  type LocalSessionExercise,
  type LocalSet,
  type SessionBundle,
} from "../execution/session.ts";
import { readQueueGroups } from "../sync/queue.ts";

export interface HistoryData {
  readonly bundles: readonly SessionBundle[];
  /** Sessões com algo ainda na fila de saída (RN-049). */
  readonly pending: ReadonlySet<string>;
}

export async function readHistory(db: LocalDatabase): Promise<HistoryData> {
  const sessions = await db.table<LocalSession, string>("sessions").toArray();
  const bundles: SessionBundle[] = [];
  for (const session of sessions) {
    if (session.deleted_at) continue;
    const bundle = await readSession(db, session.id);
    if (bundle) bundles.push(bundle);
  }
  const groups = await readQueueGroups(db);
  return {
    bundles: bundles.sort((a, b) => a.session.started_at.localeCompare(b.session.started_at)),
    pending: new Set(groups.filter((g) => g.kind === "session").map((g) => g.id)),
  };
}

export interface EditedSet {
  /** Ausente em série nova. */
  readonly id?: string;
  readonly session_exercise_id: string;
  readonly load_kg: number;
  readonly reps: number | null;
  readonly duration_s: number | null;
}

export interface SessionEdit {
  readonly startedAt: string;
  readonly endedAt: string;
  readonly rpe: number | null;
  readonly notes: string | null;
  /** Séries finais, na ordem de cada exercício (a numeração é refeita a partir de 1). */
  readonly sets: readonly EditedSet[];
}

/** Operação ainda não enviada do registro, que pode ser reescrita no lugar de criar outra. */
async function rewritable(db: LocalDatabase, entityId: string, type: string) {
  return db.outbox
    .where("entity_id")
    .equals(entityId)
    .filter((op) => op.type === type && REWRITABLE_STATES.has(op.state))
    .first();
}

/**
 * API-013, API-009 e API-010 numa só transação: horários, PSE e observação; séries alteradas,
 * novas e removidas. Ordem na fila: exclusões, depois séries em ordem crescente de número, para
 * que a renumeração nunca repita um número ainda ocupado no servidor.
 */
export async function saveSessionEdit(
  db: LocalDatabase,
  owner: string,
  bundle: SessionBundle,
  edit: SessionEdit,
): Promise<void> {
  const sessions = db.table<LocalSession, string>("sessions");
  const exercises = db.table<LocalSessionExercise, string>("session_exercises");
  const sets = db.table<LocalSet, string>("set_logs");
  const sessionId = bundle.session.id;
  const common = { ownerUserId: owner, groupId: sessionId };

  await db.transaction("rw", [sessions, exercises, sets, db.outbox], async () => {
    // Sessão: horários, duração, PSE e observação.
    const changes: Record<string, unknown> = {};
    if (edit.startedAt !== bundle.session.started_at) changes.started_at = edit.startedAt;
    if (edit.endedAt !== bundle.session.ended_at) changes.ended_at = edit.endedAt;
    if (edit.rpe !== bundle.session.rpe) changes.rpe = edit.rpe;
    if (edit.notes !== bundle.session.notes) changes.notes = edit.notes;
    if (Object.keys(changes).length > 0) {
      await sessions.update(sessionId, {
        started_at: edit.startedAt,
        ended_at: edit.endedAt,
        duration_min: sessionDurationMinutes(edit.startedAt, edit.endedAt),
        rpe: edit.rpe,
        notes: edit.notes,
      });
      const queued = await rewritable(db, sessionId, "session.update");
      if (queued?.seq !== undefined) {
        await db.outbox.update(queued.seq, { payload: { ...queued.payload, ...changes } });
      } else {
        await enqueue(db, {
          ...common,
          type: "session.update",
          entityId: sessionId,
          baseRevision: bundle.session.revision ?? 1,
          payload: changes,
        });
      }
    }

    // Séries removidas: as que nunca chegaram ao servidor só saem da fila.
    const kept = new Set(edit.sets.flatMap((s) => (s.id ? [s.id] : [])));
    for (const removed of bundle.sets.filter((s) => !kept.has(s.id))) {
      await sets.delete(removed.id);
      const ops = await db.outbox.where("entity_id").equals(removed.id).toArray();
      const removable = ops.filter((op) => REWRITABLE_STATES.has(op.state));
      await db.outbox.bulkDelete(removable.flatMap((op) => (op.seq === undefined ? [] : [op.seq])));
      if (removed.revision !== undefined || removable.length < ops.length) {
        await enqueue(db, {
          ...common,
          type: "set.delete",
          entityId: removed.id,
          baseRevision: removed.revision ?? 1,
          payload: {},
        });
      }
    }

    // Séries finais renumeradas por exercício; só as alteradas ou novas vão para a fila.
    const numbered = new Map<string, number>();
    const upserts = edit.sets.map((set) => {
      const number = (numbered.get(set.session_exercise_id) ?? 0) + 1;
      numbered.set(set.session_exercise_id, number);
      return { ...set, set_number: number };
    });
    upserts.sort((a, b) => a.set_number - b.set_number);
    for (const set of upserts) {
      const previous = set.id ? bundle.sets.find((s) => s.id === set.id) : undefined;
      const same =
        previous?.set_number === set.set_number &&
        previous.load_kg === set.load_kg &&
        previous.reps === set.reps &&
        previous.duration_s === set.duration_s;
      if (same) continue;
      const id = set.id ?? crypto.randomUUID();
      const completedAt = previous?.completed_at ?? edit.endedAt;
      const stored: LocalSet = {
        ...(previous ?? {}),
        id,
        session_exercise_id: set.session_exercise_id,
        set_number: set.set_number,
        load_kg: set.load_kg,
        reps: set.reps,
        duration_s: set.duration_s,
        completed_at: completedAt,
      };
      await sets.put(stored);
      const payload = {
        session_exercise_id: set.session_exercise_id,
        set_number: set.set_number,
        load_kg: set.load_kg,
        reps: set.reps,
        duration_s: set.duration_s,
        completed_at: completedAt,
      };
      const queued = await rewritable(db, id, "set.upsert");
      if (queued?.seq !== undefined) {
        await db.outbox.update(queued.seq, { payload });
      } else {
        await enqueue(db, {
          ...common,
          type: "set.upsert",
          entityId: id,
          baseRevision: previous ? (previous.revision ?? 1) : null,
          payload,
        });
      }
    }
    // Séries previstas acompanham as registradas (exibição neste aparelho).
    for (const [exerciseId, count] of numbered) {
      await exercises.update(exerciseId, { planned_sets: Math.max(count, 1) });
    }
  });
}
