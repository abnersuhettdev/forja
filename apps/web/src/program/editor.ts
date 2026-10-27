// Documento do rascunho no editor (TELA-031, RF-020, RF-024): operações puras sobre treinos e
// exercícios prescritos, resumo da prescrição, sugestão de alternativas (TRN-03 §7) e textos
// das pendências de publicação (RN-035, RN-021).
import {
  draftSavePayloadSchema,
  type DraftIssue,
  type DraftSavePayload,
  type MeasureType,
  type SplitType,
} from "@forja/domain";
import type { CatalogExercise } from "../catalog/catalog.ts";

export interface EditorItem {
  readonly id: string;
  readonly exercise_id: string;
  readonly measure_type: MeasureType;
  readonly sets: number;
  readonly reps_min: number | null;
  readonly reps_max: number | null;
  readonly duration_s: number | null;
  readonly rest_s: number;
  readonly suggested_load_kg: number | null;
  readonly notes: string | null;
}

export interface EditorWorkout {
  readonly id: string;
  readonly name: string;
  readonly items: readonly EditorItem[];
}

export interface EditorDocument {
  readonly name: string;
  readonly split_type: SplitType | null;
  readonly workouts: readonly EditorWorkout[];
}

const LETTERS = "ABCDEFG";

/** Próximo nome livre "Treino A", "Treino B"… */
export function nextWorkoutName(doc: EditorDocument): string {
  const used = new Set(doc.workouts.map((w) => w.name));
  for (const letter of LETTERS) {
    const name = `Treino ${letter}`;
    if (!used.has(name)) return name;
  }
  return `Treino ${String(doc.workouts.length + 1)}`;
}

export function addWorkout(doc: EditorDocument, id: string): EditorDocument {
  return { ...doc, workouts: [...doc.workouts, { id, name: nextWorkoutName(doc), items: [] }] };
}

function mapWorkout(
  doc: EditorDocument,
  workoutId: string,
  change: (w: EditorWorkout) => EditorWorkout,
): EditorDocument {
  return { ...doc, workouts: doc.workouts.map((w) => (w.id === workoutId ? change(w) : w)) };
}

export const renameWorkout = (doc: EditorDocument, workoutId: string, name: string) =>
  mapWorkout(doc, workoutId, (w) => ({ ...w, name }));

/** Move um elemento da posição `from` para `to` (arrastar ou botões subir/descer). */
export function moveIndex<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return [...list];
  }
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  if (moved !== undefined) copy.splice(to, 0, moved);
  return copy;
}

export function moveWorkout(doc: EditorDocument, from: number, to: number): EditorDocument {
  return { ...doc, workouts: moveIndex(doc.workouts, from, to) };
}

export function removeWorkout(doc: EditorDocument, workoutId: string): EditorDocument {
  return { ...doc, workouts: doc.workouts.filter((w) => w.id !== workoutId) };
}

export function addItem(doc: EditorDocument, workoutId: string, item: EditorItem): EditorDocument {
  return mapWorkout(doc, workoutId, (w) => ({ ...w, items: [...w.items, item] }));
}

export function updateItem(doc: EditorDocument, workoutId: string, item: EditorItem) {
  return mapWorkout(doc, workoutId, (w) => ({
    ...w,
    items: w.items.map((i) => (i.id === item.id ? item : i)),
  }));
}

export function moveItem(doc: EditorDocument, workoutId: string, from: number, to: number) {
  return mapWorkout(doc, workoutId, (w) => ({ ...w, items: moveIndex(w.items, from, to) }));
}

/** Remove o item e devolve como desfazer (Snackbar "Desfazer" — UX-06 §6). */
export function removeItem(
  doc: EditorDocument,
  workoutId: string,
  itemId: string,
): { doc: EditorDocument; undo: (current: EditorDocument) => EditorDocument } {
  const workout = doc.workouts.find((w) => w.id === workoutId);
  const index = workout?.items.findIndex((i) => i.id === itemId) ?? -1;
  const removed = index >= 0 ? workout?.items[index] : undefined;
  const next = mapWorkout(doc, workoutId, (w) => ({
    ...w,
    items: w.items.filter((i) => i.id !== itemId),
  }));
  return {
    doc: next,
    undo: (current) =>
      removed === undefined
        ? current
        : mapWorkout(current, workoutId, (w) => {
            const items = [...w.items];
            items.splice(Math.min(index, items.length), 0, removed);
            return { ...w, items };
          }),
  };
}

/** Prescrição padrão ao adicionar um exercício (ajustável em TELA-032). */
export function defaultItem(id: string, exercise: CatalogExercise): EditorItem {
  const duration = exercise.measure_type === "duration";
  return {
    id,
    exercise_id: exercise.id,
    measure_type: exercise.measure_type,
    sets: 3,
    reps_min: duration ? null : 8,
    reps_max: duration ? null : 12,
    duration_s: duration ? 30 : null,
    rest_s: 90,
    suggested_load_kg: null,
    notes: null,
  };
}

/** "3 × 8–12 · descanso 90 s" ou "3 × 30 s · descanso 60 s" (UX-02 §8.4). */
export function itemSummary(
  item: Pick<
    EditorItem,
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

/** Conteúdo da operação draft.save, com posições na ordem atual (DAD-04 API-017). */
export function toSavePayload(doc: EditorDocument): DraftSavePayload {
  return draftSavePayloadSchema.parse({
    name: doc.name.trim() === "" ? "Meu programa" : doc.name.trim(),
    split_type: doc.split_type,
    workouts: doc.workouts.map((w, index) => ({
      id: w.id,
      position: index + 1,
      name: w.name.trim() === "" ? `Treino ${String(index + 1)}` : w.name.trim(),
      items: w.items.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })),
    })),
  });
}

/**
 * Alternativas sugeridas (TRN-03 §7): ativos do mesmo padrão de movimento com ao menos um
 * grupo primário em comum, ordenados por nome.
 */
export function suggestAlternatives(
  catalog: readonly CatalogExercise[],
  exercise: CatalogExercise,
): CatalogExercise[] {
  return catalog
    .filter(
      (e) =>
        e.id !== exercise.id &&
        e.movement_pattern === exercise.movement_pattern &&
        e.primary.some((m) => exercise.primary.includes(m)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export interface IssueMessage {
  readonly text: string;
  /** Onde corrigir (atalho na lista de pendências — UX-04 §3). */
  readonly workoutId?: string;
  readonly itemId?: string;
}

/** Textos das pendências (TELA-031: "Treino C não tem exercícios"…). */
export function issueMessages(
  issues: readonly DraftIssue[],
  doc: EditorDocument,
  exerciseName: (id: string) => string,
): IssueMessage[] {
  const workoutName = (id: string) => doc.workouts.find((w) => w.id === id)?.name ?? "Treino";
  return issues.map((issue) => {
    switch (issue.code) {
      case "no_workouts":
        return { text: "Adicione ao menos um treino." };
      case "too_many_workouts":
        return { text: `Use no máximo 7 treinos (há ${String(issue.count)}).` };
      case "empty_workout":
        return {
          text: `${workoutName(issue.workout_id)} não tem exercícios.`,
          workoutId: issue.workout_id,
        };
      case "inactive_exercise":
        return {
          text: `${exerciseName(issue.exercise_id)} está desativado — substitua.`,
          workoutId: issue.workout_id,
          itemId: issue.item_id,
        };
      case "invalid_item":
        return {
          text: `Confira a prescrição de um exercício em ${workoutName(issue.workout_id)}.`,
          workoutId: issue.workout_id,
          itemId: issue.item_id,
        };
    }
  });
}
