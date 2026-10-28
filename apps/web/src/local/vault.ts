// Pendências mantidas após a saída (RN-052 b, RN-053 e; ADR-028 L6; ADR-070; SEG-01 §6.2).
// Tudo o que ainda não chegou ao servidor (fila e sessão em andamento) é cifrado com chave
// derivada da senha do dono e guardado num cofre separado do banco do usuário, que é apagado.
// Em claro ficam só o identificador opaco do dono, sal, vetor, iterações e versão do formato.
import Dexie, { type Table } from "dexie";

/** ADR-070: PBKDF2-HMAC-SHA-256, 600.000 iterações; reduzir exige nova aprovação. */
export const VAULT_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const FORMAT_VERSION = 1;
const VAULT_NAME = "forja-cofre";

export interface VaultRecord {
  /** Chave automática do cofre. */
  readonly id?: number;
  /** Identificador opaco do dono (o mesmo nome opaco do banco local — ADR-028 L1). */
  readonly owner: string;
  readonly version: number;
  readonly iterations: number;
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  readonly ciphertext: ArrayBuffer;
  readonly created_at: string;
}

class VaultDatabase extends Dexie {
  declare records: Table<VaultRecord, number>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ records: "++id, owner" });
  }
}

let vaultName = VAULT_NAME;
/** Só para testes: cofre separado por teste. */
export function setVaultName(name: string): void {
  vaultName = name;
}

async function withVault<T>(run: (vault: VaultDatabase) => Promise<T>): Promise<T> {
  const vault = new VaultDatabase(vaultName);
  try {
    return await run(vault);
  } finally {
    vault.close();
  }
}

/** Chave AES-256-GCM não exportável, derivada da senha; nunca é armazenada. */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** O dono entra como dado autenticado: o conteúdo não pode ser trocado de dono. */
const ownerAad = (owner: string) =>
  new TextEncoder().encode(`forja-cofre:v${String(FORMAT_VERSION)}:${owner}`);

export async function seal(
  owner: string,
  password: string,
  content: unknown,
  iterations: number = VAULT_ITERATIONS,
  now: Date = new Date(),
): Promise<VaultRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: ownerAad(owner) },
    key,
    new TextEncoder().encode(JSON.stringify(content)),
  );
  return {
    owner,
    version: FORMAT_VERSION,
    iterations,
    salt,
    iv,
    ciphertext,
    created_at: now.toISOString(),
  };
}

/** Conteúdo decifrado, ou null se a senha não for a do momento da saída. */
export async function open(record: VaultRecord, password: string): Promise<unknown> {
  try {
    const key = await deriveKey(password, record.salt, record.iterations);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: record.iv as BufferSource, additionalData: ownerAad(record.owner) },
      key,
      record.ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plain)) as unknown;
  } catch {
    return null;
  }
}

export async function storeSealed(record: VaultRecord): Promise<void> {
  await withVault((vault) => vault.records.add(record));
}

export async function readSealed(owner: string): Promise<VaultRecord[]> {
  return withVault((vault) => vault.records.where("owner").equals(owner).sortBy("created_at"));
}

/** Remove registros do cofre (após liberar ou por decisão explícita de descartar). */
export async function removeSealed(ids: readonly number[]): Promise<void> {
  await withVault((vault) => vault.records.bulkDelete([...ids]));
}

/** Tempo (ms) da derivação de chave neste aparelho (ADR-070: limite de ~3 s). */
export async function measureDerivation(iterations: number = VAULT_ITERATIONS): Promise<number> {
  const started = performance.now();
  await deriveKey(
    "medicao-ficticia",
    crypto.getRandomValues(new Uint8Array(SALT_BYTES)),
    iterations,
  );
  return Math.round(performance.now() - started);
}
