// Validação das operações de sessão (DAD-04 API-008..014).
import { z } from "zod";
import { SESSION_EXERCISE_STATUSES } from "../enums.ts";
import { inRange } from "./schemas.ts";

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
