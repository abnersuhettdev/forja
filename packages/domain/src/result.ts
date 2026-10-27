// Erros de domínio são valores, não exceções (ARQ-04 §6).
import type { ErrorCode } from "./messages.ts";

export type Result<T, E = DomainError> = { ok: true; value: T } | { ok: false; error: E };

export interface DomainError {
  readonly code: ErrorCode;
  /** Regra ou campo relacionado, para exibição junto ao campo e diagnóstico. */
  readonly details?: Readonly<Record<string, string | number>>;
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
