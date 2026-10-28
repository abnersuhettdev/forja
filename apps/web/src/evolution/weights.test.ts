// Registro e exclusão de peso no aparelho (TAR-023) sobre IndexedDB simulado.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "../local/db.ts";
import { applyChanges, listOutbox } from "../local/outbox.ts";
import type { WeightRecord } from "../offline/offline.ts";
import { deleteWeight, saveWeight, WeightNotDeletableError } from "./weights.ts";

const USER = "00000000-0000-4000-8000-00000000000a";
const opened: LocalDatabase[] = [];

function database(): LocalDatabase {
  const db = new LocalDatabase(`teste-${crypto.randomUUID()}`);
  opened.push(db);
  return db;
}

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

const weights = (db: LocalDatabase) => db.table<WeightRecord, string>("weights").toArray();

describe("peso no aparelho (API-005, API-006)", () => {
  it("registra e enfileira; excluir antes do envio só tira da fila", async () => {
    const db = database();
    const entry = await saveWeight(db, USER, { measured_on: "2026-10-27", weight_kg: 81.4 });
    expect(await weights(db)).toEqual([entry]);
    expect((await listOutbox(db))[0]).toMatchObject({
      type: "weight.create",
      entity_id: entry.id,
      group_id: entry.id,
      base_revision: null,
      payload: { measured_on: "2026-10-27", weight_kg: 81.4 },
    });
    await deleteWeight(db, USER, entry);
    expect(await weights(db)).toEqual([]);
    expect(await listOutbox(db)).toEqual([]);
  });

  it("confirmado pelo servidor: guarda a revisão e a exclusão vai com ela", async () => {
    const db = database();
    await saveWeight(db, USER, { measured_on: "2026-10-27", weight_kg: 81.4 });
    const [op] = await listOutbox(db);
    await applyChanges(db, [{ op_id: op?.op_id ?? "", action: "remove", revision: 1 }]);
    const [stored] = await weights(db);
    expect(stored?.revision).toBe(1);
    if (!stored) throw new Error("peso ausente");
    await deleteWeight(db, USER, stored);
    expect((await listOutbox(db)).map((o) => [o.type, o.base_revision])).toEqual([
      ["weight.delete", 1],
    ]);
  });

  it("peso de avaliação não é excluído", async () => {
    const db = database();
    const assessment: WeightRecord = {
      id: "avaliacao",
      measured_on: "2026-10-01",
      weight_kg: 85,
      source: "assessment",
      revision: 1,
    };
    await db.table("weights").put(assessment);
    await expect(deleteWeight(db, USER, assessment)).rejects.toThrow(WeightNotDeletableError);
    expect(await weights(db)).toHaveLength(1);
  });
});
