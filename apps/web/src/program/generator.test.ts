import { describe, expect, it } from "vitest";
import type { GeneratedItem } from "@forja/domain/motor";
import type { EditorDocument, EditorItem } from "./editor.ts";
import { applyRegeneration } from "./generator.ts";

const item = (id: string, overrides: Partial<EditorItem> = {}): EditorItem => ({
  id,
  exercise_id: `ex-${id}`,
  measure_type: "reps",
  sets: 4,
  reps_min: 6,
  reps_max: 10,
  duration_s: null,
  rest_s: 120,
  suggested_load_kg: 40,
  notes: "Antiga",
  ...overrides,
});
const prescription = (overrides: Partial<GeneratedItem> = {}): GeneratedItem => ({
  exercise_id: "novo",
  measure_type: "reps",
  sets: 2,
  reps_min: 12,
  reps_max: 15,
  duration_s: null,
  rest_s: 60,
  suggested_load_kg: null,
  notes: "Nova",
  ...overrides,
});
const doc: EditorDocument = {
  name: "Rotina",
  split_type: "abcd",
  workouts: [
    { id: "a", name: "A", items: [item("1"), item("2"), item("3")] },
    { id: "b", name: "B", items: [item("4")] },
  ],
};
const nameOf = (id: string) => id.toUpperCase();

describe("gerar outro treino no rascunho (RF-119)", () => {
  const { doc: next, summary } = applyRegeneration(
    doc,
    "a",
    [
      { kind: "changed", exercise_id: "novo", prescription: prescription() },
      { kind: "kept" },
      { kind: "removed", reason: { kind: "not_available" } },
    ],
    nameOf,
  );

  it("só mexe no treino escolhido", () => {
    expect(next.workouts[1]).toBe(doc.workouts[1]);
    expect(next.workouts[0]?.items.map((i) => i.exercise_id)).toEqual(["novo", "ex-2"]);
  });

  it("mantém a prescrição e limpa carga e observação do exercício anterior", () => {
    expect(next.workouts[0]?.items[0]).toEqual({
      ...item("1"),
      exercise_id: "novo",
      suggested_load_kg: null,
      notes: "Nova",
    });
  });

  it("a medida acompanha o novo exercício", () => {
    const { doc: swapped } = applyRegeneration(
      doc,
      "b",
      [
        {
          kind: "changed",
          exercise_id: "prancha",
          prescription: prescription({
            measure_type: "duration",
            reps_min: null,
            reps_max: null,
            duration_s: 30,
          }),
        },
      ],
      nameOf,
    );
    expect(swapped.workouts[1]?.items[0]).toMatchObject({
      measure_type: "duration",
      duration_s: 30,
      reps_min: null,
      sets: 4,
      rest_s: 120,
    });
  });

  it("explica o que mudou, o que ficou e o que saiu", () => {
    expect(summary).toEqual({
      changed: [{ from: "EX-1", to: "NOVO" }],
      kept: ["EX-2"],
      removed: [{ name: "EX-3", reason: { kind: "not_available" } }],
    });
  });
});
