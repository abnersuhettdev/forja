// Processamento de uma requisição de sincronização (DAD-04 §4.3), independente do servidor
// HTTP: o mesmo código roda na função (Deno) e nos testes de integração (Node).
import {
  messageFor,
  relatedEntityIds,
  SYNC_BATCH_LIMIT,
  SYNC_CONTRACT_VERSION,
} from "../../../packages/domain/src/index.ts";
import { z } from "zod";
import { asJson, type SyncDb, type Tx } from "./db.ts";
import { fromDatabaseError, OperationFailure, rejected } from "./errors.ts";
import { HANDLERS } from "./operations.ts";

export interface Identity {
  /** Usuário do token verificado — nunca o informado pelo aparelho (ADR-028 L4). */
  readonly userId: string;
  readonly email: string | null;
}

const operationSchema = z.object({
  op_id: z.uuid(),
  owner_user_id: z.string(),
  type: z.string().min(1).max(60),
  entity_id: z.uuid(),
  base_revision: z.number().int().min(0).nullable(),
  created_at: z.string(),
  payload: z.unknown(),
});

const requestSchema = z.object({
  contract_version: z.literal(SYNC_CONTRACT_VERSION),
  device_id: z.uuid().or(z.string().min(1).max(64)),
  client_time: z.string(),
  operations: z.array(operationSchema).max(SYNC_BATCH_LIMIT),
});

type Operation = z.infer<typeof operationSchema>;

export type OperationResult =
  | { op_id: string; status: "accepted" | "duplicate"; entity_id: string; revision?: number }
  | {
      op_id: string;
      status: "rejected" | "conflict" | "deferred";
      error: { code: string; message: string; details?: Readonly<Record<string, unknown>> };
      server_record?: Readonly<Record<string, unknown>> | null;
    };

export type ProcessResult =
  | { readonly status: 200; readonly body: { server_time: string; results: OperationResult[] } }
  | { readonly status: 400; readonly body: { code: "VALIDATION_FAILED"; message: string } };

export interface ProcessDeps {
  readonly db: SyncDb;
  readonly now?: () => Date;
  /** Resumo SHA-256 (hex) para auditoria sem dados pessoais. */
  readonly hash: (text: string) => Promise<string>;
}

function failureResult(op: Operation, failure: OperationFailure): OperationResult {
  return {
    op_id: op.op_id,
    status: failure.status,
    error: {
      code: failure.code,
      message: messageFor(failure.code),
      ...(failure.details ? { details: failure.details } : {}),
    },
    ...(failure.status === "conflict" ? { server_record: failure.serverRecord } : {}),
  };
}

async function storedResult(tx: Tx, opId: string): Promise<OperationResult | null> {
  const [row] = await tx<{ result: string; response: OperationResult }[]>`
    select result, response from public.sync_operations where op_id = ${opId}`;
  if (!row) return null;
  // Reenvio do mesmo op_id: devolve o resultado original (RN-042).
  return row.response.status === "accepted"
    ? { ...row.response, status: "duplicate" }
    : row.response;
}

async function record(tx: Tx, identity: Identity, op: Operation, result: OperationResult) {
  await tx`
    insert into public.sync_operations (op_id, user_id, op_type, entity_id, result, response)
    values (${op.op_id}, ${identity.userId}, ${op.type}, ${op.entity_id},
            ${result.status === "accepted" ? "accepted" : "rejected"}, ${tx.json(asJson(result))})`;
}

async function applyOperation(
  deps: ProcessDeps,
  identity: Identity,
  op: Operation,
  now: Date,
  deviceId: string,
): Promise<OperationResult> {
  const handler = HANDLERS[op.type];
  try {
    return await deps.db.inActorTransaction(identity.userId, async (tx) => {
      const previous = await storedResult(tx, op.op_id);
      if (previous) return previous;
      if (!handler) throw rejected("VALIDATION_FAILED", { field: "type" });
      const outcome = await handler(tx, {
        userId: identity.userId,
        email: identity.email,
        entityId: op.entity_id,
        baseRevision: op.base_revision,
        payload: op.payload,
        now,
        deviceId,
      });
      const result: OperationResult = {
        op_id: op.op_id,
        status: "accepted",
        entity_id: op.entity_id,
        ...(outcome.revision === undefined ? {} : { revision: outcome.revision }),
      };
      await record(tx, identity, op, result);
      return result;
    });
  } catch (error) {
    const failure = error instanceof OperationFailure ? error : fromDatabaseError(error);
    if (!failure) throw error;
    const result = failureResult(op, failure);
    if (failure.status === "rejected") await recordRejection(deps, identity, op, result);
    return result;
  }
}

/** Guarda a recusa para reenvios; op_id de outro usuário é recusado sem explicar (RN-042). */
async function recordRejection(
  deps: ProcessDeps,
  identity: Identity,
  op: Operation,
  result: OperationResult,
): Promise<void> {
  try {
    await deps.db.inActorTransaction(identity.userId, (tx) => record(tx, identity, op, result));
  } catch (error) {
    if (!fromDatabaseError(error)) throw error;
  }
}

export async function processRequest(
  body: unknown,
  identity: Identity,
  deps: ProcessDeps,
): Promise<ProcessResult> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: { code: "VALIDATION_FAILED", message: messageFor("VALIDATION_FAILED") },
    };
  }
  const now = deps.now?.() ?? new Date();
  const results: OperationResult[] = [];
  /** Registros com operação anterior não aceita nesta requisição. */
  const blocked = new Set<string>();

  for (const op of parsed.data.operations) {
    // ADR-028 L4: dono declarado diferente do usuário do token.
    if (op.owner_user_id !== identity.userId) {
      await deps.db.inActorTransaction(identity.userId, async (tx) => {
        await tx`
          insert into public.audit_events (event_type, subject_hash, details)
          values ('sync.owner_mismatch', ${await deps.hash(identity.userId)},
                  ${tx.json({ op_type: op.type })})`;
      });
      results.push(failureResult(op, rejected("OWNER_MISMATCH")));
      blocked.add(op.entity_id);
      continue;
    }
    const related = relatedEntityIds(op);
    if (related.some((relatedId) => blocked.has(relatedId))) {
      for (const relatedId of related) blocked.add(relatedId);
      results.push(failureResult(op, new OperationFailure("deferred", "DEPENDENCY_PENDING")));
      continue;
    }
    const result = await applyOperation(deps, identity, op, now, parsed.data.device_id);
    if (result.status !== "accepted" && result.status !== "duplicate")
      for (const relatedId of related) blocked.add(relatedId);
    results.push(result);
  }
  return { status: 200, body: { server_time: now.toISOString(), results } };
}
