// Banco local, fila e motor de envio (TAR-009) sobre IndexedDB simulado.
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import type { SyncOutcome, SyncRequest } from "@forja/domain";
import { LocalDatabase, readMeta } from "./db.ts";
import { deviceIdentity, localDatabaseName } from "./device.ts";
import { SyncEngine } from "./engine.ts";
import { countUnsent, enqueue, listOutbox, recoverInterrupted, releaseRetries } from "./outbox.ts";
import { requestPersistentStorage } from "./persistent-storage.ts";
import { LOCAL_SCHEMA } from "./schema.ts";
import { createHttpTransport, type SyncTransport } from "./transport.ts";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const NOW = 1_800_000_000_000;
const opened: LocalDatabase[] = [];

function database(name = `teste-${crypto.randomUUID()}`, schema = LOCAL_SCHEMA): LocalDatabase {
  const db = new LocalDatabase(name, schema);
  opened.push(db);
  return db;
}

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

/** Transporte simulado que registra as requisições e responde conforme a função dada. */
function fakeTransport(respond: (request: SyncRequest) => SyncOutcome) {
  const requests: SyncRequest[] = [];
  const transport: SyncTransport = (request) => {
    requests.push(request);
    return Promise.resolve(respond(request));
  };
  return { transport, requests };
}

const acceptAll = (request: SyncRequest): SyncOutcome => ({
  kind: "response",
  response: {
    server_time: new Date(NOW).toISOString(),
    results: request.operations.map((op) => ({
      op_id: op.op_id,
      status: "accepted" as const,
      revision: 1,
    })),
  },
});

function engineFor(db: LocalDatabase, userId: string, transport: SyncTransport) {
  return new SyncEngine({
    db,
    sessionUserId: userId,
    deviceId: "aparelho-teste",
    transport,
    now: () => NOW,
  });
}

describe("banco local por usuário (ADR-028 L1)", () => {
  it("nome opaco: estável por aparelho, diferente por usuário e sem o identificador", async () => {
    const { salt } = deviceIdentity(memoryStorage());
    const nameA = await localDatabaseName(A, salt);
    expect(await localDatabaseName(A, salt)).toBe(nameA);
    expect(await localDatabaseName(B, salt)).not.toBe(nameA);
    expect(await localDatabaseName(A, "outro-sal")).not.toBe(nameA);
    expect(nameA).toMatch(/^forja-u-[0-9a-f]{32}$/);
    expect(nameA).not.toContain(A.replaceAll("-", "").slice(0, 8));
  });

  it("a identidade do aparelho é gerada uma vez e reaproveitada", () => {
    const storage = memoryStorage();
    expect(deviceIdentity(storage)).toEqual(deviceIdentity(storage));
  });

  it("bancos de usuários diferentes não compartilham a fila", async () => {
    const dbA = database();
    const dbB = database();
    await enqueue(dbA, {
      ownerUserId: A,
      type: "weight.create",
      entityId: "w1",
      baseRevision: null,
      payload: {},
    });
    expect(await countUnsent(dbA)).toBe(1);
    expect(await countUnsent(dbB)).toBe(0);
  });
});

