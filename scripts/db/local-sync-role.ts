// Ambiente LOCAL (ADR-090): configuração da função de sincronização e login do papel
// sync_writer. Em produção, o mesmo passo é operacional, com a senha só nos segredos da
// função (IMP-01 §2).
//   --env    antes de `supabase start`: garante supabase/functions/.env (ignorado pelo git),
//            gerando uma senha aleatória só na primeira vez (a função lê o arquivo ao subir)
//   --apply  depois de `supabase start`: aplica essa senha ao papel no banco local
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import { localStatus } from "./local.ts";

/** Banco na rede do Docker do Supabase local (o resolvedor do Deno recusa nomes com "_"). */
const DB_HOST_IN_DOCKER = "db.supabase.internal:5432";
const DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5199"];
const FUNCTIONS_ENV = new URL("../../supabase/functions/.env", import.meta.url);

function readPassword(): string | null {
  if (!existsSync(FUNCTIONS_ENV)) return null;
  const match = /^SYNC_DB_URL=postgresql:\/\/sync_writer:([^@]+)@/m.exec(
    readFileSync(FUNCTIONS_ENV, "utf8"),
  );
  return match?.[1] ?? null;
}

function ensureEnv(): string {
  const existing = readPassword();
  if (existing) return existing;
  const password = randomBytes(24).toString("base64url");
  writeFileSync(
    FUNCTIONS_ENV,
    [
      "# Gerado por scripts/db/local-sync-role.ts — somente ambiente local",
      `SYNC_DB_URL=postgresql://sync_writer:${password}@${DB_HOST_IN_DOCKER}/postgres`,
      `ALLOWED_ORIGINS=${DEV_ORIGINS.join(",")}`,
      "",
    ].join("\n"),
  );
  return password;
}

async function apply(password: string): Promise<void> {
  const admin = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    // A senha é base64url (sem aspas), gerada por este script.
    await admin.unsafe(`alter role sync_writer with login password '${password}'`);
  } finally {
    await admin.end();
  }
}

const mode = process.argv[2];
if (mode === "--env") {
  ensureEnv();
  console.log("supabase/functions/.env pronto.");
} else if (mode === "--apply") {
  await apply(ensureEnv());
  console.log("Papel sync_writer habilitado no banco local.");
} else {
  console.error("Uso: node scripts/db/local-sync-role.ts --env | --apply");
  process.exitCode = 1;
}
