// Sessões dos últimos 90 dias (API-R06) e última execução por exercício (API-R07), baixadas
// para o aparelho (UX-08 §6.2). O que ainda está na fila de saída — e a sessão em andamento —
// prevalece sobre a cópia do servidor: nada local é perdido no download.
import type { DataClient } from "../auth/data-client.ts";
import { LOCAL_SESSIONS_WINDOW_DAYS } from "@forja/domain";
import type { LocalDatabase } from "../local/db.ts";
import type {
  CachedLastExecution,
  LocalSession,
  LocalSessionExercise,
  LocalSet,
  SessionBundle,
} from "./session.ts";

interface SetRow extends LocalSet {
  deleted_at: string | null;
}

interface ExerciseRow extends Omit<LocalSessionExercise, "planned_sets"> {
  deleted_at: string | null;
  set_logs: SetRow[];
}

export interface SessionRow extends LocalSession {
  session_exercises: ExerciseRow[];
  workout: { name: string } | null;
  version: { version_number: number | null } | null;
}

export interface SessionData {
  readonly sessions: readonly SessionRow[];
  readonly lastExecutions: readonly CachedLastExecution[];
}

const SESSION_SELECT = `id, program_version_id, workout_id, status, started_at, ended_at, duration_min,
  last_activity_at, rpe, notes, possible_duplicate_of, revision, deleted_at, workout:workouts(name),
  version:program_versions(version_number),
  session_exercises(id, session_id, workout_item_id, exercise_id, position, status, revision,
    deleted_at, set_logs(id, session_exercise_id, set_number, load_kg, reps, duration_s,
    completed_at, revision, deleted_at))`;

export async function fetchSessionData(
  supabase: DataClient,
  studentId: string,
  now: Date,
): Promise<SessionData> {
  const since = new Date(now.getTime() - LOCAL_SESSIONS_WINDOW_DAYS * 86_400_000).toISOString();
  const [sessions, last] = await Promise.all([
    supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .eq("student_id", studentId)
      .gte("started_at", since)
      .in("status", ["completed", "manual"])
      .overrideTypes<SessionRow[], { merge: false }>(),
    supabase
      .from("last_executions")
      .select("exercise_id, session_id, started_at, sets")
      .eq("student_id", studentId)
      .overrideTypes<CachedLastExecution[], { merge: false }>(),
  ]);
  if (sessions.error) throw sessions.error;
  if (last.error) throw last.error;
  return {
    sessions: sessions.data.map(normalize),
    lastExecutions: last.data.map((l) => ({ ...l, started_at: iso(l.started_at) })),
  };
}

/** Horário do servidor ("…+00:00") no formato ISO com "Z" usado nas operações (DAD-04). */
function iso<T extends string | null | undefined>(value: T): T {
  return (typeof value === "string" ? new Date(value).toISOString() : value) as T;
}

/** Normaliza os horários de uma sessão baixada (o conteúdo é revalidado ao ser reenviado). */
export function normalize(row: SessionRow): SessionRow {
  return {
    ...row,
    started_at: iso(row.started_at),
    ended_at: iso(row.ended_at),
    last_activity_at: iso(row.last_activity_at),
    ...(row.deleted_at === undefined ? {} : { deleted_at: iso(row.deleted_at) }),
    session_exercises: row.session_exercises.map((e) => ({
      ...e,
      set_logs: e.set_logs.map((l) => ({
        ...l,
        completed_at: iso(l.completed_at),
        deleted_at: iso(l.deleted_at),
      })),
    })),
  };
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(key(item)) ?? [];
    list.push(item);
    groups.set(key(item), list);
  }
  return groups;
}

/** Grava a cópia do servidor sem tocar no que ainda não foi enviado nem na sessão em andamento. */
export async function mergeSessionData(db: LocalDatabase, data: SessionData): Promise<void> {
  const sessions = db.table<LocalSession, string>("sessions");
  const exercises = db.table<LocalSessionExercise, string>("session_exercises");
  const sets = db.table<LocalSet, string>("set_logs");
  const last = db.table<CachedLastExecution, string>("last_execution");
  await db.transaction("rw", [sessions, exercises, sets, last, db.outbox], async () => {
    const pending = new Set((await db.outbox.toArray()).map((op) => op.entity_id));
    const localExercises = await exercises.toArray();
    const localSets = await sets.toArray();
    const exercisesBySession = groupBy(localExercises, (e) => e.session_id);
    const setsByExercise = groupBy(localSets, (s) => s.session_exercise_id);

    /** Sessão local intocável: em andamento ou com algo dela ainda na fila. */
    const keep = new Set<string>();
    for (const session of await sessions.toArray()) {
      const children = exercisesBySession.get(session.id) ?? [];
      const ids = [
        session.id,
        ...children.map((e) => e.id),
        ...children.flatMap((e) => (setsByExercise.get(e.id) ?? []).map((s) => s.id)),
      ];
      if (session.status === "in_progress" || ids.some((id) => pending.has(id))) {
        keep.add(session.id);
        continue;
      }
      await sets.bulkDelete(ids.slice(1 + children.length));
      await exercises.bulkDelete(children.map((e) => e.id));
      await sessions.delete(session.id);
    }

    for (const row of data.sessions) {
      if (keep.has(row.id) || row.deleted_at) continue;
      const { session_exercises: rowExercises, workout, version, ...session } = row;
      await sessions.put({
        ...session,
        workout_name: workout?.name ?? "",
        version_number: version?.version_number ?? null,
      });
      for (const { set_logs: rowSets, deleted_at, ...exercise } of rowExercises) {
        if (deleted_at) continue;
        const live = rowSets.filter((s) => !s.deleted_at);
        await exercises.put({ ...exercise, planned_sets: Math.max(live.length, 1) });
        await sets.bulkPut(live);
      }
    }

    await last.clear();
    await last.bulkPut([...data.lastExecutions]);
  });
}

/** Linha do servidor no formato das sessões do aparelho (sem gravar). */
function toBundle(row: SessionRow): SessionBundle {
  const { session_exercises: rowExercises, workout, version, ...session } = row;
  const exercises = rowExercises
    .filter((e) => !e.deleted_at)
    .map(({ set_logs: rowSets, ...exercise }) => ({
      ...exercise,
      planned_sets: Math.max(rowSets.filter((s) => !s.deleted_at).length, 1),
    }))
    .sort((a, b) => a.position - b.position);
  const sets = rowExercises
    .flatMap((e) => e.set_logs)
    .filter((s) => !s.deleted_at)
    .sort((a, b) => a.set_number - b.set_number);
  return {
    session: {
      ...session,
      workout_name: workout?.name ?? "",
      version_number: version?.version_number ?? null,
    },
    exercises,
    sets,
  };
}

/**
 * API-R06 por período, só para consulta (meses anteriores à janela de 90 dias do aparelho —
 * TELA-018); nada é gravado no aparelho.
 */
export async function fetchSessionsInRange(
  supabase: DataClient,
  studentId: string,
  from: string,
  to: string,
): Promise<SessionBundle[]> {
  const result = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .gte("started_at", from)
    .lt("started_at", to)
    .overrideTypes<SessionRow[], { merge: false }>();
  if (result.error) throw result.error;
  return result.data.map((row) => toBundle(normalize(row)));
}
