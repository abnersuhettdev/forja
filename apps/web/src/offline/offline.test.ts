import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import type { CatalogExercise } from "../catalog/catalog.ts";
import { LocalDatabase, writeMeta } from "../local/db.ts";
import type { VersionView } from "../program/program.ts";
import { prefetchImages, programImagePaths, readOfflineData } from "./offline.ts";

const opened: LocalDatabase[] = [];
afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

const version: VersionView = {
  id: "v1",
  status: "active",
  revision: 3,
  version_number: 1,
  published_at: "2026-10-27T10:00:00Z",
  updated_at: "2026-10-27T10:00:00Z",
  document: {
    name: "Programa",
    split_type: null,
    workouts: [
      {
        id: "w1",
        name: "Treino A",
        items: [
          {
            id: "i1",
            exercise_id: "e1",
            measure_type: "reps",
            sets: 3,
            reps_min: 8,
            reps_max: 12,
            duration_s: null,
            rest_s: 90,
            suggested_load_kg: null,
            notes: null,
          },
          {
            id: "i2",
            exercise_id: "e2",
            measure_type: "reps",
            sets: 3,
            reps_min: 8,
            reps_max: 12,
            duration_s: null,
            rest_s: 90,
            suggested_load_kg: null,
            notes: null,
          },
        ],
      },
    ],
  },
};

const image = (path: string) => ({
  id: path,
  path,
  position: 1,
  alt_text: "x",
  license_name: "CC0",
  attribution_text: null,
  width: null,
  height: null,
});

describe("dados offline (UX-08 §6.2)", () => {
  it("lê do aparelho o programa, os pesos e o carimbo de atualização", async () => {
    const db = new LocalDatabase(`teste-${crypto.randomUUID()}`);
    opened.push(db);
    expect(await readOfflineData(db)).toEqual({ program: null, weights: [], updatedAt: undefined });
    await db.table("program").put({ key: "ativo", view: version });
    await db.table("weights").bulkPut([
      { id: "p1", measured_on: "2026-10-01", weight_kg: 81, source: "manual", revision: 1 },
      { id: "p2", measured_on: "2026-10-20", weight_kg: 80, source: "manual", revision: 1 },
    ]);
    await writeMeta(db, "dados_offline_atualizados_em", "2026-10-27T10:00:00.000Z");
    const snapshot = await readOfflineData(db);
    expect(snapshot.program?.document.workouts[0]?.items).toHaveLength(2);
    expect(snapshot.weights.map((w) => w.id)).toEqual(["p2", "p1"]);
    expect(snapshot.updatedAt).toBe("2026-10-27T10:00:00.000Z");
  });

  it("lista as imagens dos exercícios do programa ativo, sem repetir", () => {
    const catalog = [
      { id: "e1", images: [image("/img/a.webp"), image("/img/b.webp")] },
      { id: "e2", images: [image("/img/a.webp")] },
      { id: "e3", images: [image("/img/c.webp")] },
    ] as unknown as CatalogExercise[];
    expect(programImagePaths(version, catalog)).toEqual(["/img/a.webp", "/img/b.webp"]);
    expect(programImagePaths(null, catalog)).toEqual([]);
  });

  it("sem imagens ou sem Cache API, o pré-download não faz nada", async () => {
    expect(await prefetchImages([])).toBe(0);
    expect(await prefetchImages(["/img/a.webp"])).toBe(0);
  });
});
