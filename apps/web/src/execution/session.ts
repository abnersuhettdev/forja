// Sessão no aparelho (TAR-019; RF-060..067, RN-012, RN-043, RN-044, RN-049; UX-08 §6.1).
// Cada ação grava no banco local e entra na fila de saída NA MESMA transação: a confirmação
// só aparece depois de gravada (RN-043), e nada fica só na memória.
import {
  sessionDurationMinutes,
  type LoggedSet,
  type SessionExerciseStatus,
  type SessionStatus,
} from "@forja/domain";
import type { LocalDatabase } from "../local/db.ts";
import { enqueue, REWRITABLE_STATES } from "../local/outbox.ts";
import type { VersionView } from "../program/program.ts";

export interface LocalSession {
  readonly id: string;
  readonly program_version_id: string;
  readonly workout_id: string;
  readonly status: SessionStatus;
  readonly started_at: string;
  readonly ended_at: string | null;
  readonly duration_min: number | null;
  readonly last_activity_at: string;
  readonly rpe: number | null;
  readonly notes: string | null;
  /** RN-045 — outra sessão com horário sobreposto (marca vinda do servidor). */
  readonly possible_duplicate_of?: string | null;
  /** Nome do treino no início (RN-044: publicações posteriores não mudam a sessão). */
  readonly workout_name?: string;
  /** Revisão confirmada pelo servidor; ausente enquanto o início não foi aceito. */
  readonly revision?: number;
  readonly deleted_at?: string | null;
}

export interface LocalSessionExercise {
  readonly id: string;
  readonly session_id: string;
  readonly workout_item_id: string | null;
  readonly exercise_id: string;
  readonly position: number;
  readonly status: SessionExerciseStatus;
  /** Séries previstas neste aparelho (prescrição + séries acrescentadas). */
  readonly planned_sets: number;
  /** Cópia da prescrição no início (RN-044); ausente em sessões baixadas do servidor. */
  readonly prescription?: ItemPrescription;
  readonly revision?: number;
}

export interface LocalSet {
  readonly id: string;
  readonly session_exercise_id: string;
  readonly set_number: number;
  readonly load_kg: number;
  readonly reps: number | null;
  readonly duration_s: number | null;
  readonly completed_at: string;
  readonly revision?: number;
}

export interface ItemPrescription {
  readonly measure_type: "reps" | "duration";
  readonly sets: number;
  readonly reps_min: number | null;
  readonly reps_max: number | null;
  readonly duration_s: number | null;
  readonly rest_s: number;
  readonly suggested_load_kg: number | null;
  readonly notes: string | null;
}

export interface SessionBundle {
  readonly session: LocalSession;
  readonly exercises: readonly LocalSessionExercise[];
  readonly sets: readonly LocalSet[];
}

function tables(db: LocalDatabase) {
  return {
    sessions: db.table<LocalSession, string>("sessions"),
    exercises: db.table<LocalSessionExercise, string>("session_exercises"),
    sets: db.table<LocalSet, string>("set_logs"),
  };
}

export type SessionErrorCode = "ACTIVE_EXISTS" | "NOT_FOUND" | "WORKOUT_NOT_FOUND";

export class SessionError extends Error {
  readonly code: SessionErrorCode;

