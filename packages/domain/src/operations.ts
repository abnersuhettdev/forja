// Conteúdo das operações da fila (DAD-04 §5), validado igual no app e na função de
// sincronização (ADR-034). Os campos reaproveitam os esquemas das entidades.
import { z } from "zod";
import { MUSCLE_GROUPS } from "./enums.ts";
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

export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;
export type ProfileUpdatePayload = z.infer<typeof profileUpdatePayloadSchema>;
export type RestUpdatePayload = z.infer<typeof restUpdatePayloadSchema>;
