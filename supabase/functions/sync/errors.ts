// Resultados não aceitos de uma operação (DAD-04 §4.2 e §7) e tradução de erros do banco.
import { ERROR_MESSAGES, type ErrorCode } from "../../../packages/domain/src/index.ts";

export type FailureStatus = "rejected" | "conflict" | "deferred";

export class OperationFailure extends Error {
  readonly status: FailureStatus;
  readonly code: ErrorCode;
  readonly details: Readonly<Record<string, unknown>> | undefined;
  readonly serverRecord: Readonly<Record<string, unknown>> | null;

  constructor(
    status: FailureStatus,
    code: ErrorCode,
    details?: Readonly<Record<string, unknown>>,
    serverRecord: Readonly<Record<string, unknown>> | null = null,
  ) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
    this.serverRecord = serverRecord;
  }
}

export const rejected = (code: ErrorCode, details?: Readonly<Record<string, unknown>>) =>
  new OperationFailure("rejected", code, details);

export const conflict = (code: ErrorCode, serverRecord: Readonly<Record<string, unknown>> | null) =>
  new OperationFailure("conflict", code, undefined, serverRecord);

function isErrorCode(value: string): value is ErrorCode {
  return value in ERROR_MESSAGES;
}

/** Erro do PostgreSQL (postgres.js) → recusa definitiva; null = falha inesperada. */
export function fromDatabaseError(error: unknown): OperationFailure | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = String(error.code);
  const message = "message" in error ? String(error.message) : "";
  // Gatilhos levantam o próprio código de erro como mensagem (DAD-03 §5).
  if ((code === "P0001" || code === "42501") && isErrorCode(message)) return rejected(message);
  // Política por linha: recusa sem revelar se o registro existe (RN-001).
  if (code === "42501") return rejected("NOT_FOUND");
  // Restrições de domínio, obrigatoriedade, chaves e formatos.
  if (["23514", "23502", "23503", "23505", "22P02", "22003", "22007", "22008"].includes(code)) {
    return rejected("VALIDATION_FAILED");
  }
  return null;
}
