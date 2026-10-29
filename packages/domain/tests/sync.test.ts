import { describe, expect, it } from "vitest";
import {
  buildSyncRequest,
  classifyOutcome,
  nextRetryAt,
  retryDelaySeconds,
  relatedEntityIds,
  selectBatch,
  type OutboxOperation,
} from "../src/index.ts";
import { syncResponseSchema } from "../src/validacao/index.ts";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const NOW = 1_800_000_000_000;

function op(seq: number, overrides: Partial<OutboxOperation> = {}): OutboxOperation {
  return {
    seq,
    op_id: `op-${String(seq)}`,
    owner_user_id: A,
    type: "weight.create",
    entity_id: `e-${String(seq)}`,
    base_revision: null,
    payload: { weight_kg: 80 },
    created_at: "2026-10-27T10:00:00Z",
    attempts: 0,
    state: "pending",
    next_attempt_at: null,
    last_error: null,
    ...overrides,
  };
}

describe("intervalos de nova tentativa (UX-08 §6.3)", () => {
  it("5 s, 15 s, 1 min, 5 min e depois a cada 5 min", () => {
    expect([1, 2, 3, 4, 5, 12].map(retryDelaySeconds)).toEqual([5, 15, 60, 300, 300, 300]);
  });
});

describe("selectBatch", () => {
  it("série espera a sessão que a cria (exercício da sessão no conteúdo)", () => {
    const ops = [
      op(1, {
        type: "session.start",
        entity_id: "sessao",
        payload: { exercises: [{ id: "se-1" }, { id: "se-2" }, "inválido"] },
        state: "retry",
        next_attempt_at: NOW + 60_000,
      }),
      op(2, { type: "set.upsert", entity_id: "serie", payload: { session_exercise_id: "se-1" } }),
      op(3, { type: "set.upsert", entity_id: "outra", payload: { session_exercise_id: "se-9" } }),
      op(4, { entity_id: "serie", payload: {} }),
    ];
    expect(selectBatch(ops, A, NOW).batch.map((o) => o.seq)).toEqual([3]);
    expect(relatedEntityIds({ entity_id: "x", payload: { session_exercise_id: 5 } })).toEqual([
      "x",
    ]);
  });

  it("envia na ordem de criação, só do usuário da sessão (ADR-028 L3)", () => {
    const { batch, ownerMismatch } = selectBatch(
      [op(3), op(1), op(2, { owner_user_id: B })],
      A,
      NOW,
    );
    expect(batch.map((o) => o.seq)).toEqual([1, 3]);
    expect(ownerMismatch.map((o) => o.seq)).toEqual([2]);
  });

  it("respeita o horário da próxima tentativa e retoma após o login", () => {
    const ops = [
      op(1, { state: "retry", next_attempt_at: NOW + 1000 }),
      op(2, { state: "retry", next_attempt_at: NOW - 1 }),
      op(3, { state: "awaiting_login" }),
      op(4, { state: "sending" }),
    ];
    expect(selectBatch(ops, A, NOW).batch.map((o) => o.seq)).toEqual([2, 3]);
  });

  it("segura operações seguintes do mesmo registro em conflito ou recusado", () => {
    const ops = [
      op(1, { entity_id: "x", state: "conflict" }),
      op(2, { entity_id: "x" }),
      op(3, { entity_id: "y", state: "rejected" }),
      op(4, { entity_id: "y" }),
      op(5, { entity_id: "z" }),
    ];
    expect(selectBatch(ops, A, NOW).batch.map((o) => o.seq)).toEqual([5]);
  });

  it("limita o tamanho do lote mantendo a ordem por registro", () => {
    const ops = [op(1, { entity_id: "x" }), op(2, { entity_id: "y" }), op(3, { entity_id: "x" })];
    expect(selectBatch(ops, A, NOW, 1).batch.map((o) => o.seq)).toEqual([1]);
  });

  it("indica a próxima tentativa agendada", () => {
    expect(
      nextRetryAt([
        op(1),
        op(2, { state: "retry", next_attempt_at: NOW + 5000 }),
        op(3, { state: "retry", next_attempt_at: NOW + 2000 }),
      ]),
    ).toBe(NOW + 2000);
    expect(nextRetryAt([op(1)])).toBeNull();
  });
});

