// Programas (RF-020..028, RN-003..005, RN-021, RN-035; DAD-04 API-016..019): conteúdo das
// operações de rascunho e a lista de pendências para publicar, usada pela função de
// sincronização e pelo editor (TAR-016).
import { z } from "zod";
import { RANGES } from "../ranges.ts";
import { programDraftSchema, workoutItemSchema } from "./schemas.ts";

const id = z.uuid();

/** API-016 `draft.create` (entity_id = id da nova versão rascunho). */
export const draftCreatePayloadSchema = z
  .strictObject({
    student_id: id,
    source: z.enum(["empty", "from_version"]),
    from_version_id: id.optional(),
    name: z.string().trim().min(1).max(80).optional(),
  })
  .refine((p) => p.source !== "from_version" || p.from_version_id !== undefined, {
    message: "Informe a versão de origem.",
    path: ["from_version_id"],
  });

/** API-017 `draft.save`: documento completo do rascunho (substituição integral). */
export const draftSavePayloadSchema = programDraftSchema
  .pick({ name: true, split_type: true, workouts: true })
  .strict();

/** API-018 `draft.publish` e API-019 `draft.discard`: só `base_revision`. */
export const emptyPayloadSchema = z.strictObject({});

export type DraftCreatePayload = z.infer<typeof draftCreatePayloadSchema>;
export type DraftSavePayload = z.infer<typeof draftSavePayloadSchema>;
export type DraftItem = z.infer<typeof workoutItemSchema>;

export type DraftIssue =
  | { readonly code: "no_workouts" }
  | { readonly code: "too_many_workouts"; readonly count: number }
  | { readonly code: "empty_workout"; readonly workout_id: string; readonly workout_name: string }
  | {
      readonly code: "inactive_exercise";
      readonly workout_id: string;
      readonly item_id: string;
      readonly exercise_id: string;
    }
  | {
      readonly code: "invalid_item";
      readonly workout_id: string;
      readonly item_id: string;
    };

export interface DraftForIssues {
  readonly workouts: readonly {
    readonly id: string;
    readonly name: string;
    readonly items: readonly (DraftItem & { readonly id: string })[];
  }[];
}

/**
 * Pendências que impedem publicar (RN-035, RN-021), na ordem em que aparecem no editor.
 * Lista vazia = pode publicar. `isActive` diz se o exercício está ativo.
 */
export function draftIssues(
  draft: DraftForIssues,
  isActive: (exerciseId: string) => boolean,
): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const count = draft.workouts.length;
  if (count < RANGES.workoutsPerProgram.min) issues.push({ code: "no_workouts" });
  if (count > RANGES.workoutsPerProgram.max) issues.push({ code: "too_many_workouts", count });
  for (const workout of draft.workouts) {
    if (workout.items.length === 0) {
      issues.push({ code: "empty_workout", workout_id: workout.id, workout_name: workout.name });
    }
    for (const item of workout.items) {
      if (!workoutItemSchema.safeParse(item).success) {
        issues.push({ code: "invalid_item", workout_id: workout.id, item_id: item.id });
      }
      if (!isActive(item.exercise_id)) {
        issues.push({
          code: "inactive_exercise",
          workout_id: workout.id,
          item_id: item.id,
          exercise_id: item.exercise_id,
        });
      }
    }
  }
  return issues;
}
