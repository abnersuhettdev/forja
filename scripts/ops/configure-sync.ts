// Configura a função de sincronização num projeto real (IMP-01 §2; ADR-050): dá login ao papel
// sync_writer com a senha do cofre do CI e grava os segredos da função. Nenhum valor é registrado.
//
// Uso (no CI):
//   SUPABASE_DB_URL=... SUPABASE_URL=... SYNC_DB_PASSWORD=... [APP_URL=...]
//   SUPABASE_ACCESS_TOKEN=... node scripts/ops/configure-sync.ts
import { execFileSync } from "node:child_process";
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

  // Saída ignorada: os valores não aparecem no registro do CI.
  const origins = process.env.APP_URL ? new URL(process.env.APP_URL).origin : "";
  execFileSync(
    join(import.meta.dirname, "../../node_modules/.bin/supabase"),
    [
      "secrets",
      "set",
      "--project-ref",
      ref,
      `SYNC_DB_URL=${syncDbUrl(adminUrl, password)}`,
      ...(origins === "" ? [] : [`ALLOWED_ORIGINS=${origins}`]),
    ],
    { stdio: "ignore" },
  );
  console.log(`Papel sync_writer e segredos da função configurados (origem: ${origins || "—"}).`);
}
