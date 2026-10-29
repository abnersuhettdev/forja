// Conteúdo das operações da fila (DAD-04 §5), validado igual no app e na função de
// sincronização (ADR-034). Os campos reaproveitam os esquemas das entidades.
import { z } from "zod";
import {
  DIFFICULTIES,
  EQUIPMENT,
  MEASURE_TYPES,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
} from "../enums.ts";
import { inRange, studentSchema, trainingProfileSchema } from "./schemas.ts";

const id = z.uuid();

/** Campos do perfil de treinamento que o usuário informa (sem revisão nem controle). */
export const profileFieldsSchema = trainingProfileSchema.pick({
  goal: true,
  goal_weight_kg: true,
  experience_level: true,
  activity_level: true,
  days_per_week: true,
  minutes_per_session: true,
  preferred_weekdays: true,
  training_location: true,
  equipment_codes: true,
  restrictions_declared: true,
  restriction_codes: true,
  restrictions_note: true,
  preferences_note: true,
});

/** Campos cadastrais que o próprio aluno informa. */
export const studentFieldsSchema = studentSchema.pick({
  full_name: true,
  birth_date: true,
  sex: true,
  height_cm: true,
  timezone: true,
});

/** API-002 `onboarding.complete` (entity_id = id do aluno, gerado no aparelho). */
export const onboardingPayloadSchema = z.strictObject({
  student: studentFieldsSchema.strict(),
  profile: profileFieldsSchema.strict(),
  assessment_id: id,
  weight_entry_id: id,
  assessed_on: z.iso.date(),
  weight_kg: inRange("weightKg"),
});

/** API-003 `profile.update` (entity_id = id do aluno; base_revision = revisão do perfil). */
export const profileUpdatePayloadSchema = z
  .strictObject({
    student: studentFieldsSchema.omit({ birth_date: true }).partial().strict().optional(),
    profile: profileFieldsSchema.partial().strict().optional(),
  })
  .refine((p) => p.student !== undefined || p.profile !== undefined, {
    message: "Nada a alterar.",
  });

/** API-007 `rest.update` (entity_id = id do aluno; base_revision = revisão do descanso). */
export const restUpdatePayloadSchema = z.strictObject({
  default_hours: inRange("restHours"),
  overrides: z
    .array(
      z.strictObject({ muscle_group_code: z.enum(MUSCLE_GROUPS), hours: inRange("restHours") }),
    )
    .max(MUSCLE_GROUPS.length)
    .refine((list) => new Set(list.map((o) => o.muscle_group_code)).size === list.length, {
      message: "Grupo muscular repetido.",
    }),
});

const step = z.string().trim().min(3).max(240);
const uniqueList = <T extends z.ZodType>(item: T) =>
  z.array(item).refine((list) => new Set(list).size === list.length, {
    message: "Valor repetido.",
  });

/**
 * API-020 `exercise.create` / `exercise.update` de exercício **personalizado** (RF-032,
 * TELA-036). entity_id = id do exercício, gerado no aparelho. O padrão de movimento é
 * obrigatório pelo modelo (TRN-03 §4).
 */
export const customExercisePayloadSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(120),
    primary_muscles: uniqueList(z.enum(MUSCLE_GROUPS)).min(1),
    secondary_muscles: uniqueList(z.enum(MUSCLE_GROUPS)),
    equipment: uniqueList(z.enum(EQUIPMENT)).min(1),
    difficulty: z.enum(DIFFICULTIES),
    measure_type: z.enum(MEASURE_TYPES),
    movement_pattern: z.enum(MOVEMENT_PATTERNS),
    instructions: z.array(step).min(1).max(15),
    safety_tips: z.array(step).max(15),
  })
  .refine((p) => !p.primary_muscles.some((m) => p.secondary_muscles.includes(m)), {
    message: "Grupo repetido como principal e auxiliar.",
    path: ["secondary_muscles"],
  });

export type CustomExercisePayload = z.infer<typeof customExercisePayloadSchema>;

/**
 * API-020 `exercise.update` de exercício **importado** (RF-032, ADR-091): só nome,
 * instruções e dicas; o texto da fonte é preservado pelo banco.
 */
export const importedCorrectionPayloadSchema = z.strictObject({
  name: z.string().trim().min(2).max(120),
  instructions: z.array(step).min(1).max(15),
  safety_tips: z.array(step).max(15),
});

export type ImportedCorrectionPayload = z.infer<typeof importedCorrectionPayloadSchema>;

/**
 * API-004 `assessment.create` (entity_id = id da avaliação, gerado no aparelho; RF-016,
 * RN-014). O registro de peso de origem "avaliação" usa `weight_entry_id`; a fotografia do
 * perfil é tirada pelo servidor no momento do registro.
 */
export const assessmentCreatePayloadSchema = z.strictObject({
  student_id: id,
  assessed_on: z.iso.date(),
  weight_kg: inRange("weightKg"),
  notes: z.string().trim().max(500).nullable(),
  weight_entry_id: id,
});

export type AssessmentCreatePayload = z.infer<typeof assessmentCreatePayloadSchema>;
export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;
export type ProfileUpdatePayload = z.infer<typeof profileUpdatePayloadSchema>;
export type RestUpdatePayload = z.infer<typeof restUpdatePayloadSchema>;
