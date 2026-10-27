// Descanso salvo no aparelho, dados da recomendação e formatos (TAR-018) sobre IndexedDB simulado.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import type { CatalogExercise } from "../catalog/catalog.ts";
import { cacheContext } from "../account/context.ts";
import { LocalDatabase } from "../local/db.ts";
import { applyChanges, enqueue, listOutbox, markState } from "../local/outbox.ts";
import {
  formatAgo,
  formatDay,
  formatDaysAgo,
  formatKg,
  formatRelease,
  formatShortDate,
} from "./format.ts";
import { hasUnsentRest, readStoredRest, saveRest, toRestConfig } from "./rest.ts";
import { readLocalSessions, readPlanProfile, summarizeWorkout, weekMarkers } from "./training.ts";

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

async function withRest(db: LocalDatabase, revision = 3) {
  await db.table("rest").put({
    key: "current",
    student_id: STUDENT,
    default_hours: 48,
    revision,
    overrides: [],
  });
}

const exercise = (id: string, primary: string[]) => ({ id, primary }) as unknown as CatalogExercise;

describe("descanso no aparelho (TELA-006, API-007)", () => {
  it("grava localmente e enfileira com a revisão confirmada; nova alteração reescreve a fila", async () => {
    const db = database();
    await withRest(db);
    await saveRest(db, USER, { defaultHours: 72, overrides: { chest: 24 } });
    expect(toRestConfig(await readStoredRest(db))).toEqual({
      defaultHours: 72,
      overrides: { chest: 24 },
    });
    await saveRest(db, USER, { defaultHours: 66, overrides: { lats: 0, chest: 24 } });
    const queue = await listOutbox(db);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      type: "rest.update",
      entity_id: STUDENT,
      base_revision: 3,
      owner_user_id: USER,
      payload: {
        default_hours: 66,
        overrides: [
          { muscle_group_code: "chest", hours: 24 },
          { muscle_group_code: "lats", hours: 0 },
        ],
      },
    });
    expect(await hasUnsentRest(db)).toBe(true);
  });

  it("durante o envio cria outra operação, rebaseada quando a anterior é confirmada", async () => {
    const db = database();
    await withRest(db);
    await saveRest(db, USER, { defaultHours: 60, overrides: {} });
    const [first] = await listOutbox(db);
    if (!first) throw new Error("fila vazia");
    await markState(db, [first.op_id], "sending");
    await saveRest(db, USER, { defaultHours: 54, overrides: {} });
    expect(await listOutbox(db)).toHaveLength(2);

    await applyChanges(db, [{ op_id: first.op_id, action: "remove", revision: 4 }]);
    const queue = await listOutbox(db);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.base_revision).toBe(4);
    expect((await readStoredRest(db))?.revision).toBe(4);
    expect((await readStoredRest(db))?.default_hours).toBe(54);
  });

  it("a cópia do servidor não sobrescreve alteração ainda na fila", async () => {
    const db = database();
    await withRest(db);
    await saveRest(db, USER, { defaultHours: 24, overrides: {} });
    const context = {
      context: {
        userId: USER,
        isManager: false,
        student: null,
        profileRevision: null,
        restRevision: 3,
        terEnabled: false,
        fetchedAt: new Date(0).toISOString(),
      },
      profile: null,
      rest: { student_id: STUDENT, default_hours: 48, revision: 3, overrides: [] },
    };
    await cacheContext(db, context);
    expect((await readStoredRest(db))?.default_hours).toBe(24);

    await db.outbox.clear();
    await cacheContext(db, context);
    expect((await readStoredRest(db))?.default_hours).toBe(48);
  });

  it("sem cópia do descanso não grava nada", async () => {
    const db = database();
    await expect(saveRest(db, USER, { defaultHours: 24, overrides: {} })).rejects.toThrow();
    expect(await listOutbox(db)).toHaveLength(0);
    expect(toRestConfig(undefined)).toEqual({ defaultHours: 48, overrides: {} });
  });

  it("confirmação de outro tipo não mexe no descanso", async () => {
    const db = database();
    await withRest(db);
    const op = await enqueue(db, {
      ownerUserId: USER,
      type: "profile.update",
      entityId: STUDENT,
      baseRevision: 1,
      payload: {},
    });
    await applyChanges(db, [{ op_id: op.op_id, action: "remove", revision: 9 }]);
    expect((await readStoredRest(db))?.revision).toBe(3);
  });
});

