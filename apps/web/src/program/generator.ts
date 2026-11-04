// Liga o editor ao motor (TRN-02): converte o catálogo do app e aplica o "gerar outro treino"
// ao documento do rascunho (RF-119). Fora do pacote inicial: só as telas de gestão importam.
import type { MotorExercise, RegenerationOutcome, RegenerationReason } from "@forja/domain/motor";
import type { CatalogExercise } from "../catalog/catalog.ts";
import type { EditorDocument, EditorItem } from "./editor.ts";

export function toMotorExercise(exercise: CatalogExercise): MotorExercise {
  return {
    id: exercise.id,
    code: exercise.source_ref ?? exercise.id,
    name: exercise.name,
    difficulty: exercise.difficulty,
    measure_type: exercise.measure_type,
    movement_pattern: exercise.movement_pattern,
    load_markers: exercise.load_markers,
    contraindications: exercise.contraindications,
    primary: exercise.primary,
    secondary: exercise.secondary,
    equipment: exercise.equipment,
  };
}

/** O que aconteceu no treino, para mostrar o motivo de cada mudança. */
export interface RegenerationSummary {
  readonly changed: readonly { readonly from: string; readonly to: string }[];
  readonly kept: readonly string[];
  readonly removed: readonly { readonly name: string; readonly reason: RegenerationReason }[];
}

/**
 * Aplica o resultado ao treino, sem tocar nos outros. Mantém séries, repetições e descanso do
 * item, que são a prescrição da pessoa; a medida e a carga acompanham o novo exercício.
 */
export function applyRegeneration(
  doc: EditorDocument,
  workoutId: string,
  outcomes: readonly RegenerationOutcome[],
  nameOf: (id: string) => string,
): { doc: EditorDocument; summary: RegenerationSummary } {
  const changed: { from: string; to: string }[] = [];
  const kept: string[] = [];
  const removed: { name: string; reason: RegenerationReason }[] = [];
  const next = (item: EditorItem, index: number): EditorItem[] => {
    const outcome = outcomes[index];
    if (outcome === undefined || outcome.kind === "kept") {
      kept.push(nameOf(item.exercise_id));
      return [item];
    }
    if (outcome.kind === "removed") {
      removed.push({ name: nameOf(item.exercise_id), reason: outcome.reason });
      return [];
    }
    changed.push({ from: nameOf(item.exercise_id), to: nameOf(outcome.exercise_id) });
    const { prescription } = outcome;
    const sameMeasure = prescription.measure_type === item.measure_type;
    return [
      {
        ...item,
        exercise_id: outcome.exercise_id,
        measure_type: prescription.measure_type,
        reps_min: sameMeasure ? item.reps_min : prescription.reps_min,
        reps_max: sameMeasure ? item.reps_max : prescription.reps_max,
        duration_s: sameMeasure ? item.duration_s : prescription.duration_s,
        // Carga e observação eram do exercício anterior (RN-026).
        suggested_load_kg: null,
        notes: prescription.notes,
      },
    ];
  };
  return {
    doc: {
      ...doc,
      workouts: doc.workouts.map((w) =>
        w.id === workoutId ? { ...w, items: w.items.flatMap(next) } : w,
      ),
    },
    summary: { changed, kept, removed },
  };
}
