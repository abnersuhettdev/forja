// Configura a função de sincronização num projeto real (IMP-01 §2; ADR-050): dá login ao papel
// sync_writer com a senha do cofre do CI e grava os segredos da função. Nenhum valor é registrado.
//
// Uso (no CI):
//   SUPABASE_DB_URL=... SUPABASE_URL=... SYNC_DB_PASSWORD=... [APP_URL=...]
//   [CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_AI_TOKEN=...]
//   SUPABASE_ACCESS_TOKEN=... node scripts/ops/configure-sync.ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";

/** Referência do projeto: o `xxxx` de `https://xxxx.supabase.co`. */
export function projectRef(supabaseUrl: string): string {
  const ref = /^([a-z0-9]+)\.supabase\.co$/.exec(new URL(supabaseUrl).hostname)?.[1];
  if (ref === undefined) throw new Error("SUPABASE_URL não é o endereço de um projeto.");
  return ref;
}

/**
 * Endereço do papel sync_writer no mesmo servidor do endereço administrativo. No pooler, o
 * usuário leva a referência do projeto (`postgres.xxxx` → `sync_writer.xxxx`).
 */
export function syncDbUrl(adminUrl: string, password: string): string {
  const url = new URL(adminUrl);
  url.username = url.username.replace(/^[^.]+/, "sync_writer");
  url.password = password;
  return url.toString();
}

/**
 * Conteúdo do arquivo de segredos das funções. Os da Workers AI (ADR-093) só entram quando os dois
 * existem: sem eles, a função de IA devolve só o motor (RN-062).
 */
export function secretsFile(input: {
  readonly syncUrl: string;
  readonly origins: string;
  readonly cloudflareAccount?: string | undefined;
  readonly cloudflareToken?: string | undefined;
}): string {
  const lines = [`SYNC_DB_URL=${input.syncUrl}`];
  if (input.origins !== "") lines.push(`ALLOWED_ORIGINS=${input.origins}`);
  if (input.cloudflareAccount && input.cloudflareToken) {
    lines.push(`CLOUDFLARE_ACCOUNT_ID=${input.cloudflareAccount}`);
    lines.push(`CLOUDFLARE_AI_TOKEN=${input.cloudflareToken}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Tira segredos de um texto antes de registrá-lo. */
export function redact(text: string, secrets: readonly string[]): string {
  return secrets.reduce(
    (out, secret) => (secret === "" ? out : out.split(secret).join("***")),
    text,
  );
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`Defina ${name}.`);
  return value;
}

if (import.meta.main) {
  const adminUrl = required("SUPABASE_DB_URL");
  const password = required("SYNC_DB_PASSWORD");
  const ref = projectRef(required("SUPABASE_URL"));
  // A senha entra no comando SQL: só caracteres que dispensam escape.
  if (!/^[A-Za-z0-9_-]{32,}$/.test(password)) {
    throw new Error("SYNC_DB_PASSWORD deve ter 32+ caracteres (letras, números, _ e -).");
  }

  const admin = postgres(adminUrl, { onnotice: () => undefined, max: 1 });
  try {
    await admin.unsafe(`alter role sync_writer with login password '${password}'`);
  } finally {
    await admin.end();
  }

  // Os valores vão por arquivo temporário, nunca como argumentos: uma falha do comando repetiria
  // os argumentos na mensagem de erro.
  const origins = process.env.APP_URL ? new URL(process.env.APP_URL).origin : "";
  const url = syncDbUrl(adminUrl, password);
  const dir = mkdtempSync(join(tmpdir(), "forja-segredos-"));
  const envFile = join(dir, "segredos.env");
  const cloudflareAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cloudflareToken = process.env.CLOUDFLARE_AI_TOKEN;
  writeFileSync(
    envFile,
    secretsFile({ syncUrl: url, origins, cloudflareAccount, cloudflareToken }),
    { mode: 0o600 },
  );
  try {
    execFileSync(
      join(import.meta.dirname, "../../node_modules/.bin/supabase"),
      ["secrets", "set", "--project-ref", ref, "--env-file", envFile],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    console.error(
      `supabase secrets set falhou: ${redact(stderr, [url, password, adminUrl, cloudflareToken ?? ""])}`,
    );
    process.exit(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const ai = cloudflareAccount && cloudflareToken ? "com" : "sem";
  console.log(
    `Papel sync_writer e segredos das funções configurados (origem: ${origins || "—"}; ${ai} Workers AI).`,
  );
}
