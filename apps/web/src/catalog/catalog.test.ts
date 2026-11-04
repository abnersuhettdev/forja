import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "../local/db.ts";
import {
  cacheCatalog,
  filterCatalog,
  NO_FILTERS,
  normalizeText,
  readCachedCatalog,
  toCatalogExercise,
  type CatalogExercise,
} from "./catalog.ts";

function exercise(overrides: Partial<CatalogExercise>): CatalogExercise {
  return {
    id: crypto.randomUUID(),
    origin: "imported",
    name: "Exercício",
    instructions: ["Passo"],
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
    equipment: ["barbell", "bench"],
    images: [],
    source: null,
    ...overrides,
  };
}

const LIST = [
  exercise({ name: "Supino reto com barra" }),
  exercise({ name: "Supino inclinado com halteres", equipment: ["dumbbell", "bench"] }),
  exercise({ name: "Supino fechado com barra", primary: ["triceps"], secondary: ["chest"] }),
  exercise({ name: "Agachamento livre", primary: ["quadriceps"], difficulty: "intermediate" }),
  exercise({ name: "Meu exercício", origin: "custom", primary: ["quadriceps"] }),
];

describe("filterCatalog (RF-030, CA-030)", () => {
  it("busca sem acentos nem caixa, com todas as palavras, ordenando por nome", () => {
    expect(normalizeText("  SUPÍNO Reto ")).toBe("supino reto");
    expect(filterCatalog(LIST, { ...NO_FILTERS, query: "SUPINO" }).map((e) => e.name)).toEqual([
      "Supino fechado com barra",
      "Supino inclinado com halteres",
      "Supino reto com barra",
    ]);
    expect(filterCatalog(LIST, { ...NO_FILTERS, query: "barra supino" })).toHaveLength(2);
    expect(filterCatalog(LIST, { ...NO_FILTERS, query: "agachámento" })).toHaveLength(1);
  });

  it("combina busca com grupo primário, equipamento, dificuldade e origem", () => {
    const names = (f: Partial<typeof NO_FILTERS>) =>
      filterCatalog(LIST, { ...NO_FILTERS, ...f }).map((e) => e.name);
    expect(names({ query: "supino", muscle: "chest", equipment: "barbell" })).toEqual([
      "Supino reto com barra",
    ]);
    expect(names({ muscle: "quadriceps", difficulty: "intermediate" })).toEqual([
      "Agachamento livre",
    ]);
    expect(names({ origin: "custom" })).toEqual(["Meu exercício"]);
    expect(names({ query: "inexistente" })).toEqual([]);
  });
});

describe("leitura e cópia local", () => {
  const opened: LocalDatabase[] = [];
  afterEach(async () => {
    for (const db of opened.splice(0)) {
      db.close();
      await Dexie.delete(db.name);
    }
  });

  it("converte a linha da API e guarda a cópia substituindo a anterior", async () => {
    const converted = toCatalogExercise({
      id: "e1",
      origin: "imported",
      name: "Remada",
      instructions: ["a"],
      safety_tips: null,
      difficulty: "beginner",
      measure_type: "reps",
      is_bodyweight: false,
      movement_pattern: "h_pull",
      edited_by_manager_at: null,
      exercise_muscles: [
        { muscle_group_code: "lats", role: "secondary" },
        { muscle_group_code: "upper_back", role: "primary" },
      ],
      exercise_equipment: [{ equipment_code: "cable" }],
      source_ref: null,
      load_markers: [],
      exercise_contraindications: [{ restriction_code: "knee" }],
      exercise_images: [],
      content_sources: null,
    });
    expect(converted).toMatchObject({
      contraindications: ["knee"],
      primary: ["upper_back"],
      secondary: ["lats"],
      safety_tips: [],
    });

    const db = new LocalDatabase(`teste-${crypto.randomUUID()}`);
    opened.push(db);
    await cacheCatalog(
      db,
      [converted, exercise({ name: "Outro" })],
      new Date("2026-10-27T10:00:00Z"),
    );
    await cacheCatalog(db, [converted], new Date("2026-10-27T11:00:00Z"));
    const cached = await readCachedCatalog(db);
    expect(cached.exercises.map((e) => e.name)).toEqual(["Remada"]);
    expect(cached.updatedAt).toBe("2026-10-27T11:00:00.000Z");
  });
});
