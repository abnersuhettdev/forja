// Sessão no aparelho e fila (TAR-019) sobre IndexedDB simulado: cada ação grava e enfileira
// junto; o que nunca chegou ao servidor só sai da fila; download não apaga pendências.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "../local/db.ts";
import { applyChanges, listOutbox, markState } from "../local/outbox.ts";
import type { VersionView } from "../program/program.ts";
import { mergeSessionData, normalize } from "./download.ts";
import {
  completeSession,
  deleteSet,
  discardSession,
  findActiveSession,
  lastExecution,
  readSession,
  saveSet,
  SessionError,
  setPlannedSets,
  startSession,
  updateSessionExercise,
} from "./session.ts";

const USER = "00000000-0000-4000-8000-00000000000a";
const NOW = new Date("2026-10-27T13:00:00Z");
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

const item = (id: string, exerciseId: string) => ({
  id,
  exercise_id: exerciseId,
  measure_type: "reps" as const,
  sets: 3,
  reps_min: 8,
  reps_max: 12,
  duration_s: null,
  rest_s: 90,
  suggested_load_kg: 40,
  notes: null,
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
      { id: "treino-a", name: "Treino A", items: [item("i1", "supino"), item("i2", "remada")] },
      { id: "vazio", name: "Vazio", items: [] },
    ],
  },
};

async function started(db: LocalDatabase) {
  const id = await startSession(db, USER, VERSION, "treino-a", NOW);
  const bundle = await readSession(db, id);
  if (!bundle) throw new Error("sessão ausente");
  return bundle;
}

const accept = (db: LocalDatabase, opId: string, revision?: number) =>
  applyChanges(db, [{ op_id: opId, action: "remove", ...(revision ? { revision } : {}) }]);

describe("início e séries (API-008, API-009)", () => {
  it("inicia com a cópia da prescrição e enfileira; só uma em andamento", async () => {
    const db = database();
    const { session, exercises } = await started(db);
    expect(session).toMatchObject({ status: "in_progress", workout_name: "Treino A" });
    expect(exercises.map((e) => [e.exercise_id, e.planned_sets, e.prescription?.rest_s])).toEqual([
      ["supino", 3, 90],
      ["remada", 3, 90],
    ]);
    const [op] = await listOutbox(db);
    expect(op).toMatchObject({ type: "session.start", entity_id: session.id, base_revision: null });
    expect((op?.payload as { exercises: unknown[] }).exercises).toHaveLength(2);
    await expect(startSession(db, USER, VERSION, "treino-a", NOW)).rejects.toThrow(SessionError);
    await expect(startSession(db, USER, VERSION, "vazio", NOW)).rejects.toThrow(
      "WORKOUT_NOT_FOUND",
    );
    expect((await findActiveSession(db))?.id).toBe(session.id);
  });

  it("série nova cria; correção antes do envio reescreve; durante o envio vai com base 1", async () => {
    const db = database();
    const { session, exercises } = await started(db);
    const se = exercises[0]?.id ?? "";
    const set = await saveSet(db, USER, session.id, {
      session_exercise_id: se,
      set_number: 1,
      load_kg: 40,
      reps: 10,
      duration_s: null,
    });
    await saveSet(db, USER, session.id, { ...set, id: set.id, load_kg: 42.5 });
    let queue = await listOutbox(db);
    expect(queue.map((op) => [op.type, op.base_revision])).toEqual([
      ["session.start", null],
      ["set.upsert", null],
    ]);
    expect(queue[1]?.payload).toMatchObject({ load_kg: 42.5 });

    await markState(db, [queue[1]?.op_id ?? ""], "sending");
    await saveSet(db, USER, session.id, { ...set, id: set.id, load_kg: 45 });
    queue = await listOutbox(db);
    expect(queue.map((op) => [op.type, op.base_revision])).toEqual([
      ["session.start", null],
      ["set.upsert", null],
      ["set.upsert", 1],
    ]);
    // Confirmação: revisão local e rebase da correção seguinte.
    await accept(db, queue[1]?.op_id ?? "", 3);
    expect((await readSession(db, session.id))?.sets[0]?.revision).toBe(3);
    expect((await listOutbox(db)).at(-1)?.base_revision).toBe(3);
    const latest = await readSession(db, session.id);
    expect(latest?.session.last_activity_at).toBe(latest?.sets[0]?.completed_at);
  });
});

