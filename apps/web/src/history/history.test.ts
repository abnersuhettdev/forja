// Histórico e edição de sessão (TAR-022) sobre IndexedDB simulado.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { completeSession, readSession, saveSet, startSession } from "../execution/session.ts";
import { LocalDatabase } from "../local/db.ts";
import { applyChanges, listOutbox } from "../local/outbox.ts";
import type { VersionView } from "../program/program.ts";
import { readHistory, saveSessionEdit } from "./history.ts";

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

const VERSION: VersionView = {
  id: "versao",
  status: "active",
  revision: 1,
  version_number: 3,
  published_at: "2026-10-20T12:00:00Z",
  updated_at: "2026-10-20T12:00:00Z",
  document: {
    name: "Programa fictício",
    split_type: "ab",
    workouts: [
      {
        id: "treino-a",
        name: "Treino A",
        items: [
          {
            id: "i1",
            exercise_id: "supino",
            measure_type: "reps",
            sets: 3,
            reps_min: 8,
            reps_max: 12,
            duration_s: null,
            rest_s: 90,
            suggested_load_kg: 40,
            notes: null,
          },
        ],
      },
    ],
  },
};

/** Sessão concluída com três séries, já confirmada pelo servidor (revisões 1). */
async function syncedSession(db: LocalDatabase) {
  const id = await startSession(db, USER, VERSION, "treino-a", new Date("2026-10-27T12:00:00Z"));
  const se = (await readSession(db, id))?.exercises[0]?.id ?? "";
  for (const load of [40, 42.5, 45]) {
    const n = ((await readSession(db, id))?.sets.length ?? 0) + 1;
    await saveSet(db, USER, id, {
      session_exercise_id: se,
      set_number: n,
      load_kg: load,
      reps: 10,
      duration_s: null,
    });
  }
  await completeSession(db, USER, id, { rpe: 7, notes: null }, new Date("2026-10-27T13:00:00Z"));
  for (const op of await listOutbox(db)) {
    await applyChanges(db, [
      { op_id: op.op_id, action: "remove", revision: op.type === "session.complete" ? 2 : 1 },
    ]);
  }
  const bundle = await readSession(db, id);
  if (!bundle) throw new Error("sessão ausente");
  return bundle;
}

describe("histórico (TELA-018/019)", () => {
  it("lista sessões do aparelho em ordem e marca as que aguardam envio", async () => {
    const db = database();
    const synced = await syncedSession(db);
    const pending = await startSession(
      db,
      USER,
      VERSION,
      "treino-a",
      new Date("2026-10-28T12:00:00Z"),
    );
    await db
      .table("sessions")
      .put({ ...synced.session, id: "excluida", deleted_at: "2026-10-28T00:00:00Z" });
    const history = await readHistory(db);
    expect(history.bundles.map((b) => b.session.id)).toEqual([synced.session.id, pending]);
    expect(history.bundles[0]?.session.version_number).toBe(3);
    expect([...history.pending]).toEqual([pending]);
  });
});

describe("edição (TELA-020; RF-069)", () => {
  it("horários, PSE e observação vão numa só alteração da sessão", async () => {
    const db = database();
    const bundle = await syncedSession(db);
    const sets = bundle.sets.map((s) => ({ ...s }));
    await saveSessionEdit(db, USER, bundle, {
      startedAt: "2026-10-27T11:50:00.000Z",
      endedAt: bundle.session.ended_at ?? "",
      rpe: 8,
      notes: "Ajuste fictício",
      sets,
    });
    // Nova edição antes do envio reescreve a mesma operação.
    const edited = await readSession(db, bundle.session.id);
    if (!edited) throw new Error("sessão ausente");
    await saveSessionEdit(db, USER, edited, {
      startedAt: edited.session.started_at,
      endedAt: edited.session.ended_at ?? "",
      rpe: 9,
      notes: edited.session.notes,
      sets: edited.sets.map((s) => ({ ...s })),
    });
    const queue = await listOutbox(db);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      type: "session.update",
      base_revision: 2,
      group_id: bundle.session.id,
      payload: { started_at: "2026-10-27T11:50:00.000Z", rpe: 9, notes: "Ajuste fictício" },
    });
    expect((await readSession(db, bundle.session.id))?.session).toMatchObject({
      duration_min: 70,
      rpe: 9,
    });
  });

  it("remove, altera e acrescenta séries com renumeração segura", async () => {
    const db = database();
    const bundle = await syncedSession(db);
    const [first, second, third] = bundle.sets;
    if (!first || !second || !third) throw new Error("séries ausentes");
    const se = first.session_exercise_id;
    await saveSessionEdit(db, USER, bundle, {
      startedAt: bundle.session.started_at,
      endedAt: bundle.session.ended_at ?? "",
      rpe: bundle.session.rpe,
      notes: bundle.session.notes,
      sets: [
        { id: second.id, session_exercise_id: se, load_kg: 42.5, reps: 10, duration_s: null },
        { id: third.id, session_exercise_id: se, load_kg: 47.5, reps: 8, duration_s: null },
        { session_exercise_id: se, load_kg: 20, reps: 15, duration_s: null },
      ],
    });
    const queue = await listOutbox(db);
    expect(queue.map((op) => [op.type, op.base_revision, op.payload.set_number ?? null])).toEqual([
      ["set.delete", 1, null],
      ["set.upsert", 1, 1],
      ["set.upsert", 1, 2],
      ["set.upsert", null, 3],
    ]);
    const after = await readSession(db, bundle.session.id);
    expect(after?.sets.map((s) => [s.set_number, s.load_kg])).toEqual([
      [1, 42.5],
      [2, 47.5],
      [3, 20],
    ]);
    expect(after?.exercises[0]?.planned_sets).toBe(3);
  });

  it("série nunca enviada sai só da fila; sem mudança nada entra na fila", async () => {
    const db = database();
    const bundle = await syncedSession(db);
    const se = bundle.sets[0]?.session_exercise_id ?? "";
    await saveSessionEdit(db, USER, bundle, {
      startedAt: bundle.session.started_at,
      endedAt: bundle.session.ended_at ?? "",
      rpe: bundle.session.rpe,
      notes: bundle.session.notes,
      sets: [
        ...bundle.sets.map((s) => ({ ...s })),
        { session_exercise_id: se, load_kg: 20, reps: 12, duration_s: null },
      ],
    });
    const withNew = await readSession(db, bundle.session.id);
    if (!withNew) throw new Error("sessão ausente");
    await saveSessionEdit(db, USER, withNew, {
      startedAt: withNew.session.started_at,
      endedAt: withNew.session.ended_at ?? "",
      rpe: withNew.session.rpe,
      notes: withNew.session.notes,
      sets: withNew.sets.slice(0, 3).map((s) => ({ ...s })),
    });
    expect(await listOutbox(db)).toHaveLength(0);
  });
});
