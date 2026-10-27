// Recomendação do treino (TRN-04 §4; RN-011, RN-013, RN-038, RN-049, RN-050; ADR-007, ADR-021)
// e duração estimada (TRN-04 §5, ADR-065). Funções puras: o mesmo resultado online e offline,
// pois só usam os dados guardados no aparelho (ARQ-01 §5).
import type { MeasureType, SessionStatus } from "./enums.ts";
import {
  DEFAULT_REST_HOURS,
  ESTIMATE_ROUNDING_MINUTES,
  ESTIMATE_SECONDS_PER_SET,
  ESTIMATE_TRANSITION_SECONDS,
  LOCAL_SESSIONS_WINDOW_DAYS,
  SESSION_ABANDON_HOURS,
} from "./parameters.ts";
import { hoursBetween, isoWeekday, toLocalDate, weekBounds } from "./time.ts";

// ---------- Duração estimada (ADR-065) ----------

export interface EstimateItem {
  readonly measure_type: MeasureType;
  readonly sets: number;
  readonly duration_s: number | null;
  readonly rest_s: number;
}

/**
 * Σ itens [séries × (45 s + descanso) + 60 s], arredondada para múltiplos de 5 min (mínimo
 * 5 min com ao menos um item); itens por duração usam a duração prescrita no lugar de 45 s.
 */
export function estimateWorkoutMinutes(items: readonly EstimateItem[]): number {
  if (items.length === 0) return 0;
  const seconds = items.reduce((total, item) => {
    const work =
      item.measure_type === "duration" && item.duration_s !== null
        ? item.duration_s
        : ESTIMATE_SECONDS_PER_SET;
    return total + item.sets * (work + item.rest_s) + ESTIMATE_TRANSITION_SECONDS;
  }, 0);
  const rounded = Math.round(seconds / 60 / ESTIMATE_ROUNDING_MINUTES) * ESTIMATE_ROUNDING_MINUTES;
  return Math.max(rounded, ESTIMATE_ROUNDING_MINUTES);
}

// ---------- Descanso por grupo (RN-050) ----------

export interface RestConfig {
  readonly defaultHours: number;
  /** Ajustes por grupo muscular (código → horas); 0 = ignora o grupo. */
  readonly overrides: Readonly<Record<string, number>>;
}

export const DEFAULT_REST_CONFIG: RestConfig = { defaultHours: DEFAULT_REST_HOURS, overrides: {} };

export function restHoursFor(rest: RestConfig, group: string): number {
  return rest.overrides[group] ?? rest.defaultHours;
}

// ---------- Recomendação (RN-013) ----------

export interface RecommendationWorkout {
  readonly id: string;
  /** União dos grupos primários dos exercícios do treino (RN-050). */
  readonly groups: readonly string[];
}

export interface RecommendationSession {
  readonly id: string;
  readonly workoutId: string;
  readonly status: SessionStatus;
  /** Instantes ISO 8601. */
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly lastActivityAt: string;
  /**
   * Grupos trabalhados: primários dos exercícios com ao menos uma série registrada; sessão
   * manual sem séries usa os grupos do treino referenciado (TRN-04 §4, passo 6).
   */
  readonly groups: readonly string[];
}

export interface RecommendationInput {
  /** Treinos do programa ativo, na ordem da sequência planejada. */
  readonly workouts: readonly RecommendationWorkout[];
  /** Publicação da versão ativa (início do primeiro ciclo). */
  readonly publishedAt: string;
  /** Sessões não excluídas do aluno, inclusive pendentes de envio (RN-049). */
  readonly sessions: readonly RecommendationSession[];
  readonly rest: RestConfig;
  /** Meta semanal = dias por semana do perfil (RN-038); null = sem meta. */
  readonly daysPerWeek: number | null;
  /** Dias ISO (1 = segunda … 7 = domingo); vazio = não informados. */
  readonly preferredWeekdays: readonly number[];
  readonly timeZone: string;
  readonly now: Date;
}

