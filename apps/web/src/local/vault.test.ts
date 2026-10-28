// Cofre das pendências mantidas (TAR-021; ADR-028 L6, ADR-070) e o que ele guarda e devolve.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { completeSession, readSession, saveSet, startSession } from "../execution/session.ts";
import type { VersionView } from "../program/program.ts";
import { saveRest } from "../training/rest.ts";
import { LocalDatabase, readMeta, writeMeta } from "./db.ts";
import { collectPending, hasPending, restorePending } from "./kept.ts";
import { listOutbox, markState } from "./outbox.ts";
import {
  measureDerivation,
  open,
  readSealed,
  removeSealed,
  seal,
  setVaultName,
  storeSealed,
  VAULT_ITERATIONS,
} from "./vault.ts";

const USER = "00000000-0000-4000-8000-00000000000a";
const OWNER = "forja-u-0123456789abcdef0123456789abcdef";
/** Poucas iterações nos testes de função; o valor real é medido à parte. */
const FAST = 1_000;
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

describe("cifra das pendências (ADR-070)", () => {
  it("guarda só metadados em claro e abre apenas com a senha do dono", async () => {
    const content = { segredo: "Sessão fictícia", cargas: [40, 42.5] };
    const record = await seal(OWNER, "Senha-ficticia-01", content, FAST);
    expect(record).toMatchObject({ owner: OWNER, version: 1, iterations: FAST });
    expect(record.salt).toHaveLength(16);
    expect(record.iv).toHaveLength(12);
    const raw = new TextDecoder().decode(record.ciphertext);
    expect(raw).not.toContain("Sessão fictícia");
    expect(await open(record, "Senha-ficticia-01")).toEqual(content);
    expect(await open(record, "Senha-errada-01")).toBeNull();
    // O dono faz parte do dado autenticado: outro dono não abre.
    expect(await open({ ...record, owner: "forja-u-outro" }, "Senha-ficticia-01")).toBeNull();
    // Sal e vetor novos a cada gravação.
    const again = await seal(OWNER, "Senha-ficticia-01", content, FAST);
    expect(again.salt).not.toEqual(record.salt);
    expect(again.iv).not.toEqual(record.iv);
  });

  it("usa 600.000 iterações por padrão e mede a derivação", async () => {
    expect(VAULT_ITERATIONS).toBe(600_000);
    const record = await seal(OWNER, "Senha-ficticia-01", {}, undefined);
    expect(record.iterations).toBe(600_000);
    expect(await measureDerivation(FAST)).toBeGreaterThanOrEqual(0);
  });

  it("cofre separado do banco do usuário, por dono, em ordem", async () => {
    setVaultName(`cofre-${crypto.randomUUID()}`);
    await storeSealed(await seal(OWNER, "a", { n: 1 }, FAST, new Date("2026-10-27T10:00:00Z")));
    await storeSealed(await seal(OWNER, "a", { n: 2 }, FAST, new Date("2026-10-26T10:00:00Z")));
    await storeSealed(await seal("forja-u-outro", "b", { n: 3 }, FAST));
    const mine = await readSealed(OWNER);
    expect(await Promise.all(mine.map((r) => open(r, "a")))).toEqual([{ n: 2 }, { n: 1 }]);
    await removeSealed(mine.flatMap((r) => (r.id === undefined ? [] : [r.id])));
    expect(await readSealed(OWNER)).toHaveLength(0);
    expect(await readSealed("forja-u-outro")).toHaveLength(1);
  });
});

describe("o que é guardado e devolvido (RN-052 b)", () => {
  it("sessão em andamento, séries, descanso e fila voltam iguais no próximo login", async () => {
    const before = database();
    expect(await hasPending(before)).toBe(false);
    const id = await startSession(before, USER, VERSION, "treino-a");
    expect(await hasPending(before)).toBe(true);
    const bundle = await readSession(before, id);
    await saveSet(before, USER, id, {
      session_exercise_id: bundle?.exercises[0]?.id ?? "",
      set_number: 1,
      load_kg: 40,
      reps: 10,
      duration_s: null,
    });
    await before.table("rest").put({
      key: "current",
      student_id: "aluno",
      default_hours: 48,
      revision: 2,
      overrides: [],
    });
    await saveRest(before, USER, { defaultHours: 54, overrides: {} });
    await writeMeta(before, "execucao.posicao", {
      sessionId: id,
      currentExerciseId: null,
      rest: null,
    });
    // Sessão antiga já enviada (sem fila) não é guardada.
    await before.table("sessions").put({ id: "antiga", status: "completed" });
    const ops = await listOutbox(before);
    await markState(before, [ops[0]?.op_id ?? ""], "sending");

    const content = await collectPending(before);
    expect(content.outbox.map((op) => op.type)).toEqual([
      "session.start",
      "set.upsert",
      "rest.update",
    ]);
    expect(content.outbox.every((op) => op.seq === undefined)).toBe(true);
    expect((content.tables.sessions ?? []).map((s) => (s as { id: string }).id)).toEqual([id]);
    expect(content.tables.set_logs).toHaveLength(1);
    expect(content.tables.rest).toHaveLength(1);

    // Ida e volta pelo cofre, como no próximo login.
    const record = await seal(OWNER, "Senha-ficticia-01", content, FAST);
    const after = database();
    expect(await restorePending(after, await open(record, "Senha-ficticia-01"))).toBe(true);
    const restored = await listOutbox(after);
    expect(restored.map((op) => [op.type, op.op_id, op.state])).toEqual(
      ops.map((op, index) => [op.type, op.op_id, index === 0 ? "pending" : op.state]),
    );
    expect((await readSession(after, id))?.sets).toHaveLength(1);
    expect(await readMeta(after, "execucao.posicao")).toMatchObject({ sessionId: id });
    // Repetir não duplica a fila (mesmo op_id).
    await restorePending(after, content);
    expect(await listOutbox(after)).toHaveLength(3);
    expect(await restorePending(after, { qualquer: 1 })).toBe(false);
    expect(await restorePending(after, null)).toBe(false);
  });

  it("sessão concluída ainda na fila é guardada pelo grupo; sem descanso alterado, nada dele", async () => {
    const db = database();
    const id = await startSession(db, USER, VERSION, "treino-a");
    await completeSession(db, USER, id, { rpe: null, notes: null });
    const content = await collectPending(db);
    expect(content.tables.sessions).toHaveLength(1);
    expect(content.tables.rest).toHaveLength(0);
  });
});
