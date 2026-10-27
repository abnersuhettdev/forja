// RN-031 (redação da ADR-051): regras de senha verificadas no app e espera progressiva
// após falhas seguidas de login. A lista de senhas comuns chega por parâmetro (sem E/S).
import {
  LOGIN_BACKOFF_BASE_SECONDS,
  LOGIN_BACKOFF_MAX_SECONDS,
  LOGIN_FAILURES_BEFORE_BACKOFF,
  PASSWORD_MIN_LENGTH,
} from "./parameters.ts";

export type PasswordIssue = "too_short" | "equals_email" | "common" | "same_as_current";

export interface NewPasswordInput {
  readonly password: string;
  readonly email: string;
  readonly currentPassword?: string;
  /** Verdadeiro quando a senha está na lista de senhas comuns (comparação sem caixa). */
  readonly isCommon: (normalized: string) => boolean;
}

/** Normalização usada para comparar com o e-mail e com a lista de senhas comuns. */
export function normalizeForComparison(text: string): string {
  return text.trim().toLowerCase();
}

/** Problemas da nova senha, na ordem em que aparecem na tela (TELA-005). */
export function passwordIssues(input: NewPasswordInput): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  const normalized = normalizeForComparison(input.password);
  // Contagem por ponto de código (um emoji conta como um). O serviço de autenticação conta
  // bytes, que nunca são menos que pontos de código: a regra do app é a mais exigente.
  if (Array.from(input.password).length < PASSWORD_MIN_LENGTH) issues.push("too_short");
  if (normalized !== "" && normalized === normalizeForComparison(input.email)) {
    issues.push("equals_email");
  }
  if (input.isCommon(normalized)) issues.push("common");
  if (input.currentPassword !== undefined && input.password === input.currentPassword) {
    issues.push("same_as_current");
  }
  return issues;
}

/** Segundos de espera exigidos após `consecutiveFailures` falhas seguidas de login. */
export function loginBackoffSeconds(consecutiveFailures: number): number {
  if (consecutiveFailures < LOGIN_FAILURES_BEFORE_BACKOFF) return 0;
  const exponent = consecutiveFailures - LOGIN_FAILURES_BEFORE_BACKOFF;
  return Math.min(LOGIN_BACKOFF_BASE_SECONDS * 2 ** exponent, LOGIN_BACKOFF_MAX_SECONDS);
}

export interface LoginAttemptState {
  readonly consecutiveFailures: number;
  /** Instante (ms desde a época) a partir do qual nova tentativa é permitida. */
  readonly blockedUntil: number;
}

export const INITIAL_LOGIN_ATTEMPTS: LoginAttemptState = {
  consecutiveFailures: 0,
  blockedUntil: 0,
};

/** Registra uma falha de login no instante `now` e calcula o bloqueio resultante. */
export function registerLoginFailure(state: LoginAttemptState, now: number): LoginAttemptState {
  const consecutiveFailures = state.consecutiveFailures + 1;
  return {
    consecutiveFailures,
    blockedUntil: now + loginBackoffSeconds(consecutiveFailures) * 1000,
  };
}

/** Segundos restantes de espera no instante `now` (0 = pode tentar). */
export function remainingWaitSeconds(state: LoginAttemptState, now: number): number {
  return Math.max(0, Math.ceil((state.blockedUntil - now) / 1000));
}