  constructor(code: SessionErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Sessão em andamento neste aparelho (no máximo uma — RN-012). */
export async function findActiveSession(db: LocalDatabase): Promise<LocalSession | undefined> {
  const all = await tables(db).sessions.toArray();
  return all.find((s) => s.status === "in_progress" && !s.deleted_at);
}

export async function readSession(
  db: LocalDatabase,
  sessionId: string,
): Promise<SessionBundle | undefined> {
  const t = tables(db);
  const session = await t.sessions.get(sessionId);
  if (!session) return undefined;
  const exercises = (await t.exercises.where("session_id").equals(sessionId).toArray()).sort(
    (a, b) => a.position - b.position,
  );
  const sets = await t.sets
    .where("session_exercise_id")
    .anyOf(exercises.map((e) => e.id))
    .toArray();
  return { session, exercises, sets: sets.sort((a, b) => a.set_number - b.set_number) };
}

/** API-008 — inicia a sessão do treino da versão ativa (RN-044), online ou offline. */
export async function startSession(
  db: LocalDatabase,
  ownerUserId: string,
  version: VersionView,
  workoutId: string,
  now: Date = new Date(),
): Promise<string> {
  const workout = version.document.workouts.find((w) => w.id === workoutId);
  if (!workout || workout.items.length === 0) throw new SessionError("WORKOUT_NOT_FOUND");
  const t = tables(db);
  const sessionId = crypto.randomUUID();
  const startedAt = now.toISOString();
  const exercises: LocalSessionExercise[] = workout.items.map((item, index) => ({
    id: crypto.randomUUID(),
    session_id: sessionId,
    workout_item_id: item.id,
    exercise_id: item.exercise_id,
    position: index + 1,
    status: "pending",
    planned_sets: item.sets,
    prescription: {
      measure_type: item.measure_type,
      sets: item.sets,
      reps_min: item.reps_min,
      reps_max: item.reps_max,
      duration_s: item.duration_s,
      rest_s: item.rest_s,
      suggested_load_kg: item.suggested_load_kg,
      notes: item.notes,
    },
  }));
  await db.transaction("rw", [t.sessions, t.exercises, db.outbox], async () => {
    if (await findActiveSession(db)) throw new SessionError("ACTIVE_EXISTS");
    await t.sessions.add({
      id: sessionId,
      program_version_id: version.id,
      workout_id: workoutId,
      status: "in_progress",
      started_at: startedAt,
      ended_at: null,
      duration_min: null,
      last_activity_at: startedAt,
      rpe: null,
      notes: null,
      workout_name: workout.name,
    });
    await t.exercises.bulkAdd(exercises);
    await enqueue(db, {
      ownerUserId,
      type: "session.start",
      entityId: sessionId,
      groupId: sessionId,
      baseRevision: null,
      payload: {
        program_version_id: version.id,
        workout_id: workoutId,
        started_at: startedAt,
        exercises: exercises.map((e) => ({
          id: e.id,
          workout_item_id: e.workout_item_id,
          exercise_id: e.exercise_id,
          position: e.position,
        })),
      },
    });
  });
  return sessionId;
}

/** Operação ainda não enviada do registro, que pode ser reescrita no lugar de criar outra. */
async function rewritable(db: LocalDatabase, entityId: string, type: string) {
  return db.outbox
    .where("entity_id")
    .equals(entityId)
    .filter((op) => op.type === type && REWRITABLE_STATES.has(op.state))
    .first();
}

export interface SetInput {
  readonly id?: string;
  readonly session_exercise_id: string;
  readonly set_number: number;
  readonly load_kg: number;
  readonly reps: number | null;
  readonly duration_s: number | null;
}

/** API-009 — grava a série (nova ou corrigida) e a atividade da sessão. */
export async function saveSet(
  db: LocalDatabase,
  ownerUserId: string,
  sessionId: string,
  input: SetInput,
  now: Date = new Date(),
): Promise<LocalSet> {
  const t = tables(db);
  const completedAt = now.toISOString();
  return db.transaction("rw", [t.sessions, t.sets, db.outbox], async () => {
    const existing = input.id ? await t.sets.get(input.id) : undefined;
    const set: LocalSet = {
      ...(existing ?? {}),
      id: existing?.id ?? input.id ?? crypto.randomUUID(),
      session_exercise_id: input.session_exercise_id,
      set_number: input.set_number,
      load_kg: input.load_kg,
      reps: input.reps,
      duration_s: input.duration_s,
      completed_at: completedAt,
    };
    await t.sets.put(set);
    await t.sessions.update(sessionId, { last_activity_at: completedAt });
    const payload = {
      session_exercise_id: set.session_exercise_id,
      set_number: set.set_number,
      load_kg: set.load_kg,
      reps: set.reps,
      duration_s: set.duration_s,
      completed_at: completedAt,
    };
    const queued = await rewritable(db, set.id, "set.upsert");
    if (queued?.seq !== undefined) {
      await db.outbox.update(queued.seq, { payload });
    } else {
      await enqueue(db, {
        ownerUserId,
        type: "set.upsert",
        entityId: set.id,
        groupId: sessionId,
        // Criação, ou correção sobre a revisão confirmada (1 se a criação ainda está indo).
        baseRevision: existing ? (existing.revision ?? 1) : null,
        payload,
      });
    }
    return set;
  });
}

/** API-010 — desfaz a série. Se ela nunca chegou ao servidor, só sai da fila. */
export async function deleteSet(
  db: LocalDatabase,
  ownerUserId: string,
  setId: string,
): Promise<void> {
  const t = tables(db);
  await db.transaction("rw", [t.sets, t.exercises, db.outbox], async () => {
    const set = await t.sets.get(setId);
    if (!set) return;
    const parent = await t.exercises.get(set.session_exercise_id);
    await t.sets.delete(setId);
    const ops = await db.outbox.where("entity_id").equals(setId).toArray();
    const removable = ops.filter((op) => REWRITABLE_STATES.has(op.state));
    await db.outbox.bulkDelete(removable.flatMap((op) => (op.seq === undefined ? [] : [op.seq])));
    const reachedServer = set.revision !== undefined || removable.length < ops.length;
    if (reachedServer) {
      await enqueue(db, {
        ownerUserId,
        type: "set.delete",
        entityId: setId,
        ...(parent ? { groupId: parent.session_id } : {}),
        baseRevision: set.revision ?? 1,
        payload: {},
      });
    }
  });
}

/** API-011 — estado (feito/pulado) ou ordem do exercício na sessão (RF-063). */
export async function updateSessionExercise(
  db: LocalDatabase,
  ownerUserId: string,
  exerciseId: string,
  change: { status?: SessionExerciseStatus; position?: number },
): Promise<void> {
  const t = tables(db);
  await db.transaction("rw", [t.exercises, db.outbox], async () => {
    const current = await t.exercises.get(exerciseId);
    if (!current) throw new SessionError("NOT_FOUND");
    await t.exercises.update(exerciseId, change);
    const queued = await rewritable(db, exerciseId, "session_exercise.update");
    if (queued?.seq !== undefined) {
      await db.outbox.update(queued.seq, { payload: { ...queued.payload, ...change } });
      return;
    }
    await enqueue(db, {
      ownerUserId,
      type: "session_exercise.update",
      entityId: exerciseId,
      groupId: current.session_id,
      baseRevision: current.revision ?? 1,
      payload: change,
    });
  });
}

/** Séries previstas neste aparelho ("+ Adicionar série" e remoção de série não registrada). */
export async function setPlannedSets(
  db: LocalDatabase,
  exerciseId: string,
  plannedSets: number,
): Promise<void> {
  await tables(db).exercises.update(exerciseId, { planned_sets: Math.min(20, plannedSets) });
}

/** API-012 — conclui a sessão; o término informado vale para sessões abandonadas (RN-012). */
export async function completeSession(
  db: LocalDatabase,
  ownerUserId: string,
  sessionId: string,
  details: { rpe: number | null; notes: string | null; endedAt?: Date },
  now: Date = new Date(),
): Promise<LocalSession> {
  const t = tables(db);
  return db.transaction("rw", [t.sessions, db.outbox], async () => {
    const session = await t.sessions.get(sessionId);
    if (!session) throw new SessionError("NOT_FOUND");
    const endedAt = (details.endedAt ?? now).toISOString();
    const completed: LocalSession = {
      ...session,
      status: "completed",
      ended_at: endedAt,
      duration_min: sessionDurationMinutes(session.started_at, endedAt),
      rpe: details.rpe,
      notes: details.notes,
    };
    await t.sessions.put(completed);
    await enqueue(db, {
      ownerUserId,
      type: "session.complete",
      entityId: sessionId,
      groupId: sessionId,
      baseRevision: session.revision ?? 1,
      payload: {
        ended_at: endedAt,
        duration_min: completed.duration_min,
        rpe: completed.rpe,
        notes: completed.notes,
      },
    });
    return completed;
  });
}

/**
 * API-014 — descarta a sessão em andamento e suas séries (RF-067). Se nada dela chegou ao
 * servidor, as operações só saem da fila; senão, vai o descarte.
 */
export async function discardSession(
  db: LocalDatabase,
  ownerUserId: string,
  sessionId: string,
): Promise<void> {
  const t = tables(db);
  await db.transaction("rw", [t.sessions, t.exercises, t.sets, db.outbox], async () => {
    const bundle = await readSession(db, sessionId);
    if (!bundle) return;
    const ids = new Set([
      sessionId,
      ...bundle.exercises.map((e) => e.id),
      ...bundle.sets.map((s) => s.id),
    ]);
    await t.sets.bulkDelete(bundle.sets.map((s) => s.id));
    await t.exercises.bulkDelete(bundle.exercises.map((e) => e.id));
    await t.sessions.delete(sessionId);
    const ops = await db.outbox.filter((op) => ids.has(op.entity_id)).toArray();
    const removable = ops.filter((op) => REWRITABLE_STATES.has(op.state));
    await db.outbox.bulkDelete(removable.flatMap((op) => (op.seq === undefined ? [] : [op.seq])));
    const reachedServer = bundle.session.revision !== undefined || removable.length < ops.length;
    if (reachedServer) {
      await enqueue(db, {
        ownerUserId,
        type: "session.delete",
        entityId: sessionId,
        groupId: sessionId,
        baseRevision: bundle.session.revision ?? 1,
        payload: {},
      });
    }
  });
}

/** Há operação desta sessão (ou de suas partes) ainda na fila. */
export async function hasPendingOps(db: LocalDatabase, bundle: SessionBundle): Promise<boolean> {
  const ids = new Set([
    bundle.session.id,
    ...bundle.exercises.map((e) => e.id),
    ...bundle.sets.map((s) => s.id),
  ]);
  return (await db.outbox.filter((op) => ids.has(op.entity_id)).count()) > 0;
}

// ---------- Última execução (TRN-04 §3, API-R07) ----------

export interface CachedLastExecution {
  readonly exercise_id: string;
  readonly session_id: string;
  readonly started_at: string;
  readonly sets: readonly LoggedSet[];
}

/**
 * Última execução do exercício: a mais recente entre as sessões do aparelho (inclusive
 * pendentes — RN-049) e a cópia baixada do servidor; a sessão atual não conta.
 */
export async function lastExecution(
  db: LocalDatabase,
  exerciseId: string,
  excludeSessionId: string | null,
): Promise<CachedLastExecution | null> {
  const t = tables(db);
  const exercises = await t.exercises
    .where("session_id")
    .notEqual(excludeSessionId ?? "")
    .toArray();
  const candidates = exercises.filter((e) => e.exercise_id === exerciseId);
  let best: CachedLastExecution | null = null;
  for (const candidate of candidates) {
    const session = await t.sessions.get(candidate.session_id);
    if (
      !session ||
      session.deleted_at ||
      (session.status !== "completed" && session.status !== "manual")
    )
      continue;
    const sets = await t.sets.where("session_exercise_id").equals(candidate.id).toArray();
    if (sets.length === 0) continue;
    if (best === null || session.started_at > best.started_at) {
      best = {
        exercise_id: exerciseId,
        session_id: session.id,
        started_at: session.started_at,
        sets: sets.sort((a, b) => a.set_number - b.set_number),
      };
    }
  }
  const cached = (await db.table("last_execution").get(exerciseId)) as
    CachedLastExecution | undefined;
  if (
    cached &&
    cached.session_id !== excludeSessionId &&
    (!best || cached.started_at > best.started_at)
  )
    return cached;
  return best;
}
