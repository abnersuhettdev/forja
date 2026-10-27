// Envio direto de UMA operação à função de sincronização, para ações que exigem conexão
// (Gestão — RF-093). Passa pelo mesmo contrato e validações da fila (DAD-04 §4).
import { messageFor, SYNC_CONTRACT_VERSION, type OutboxError } from "@forja/domain";
import type { LocalData } from "./LocalDataProvider.tsx";

export type DirectResult =
  | { readonly ok: true; readonly revision?: number }
  | {
      readonly ok: false;
      readonly kind: "rejected" | "conflict" | "transport";
      readonly error: OutboxError;
      readonly message: string;
      readonly serverRecord?: Readonly<Record<string, unknown>> | null;
    };

export async function sendDirect(
  local: LocalData,
  operation: {
    opId: string;
    type: string;
    entityId: string;
    baseRevision: number | null;
    payload: unknown;
  },
): Promise<DirectResult> {
  const outcome = await local.transport({
    contract_version: SYNC_CONTRACT_VERSION,
    device_id: local.deviceId,
    client_time: new Date().toISOString(),
    operations: [
      {
        op_id: operation.opId,
        owner_user_id: local.userId,
        type: operation.type,
        entity_id: operation.entityId,
        base_revision: operation.baseRevision,
        created_at: new Date().toISOString(),
        payload: operation.payload as Readonly<Record<string, unknown>>,
      },
    ],
  });
  if (outcome.kind === "unauthorized") {
    return transportFailure("AUTH_REQUIRED");
  }
  if (outcome.kind !== "response") {
    return transportFailure(outcome.kind === "rate_limited" ? "RATE_LIMITED" : outcome.code);
  }
  const result = outcome.response.results[0];
  if (result === undefined) return transportFailure("INTERNAL");
  switch (result.status) {
    case "accepted":
    case "duplicate":
      return result.revision === undefined ? { ok: true } : { ok: true, revision: result.revision };
    case "deferred":
      return transportFailure("INTERNAL");
    case "rejected":
    case "conflict": {
      const error: OutboxError = {
        code: result.error.code,
        ...(result.error.details ? { details: result.error.details } : {}),
      };
      return {
        ok: false,
        kind: result.status,
        error,
        message: result.error.message ?? messageFor(result.error.code),
        ...(result.status === "conflict" ? { serverRecord: result.server_record ?? null } : {}),
      };
    }
  }
}

function transportFailure(code: OutboxError["code"]): DirectResult {
  return { ok: false, kind: "transport", error: { code }, message: messageFor(code) };
}
