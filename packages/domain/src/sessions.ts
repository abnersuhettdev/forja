// Execução do treino (TRN-04 §2, §3 e §5; RN-012, RN-018, RN-043..049; DAD-04 API-008..014):
// conteúdo das operações de sessão, pré-preenchimento das séries e números do resumo.
import { z } from "zod";
import type { MeasureType } from "./enums.ts";
import { SESSION_EXERCISE_STATUSES } from "./enums.ts";
import { CLIENT_CLOCK_TOLERANCE_MINUTES, SESSION_ABANDON_HOURS } from "./parameters.ts";
import { inRange } from "./schemas.ts";
import { hoursBetween } from "./time.ts";

const id = z.uuid();
const instant = z.iso.datetime();
const notes = z.string().trim().max(500).nullable();

// ---------- Operações (DAD-04 §5) ----------

/** API-008 `session.start` (entity_id = id da sessão; criação, base_revision nula). */
export const sessionStartPayloadSchema = z.strictObject({
  program_version_id: id,
  workout_id: id,
  started_at: instant,
  exercises: z
    .array(
      z.strictObject({
        id,
        workout_item_id: id.nullable(),
        exercise_id: id,
        position: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
});

/** API-009 `set.upsert` (entity_id = id da série). */
export const setUpsertPayloadSchema = z
  .strictObject({
    session_exercise_id: id,
    set_number: inRange("setNumber"),
    load_kg: inRange("loadKg"),
    reps: inRange("reps").nullable(),
    duration_s: inRange("durationSecondsLogged").nullable(),
    completed_at: instant,
  })
  .refine((set) => (set.reps === null) !== (set.duration_s === null), {
    message: "Informe repetições ou duração.",
    path: ["reps"],
  });

/** API-011 `session_exercise.update` (status e/ou ordem; substituição é D5). */
export const sessionExerciseUpdatePayloadSchema = z
  .strictObject({
    status: z.enum(SESSION_EXERCISE_STATUSES).optional(),
    position: z.number().int().min(1).max(50).optional(),
  })
  .refine((p) => p.status !== undefined || p.position !== undefined, {
    message: "Nada a alterar.",
  });

/** API-012 `session.complete`. */
export const sessionCompletePayloadSchema = z.strictObject({
  ended_at: instant,
  duration_min: inRange("sessionDurationMinutes"),
  rpe: inRange("rpe").nullable(),
  notes,
});

/** API-013 `session.update` (horários, PSE e observação de sessão concluída — RF-069; RN-045). */
export const sessionUpdatePayloadSchema = z
  .strictObject({
    started_at: instant.optional(),
    ended_at: instant.optional(),
    rpe: inRange("rpe").nullable().optional(),
    notes: notes.optional(),
    /** RN-045 — "Manter ambas": apenas limpa a marca de possível duplicidade. */
    possible_duplicate_of: z.null().optional(),
  })
  .refine((p) => Object.keys(p).length > 0, { message: "Nada a alterar." });

export type SessionStartPayload = z.infer<typeof sessionStartPayloadSchema>;
export type SetUpsertPayload = z.infer<typeof setUpsertPayloadSchema>;
export type SessionExerciseUpdatePayload = z.infer<typeof sessionExerciseUpdatePayloadSchema>;
export type SessionCompletePayload = z.infer<typeof sessionCompletePayloadSchema>;
export type SessionUpdatePayload = z.infer<typeof sessionUpdatePayloadSchema>;

// ---------- Pré-preenchimento (TRN-04 §3, RF-061) ----------

export interface LoggedSet {
  readonly set_number: number;
  readonly load_kg: number | null;
  readonly reps: number | null;
  readonly duration_s: number | null;
}

export interface Prescription {
  readonly measure_type: MeasureType;
  readonly reps_min: number | null;
  readonly duration_s: number | null;
  readonly suggested_load_kg: number | null;
}

export interface SetValues {
  /** null = carga ainda não informada (exigida antes de confirmar). */
  readonly load_kg: number | null;
  readonly reps: number | null;
  readonly duration_s: number | null;
}

/**
 * Valores iniciais da série `setNumber`: a mesma série da última execução (ou a última série
 * dela, se teve menos); sem histórico, carga sugerida e o mínimo da faixa; sem carga sugerida,
 * carga vazia — ou 0 para peso corporal. Por duração, segundos no lugar de repetições.
 */
export function prefillSet(
  setNumber: number,
  prescription: Prescription,
  isBodyweight: boolean,
  lastExecution: readonly LoggedSet[] | null,
): SetValues {
  const byDuration = prescription.measure_type === "duration";
  const history = [...(lastExecution ?? [])].sort((a, b) => a.set_number - b.set_number);
  const previous = history.find((s) => s.set_number === setNumber) ?? history.at(-1);
  if (previous) {
    return {
      load_kg: previous.load_kg,
      reps: byDuration ? null : (previous.reps ?? prescription.reps_min),
      duration_s: byDuration ? (previous.duration_s ?? prescription.duration_s) : null,
    };
  }
  return {
    load_kg: prescription.suggested_load_kg ?? (isBodyweight ? 0 : null),
    reps: byDuration ? null : prescription.reps_min,
    duration_s: byDuration ? prescription.duration_s : null,
  };
}

// ---------- Resumo (TRN-04 §5, ADR-065) ----------

/** Duração em minutos inteiros (mínimo 1), limitada a 300 (RN-027). */
export function sessionDurationMinutes(startedAt: string, endedAt: string): number {
  const minutes = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000,
  );
  return Math.min(Math.max(minutes, 1), 300);
}

/** Σ carga × repetições; séries por duração ou de carga 0 não somam kg. */
export function sessionVolumeKg(sets: readonly LoggedSet[]): number {
  return sets.reduce((total, s) => total + (s.load_kg ?? 0) * (s.reps ?? 0), 0);
}

/** Sessão em andamento sem nova série há mais de 6 h (RN-012). */
export function isAbandoned(lastActivityAt: string, now: Date): boolean {
  return hoursBetween(new Date(lastActivityAt), now) > SESSION_ABANDON_HOURS;
}

/** Fim do descanso pelo horário de término, imune a segundo plano (CA-062). */
export function restRemainingSeconds(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

// ---------- Edição de sessão (TELA-020; RF-069, RN-018, RN-027, RN-048) ----------

export type SessionTimesIssue = "end_before_start" | "too_long" | "future";

/**
 * Horários editados: término não anterior ao início, duração de até 300 min (RN-027) e nada no
 * futuro além da tolerância do relógio (RN-048).
 */
export function sessionTimesIssue(
  startedAt: string,
  endedAt: string,
  now: Date,
): SessionTimesIssue | null {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (end < start) return "end_before_start";
  if ((end - start) / 60_000 > 300) return "too_long";
  if (end - now.getTime() > CLIENT_CLOCK_TOLERANCE_MINUTES * 60_000) return "future";
  return null;
}
