// Sincronização (TAR-020) sobre IndexedDB simulado: estados do indicador, aviso de pendências
// antigas e decisões do usuário sobre recusados, conflitos e possíveis duplicidades.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { summarizeOutbox } from "@forja/domain";
import { formatValue } from "../components/ConflictCompare.tsx";
import { LocalDatabase } from "../local/db.ts";
import { applyChanges, listOutbox } from "../local/outbox.ts";
import type { VersionView } from "../program/program.ts";
import { completeSession, readSession, saveSet, startSession } from "../execution/session.ts";
import { readStoredRest, saveRest } from "../training/rest.ts";
import {
  deleteSession,
  discardGroup,
  keepBoth,
  keepLocal,
  keepServer,
  readDuplicates,
  readQueueGroups,
  recreateSession,
} from "./queue.ts";
import { indicatorState, pendingAge } from "./status.ts";

const USER = "00000000-0000-4000-8000-00000000000a";
const STUDENT = "00000000-0000-4000-8000-0000000000a1";
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
  version_number: 1,
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
            sets: 2,
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

async function finishedSession(db: LocalDatabase) {
  const id = await startSession(db, USER, VERSION, "treino-a", new Date("2026-10-27T12:00:00Z"));
  const bundle = await readSession(db, id);
  await saveSet(db, USER, id, {
    session_exercise_id: bundle?.exercises[0]?.id ?? "",
    set_number: 1,
    load_kg: 40,
    reps: 10,
    duration_s: null,
  });
  await completeSession(db, USER, id, { rpe: 7, notes: null }, new Date("2026-10-27T13:00:00Z"));
  return id;
}

/** Marca uma operação com o resultado do servidor (recusa ou conflito). */
async function markResult(
  db: LocalDatabase,
  type: string,
  result: "rejected" | "conflict",
  code: "VALIDATION_FAILED" | "REVISION_CONFLICT" | "ENTITY_DELETED",
  serverRecord?: Record<string, unknown> | null,
) {
  const op = (await listOutbox(db)).find((o) => o.type === type);
  if (!op) throw new Error(`operação ${type} ausente`);
  await applyChanges(db, [
    {
      op_id: op.op_id,
      action: "update",
      state: result,
      attempts: 1,
      next_attempt_at: null,
      last_error: { code },
      ...(serverRecord === undefined ? {} : { server_record: serverRecord }),
    },
  ]);
}

describe("indicador e pendências antigas (CA-092, UX-08 §7)", () => {
  const summary = (overrides: Partial<ReturnType<typeof summarizeOutbox>> = {}) => ({
    ...summarizeOutbox([]),
    ...overrides,
  });

  it("distingue atenção, sem conexão, envio, login, nova tentativa, aguardando e sincronizado", () => {
    expect(indicatorState(summary({ total: 3, attention: 1 }), false).kind).toBe("attention");
    expect(indicatorState(summary({ total: 2 }), false)).toEqual({
      kind: "offline",
      attention: 0,
      pending: 2,
    });
    expect(indicatorState(summary({ total: 1, sending: 1 }), true).kind).toBe("sending");
    expect(indicatorState(summary({ total: 1, awaitingLogin: 1 }), true).kind).toBe(
      "awaiting_login",
    );
    expect(indicatorState(summary({ total: 1, retrying: 1 }), true).kind).toBe("retrying");
    expect(indicatorState(summary({ total: 4 }), true).kind).toBe("waiting");
    expect(indicatorState(summary(), true).kind).toBe("synced");
  });

  it("aviso após 24 h e perigo após 72 h", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    expect(pendingAge(null, now)).toBe("none");
    expect(pendingAge("2026-10-27T00:00:00Z", now)).toBe("none");
    expect(pendingAge("2026-10-26T10:00:00Z", now)).toBe("warning");
    expect(pendingAge("2026-10-24T10:00:00Z", now)).toBe("danger");
  });

  it("resume a fila por estado e a mais antiga", async () => {
    const db = database();
    await finishedSession(db);
    await markResult(db, "set.upsert", "rejected", "VALIDATION_FAILED");
    const ops = await listOutbox(db);
    expect(summarizeOutbox(ops)).toMatchObject({ total: 2, attention: 1, sending: 0 });
    const result = summarizeOutbox(ops, (op) => op.group_id ?? op.entity_id);
    expect(result).toMatchObject({ total: 1, attention: 1, sending: 0 });
    expect(result.oldestCreatedAt).not.toBeNull();
  });
});

