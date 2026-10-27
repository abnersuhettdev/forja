// Identidade do aparelho e nome opaco do banco local por usuário (ADR-028 L1, RN-053 a).
// O identificador do aparelho é aleatório (DAD-02 sessions.device_id) e não é dado pessoal;
// o sal impede derivar o nome do banco a partir do identificador do usuário.

const DEVICE_KEY = "forja.aparelho";

interface DeviceIdentity {
  readonly id: string;
  readonly salt: string;
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function deviceIdentity(storage: Storage = localStorage): DeviceIdentity {
  try {
    const raw = storage.getItem(DEVICE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<DeviceIdentity>;
      if (typeof parsed.id === "string" && typeof parsed.salt === "string") {
        return { id: parsed.id, salt: parsed.salt };
      }
    }
  } catch {
    // Valor corrompido: gera nova identidade.
  }
  const identity = { id: crypto.randomUUID(), salt: randomHex(16) };
  try {
    storage.setItem(DEVICE_KEY, JSON.stringify(identity));
  } catch {
    // Sem armazenamento, a identidade vale só nesta abertura.
  }
  return identity;
}

/** Nome do banco local do usuário: resumo SHA-256 de sal + identificador, nunca e-mail. */
export async function localDatabaseName(userId: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${userId}`),
  );
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `forja-u-${hex.slice(0, 32)}`;
}
