import { describe, expect, it } from "vitest";
import type { CatalogExercise } from "../catalog/catalog.ts";
import {
  addItem,
  addWorkout,
  defaultItem,
  issueMessages,
  itemSummary,
  moveIndex,
  moveItem,
  moveWorkout,
  nextWorkoutName,
  removeItem,
  removeWorkout,
  renameWorkout,
  suggestAlternatives,
  toSavePayload,
  updateItem,
  type EditorDocument,
} from "./editor.ts";

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function exercise(n: number, overrides: Partial<CatalogExercise> = {}): CatalogExercise {
  return {
    id: uid(1000 + n),
    origin: "imported",
    name: `Exercício ${String(n)}`,
    instructions: ["a"],
    safety_tips: [],
    difficulty: "beginner",
    measure_type: "reps",
    is_bodyweight: false,
    movement_pattern: "h_push",
    edited_by_manager_at: null,
    source_ref: null,
    load_markers: [],
    contraindications: [],
    primary: ["chest"],
    secondary: [],
    equipment: ["barbell"],
    images: [],
    source: null,
    ...overrides,
  };
}

const empty: EditorDocument = { name: "Programa", split_type: "ab", workouts: [] };

describe("operações do rascunho (RF-020, RF-024)", () => {
  it("adiciona treinos com nomes livres, renomeia, move e remove", () => {
    let doc = addWorkout(empty, uid(1));
    doc = addWorkout(doc, uid(2));
    expect(doc.workouts.map((w) => w.name)).toEqual(["Treino A", "Treino B"]);
    doc = renameWorkout(doc, uid(1), "A — Peito");
    expect(nextWorkoutName(doc)).toBe("Treino A");
    doc = moveWorkout(doc, 1, 0);
    expect(doc.workouts.map((w) => w.id)).toEqual([uid(2), uid(1)]);
    expect(removeWorkout(doc, uid(2)).workouts).toHaveLength(1);
  });

  it("adiciona, edita, reordena e remove exercício com desfazer na posição original", () => {
    let doc = addWorkout(empty, uid(1));
    doc = addItem(doc, uid(1), defaultItem(uid(10), exercise(1)));
    doc = addItem(doc, uid(1), defaultItem(uid(11), exercise(2, { measure_type: "duration" })));
    doc = addItem(doc, uid(1), defaultItem(uid(12), exercise(3)));
    doc = updateItem(doc, uid(1), { ...defaultItem(uid(10), exercise(1)), sets: 4 });
    doc = moveItem(doc, uid(1), 2, 0);
    expect(doc.workouts[0]?.items.map((i) => i.id)).toEqual([uid(12), uid(10), uid(11)]);
    const { doc: without, undo } = removeItem(doc, uid(1), uid(10));
    expect(without.workouts[0]?.items.map((i) => i.id)).toEqual([uid(12), uid(11)]);
    expect(undo(without).workouts[0]?.items.map((i) => i.id)).toEqual([uid(12), uid(10), uid(11)]);
    expect(undo(without).workouts[0]?.items[1]?.sets).toBe(4);
  });

  it("moveIndex ignora posições fora da lista", () => {
    expect(moveIndex([1, 2, 3], 0, 5)).toEqual([1, 2, 3]);
    expect(moveIndex([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
  });
});

describe("resumo e conteúdo da operação", () => {
  it("resume prescrições por repetições e por duração", () => {
    expect(itemSummary(defaultItem(uid(1), exercise(1)))).toBe("3 × 8–12 · descanso 90 s");
    expect(itemSummary(defaultItem(uid(2), exercise(2, { measure_type: "duration" })))).toBe(
      "3 × 30 s · descanso 90 s",
    );
    expect(itemSummary({ ...defaultItem(uid(3), exercise(3)), reps_min: 10, reps_max: 10 })).toBe(
      "3 × 10 · descanso 90 s",
    );
  });

  it("numera posições na ordem atual e preenche nomes vazios", () => {
    let doc = addWorkout({ ...empty, name: "  " }, uid(1));
    doc = renameWorkout(doc, uid(1), " ");
    doc = addItem(doc, uid(1), defaultItem(uid(10), exercise(1)));
    const payload = toSavePayload(doc);
    expect(payload.name).toBe("Meu programa");
    expect(payload.workouts[0]).toMatchObject({ position: 1, name: "Treino 1" });
    expect(payload.workouts[0]?.items[0]).toMatchObject({ position: 1, sets: 3 });
  });
});

describe("alternativas (TRN-03 §7) e pendências", () => {
  it("sugere ativos do mesmo padrão com grupo primário em comum", () => {
    const base = exercise(1);
    const catalog = [
      base,
      exercise(2, { name: "B alternativa" }),
      exercise(3, { name: "A alternativa" }),
      exercise(4, { movement_pattern: "squat" }),
      exercise(5, { primary: ["triceps"] }),
    ];
    expect(suggestAlternatives(catalog, base).map((e) => e.name)).toEqual([
      "A alternativa",
      "B alternativa",
    ]);
  });

  it("traduz pendências com atalho para o treino ou exercício", () => {
    const doc = addWorkout(empty, uid(1));
    expect(
      issueMessages(
        [
          { code: "no_workouts" },
          { code: "too_many_workouts", count: 8 },
          { code: "empty_workout", workout_id: uid(1), workout_name: "Treino A" },
          { code: "inactive_exercise", workout_id: uid(1), item_id: uid(5), exercise_id: uid(9) },
          { code: "invalid_item", workout_id: uid(1), item_id: uid(6) },
        ],
        doc,
        () => "Supino declinado",
      ).map((m) => m.text),
    ).toEqual([
      "Adicione ao menos um treino.",
      "Use no máximo 7 treinos (há 8).",
      "Treino A não tem exercícios.",
      "Supino declinado está desativado — substitua.",
      "Confira a prescrição de um exercício em Treino A.",
    ]);
  });
});
