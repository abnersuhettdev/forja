// Senha do login guardada só em memória, por instantes, para liberar as pendências mantidas
// numa saída anterior (ADR-028 L6: "no próximo login, a senha digitada libera as pendências").
// Nunca vai para armazenamento; é usada uma vez e esquecida (ou esquecida após 60 s).
const TTL_MS = 60_000;
let held: { password: string; timer: ReturnType<typeof setTimeout> } | null = null;

export function forgetUnlockPassword(): void {
  if (held) clearTimeout(held.timer);
  held = null;
}

export function rememberUnlockPassword(password: string): void {
  forgetUnlockPassword();
  held = { password, timer: setTimeout(forgetUnlockPassword, TTL_MS) };
}

/** Entrega a senha uma única vez. */
export function takeUnlockPassword(): string | null {
  const password = held?.password ?? null;
  forgetUnlockPassword();
  return password;
}
