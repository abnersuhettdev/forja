import { describe, expect, it } from "vitest";
import {
  draftCreatePayloadSchema,
  draftIssues,
  draftSavePayloadSchema,
  type DraftForIssues,
} from "../src/index.ts";

const ACTIVE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INACTIVE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
/** Identificador UUID estável a partir de um rótulo curto (o esquema exige UUID). */
const uid = (label: string) => `00000000-0000-4000-8000-${label.padStart(12, "0")}`;

const item = (label: string, exercise = ACTIVE) => ({
  id: uid(label),
  position: 1,
  exercise_id: exercise,
  measure_type: "reps" as const,
  sets: 3,
  reps_min: 8,
  reps_max: 12,
  duration_s: null,
  rest_s: 90,
  suggested_load_kg: null,
  notes: null,
});

const active = (id: string) => id !== INACTIVE;

describe("draftIssues (RN-035, RN-021)", () => {
  it("rascunho válido não tem pendências", () => {
    const draft: DraftForIssues = { workouts: [{ id: "w1", name: "A", items: [item("1")] }] };
    expect(draftIssues(draft, active)).toEqual([]);
  });

  it("aponta ausência de treinos, excesso, treino vazio, item inválido e exercício desativado", () => {
    expect(draftIssues({ workouts: [] }, active)).toEqual([{ code: "no_workouts" }]);
    const eight = Array.from({ length: 8 }, (_, i) => ({
      id: `w${String(i)}`,
      name: `T${String(i)}`,
      items: [item(String(i + 10))],
    }));
    expect(draftIssues({ workouts: eight }, active)).toEqual([
      { code: "too_many_workouts", count: 8 },
    ]);
    const draft: DraftForIssues = {
      workouts: [
        { id: "w1", name: "Vazio", items: [] },
        {
          id: "w2",
          name: "B",
          items: [{ ...item("2"), reps_min: 15 }, item("3", INACTIVE)],
        },
      ],
    };
    expect(draftIssues(draft, active)).toEqual([
      { code: "empty_workout", workout_id: "w1", workout_name: "Vazio" },
      { code: "invalid_item", workout_id: "w2", item_id: uid("2") },
      { code: "inactive_exercise", workout_id: "w2", item_id: uid("3"), exercise_id: INACTIVE },
    ]);
  });
});

describe("conteúdo das operações de rascunho (API-016, API-017)", () => {
  const student = "11111111-1111-4111-8111-111111111111";

  it("criar a partir de versão exige a versão de origem", () => {
    expect(
      draftCreatePayloadSchema.safeParse({ student_id: student, source: "empty" }).success,
    ).toBe(true);
    expect(
      draftCreatePayloadSchema.safeParse({ student_id: student, source: "from_version" }).success,
    ).toBe(false);
  });

  it("salvar aceita documento completo e recusa campos de controle", () => {
    const doc = { name: "P", split_type: null, workouts: [] };
    expect(draftSavePayloadSchema.safeParse(doc).success).toBe(true);
    expect(draftSavePayloadSchema.safeParse({ ...doc, status: "active" }).success).toBe(false);
  });
});