describe("desfazer, pular, concluir e descartar (API-010..014)", () => {
  it("desfazer série nunca enviada só limpa a fila; enviada vira exclusão", async () => {
    const db = database();
    const { session, exercises } = await started(db);
    const input = {
      session_exercise_id: exercises[0]?.id ?? "",
      set_number: 1,
      load_kg: 40,
      reps: 10,
      duration_s: null,
    };
    const first = await saveSet(db, USER, session.id, input);
    await deleteSet(db, USER, first.id);
    expect((await listOutbox(db)).map((op) => op.type)).toEqual(["session.start"]);

    const second = await saveSet(db, USER, session.id, input);
    const queue = await listOutbox(db);
    await accept(db, queue[1]?.op_id ?? "", 1);
    await deleteSet(db, USER, second.id);
    expect((await listOutbox(db)).map((op) => [op.type, op.base_revision])).toEqual([
      ["session.start", null],
      ["set.delete", 1],
    ]);
    await deleteSet(db, USER, "inexistente");
    expect((await readSession(db, session.id))?.sets).toHaveLength(0);
  });

  it("pular reescreve a alteração pendente; séries previstas mudam só no aparelho", async () => {
    const db = database();
    const { session, exercises } = await started(db);
    const se = exercises[1]?.id ?? "";
    await updateSessionExercise(db, USER, se, { status: "skipped" });
    await updateSessionExercise(db, USER, se, { position: 1 });
    const queue = await listOutbox(db);
    expect(queue.at(-1)).toMatchObject({
      type: "session_exercise.update",
      base_revision: 1,
      payload: { status: "skipped", position: 1 },
    });
    expect(queue).toHaveLength(2);
    await setPlannedSets(db, se, 25);
    const after = await readSession(db, session.id);
    expect(after?.exercises.find((e) => e.id === se)?.planned_sets).toBe(20);
    await expect(updateSessionExercise(db, USER, "x", { status: "done" })).rejects.toThrow();
  });

  it("concluir enfileira término, duração, PSE e observação", async () => {
    const db = database();
    const { session } = await started(db);
    const done = await completeSession(
      db,
      USER,
      session.id,
      { rpe: 7, notes: "Fictício" },
      new Date(NOW.getTime() + 58 * 60_000),
    );
    expect(done).toMatchObject({ status: "completed", duration_min: 58, rpe: 7 });
    expect((await listOutbox(db)).at(-1)).toMatchObject({
      type: "session.complete",
      base_revision: 1,
      payload: { duration_min: 58, rpe: 7, notes: "Fictício" },
    });
    expect(await findActiveSession(db)).toBeUndefined();
    await expect(
      completeSession(db, USER, "inexistente", { rpe: null, notes: null }),
    ).rejects.toThrow();
  });

  it("descartar sessão que nunca chegou ao servidor esvazia a fila; aceita vira descarte", async () => {
    const db = database();
    const first = await started(db);
    await saveSet(db, USER, first.session.id, {
      session_exercise_id: first.exercises[0]?.id ?? "",
      set_number: 1,
      load_kg: 40,
      reps: 10,
      duration_s: null,
    });
    await discardSession(db, USER, first.session.id);
    expect(await listOutbox(db)).toHaveLength(0);
    expect(await readSession(db, first.session.id)).toBeUndefined();

    const second = await started(db);
    await accept(db, (await listOutbox(db))[0]?.op_id ?? "", 1);
    await discardSession(db, USER, second.session.id);
    expect((await listOutbox(db)).map((op) => [op.type, op.base_revision])).toEqual([
      ["session.delete", 1],
    ]);
    await discardSession(db, USER, "inexistente");
  });
});