/** Grupo ainda em descanso para um treino. */
export interface RestBlock {
  readonly group: string;
  readonly hoursSince: number;
  readonly restHours: number;
  /** Quando o grupo fica liberado (ISO). */
  readonly availableAt: string;
}

export interface WorkoutStatus {
  readonly workoutId: string;
  /** Dia local da sessão que marcou o treino como feito no ciclo atual. */
  readonly doneInCycleOn: string | null;
  /** Grupo mais restritivo ainda em descanso (null = compatível). */
  readonly block: RestBlock | null;
  readonly recommended: boolean;
}

export interface NextWorkout {
  readonly workoutId: string;
  /** Grupo do treino trabalhado mais recentemente e há quantas horas (motivo). */
  readonly lastTrained: { readonly group: string; readonly hoursSince: number } | null;
}

export type RecommendationState =
  | { readonly kind: "continue"; readonly sessionId: string; readonly workoutId: string }
  | {
      readonly kind: "completed_today";
      readonly sessionId: string;
      readonly workoutId: string;
    }
  | { readonly kind: "rest_goal" }
  | { readonly kind: "rest_recovery"; readonly availableAt: string | null }
  | { readonly kind: "workout" };

export interface Recommendation {
  readonly state: RecommendationState;
  /** Próximo treino recomendado (exibido também em "concluído hoje" e nos descansos). */
  readonly next: NextWorkout | null;
  readonly week: { readonly count: number; readonly goal: number | null };
  /** Hoje não está entre os dias preferidos (quando informados) — não altera a recomendação. */
  readonly notPlannedToday: boolean;
  readonly workouts: readonly WorkoutStatus[];
}

const finished = (s: RecommendationSession) => s.status === "completed" || s.status === "manual";
const time = (iso: string) => new Date(iso).getTime();

/** Sessão em andamento ainda ativa (sem atividade há até 6 h — RN-012). */
export function isActiveInProgress(session: RecommendationSession, now: Date): boolean {
  return (
    session.status === "in_progress" &&
    hoursBetween(new Date(session.lastActivityAt), now) <= SESSION_ABANDON_HOURS
  );
}

/**
 * Treinos feitos no ciclo atual. O ciclo começa na publicação da versão ativa (ou no início da
 * janela de 90 dias do aparelho, se for anterior) e recomeça sempre que todos os treinos são
 * feitos.
 */
function doneInCycle(input: RecommendationInput): Map<string, RecommendationSession> {
  const windowStart = input.now.getTime() - LOCAL_SESSIONS_WINDOW_DAYS * 86_400_000;
  const cycleStart = Math.max(time(input.publishedAt), windowStart);
  const ids = new Set(input.workouts.map((w) => w.id));
  const ordered = input.sessions
    .filter((s) => finished(s) && ids.has(s.workoutId) && time(s.startedAt) >= cycleStart)
    .sort((a, b) => time(a.startedAt) - time(b.startedAt));
  let done = new Map<string, RecommendationSession>();
  for (const session of ordered) {
    done.set(session.workoutId, session);
    if (done.size === ids.size) done = new Map();
  }
  return done;
}

/** Último término de sessão concluída/registrada que trabalhou cada grupo. */
function lastWorkedByGroup(sessions: readonly RecommendationSession[]): Map<string, number> {
  const last = new Map<string, number>();
  for (const session of sessions) {
    if (!finished(session) || session.endedAt === null) continue;
    const ended = time(session.endedAt);
    for (const group of session.groups) {
      if ((last.get(group) ?? -Infinity) < ended) last.set(group, ended);
    }
  }
  return last;
}

function restBlock(
  workout: RecommendationWorkout,
  lastWorked: Map<string, number>,
  rest: RestConfig,
  now: Date,
): RestBlock | null {
  let block: RestBlock | null = null;
  for (const group of workout.groups) {
    const restHours = restHoursFor(rest, group);
    const ended = lastWorked.get(group);
    if (restHours === 0 || ended === undefined) continue;
    const availableAt = ended + restHours * 3_600_000;
    if (availableAt <= now.getTime()) continue;
    if (block === null || availableAt > time(block.availableAt)) {
      block = {
        group,
        hoursSince: hoursBetween(new Date(ended), now),
        restHours,
        availableAt: new Date(availableAt).toISOString(),
      };
    }
  }
  return block;
}

