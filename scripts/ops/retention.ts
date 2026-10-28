// Limpeza diária de retenção (SEG-02 §3, ADR-072): executa `app.run_retention()` e registra só
// as contagens (nenhum dado pessoal no registro do CI).
// Uso:
//   SUPABASE_DB_URL=postgres://... node scripts/ops/retention.ts
//   node scripts/ops/retention.ts --local
import postgres from "postgres";
import { localStatus } from "../db/local.ts";

const url = process.argv.includes("--local")
  ? localStatus().DB_URL
  : (process.env.SUPABASE_DB_URL ?? "");
if (url === "") {
  console.error("Defina SUPABASE_DB_URL (ou use --local).");
  process.exit(1);
}

const sql = postgres(url, { onnotice: () => undefined, max: 1 });
try {
  const [row] = await sql<{ removed: Record<string, number> }[]>`
    select app.run_retention() as removed`;
  console.log("Retenção aplicada:", JSON.stringify(row?.removed ?? {}));
} finally {
  await sql.end();
}