describe("download e última execução (API-R06, API-R07)", () => {
  const serverSession = (id: string, startedAt: string, load: number) => ({
    id,
    program_version_id: "versao",
    workout_id: "treino-a",
    status: "completed" as const,
    started_at: startedAt,
    ended_at: startedAt,
    duration_min: 50,
    last_activity_at: startedAt,
    rpe: null,
    notes: null,
    revision: 2,
    deleted_at: null,
    workout: { name: "Treino A" },
    version: { version_number: 1 },
    session_exercises: [
      {
        id: `${id}-se`,
        session_id: id,
        workout_item_id: "i1",
        exercise_id: "supino",
        position: 1,
        status: "done" as const,
        revision: 1,
        deleted_at: null,
        set_logs: [
          {
            id: `${id}-s1`,
            session_exercise_id: `${id}-se`,
            set_number: 1,
            load_kg: load,
            reps: 10,
            duration_s: null,
            completed_at: startedAt,
            revision: 1,
            deleted_at: null,
          },
          {
            id: `${id}-s2`,
            session_exercise_id: `${id}-se`,
            set_number: 2,
            load_kg: 0,
            reps: 0,
            duration_s: null,
            completed_at: startedAt,
            revision: 2,
            deleted_at: "2026-10-26T12:00:00Z",
          },
        ],
      },
    ],
  });

  it("grava a cópia do servidor sem apagar a sessão em andamento nem pendências", async () => {
    const db = database();
    const active = await started(db);
    await mergeSessionData(db, {
      sessions: [
        serverSession("antiga", "2026-10-20T12:00:00Z", 37.5),
        {
          ...serverSession("excluida", "2026-10-21T12:00:00Z", 30),
          deleted_at: "2026-10-22T12:00:00Z",
        },
      ],
      lastExecutions: [
        {
          exercise_id: "remada",
          session_id: "muito-antiga",
          started_at: "2026-06-01T12:00:00Z",
          sets: [{ set_number: 1, load_kg: 50, reps: 8, duration_s: null }],
        },
      ],
    });
    expect((await findActiveSession(db))?.id).toBe(active.session.id);
    const old = await readSession(db, "antiga");
    expect(old?.sets.map((s) => s.load_kg)).toEqual([37.5]);
    expect(old?.exercises[0]?.planned_sets).toBe(1);
    expect(await readSession(db, "excluida")).toBeUndefined();

    // Última execução: sessão do aparelho (sem a atual) ou cópia baixada, a mais recente.
    expect((await lastExecution(db, "supino", active.session.id))?.session_id).toBe("antiga");
    expect((await lastExecution(db, "remada", active.session.id))?.session_id).toBe("muito-antiga");
    expect(await lastExecution(db, "outro", null)).toBeNull();

    // Novo download sem a sessão: some do aparelho, pois nada dela está pendente.
    await mergeSessionData(db, { sessions: [], lastExecutions: [] });
    expect(await readSession(db, "antiga")).toBeUndefined();
    expect(await lastExecution(db, "remada", null)).toBeNull();

    // Concluída localmente e ainda na fila: o download não a substitui.
    await completeSession(db, USER, active.session.id, { rpe: null, notes: null });
    await mergeSessionData(db, {
      sessions: [serverSession(active.session.id, active.session.started_at, 99)],
      lastExecutions: [],
    });
    expect((await readSession(db, active.session.id))?.session.status).toBe("completed");
    expect((await readSession(db, active.session.id))?.sets).toHaveLength(0);
  });
});

describe("horários do servidor", () => {
  it("são normalizados para ISO com Z, aceito pelas operações (DAD-04)", () => {
    const row = normalize({
      id: "s",
      program_version_id: "v",
      workout_id: "w",
      status: "completed",
      started_at: "2026-10-25T13:00:00+00:00",
      ended_at: "2026-10-25T13:50:00.5+00:00",
      duration_min: 50,
      last_activity_at: "2026-10-25T10:50:00-03:00",
      rpe: null,
      notes: null,
      workout: null,
      version: null,
      session_exercises: [
        {
          id: "se",
          session_id: "s",
          workout_item_id: null,
          exercise_id: "e",
          position: 1,
          status: "done",
          deleted_at: null,
          set_logs: [
            {
              id: "l",
              session_exercise_id: "se",
              set_number: 1,
              load_kg: 40,
              reps: 10,
              duration_s: null,
              completed_at: "2026-10-25T13:40:00+00:00",
              deleted_at: null,
            },
          ],
        },
      ],
    });
    expect([row.started_at, row.ended_at, row.last_activity_at]).toEqual([
      "2026-10-25T13:00:00.000Z",
      "2026-10-25T13:50:00.500Z",
      "2026-10-25T13:50:00.000Z",
    ]);
    expect(row.session_exercises[0]?.set_logs[0]?.completed_at).toBe("2026-10-25T13:40:00.000Z");
  });
});
