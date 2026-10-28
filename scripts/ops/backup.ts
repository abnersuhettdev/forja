// Backup lógico criptografado (IMP-03 §1, ADR-073): `supabase db dump` (papéis, esquema, dados
// — incluindo os usuários do serviço de autenticação — e histórico de migrações), cada arquivo cifrado com a CHAVE PÚBLICA
// `age` e acompanhado de soma de verificação. O texto em claro só existe numa pasta temporária,
// apagada ao final; só a chave privada do usuário decifra.
//
// Uso:
//   BACKUP_AGE_RECIPIENT=age1... SUPABASE_DB_URL=postgres://... node scripts/ops/backup.ts --out <pasta>
//   BACKUP_AGE_RECIPIENT=age1... node scripts/ops/backup.ts --local --out <pasta>
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Encrypter } from "age-encryption";

/**
 * Arquivos na ordem de importação. Dados só de `auth` e `public` (onde estão todos os dados do
 * app; tabelas internas do Storage e das Functions já existem em qualquer projeto novo e
 * conflitariam). O histórico de migrações (`supabase_migrations`) vai à parte, como no guia do
 * provedor para restaurar em projeto novo — sem ele, o próximo deploy reaplicaria tudo.
 */
export const DUMPS = [
  { file: "roles.sql", args: ["--role-only"] },
  { file: "schema.sql", args: [] },
  { file: "history_schema.sql", args: ["--schema", "supabase_migrations"] },
  { file: "data.sql", args: ["--use-copy", "--data-only", "--schema", "auth,public"] },
  {
    file: "history_data.sql",
    args: ["--use-copy", "--data-only", "--schema", "supabase_migrations"],
  },
] as const;

export const SUMS_FILE = "SHA256SUMS";

export function sha256(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Linhas `<hash>  <arquivo>`, no formato do `sha256sum` (verificável com `sha256sum -c`). */
export function sumsFile(entries: readonly { file: string; hash: string }[]): string {
  return entries.map((e) => `${e.hash}  ${e.file}`).join("\n") + "\n";
}

const supabaseBin = join(
  import.meta.dirname,
  "../../node_modules/.bin",
  process.platform === "win32" ? "supabase.cmd" : "supabase",
);

export async function backup(options: {
  out: string;
  recipient: string;
  target: { local: true } | { dbUrl: string };
}): Promise<{ file: string; bytes: number }[]> {
  if (!/^age1[0-9a-z]+$/.test(options.recipient)) {
    throw new Error("BACKUP_AGE_RECIPIENT deve ser uma chave pública age (age1...).");
  }
  const target = "local" in options.target ? ["--local"] : ["--db-url", options.target.dbUrl];
  const plain = mkdtempSync(join(tmpdir(), "forja-backup-"));
  mkdirSync(options.out, { recursive: true });
  const written: { file: string; bytes: number; hash: string }[] = [];
  try {
    for (const dump of DUMPS) {
      const path = join(plain, dump.file);
      execFileSync(supabaseBin, ["db", "dump", ...target, ...dump.args, "-f", path], {
        stdio: ["ignore", "ignore", "inherit"],
        shell: process.platform === "win32",
      });
      const encrypter = new Encrypter();
      encrypter.addRecipient(options.recipient);
      const encrypted = await encrypter.encrypt(readFileSync(path));
      const file = `${dump.file}.age`;
      writeFileSync(join(options.out, file), encrypted);
      written.push({ file, bytes: encrypted.length, hash: sha256(encrypted) });
    }
  } finally {
    rmSync(plain, { recursive: true, force: true });
  }
  writeFileSync(join(options.out, SUMS_FILE), sumsFile(written));
  return written.map(({ file, bytes }) => ({ file, bytes }));
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const out = args[args.indexOf("--out") + 1];
  const recipient = process.env.BACKUP_AGE_RECIPIENT ?? "";
  const dbUrl = process.env.SUPABASE_DB_URL ?? "";
  if (!args.includes("--out") || out === undefined) throw new Error("Informe --out <pasta>.");
  if (!args.includes("--local") && dbUrl === "") throw new Error("Defina SUPABASE_DB_URL.");
  const files = await backup({
    out,
    recipient,
    target: args.includes("--local") ? { local: true } : { dbUrl },
  });
  // Só nomes e tamanhos: nenhum conteúdo do banco no registro do CI.
  for (const f of files) console.log(`${f.file}: ${String(f.bytes)} bytes`);
}