describe("motor de envio", () => {
  it("envia em ordem de criação e só remove após confirmação (RN-042)", async () => {
    const db = database();
    for (const entityId of ["s1", "s1", "w1"]) {
      await enqueue(
        db,
        { ownerUserId: A, type: "t", entityId, baseRevision: null, payload: {} },
        NOW,
      );
    }
    const { transport, requests } = fakeTransport(acceptAll);
    await engineFor(db, A, transport).syncNow();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.operations.map((op) => op.entity_id)).toEqual(["s1", "s1", "w1"]);
    expect(requests[0]?.device_id).toBe("aparelho-teste");
    expect(await countUnsent(db)).toBe(0);
  });

  it("falha de rede mantém tudo na fila com nova tentativa agendada", async () => {
    const db = database();
    await enqueue(db, {
      ownerUserId: A,
      type: "t",
      entityId: "w1",
      baseRevision: null,
      payload: {},
    });
    const { transport } = fakeTransport(() => ({
      kind: "transport_failure",
      code: "NETWORK_UNAVAILABLE",
    }));
    const engine = engineFor(db, A, transport);
    await engine.syncNow();
    engine.stop();
    const [op] = await listOutbox(db);
    expect(op).toMatchObject({ state: "retry", attempts: 1, next_attempt_at: NOW + 5000 });
  });

  it("sessão expirada deixa a fila aguardando login, sem apagar nada (RN-052 d)", async () => {
    const db = database();
    await enqueue(db, {
      ownerUserId: A,
      type: "t",
      entityId: "w1",
      baseRevision: null,
      payload: {},
    });
    const { transport } = fakeTransport(() => ({ kind: "unauthorized" }));
    await engineFor(db, A, transport).syncNow();
    expect((await listOutbox(db))[0]?.state).toBe("awaiting_login");
  });

  it("operação de outro dono nunca é enviada e fica registrada como divergência (T-PWA-15)", async () => {
    const db = database();
    await enqueue(db, {
      ownerUserId: B,
      type: "t",
      entityId: "intrusa",
      baseRevision: null,
      payload: {},
    });
    await enqueue(db, {
      ownerUserId: A,
      type: "t",
      entityId: "minha",
      baseRevision: null,
      payload: {},
    });
    const { transport, requests } = fakeTransport(acceptAll);
    await engineFor(db, A, transport).syncNow();
    expect(requests.flatMap((r) => r.operations.map((op) => op.owner_user_id))).toEqual([A]);
    const remaining = await listOutbox(db);
    expect(remaining.map((op) => op.owner_user_id)).toEqual([B]);
    expect(await readMeta(db, "diagnostico.dono_divergente")).toMatchObject({
      code: "OWNER_MISMATCH",
      count: 1,
    });
  });

  it("recusa e conflito ficam na fila exigindo ação; seguintes do mesmo registro esperam", async () => {
    const db = database();
    await enqueue(db, { ownerUserId: A, type: "t", entityId: "x", baseRevision: 1, payload: {} });
    await enqueue(db, {
      ownerUserId: A,
      type: "t",
      entityId: "y",
      baseRevision: null,
      payload: {},
    });
    const { transport, requests } = fakeTransport((request) => {
      const [first, second] = request.operations;
      return {
        kind: "response",
        response: {
          server_time: "x",
          results: [
            ...(first
              ? [
                  {
                    op_id: first.op_id,
                    status: "conflict" as const,
                    error: { code: "REVISION_CONFLICT" as const },
                  },
                ]
              : []),
            ...(second
              ? [
                  {
                    op_id: second.op_id,
                    status: "rejected" as const,
                    error: { code: "VALIDATION_FAILED" as const },
                  },
                ]
              : []),
          ],
        },
      };
    });
    const engine = engineFor(db, A, transport);
    await engine.syncNow();
    await enqueue(db, { ownerUserId: A, type: "t", entityId: "x", baseRevision: 2, payload: {} });
    await engine.syncNow();
    expect(requests).toHaveLength(1);
    expect((await listOutbox(db)).map((op) => op.state)).toEqual([
      "conflict",
      "rejected",
      "pending",
    ]);
  });

  it("envio interrompido volta a aguardar envio ao reabrir", async () => {
    const db = database();
    await enqueue(db, {
      ownerUserId: A,
      type: "t",
      entityId: "w1",
      baseRevision: null,
      payload: {},
    });
    await db.outbox.toCollection().modify({ state: "sending" });
    await recoverInterrupted(db);
    expect((await listOutbox(db))[0]?.state).toBe("pending");
  });
});

describe("migração do banco local (DAD-07 §4)", () => {
  it("nova versão preserva a fila e a sessão em andamento", async () => {
    const name = `teste-migracao-${crypto.randomUUID()}`;
    const v1 = database(name);
    await enqueue(v1, {
      ownerUserId: A,
      type: "set.upsert",
      entityId: "set-1",
      baseRevision: null,
      payload: { reps: 10 },
    });
    await v1
      .table("sessions")
      .put({ id: "sessao-1", started_at: "2026-10-27T10:00:00Z", status: "in_progress" });
    v1.close();

    const v2 = database(name, [
      ...LOCAL_SCHEMA,
      {
        version: 2,
        stores: { sessions: "id, started_at, status", novidade: "id" },
        upgrade: async (tx) => {
          await tx.table("sessions").toCollection().modify({ migrated: true });
        },
      },
    ]);
    await v2.open();
    expect(v2.verno).toBe(2);
    expect(await listOutbox(v2)).toHaveLength(1);
    expect(await v2.table("sessions").get("sessao-1")).toMatchObject({
      status: "in_progress",
      migrated: true,
    });
  });
});

