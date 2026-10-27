// Fila de saída e classificação dos resultados do envio (RN-042, RN-047, RN-051, UX-08 §6.3,
// DAD-04 §4, ADR-028 L2–L3). Regras puras: o armazenamento e o transporte ficam no app.
import { z } from "zod";
import { ERROR_MESSAGES, type ErrorCode } from "./messages.ts";
import {
  SYNC_BATCH_LIMIT,
  SYNC_CONTRACT_VERSION,
  SYNC_RETRY_DELAYS_SECONDS,
} from "./parameters.ts";

/**
 * Estado de uma operação na fila (RN-051). Operações sincronizadas saem da fila; nenhuma
 * outra é removida sem decisão explícita do usuário.
 * - pending: aguardando envio · sending: enviando · retry: nova tentativa automática
 * - awaiting_login: sessão expirada, o envio aguarda login do mesmo usuário
 * - rejected: recusa definitiva do servidor · conflict: RN-046
 */
export type OutboxState =
  "pending" | "sending" | "retry" | "awaiting_login" | "rejected" | "conflict";

export interface OutboxError {
  readonly code: ErrorCode;
  readonly message?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface OutboxOperation {
  /** Ordem de criação no aparelho (crescente). */
  readonly seq: number;
  readonly op_id: string;
  readonly owner_user_id: string;
  readonly type: string;
  readonly entity_id: string;
  readonly base_revision: number | null;
  readonly payload: Readonly<Record<string, unknown>>;
  /** ISO 8601 (UTC) do momento da criação no aparelho. */
  readonly created_at: string;
  readonly attempts: number;
  readonly state: OutboxState;
  /** Instante (ms) a partir do qual uma nova tentativa é permitida; null = já. */
  readonly next_attempt_at: number | null;
  readonly last_error: OutboxError | null;
  /** Registro atual do servidor quando em conflito (DAD-04 §4.2). */
  readonly server_record?: Readonly<Record<string, unknown>> | null;
}

/** Estados que exigem ação do usuário (RN-051). */
export const ACTION_REQUIRED_STATES: readonly OutboxState[] = ["rejected", "conflict"];

/** Segundos até a próxima tentativa depois de `attempts` falhas temporárias seguidas. */
export function retryDelaySeconds(attempts: number): number {
  const index = Math.min(Math.max(attempts, 1), SYNC_RETRY_DELAYS_SECONDS.length) - 1;
  return SYNC_RETRY_DELAYS_SECONDS[index] ?? 300;
}

export interface BatchSelection {
  /** Operações a enviar agora, na ordem de criação. */
  readonly batch: OutboxOperation[];
  /** Operações de outro dono encontradas na fila: nunca enviadas (ADR-028 L3). */
  readonly ownerMismatch: OutboxOperation[];
}

/**
 * Registros que a operação cria ou de que depende, além do próprio: uma série depende do
 * exercício da sessão, criado junto com a sessão. Usado no aparelho (ordem de envio) e no
 * servidor (adiamento), para que nada chegue antes do registro de que precisa.
 */
export function relatedEntityIds(op: { entity_id: string; payload: unknown }): string[] {
  const ids = [op.entity_id];
  const payload = op.payload;
  if (typeof payload !== "object" || payload === null) return ids;
  if ("session_exercise_id" in payload && typeof payload.session_exercise_id === "string")
    ids.push(payload.session_exercise_id);
  if ("exercises" in payload && Array.isArray(payload.exercises)) {
    for (const exercise of payload.exercises as unknown[]) {
      if (typeof exercise === "object" && exercise !== null && "id" in exercise)
        ids.push(String(exercise.id));
    }
  }
  return ids;
}

/**
 * Escolhe o próximo lote: só operações do usuário da sessão, prontas para envio, em ordem de
 * criação. Uma operação espera enquanto houver outra anterior do mesmo registro (ou de registro
 * de que dependa — relatedEntityIds) que não possa seguir (em conflito, recusada, enviando ou
 * aguardando nova tentativa) — UX-08 §6.3 item 2.
 */
export function selectBatch(
  operations: readonly OutboxOperation[],
  sessionUserId: string,
  now: number,
  limit: number = SYNC_BATCH_LIMIT,
): BatchSelection {
  const batch: OutboxOperation[] = [];
  const ownerMismatch: OutboxOperation[] = [];
  const blockedEntities = new Set<string>();
  const ordered = [...operations].sort((a, b) => a.seq - b.seq);

  for (const op of ordered) {
    if (op.owner_user_id !== sessionUserId) {
      ownerMismatch.push(op);
      continue;
    }
    const ready =
      op.state === "pending" ||
      op.state === "awaiting_login" ||
      (op.state === "retry" && (op.next_attempt_at ?? 0) <= now);
    const related = relatedEntityIds(op);
    if (!ready || related.some((id) => blockedEntities.has(id)) || batch.length >= limit) {
      for (const id of related) blockedEntities.add(id);
      continue;
    }
    batch.push(op);
  }
  return { batch, ownerMismatch };
}

export interface OutboxSummary {
  readonly total: number;
  /** Recusados e conflitos: exigem ação do usuário (RN-051). */
  readonly attention: number;
  readonly sending: number;
  readonly retrying: number;
  readonly awaitingLogin: number;
  /** Criação (ISO) da operação mais antiga ainda não confirmada; null = fila vazia. */
  readonly oldestCreatedAt: string | null;
}

/**
 * Resumo da fila para o indicador e os avisos (RN-051, UX-08 §7). As contagens são de
 * registros do usuário, não de operações: `recordOf` agrupa (ex.: a sessão e suas séries).
 */
export function summarizeOutbox<T extends OutboxOperation>(
  operations: readonly T[],
  recordOf: (op: T) => string = (op) => op.entity_id,
): OutboxSummary {
  let oldest: string | null = null;
  const records = (states?: readonly OutboxState[]) =>
    new Set(
      operations.filter((op) => states === undefined || states.includes(op.state)).map(recordOf),
    ).size;
  for (const op of operations)
    if (oldest === null || op.created_at < oldest) oldest = op.created_at;
  return {
    total: records(),
    attention: records(ACTION_REQUIRED_STATES),
    sending: records(["sending"]),
    retrying: records(["retry"]),
    awaitingLogin: records(["awaiting_login"]),
    oldestCreatedAt: oldest,
  };
}

/** Instante (ms) da próxima tentativa automática pendente, se houver. */
export function nextRetryAt(operations: readonly OutboxOperation[]): number | null {
  let earliest: number | null = null;
  for (const op of operations) {
    if (op.state !== "retry" || op.next_attempt_at === null) continue;
    if (earliest === null || op.next_attempt_at < earliest) earliest = op.next_attempt_at;
  }
  return earliest;
}

// ---------- Contrato de envio (DAD-04 §4) ----------

export interface SyncRequestOperation {
  readonly op_id: string;
  readonly owner_user_id: string;
  readonly type: string;
  readonly entity_id: string;
  readonly base_revision: number | null;
  readonly created_at: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface SyncRequest {
  readonly contract_version: number;
  readonly device_id: string;
  readonly client_time: string;
  readonly operations: readonly SyncRequestOperation[];
}

export function buildSyncRequest(
  batch: readonly OutboxOperation[],
  deviceId: string,
  now: number,
): SyncRequest {
  return {
    contract_version: SYNC_CONTRACT_VERSION,
    device_id: deviceId,
    client_time: new Date(now).toISOString(),
    operations: batch.map((op) => ({
      op_id: op.op_id,
      owner_user_id: op.owner_user_id,
      type: op.type,
      entity_id: op.entity_id,
      base_revision: op.base_revision,
      created_at: op.created_at,
      payload: op.payload,
    })),
  };
}

const errorCode = z
  .string()
  .transform((code): ErrorCode => (code in ERROR_MESSAGES ? (code as ErrorCode) : "UNEXPECTED"));

const resultError = z.object({
  code: errorCode,
  message: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

/** Resposta do servidor: dado externo, sempre validado antes de usar. */
export const syncResponseSchema = z.object({
  server_time: z.string(),
  results: z.array(
    z.discriminatedUnion("status", [
      z.object({
        op_id: z.string(),
        status: z.enum(["accepted", "duplicate"]),
        entity_id: z.string().optional(),
        revision: z.number().int().optional(),
      }),
      z.object({ op_id: z.string(), status: z.literal("rejected"), error: resultError }),
      z.object({
        op_id: z.string(),
        status: z.literal("conflict"),
        error: resultError,
        server_record: z.record(z.string(), z.unknown()).nullable().optional(),
      }),
      z.object({
        op_id: z.string(),
        status: z.literal("deferred"),
        error: resultError.optional(),
      }),
    ]),
  ),
});

export type SyncResponse = z.infer<typeof syncResponseSchema>;

/** O que aconteceu com a requisição de envio. */
export type SyncOutcome =
  | { readonly kind: "response"; readonly response: SyncResponse }
  | {
      readonly kind: "transport_failure";
      readonly code: "NETWORK_UNAVAILABLE" | "TIMEOUT" | "INTERNAL";
    }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "unauthorized" };

/** Alteração a aplicar na fila para uma operação do lote. */
export type OutboxChange =
  | { readonly op_id: string; readonly action: "remove"; readonly revision?: number }
  | {
      readonly op_id: string;
      readonly action: "update";
      readonly state: OutboxState;
      readonly attempts: number;
      readonly next_attempt_at: number | null;
      readonly last_error: OutboxError | null;
      readonly server_record?: Readonly<Record<string, unknown>> | null;
    };

function toError(error: z.infer<typeof resultError>): OutboxError {
  return {
    code: error.code,
    ...(error.message === undefined ? {} : { message: error.message }),
    ...(error.details === undefined ? {} : { details: error.details }),
  };
}

/**
 * Classifica o resultado do envio (RN-051, UX-08 §6.3 item 4). Uma operação do lote sem
 * resultado na resposta continua aguardando envio — nunca é dada como sincronizada.
 */
export function classifyOutcome(
  batch: readonly OutboxOperation[],
  outcome: SyncOutcome,
  now: number,
): OutboxChange[] {
  if (outcome.kind !== "response") {
    return batch.map((op): OutboxChange => {
      if (outcome.kind === "unauthorized") {
        return {
          op_id: op.op_id,
          action: "update",
          state: "awaiting_login",
          attempts: op.attempts,
          next_attempt_at: null,
          last_error: { code: "AUTH_REQUIRED" },
        };
      }
      const attempts = op.attempts + 1;
      return {
        op_id: op.op_id,
        action: "update",
        state: "retry",
        attempts,
        next_attempt_at: now + retryDelaySeconds(attempts) * 1000,
        last_error: { code: outcome.kind === "rate_limited" ? "RATE_LIMITED" : outcome.code },
      };
    });
  }

  const byId = new Map(outcome.response.results.map((r) => [r.op_id, r]));
  return batch.map((op): OutboxChange => {
    const result = byId.get(op.op_id);
    if (result === undefined || result.status === "deferred") {
      return {
        op_id: op.op_id,
        action: "update",
        state: "pending",
        attempts: op.attempts,
        next_attempt_at: null,
        last_error: result?.error ? toError(result.error) : null,
      };
    }
    switch (result.status) {
      case "accepted":
      case "duplicate":
        return result.revision === undefined
          ? { op_id: op.op_id, action: "remove" }
          : { op_id: op.op_id, action: "remove", revision: result.revision };
      case "rejected":
        return {
          op_id: op.op_id,
          action: "update",
          state: "rejected",
          attempts: op.attempts + 1,
          next_attempt_at: null,
          last_error: toError(result.error),
        };
      case "conflict":
        return {
          op_id: op.op_id,
          action: "update",
          state: "conflict",
          attempts: op.attempts + 1,
          next_attempt_at: null,
          last_error: toError(result.error),
          server_record: result.server_record ?? null,
        };
    }
  });
}
