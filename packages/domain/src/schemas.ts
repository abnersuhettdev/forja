// Esquemas das estruturas trafegadas (DAD-02), em snake_case como no banco e nos contratos
// (DAD-04). São a definição única usada pelo app (retorno imediato) e pela função de
// sincronização (revalidação) — ARQ-04 §6.
import { z } from "zod";
import {
  ACTIVITY_LEVELS,
  DIFFICULTIES,
  EQUIPMENT,
  EXPERIENCE_LEVELS,
  GOALS,
  LOAD_MARKERS,
  MEASURE_TYPES,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
  PROGRAM_VERSION_STATUSES,
  RESTRICTIONS,
  SESSION_EXERCISE_STATUSES,
  SESSION_STATUSES,
  SEXES,
  SPLIT_TYPES,
  TRAINING_LOCATIONS,
} from "./enums.ts";
import { isWithinRange, RANGES, type RangeName } from "./ranges.ts";
import { isValidTimeZone } from "./time.ts";

/** Número dentro de uma faixa de RN-018/RN-035, com mensagem citando os limites. */
export function inRange(name: RangeName) {
  const range = RANGES[name];
  return z.number().refine((value) => isWithinRange(value, range), {
    message: `Valor fora da faixa permitida (${String(range.min)} a ${String(range.max)}).`,
  });
}

const id = z.uuid();
const localDate = z.iso.date();
const instant = z.iso.datetime();
const text = (max: number) => z.string().trim().max(max);
const revision = z.number().int().min(0);

export const studentSchema = z.object({
  id,
  manager_id: id,
  user_id: id.nullable(),
  is_self: z.boolean(),
  full_name: z.string().trim().min(1).max(120),
  email: z.email().nullable(),
  birth_date: localDate,
  sex: z.enum(SEXES).nullable(),
  height_cm: inRange("heightCm").nullable(),
  timezone: z.string().refine(isValidTimeZone, { message: "Fuso horário inválido." }),
  status: z.enum(["active", "inactive", "invited"]),
});

export const trainingProfileSchema = z.object({
  student_id: id,
  goal: z.enum(GOALS).nullable(),
  goal_weight_kg: inRange("weightKg").nullable(),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullable(),
  activity_level: z.enum(ACTIVITY_LEVELS).nullable(),
  days_per_week: inRange("daysPerWeek").nullable(),
  minutes_per_session: inRange("minutesPerSession").nullable(),
  preferred_weekdays: z.array(z.number().int().min(1).max(7)).max(7).nullable(),
  training_location: z.enum(TRAINING_LOCATIONS).nullable(),
  equipment_codes: z.array(z.enum(EQUIPMENT)).nullable(),
  restrictions_declared: z.enum(["none", "listed"]).nullable(),
  restriction_codes: z.array(z.enum(RESTRICTIONS)).nullable(),
  restrictions_note: text(500).nullable(),
  preferences_note: text(500).nullable(),
  reassessment_interval_days: z.number().int().min(7).max(90),
  reassessment_snooze_until: localDate.nullable(),
  revision,
});

export const assessmentSchema = z.object({
  id,
  student_id: id,
  assessed_on: localDate,
  kind: z.enum(["initial", "periodic"]),
  weight_kg: inRange("weightKg"),
  profile_snapshot: z.record(z.string(), z.unknown()),
  notes: text(500).nullable(),
});

export const weightEntrySchema = z.object({
  id,
  student_id: id,
  measured_on: localDate,
  weight_kg: inRange("weightKg"),
  source: z.enum(["manual", "assessment"]),
  assessment_id: id.nullable(),
});

const circumference = inRange("circumferenceCm").nullable();
export const bodyMeasurementSchema = z.object({
  id,
  student_id: id,
  measured_on: localDate,
  assessment_id: id.nullable(),
  neck_cm: circumference,
  shoulders_cm: circumference,
  chest_cm: circumference,
  waist_cm: circumference,
  abdomen_cm: circumference,
  hips_cm: circumference,
  arm_left_cm: circumference,
  arm_right_cm: circumference,
  forearm_left_cm: circumference,
  forearm_right_cm: circumference,
  thigh_left_cm: circumference,
  thigh_right_cm: circumference,
  calf_left_cm: circumference,
  calf_right_cm: circumference,
  body_fat_pct: inRange("bodyFatPct").nullable(),
});

export const restSettingsSchema = z.object({
  student_id: id,
  default_hours: inRange("restHours"),
  overrides: z.array(
    z.object({ muscle_group_code: z.enum(MUSCLE_GROUPS), hours: inRange("restHours") }),
  ),
});