describe("armazenamento persistente (UX-08 §7)", () => {
  it("pede uma vez e registra o resultado", async () => {
    const db = database();
    let asked = 0;
    const storage = {
      persisted: () => Promise.resolve(false),
      persist: () => {
        asked++;
        return Promise.resolve(true);
      },
    };
    expect(await requestPersistentStorage(db, storage, NOW)).toMatchObject({
      supported: true,
      granted: true,
    });
    await requestPersistentStorage(db, storage, NOW);
    expect(asked).toBe(1);
  });

  it("navegador sem suporte fica registrado sem erro", async () => {
    expect(await requestPersistentStorage(database(), null, NOW)).toMatchObject({
      supported: false,
    });
  });
});

describe("transporte HTTP (DAD-04 §4.2)", () => {
  const request: SyncRequest = {
    contract_version: 1,
    device_id: "d",
    client_time: "t",
    operations: [],
  };

  function transportWith(response: () => Promise<Response>, token: string | null = "tok") {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const transport = createHttpTransport({
      baseUrl: "http://127.0.0.1:55421",
      publicKey: "chave-publica",
      accessToken: () => Promise.resolve(token),
      fetchImpl: (url, init) => {
        calls.push({ url: url instanceof Request ? url.url : url.toString(), init });
        return response();
      },
    });
    return { transport, calls };
  }

  it("resposta válida é entregue; requisição leva token e não é cacheada", async () => {
    const { transport, calls } = transportWith(() =>
      Promise.resolve(Response.json({ server_time: "t", results: [] })),
    );
    expect(await transport(request)).toEqual({
      kind: "response",
      response: { server_time: "t", results: [] },
    });
    expect(calls[0]?.url).toBe("http://127.0.0.1:55421/functions/v1/sync");
    expect(calls[0]?.init?.cache).toBe("no-store");
    expect((calls[0]?.init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it.each([
    [401, { kind: "unauthorized" }],
    [429, { kind: "rate_limited" }],
    [500, { kind: "transport_failure", code: "INTERNAL" }],
    [404, { kind: "transport_failure", code: "INTERNAL" }],
  ])("HTTP %i é classificado", async (status, expected) => {
    const { transport } = transportWith(() => Promise.resolve(new Response("{}", { status })));
    expect(await transport(request)).toEqual(expected);
  });

  it("corpo fora do contrato, rede indisponível e falta de sessão", async () => {
    expect(
      await transportWith(() => Promise.resolve(Response.json({ results: "?" }))).transport(
        request,
      ),
    ).toEqual({ kind: "transport_failure", code: "INTERNAL" });
    expect(
      await transportWith(() => Promise.reject(new TypeError("offline"))).transport(request),
    ).toEqual({ kind: "transport_failure", code: "NETWORK_UNAVAILABLE" });
    const noSession = transportWith(() => Promise.resolve(Response.json({})), null);
    expect(await noSession.transport(request)).toEqual({ kind: "unauthorized" });
    expect(noSession.calls).toHaveLength(0);
  });
});

describe("conexão de volta", () => {
  it("operações aguardando nova tentativa ficam prontas na hora", async () => {
    const db = database();
    const op = await enqueue(db, {
      ownerUserId: A,
      type: "weight.create",
      entityId: B,
      baseRevision: null,
      payload: {},
    });
    await db.outbox
      .where("op_id")
      .equals(op.op_id)
      .modify({ state: "retry", next_attempt_at: NOW });
    await releaseRetries(db);
    expect((await listOutbox(db))[0]).toMatchObject({ state: "retry", next_attempt_at: null });
  });
});
