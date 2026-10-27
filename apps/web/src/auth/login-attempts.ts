// Contador de falhas seguidas de login no aparelho (RN-031, ADR-051). Não guarda e-mail nem
// senha: só o número de falhas e o fim da espera.
import { INITIAL_LOGIN_ATTEMPTS, type LoginAttemptState } from "@forja/domain";

const KEY = "forja.login.tentativas";

export function readLoginAttempts(): LoginAttemptState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return INITIAL_LOGIN_ATTEMPTS;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "consecutiveFailures" in parsed &&
      "blockedUntil" in parsed &&
      typeof parsed.consecutiveFailures === "number" &&
      typeof parsed.blockedUntil === "number"
    ) {
      return { consecutiveFailures: parsed.consecutiveFailures, blockedUntil: parsed.blockedUntil };
    }
  } catch {
    // Armazenamento indisponível ou valor corrompido: recomeça a contagem.
  }
  return INITIAL_LOGIN_ATTEMPTS;
}

export function writeLoginAttempts(state: LoginAttemptState): void {
  try {
    if (state.consecutiveFailures === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Sem armazenamento, a espera vale só enquanto a tela estiver aberta.
  }
}