export const exerciseSchema = z
  .object({
    id,
    origin: z.enum(["imported", "custom"]),
    manager_id: id.nullable(),
    source_id: id.nullable(),
    name: z.string().trim().min(2).max(120),
    instructions: z.array(z.string().trim().min(1)).min(1).max(15),
    safety_tips: z.array(z.string().trim().min(1)).nullable(),
    difficulty: z.enum(DIFFICULTIES),
    measure_type: z.enum(MEASURE_TYPES),
    is_bodyweight: z.boolean(),
    movement_pattern: z.enum(MOVEMENT_PATTERNS),
    load_markers: z.array(z.enum(LOAD_MARKERS)),
    primary_muscles: z.array(z.enum(MUSCLE_GROUPS)).min(1),
    secondary_muscles: z.array(z.enum(MUSCLE_GROUPS)),
    equipment: z.array(z.enum(EQUIPMENT)).min(1),
    active: z.boolean(),
  })
  .superRefine((exercise, ctx) => {
    // RN-037 — origem determina o dono: personalizado tem gestor; importado tem fonte.
    if (exercise.origin === "custom" && exercise.manager_id === null) {
      ctx.addIssue({
        code: "custom",
        path: ["manager_id"],
        message: "Exercício personalizado sem gestor.",
      });
    }
    if (exercise.origin === "imported" && exercise.source_id === null) {
      ctx.addIssue({
        code: "custom",
        path: ["source_id"],
        message: "Exercício importado sem fonte.",
      });
    }
  });

export const workoutItemSchema = z
  .object({
    id,
    position: z.number().int().min(1),
    exercise_id: id,
    measure_type: z.enum(MEASURE_TYPES),
    sets: inRange("prescribedSets"),
    reps_min: inRange("prescribedReps").nullable(),
    reps_max: inRange("prescribedReps").nullable(),
    duration_s: inRange("durationSeconds").nullable(),
    rest_s: inRange("prescribedRestSeconds"),
    suggested_load_kg: inRange("loadKg").nullable(),
    notes: text(500).nullable(),
  })
  .superRefine((item, ctx) => {
    // RN-035 — repetições (mín ≤ máx) ou duração, conforme a medida.
    if (item.measure_type === "reps") {
      if (item.reps_min === null || item.reps_max === null) {
        ctx.addIssue({
          code: "custom",
          path: ["reps_min"],
          message: "Informe a faixa de repetições.",
        });
      } else if (item.reps_min > item.reps_max) {
        ctx.addIssue({
          code: "custom",
          path: ["reps_max"],
          message: "O máximo deve ser maior ou igual ao mínimo.",
        });
      }
    } else if (item.duration_s === null) {
      ctx.addIssue({
        code: "custom",
        path: ["duration_s"],
        message: "Informe a duração em segundos.",
      });
    }
  });

export const workoutSchema = z.object({
  id,
  position: inRange("workoutsPerProgram"),
  name: z.string().trim().min(1).max(60),
  items: z.array(workoutItemSchema),
});

/** Rascunho como documento completo (API-017). A validação de publicação é separada (RN-035). */
export const programDraftSchema = z.object({
  id,
  student_id: id,
  status: z.enum(PROGRAM_VERSION_STATUSES),
  name: z.string().trim().min(1).max(80),
  split_type: z.enum(SPLIT_TYPES).nullable(),
  workouts: z.array(workoutSchema).max(RANGES.workoutsPerProgram.max),
  revision,
});

export const sessionSchema = z
  .object({
    id,
    student_id: id,
    program_version_id: id,
    workout_id: id,
    status: z.enum(SESSION_STATUSES),
    started_at: instant,
    ended_at: instant.nullable(),
    duration_min: inRange("sessionDurationMinutes").nullable(),
    last_activity_at: instant,
    rpe: inRange("rpe").nullable(),
    notes: text(500).nullable(),
    device_id: id,
  })
  .superRefine((session, ctx) => {
    const finished = session.status === "completed" || session.status === "manual";
    if (finished && session.ended_at === null) {
      ctx.addIssue({ code: "custom", path: ["ended_at"], message: "Informe o término da sessão." });
    }
    if (
      session.ended_at !== null &&
      Date.parse(session.ended_at) < Date.parse(session.started_at)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ended_at"],
        message: "O término deve ser após o início.",
      });
    }
  });

export const sessionExerciseSchema = z.object({
  id,
  session_id: id,
  workout_item_id: id.nullable(),
  exercise_id: id,
  position: z.number().int().min(1),
  status: z.enum(SESSION_EXERCISE_STATUSES),
});

export const setLogSchema = z
  .object({
    id,
    session_exercise_id: id,
    set_number: inRange("setNumber"),
    load_kg: inRange("loadKg"),
    reps: inRange("reps").nullable(),
    duration_s: inRange("durationSeconds").nullable(),
    completed_at: instant,
  })
  .refine((set) => (set.reps === null) !== (set.duration_s === null), {
    message: "Informe repetições ou duração.",
    path: ["reps"],
  });

export type Student = z.infer<typeof studentSchema>;
export type TrainingProfile = z.infer<typeof trainingProfileSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type WeightEntry = z.infer<typeof weightEntrySchema>;
export type BodyMeasurement = z.infer<typeof bodyMeasurementSchema>;
export type RestSettings = z.infer<typeof restSettingsSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type WorkoutItem = z.infer<typeof workoutItemSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type ProgramDraft = z.infer<typeof programDraftSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SessionExercise = z.infer<typeof sessionExerciseSchema>;
export type SetLog = z.infer<typeof setLogSchema>;