describe("dados da recomendação", () => {
  const catalog = new Map([
    ["e1", exercise("e1", ["chest", "triceps"])],
    ["e2", exercise("e2", ["chest", "shoulders"])],
  ]);
  const item = (id: string, exerciseId: string) => ({
    id,
    exercise_id: exerciseId,
    measure_type: "reps" as const,
    sets: 3,
    reps_min: 8,
    reps_max: 12,
    duration_s: null,
    rest_s: 90,
    suggested_load_kg: null,
    notes: null,
  });

  it("resume o treino: exercícios, duração e grupos primários na ordem", () => {
    expect(
      summarizeWorkout(
        { id: "w", name: "Treino A", items: [item("i1", "e1"), item("i2", "e2")] },
        catalog,
      ),
    ).toEqual({
      id: "w",
      name: "Treino A",
      exerciseCount: 2,
      minutes: 15,
      groups: ["chest", "triceps", "shoulders"],
    });
  });

  it("lê sessões do aparelho com os grupos trabalhados e as pendentes de envio", async () => {
    const db = database();
    await db.table("sessions").bulkPut([
      {
        id: "s1",
        workout_id: "w",
        status: "completed",
        started_at: "2026-10-26T12:00:00Z",
        ended_at: "2026-10-26T13:00:00Z",
        last_activity_at: "2026-10-26T13:00:00Z",
      },
      {
        id: "s2",
        workout_id: "w",
        status: "manual",
        started_at: "2026-10-27T12:00:00Z",
        ended_at: "2026-10-27T13:00:00Z",
        last_activity_at: "2026-10-27T13:00:00Z",
      },
      {
        id: "s3",
        workout_id: "w",
        status: "completed",
        started_at: "2026-10-25T12:00:00Z",
        ended_at: "2026-10-25T13:00:00Z",
        last_activity_at: "2026-10-25T13:00:00Z",
        deleted_at: "2026-10-25T14:00:00Z",
      },
    ]);
    await db.table("session_exercises").bulkPut([
      { id: "se1", session_id: "s1", exercise_id: "e1" },
      { id: "se2", session_id: "s1", exercise_id: "e2" },
    ]);
    await db.table("set_logs").bulkPut([{ id: "l1", session_exercise_id: "se1" }]);
    await enqueue(db, {
      ownerUserId: USER,
      type: "session.create",
      entityId: "s2",
      baseRevision: null,
      payload: {},
    });
    const local = await readLocalSessions(db, catalog, new Map([["w", ["lats"]]]));
    expect(local.sessions.map((s) => [s.id, s.groups])).toEqual([
      ["s1", ["chest", "triceps"]],
      ["s2", ["lats"]],
    ]);
    expect(local.pendingIds.has("s2")).toBe(true);

    const week = weekMarkers(
      new Date("2026-10-27T15:00:00Z"),
      "America/Sao_Paulo",
      local,
      [2, 4, 6],
    );
    expect(week.map((d) => d.mark)).toEqual([
      "presence",
      "pending",
      "none",
      "planned",
      "none",
      "planned",
      "none",
    ]);
    expect(week[1]?.isToday).toBe(true);
  });

  it("perfil sem dias informados não define meta nem dias planejados", async () => {
    const db = database();
    expect(await readPlanProfile(db)).toEqual({ daysPerWeek: null, preferredWeekdays: [] });
    await db.table("profile").put({ key: "current", days_per_week: 4, preferred_weekdays: [1] });
    expect(await readPlanProfile(db)).toEqual({ daysPerWeek: 4, preferredWeekdays: [1] });
  });
});

describe("formatos (UX-02 §8.4)", () => {
  const now = new Date("2026-10-27T13:00:00Z");
  it("datas, horários e intervalos", () => {
    expect(formatDay("2026-10-26")).toBe("seg., 26 out.");
    expect(formatShortDate("2026-10-24")).toBe("24/10");
    expect(formatAgo(0.2)).toBe("1 h");
    expect(formatAgo(20.7)).toBe("20 h");
    expect(formatAgo(30)).toBe("1 dia");
    expect(formatAgo(80)).toBe("3 dias");
    expect(formatRelease(new Date("2026-10-27T22:10:00Z"), now, "America/Sao_Paulo")).toBe(
      "hoje às 19:10",
    );
    expect(formatRelease(new Date("2026-10-28T10:10:00Z"), now, "America/Sao_Paulo")).toBe(
      "amanhã às 07:10",
    );
    expect(formatRelease(new Date("2026-10-29T10:10:00Z"), now, "America/Sao_Paulo")).toMatch(
      /^qui\., 29 .*às 07:10$/,
    );
    expect(formatDaysAgo("2026-10-27", "2026-10-27")).toBe("hoje");
    expect(formatDaysAgo("2026-10-26", "2026-10-27")).toBe("ontem");
    expect(formatDaysAgo("2026-10-22", "2026-10-27")).toBe("há 5 dias");
    expect(formatKg(82.4)).toBe("82,4");
  });
});
