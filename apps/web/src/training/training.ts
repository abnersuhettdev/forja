// Dados do "Meu treino" (TELA-010..013): resumo dos treinos, sessões guardadas no aparelho e
// entradas da recomendação (TRN-04 §4). Tudo vem do banco local, para que o resultado seja o
// mesmo online e offline (ARQ-01 §5).
import {
  addDays,
  estimateWorkoutMinutes,
  isoWeekday,
  sessionGroups,
  toLocalDate,
  weekBounds,
  type RecommendationSession,
  type SessionStatus,
} from "@forja/domain";
import type { CatalogExercise } from "../catalog/catalog.ts";
import type { LocalDatabase } from "../local/db.ts";
import type { EditorDocument } from "../program/editor.ts";

type Workout = EditorDocument["workouts"][number];

export interface WorkoutSummary {
  readonly id: string;
  readonly name: string;
  readonly exerciseCount: number;
  readonly minutes: number;
  /** Grupos primários, na ordem em que aparecem no treino (RN-050). */
  readonly groups: readonly string[];
}

export function summarizeWorkout(
  workout: Workout,
  exercises: ReadonlyMap<string, CatalogExercise>,
): WorkoutSummary {
  const groups = new Set<string>();
  for (const item of workout.items)
    for (const group of exercises.get(item.exercise_id)?.primary ?? []) groups.add(group);
  return {
    id: workout.id,
    name: workout.name,
    exerciseCount: workout.items.length,
    minutes: estimateWorkoutMinutes(workout.items),
    groups: [...groups],
  };
}

// ---------- Sessões guardadas no aparelho (entram com a execução — TAR-019) ----------

interface StoredSession {
  id: string;
  workout_id: string;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string;
  deleted_at?: string | null;
}

interface StoredSessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  planned_sets?: number;
}

interface StoredSetLog {
  session_exercise_id: string;
}

export interface LocalSessions {
  readonly sessions: readonly RecommendationSession[];
  /** Sessões com operação ainda na fila de saída (RN-049). */
  readonly pendingIds: ReadonlySet<string>;
  /** Progresso da sessão em andamento do aparelho ("9 de 18 séries"). */
  readonly active: ActiveProgress | null;
}

export interface ActiveProgress {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly sets: number;
  readonly planned: number;
}

export async function readLocalSessions(
  db: LocalDatabase,
  exercises: ReadonlyMap<string, CatalogExercise>,
  workoutGroups: ReadonlyMap<string, readonly string[]>,
): Promise<LocalSessions> {
  const [sessions, sessionExercises, setLogs, outbox] = await Promise.all([
    db.table("sessions").toArray() as Promise<StoredSession[]>,
    db.table("session_exercises").toArray() as Promise<StoredSessionExercise[]>,
    db.table("set_logs").toArray() as Promise<StoredSetLog[]>,
    db.outbox.toArray(),
  ]);
  const withSets = new Set(setLogs.map((s) => s.session_exercise_id));
  const active = sessions.find((s) => s.status === "in_progress" && !s.deleted_at);
  const activeExercises = sessionExercises.filter((se) => se.session_id === active?.id);
  const activeIds = new Set(activeExercises.map((se) => se.id));
  const bySession = new Map<string, string[][]>();
  for (const se of sessionExercises) {
    if (!withSets.has(se.id)) continue;
    const list = bySession.get(se.session_id) ?? [];
    list.push([...(exercises.get(se.exercise_id)?.primary ?? [])]);
    bySession.set(se.session_id, list);
  }
  return {
    sessions: sessions
      .filter((s) => !s.deleted_at)
      .map((s) => ({
        id: s.id,
        workoutId: s.workout_id,
        status: s.status,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        lastActivityAt: s.last_activity_at,
        groups: sessionGroups(
          s.status,
          bySession.get(s.id) ?? [],
          workoutGroups.get(s.workout_id) ?? [],
        ),
      })),
    pendingIds: new Set(outbox.map((op) => op.entity_id)),
    active: active
      ? {
          sessionId: active.id,
          startedAt: active.started_at,
          sets: setLogs.filter((l) => activeIds.has(l.session_exercise_id)).length,
          planned: activeExercises.reduce((total, se) => total + (se.planned_sets ?? 0), 0),
        }
      : null,
  };
}

// ---------- Semana (TELA-010 item 4; RN-011, RN-029, RN-049) ----------

export type DayMark = "presence" | "pending" | "planned" | "none";

export interface WeekDay {
  readonly date: string;
  readonly weekday: number;
  readonly mark: DayMark;
  readonly isToday: boolean;
}

export function weekMarkers(
  now: Date,
  timeZone: string,
  local: LocalSessions,
  preferredWeekdays: readonly number[],
): WeekDay[] {
  const today = toLocalDate(now, timeZone);
  const { start } = weekBounds(today);
  const presence = new Map<string, boolean>();
  for (const s of local.sessions) {
    if (s.status !== "completed" && s.status !== "manual") continue;
    const day = toLocalDate(new Date(s.startedAt), timeZone);
    presence.set(day, (presence.get(day) ?? false) || local.pendingIds.has(s.id));
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const weekday = isoWeekday(date);
    const pending = presence.get(date);
    const mark: DayMark =
      pending === true
        ? "pending"
        : pending === false
          ? "presence"
          : date >= today && preferredWeekdays.includes(weekday)
            ? "planned"
            : "none";
    return { date, weekday, mark, isToday: date === today };
  });
}

// ---------- Perfil usado pela recomendação ----------

export interface PlanProfile {
  readonly daysPerWeek: number | null;
  readonly preferredWeekdays: readonly number[];
}

export async function readPlanProfile(db: LocalDatabase): Promise<PlanProfile> {
  const profile = (await db.table("profile").get("current")) as
    { days_per_week?: number | null; preferred_weekdays?: number[] | null } | undefined;
  return {
    daysPerWeek: profile?.days_per_week ?? null,
    preferredWeekdays: profile?.preferred_weekdays ?? [],
  };
}