describe("grupos e decisões (CA-100, RN-046, RN-051)", () => {
  it("agrupa sessão e séries; descartar sessão que nunca chegou ao servidor a remove", async () => {
    const db = database();
    const id = await finishedSession(db);
    await markResult(db, "session.start", "rejected", "VALIDATION_FAILED");
    const [group] = await readQueueGroups(db);
    expect(group).toMatchObject({ id, kind: "session" });
    expect(group?.ops.map((o) => o.type)).toEqual([
      "session.start",
      "set.upsert",
      "session.complete",
    ]);
    expect(group?.attention?.type).toBe("session.start");
    expect(group?.session?.sets).toHaveLength(1);
    if (!group) throw new Error("grupo ausente");
    await discardGroup(db, group);
    expect(await listOutbox(db)).toHaveLength(0);
    expect(await readSession(db, id)).toBeUndefined();
  });

  it("operações sem grupo (anteriores) se juntam à sessão pela série e pelo exercício", async () => {
    const db = database();
    const id = await finishedSession(db);
    const bundle = await readSession(db, id);
    const set = bundle?.sets[0];
    const exercise = bundle?.exercises[0];
    if (!set || !exercise) throw new Error("sessão ausente");
    await db.outbox.clear();
    const legacy = (type: string, entity: string, payload: Record<string, unknown>) =>
      db.outbox.add({
        op_id: crypto.randomUUID(),
        owner_user_id: USER,
        type,
        entity_id: entity,
        base_revision: 1,
        payload,
        created_at: new Date().toISOString(),
        attempts: 0,
        state: "pending",
        next_attempt_at: null,
        last_error: null,
      });
    await legacy("set.delete", set.id, {});
    await legacy("session_exercise.update", exercise.id, { status: "done" });
    await legacy("set.upsert", crypto.randomUUID(), { session_exercise_id: exercise.id });
    await legacy("set.delete", "serie-desconhecida", {});
    const groups = await readQueueGroups(db);
    expect(groups.map((g) => [g.id, g.ops.length])).toEqual([
      [id, 3],
      ["serie-desconhecida", 1],
    ]);
  });

  it("conflito no descanso: manter deste aparelho reenvia sobre a revisão do servidor", async () => {
    const db = database();
    await db.table("rest").put({
      key: "current",
      student_id: STUDENT,
      default_hours: 48,
      revision: 3,
      overrides: [],
    });
    await saveRest(db, USER, { defaultHours: 54, overrides: {} });
    const server = { student_id: STUDENT, default_hours: 24, revision: 5, overrides: [] };
    await markResult(db, "rest.update", "conflict", "REVISION_CONFLICT", server);
    const [group] = await readQueueGroups(db);
    expect(group).toMatchObject({ kind: "rest", id: "descanso" });
    expect(group?.rest?.default_hours).toBe(54);
    const op = group?.attention;
    if (!op) throw new Error("conflito ausente");
    await keepLocal(db, op);
    expect((await listOutbox(db))[0]).toMatchObject({
      state: "pending",
      base_revision: 5,
      attempts: 0,
      last_error: null,
    });
  });

  it("conflito no descanso: manter a do servidor descarta a local e aplica a do servidor", async () => {
    const db = database();
    await db.table("rest").put({
      key: "current",
      student_id: STUDENT,
      default_hours: 48,
      revision: 3,
      overrides: [],
    });
    await saveRest(db, USER, { defaultHours: 54, overrides: {} });
    const server = { student_id: STUDENT, default_hours: 24, revision: 5, overrides: [] };
    await markResult(db, "rest.update", "conflict", "REVISION_CONFLICT", server);
    const op = (await listOutbox(db))[0];
    if (!op) throw new Error("conflito ausente");
    await keepServer(db, op);
    expect(await listOutbox(db)).toHaveLength(0);
    expect(await readStoredRest(db)).toMatchObject({ default_hours: 24, revision: 5 });
  });

  it("conflito em sessão e série aplica o registro do servidor; sem registro só descarta", async () => {
    const db = database();
    const id = await finishedSession(db);
    for (const op of await listOutbox(db))
      await applyChanges(db, [{ op_id: op.op_id, action: "remove", revision: 1 }]);
    const bundle = await readSession(db, id);
    const set = bundle?.sets[0];
    if (!bundle || !set) throw new Error("sessão ausente");
    await saveSet(db, USER, id, { ...set, load_kg: 45 });
    await markResult(db, "set.upsert", "conflict", "REVISION_CONFLICT", {
      load_kg: 42.5,
      revision: 2,
    });
    const setOp = (await listOutbox(db))[0];
    if (!setOp) throw new Error("conflito ausente");
    await keepServer(db, setOp);
    expect((await readSession(db, id))?.sets[0]).toMatchObject({ load_kg: 42.5, revision: 2 });

    await completeSession(db, USER, id, { rpe: 9, notes: null });
    await markResult(db, "session.complete", "conflict", "REVISION_CONFLICT", {
      rpe: 5,
      revision: 3,
    });
    const sessionOp = (await listOutbox(db))[0];
    if (!sessionOp) throw new Error("conflito ausente");
    await keepServer(db, sessionOp);
    expect((await readSession(db, id))?.session.rpe).toBe(5);

    await db.table("session_exercises").update(bundle.exercises[0]?.id ?? "", { revision: 1 });
    await db.outbox.add({
      op_id: crypto.randomUUID(),
      owner_user_id: USER,
      type: "session_exercise.update",
      entity_id: bundle.exercises[0]?.id ?? "",
      base_revision: 1,
      payload: { status: "skipped" },
      created_at: new Date().toISOString(),
      attempts: 1,
      state: "conflict",
      next_attempt_at: null,
      last_error: { code: "REVISION_CONFLICT" },
      server_record: { status: "done", revision: 2 },
    });
    const exerciseOp = (await listOutbox(db))[0];
    if (!exerciseOp) throw new Error("conflito ausente");
    await keepServer(db, exerciseOp);
    expect((await readSession(db, id))?.exercises[0]).toMatchObject({
      status: "done",
      revision: 2,
    });

    await db.outbox.add({
      op_id: crypto.randomUUID(),
      owner_user_id: USER,
      type: "outro.tipo",
      entity_id: "x",
      base_revision: 1,
      payload: {},
      created_at: new Date().toISOString(),
      attempts: 1,
      state: "conflict",
      next_attempt_at: null,
      last_error: { code: "ENTITY_DELETED" },
      server_record: null,
    });
    const other = (await readQueueGroups(db))[0];
    expect(other).toMatchObject({ kind: "other", session: null, rest: null });
    const otherOp = other?.attention;
    if (!otherOp) throw new Error("conflito ausente");
    await keepServer(db, otherOp);
    await keepLocal(db, { ...otherOp, server_record: null });
    expect(await listOutbox(db)).toHaveLength(0);
  });

  it("registro excluído em outro aparelho: recriar gera sessão nova com tudo na fila", async () => {
    const db = database();
    const id = await finishedSession(db);
    for (const op of await listOutbox(db))
      await applyChanges(db, [{ op_id: op.op_id, action: "remove", revision: 1 }]);
    const original = await readSession(db, id);
    const set = original?.sets[0];
    if (!original || !set) throw new Error("sessão ausente");
    await saveSet(db, USER, id, { ...set, reps: 12 });
    await db.table("session_exercises").update(original.exercises[0]?.id ?? "", { status: "done" });
    await markResult(db, "set.upsert", "conflict", "ENTITY_DELETED", null);
    const [group] = await readQueueGroups(db);
    if (!group) throw new Error("grupo ausente");
    const newId = await recreateSession(db, USER, group);
    expect(newId).not.toBe(id);
    expect(await readSession(db, id)).toBeUndefined();
    const recreated = await readSession(db, newId ?? "");
    expect(recreated?.sets.map((s) => s.reps)).toEqual([12]);
    expect(recreated?.session.revision).toBeUndefined();
    expect((await listOutbox(db)).map((o) => [o.type, o.base_revision])).toEqual([
      ["session.start", null],
      ["set.upsert", null],
      ["session_exercise.update", 1],
      ["session.complete", 1],
    ]);
    expect(await recreateSession(db, USER, { ...group, session: null })).toBeNull();
  });

  it("possível duplicidade: lista o par, mantém ambas ou exclui uma", async () => {
    const db = database();
    const first = await finishedSession(db);
    const second = await finishedSession(db);
    await db.outbox.clear();
    await db.table("sessions").update(first, { revision: 2 });
    await db.table("sessions").update(second, { revision: 2, possible_duplicate_of: first });
    // Marcadas uma para a outra (dados antigos): o par aparece uma vez só.
    await db.table("sessions").update(first, { possible_duplicate_of: second });
    expect(await readDuplicates(db)).toHaveLength(1);
    await db.table("sessions").update(first, { possible_duplicate_of: null });
    const [pair] = await readDuplicates(db);
    expect([pair?.first.session.id, pair?.second.session.id]).toEqual([first, second]);
    if (!pair) throw new Error("par ausente");

    await keepBoth(db, USER, pair);
    expect(await readDuplicates(db)).toHaveLength(0);
    expect((await listOutbox(db))[0]).toMatchObject({
      type: "session.update",
      entity_id: second,
      base_revision: 2,
      payload: { possible_duplicate_of: null },
    });

    await deleteSession(db, USER, pair.first);
    expect(await readSession(db, first)).toBeUndefined();
    expect((await listOutbox(db)).at(-1)).toMatchObject({
      type: "session.delete",
      base_revision: 2,
    });
  });
});

describe("valores na comparação (ConflictCompare)", () => {
  it("formata ajustes, datas, números e ausentes", () => {
    expect(
      formatValue("overrides", [
        { muscle_group_code: "chest", hours: 0 },
        { muscle_group_code: "outro", hours: 12 },
        "x",
      ]),
    ).toBe("Peitoral 0 h, outro 12 h, ");
    expect(formatValue("overrides", [])).toBe("—");
    expect(formatValue("rpe", null)).toBe("—");
    expect(formatValue("load_kg", 42.5)).toBe("42,5");
    expect(formatValue("notes", "texto")).toBe("texto");
    expect(formatValue("started_at", "inválida")).toBe("inválida");
    expect(formatValue("started_at", "2026-10-27T12:00:00Z")).toMatch(/27\/10\/2026/);
    expect(formatValue("status", { a: 1 })).toBe('{"a":1}');
  });
});