function lastTrainedOf(
  workout: RecommendationWorkout,
  lastWorked: Map<string, number>,
  now: Date,
): NextWorkout["lastTrained"] {
  let best: { group: string; ended: number } | null = null;
  for (const group of workout.groups) {
    const ended = lastWorked.get(group);
    if (ended !== undefined && (best === null || ended > best.ended)) best = { group, ended };
  }
  return best === null
    ? null
    : { group: best.group, hoursSince: hoursBetween(new Date(best.ended), now) };
}

export function recommendWorkout(input: RecommendationInput): Recommendation {
  const { now, timeZone } = input;
  const today = toLocalDate(now, timeZone);

  // Passo 4 — presenças na semana (seg–dom, fuso do aluno) contra a meta.
  const week = weekBounds(today);
  const presenceDays = new Set(
    input.sessions
      .filter(finished)
      .map((s) => toLocalDate(new Date(s.startedAt), timeZone))
      .filter((day) => day >= week.start && day <= week.end),
  );
  const goal = input.daysPerWeek;

  // Passos 2, 5 e 6 — ciclo, pendentes e compatibilidade por descanso.
  const done = doneInCycle(input);
  const lastWorked = lastWorkedByGroup(input.sessions);
  const blocks = new Map(
    input.workouts.map((w) => [w.id, restBlock(w, lastWorked, input.rest, now)] as const),
  );
  const pending = input.workouts.filter((w) => !done.has(w.id));
  const chosen = pending.find((w) => blocks.get(w.id) === null) ?? null;
  const next: NextWorkout | null =
    chosen === null
      ? null
      : { workoutId: chosen.id, lastTrained: lastTrainedOf(chosen, lastWorked, now) };

  // Passo 7 — menor horário em que algum pendente fica compatível.
  const releases = pending
    .map((w) => blocks.get(w.id)?.availableAt)
    .filter((at): at is string => at !== undefined)
    .sort();

  const inProgress = input.sessions
    .filter((s) => isActiveInProgress(s, now))
    .sort((a, b) => time(b.lastActivityAt) - time(a.lastActivityAt))[0];
  const completedToday = input.sessions
    .filter((s) => finished(s) && toLocalDate(new Date(s.startedAt), timeZone) === today)
    .sort((a, b) => time(b.startedAt) - time(a.startedAt))[0];

  let state: RecommendationState;
  if (inProgress) {
    state = { kind: "continue", sessionId: inProgress.id, workoutId: inProgress.workoutId };
  } else if (completedToday) {
    state = {
      kind: "completed_today",
      sessionId: completedToday.id,
      workoutId: completedToday.workoutId,
    };
  } else if (goal !== null && presenceDays.size >= goal) {
    state = { kind: "rest_goal" };
  } else if (chosen === null) {
    state = { kind: "rest_recovery", availableAt: releases[0] ?? null };
  } else {
    state = { kind: "workout" };
  }

  return {
    state,
    next,
    week: { count: presenceDays.size, goal },
    notPlannedToday:
      input.preferredWeekdays.length > 0 && !input.preferredWeekdays.includes(isoWeekday(today)),
    workouts: input.workouts.map((w) => {
      const doneSession = done.get(w.id);
      return {
        workoutId: w.id,
        doneInCycleOn:
          doneSession === undefined ? null : toLocalDate(new Date(doneSession.startedAt), timeZone),
        block: blocks.get(w.id) ?? null,
        recommended: chosen?.id === w.id,
      };
    }),
  };
}

/** Grupos de uma sessão passada (TRN-04 §4, passo 6). */
export function sessionGroups(
  status: SessionStatus,
  exercisesWithSets: readonly (readonly string[])[],
  workoutGroups: readonly string[],
): string[] {
  const groups = new Set(exercisesWithSets.flat());
  if (groups.size === 0 && status === "manual") return [...workoutGroups];
  return [...groups];
}