describe("buildSyncRequest (DAD-04 §4.1)", () => {
  it("monta a requisição sem campos locais", () => {
    const request = buildSyncRequest([op(1, { attempts: 3 })], "dev-1", NOW);
    expect(request.contract_version).toBe(1);
    expect(request.client_time).toBe(new Date(NOW).toISOString());
    expect(request.operations[0]).toEqual({
      op_id: "op-1",
      owner_user_id: A,
      type: "weight.create",
      entity_id: "e-1",
      base_revision: null,
      created_at: "2026-10-27T10:00:00Z",
      payload: { weight_kg: 80 },
    });
  });
});

describe("classifyOutcome (RN-051)", () => {
  const batch = [op(1), op(2), op(3), op(4), op(5), op(6)];

  it("traduz cada resultado do servidor no estado da fila", () => {
    const response = syncResponseSchema.parse({
      server_time: "2026-10-27T10:00:01Z",
      results: [
        { op_id: "op-1", status: "accepted", entity_id: "e-1", revision: 1 },
        { op_id: "op-2", status: "duplicate" },
        { op_id: "op-3", status: "rejected", error: { code: "VALIDATION_FAILED", message: "x" } },
        {
          op_id: "op-4",
          status: "conflict",
          error: { code: "REVISION_CONFLICT" },
          server_record: { revision: 4 },
        },
        { op_id: "op-5", status: "deferred", error: { code: "DEPENDENCY_PENDING" } },
      ],
    });
    const changes = classifyOutcome(batch, { kind: "response", response }, NOW);
    expect(changes.map((c) => (c.action === "remove" ? "remove" : c.state))).toEqual([
      "remove",
      "remove",
      "rejected",
      "conflict",
      "pending",
      "pending", // sem resultado: nunca é dada como sincronizada
    ]);
    expect(changes[0]).toEqual({ op_id: "op-1", action: "remove", revision: 1 });
    expect(changes[3]).toMatchObject({ server_record: { revision: 4 } });
  });

  it("falha de transporte e limite de taxa geram nova tentativa com intervalo crescente", () => {
    const [first] = classifyOutcome(
      [op(1, { attempts: 1 })],
      { kind: "transport_failure", code: "TIMEOUT" },
      NOW,
    );
    expect(first).toMatchObject({
      state: "retry",
      attempts: 2,
      next_attempt_at: NOW + 15_000,
      last_error: { code: "TIMEOUT" },
    });
    const [limited] = classifyOutcome([op(1)], { kind: "rate_limited" }, NOW);
    expect(limited).toMatchObject({ state: "retry", last_error: { code: "RATE_LIMITED" } });
  });

  it("sessão expirada deixa as operações aguardando login, sem contar tentativa", () => {
    const [change] = classifyOutcome([op(1, { attempts: 2 })], { kind: "unauthorized" }, NOW);
    expect(change).toMatchObject({ state: "awaiting_login", attempts: 2 });
  });

  it("código de erro desconhecido do servidor vira UNEXPECTED", () => {
    const response = syncResponseSchema.parse({
      server_time: "x",
      results: [{ op_id: "op-1", status: "rejected", error: { code: "NOVO_CODIGO" } }],
    });
    expect(classifyOutcome([op(1)], { kind: "response", response }, NOW)[0]).toMatchObject({
      last_error: { code: "UNEXPECTED" },
    });
  });

  it("resposta fora do contrato é recusada pela validação", () => {
    expect(syncResponseSchema.safeParse({ results: [{ op_id: 1 }] }).success).toBe(false);
  });
});
