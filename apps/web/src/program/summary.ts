// Resumo da prescrição de um exercício (UX-02 §8.4), usado em Hoje, na execução e no editor.
// Fica fora de editor.ts para não levar a validação do rascunho ao JS inicial (PR-DES-03).
import type { MeasureType } from "@forja/domain";

/** Campos da prescrição usados no resumo. */
export interface PrescribedItem {
  readonly measure_type: MeasureType;
  readonly sets: number;
  readonly reps_min: number | null;
  readonly reps_max: number | null;
  readonly duration_s: number | null;
  readonly rest_s: number;
}

/** "3 × 8–12 · descanso 90 s" ou "3 × 30 s · descanso 60 s" (UX-02 §8.4). */
export function itemSummary(
  item: Pick<
    PrescribedItem,
    "measure_type" | "sets" | "reps_min" | "reps_max" | "duration_s" | "rest_s"
  >,
): string {
  const volume =
    item.measure_type === "duration"
      ? `${String(item.duration_s ?? 0)} s`
      : item.reps_min === item.reps_max
        ? String(item.reps_min ?? 0)
        : `${String(item.reps_min ?? 0)}–${String(item.reps_max ?? 0)}`;
  return `${String(item.sets)} × ${volume} · descanso ${String(item.rest_s)} s`;
}
