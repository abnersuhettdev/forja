// Alerta de cota da IA (V12-10; RN-063): confere o consumo do dia anterior (UTC, como a cota do
// provedor) em `ai_usage` e falha acima de 80% do limite diário, o que faz o GitHub avisar por
// e-mail. Registra só totais por tipo e resultado: nenhum dado pessoal no registro do CI.
// Uso:
//   SUPABASE_DB_URL=postgres://... node scripts/ops/ai-quota.ts
//   node scripts/ops/ai-quota.ts --local
import postgres from "postgres";
import { DAILY_NEURON_LIMIT } from "../../supabase/functions/ai/routine.ts";
import { localStatus } from "../db/local.ts";

/** Decisão do usuário em 2026-11-06: alerta acima de 80% do limite diário. */
export const ALERT_RATIO = 0.8;

export interface UsageRow {
  readonly kind: string;
  readonly outcome: string;
  readonly calls: number;
  readonly neurons: number;
}

export function evaluateQuota(
  rows: readonly UsageRow[],
  limit: number = DAILY_NEURON_LIMIT,
): { readonly total: number; readonly threshold: number; readonly alert: boolean } {
  const total = Math.round(rows.reduce((sum, row) => sum + row.neurons, 0) * 100) / 100;
  const threshold = limit * ALERT_RATIO;
  return { total, threshold, alert: total > threshold };
}

/** Dia anterior em UTC, como o provedor zera a cota. */
export function previousUtcDay(now: Date): { readonly start: string; readonly end: string } {
  const end = `${now.toISOString().slice(0, 10)}T00:00:00Z`;
  const start = new Date(Date.parse(end) - 86_400_000).toISOString();
  return { start, end: new Date(Date.parse(end)).toISOString() };
}

if (import.meta.main) {
  const url = process.argv.includes("--local")
    ? localStatus().DB_URL
    : (process.env.SUPABASE_DB_URL ?? "");
  if (url === "") {
    console.error("Defina SUPABASE_DB_URL (ou use --local).");
    process.exit(1);
  }
  const { start, end } = previousUtcDay(new Date());
  const sql = postgres(url, { onnotice: () => undefined, max: 1 });
  let rows: UsageRow[];
  try {
    rows = await sql<UsageRow[]>`
      select kind, outcome, count(*)::int as calls, coalesce(sum(neurons), 0)::float8 as neurons
      from public.ai_usage where occurred_at >= ${start} and occurred_at < ${end}
      group by kind, outcome order by kind, outcome`;
  } finally {
    await sql.end();
  }
  const result = evaluateQuota(rows);
  console.log(`Consumo da IA em ${start.slice(0, 10)}:`, JSON.stringify(rows));
  console.log(`Total: ${String(result.total)} de ${String(DAILY_NEURON_LIMIT)} neurônios.`);
  if (result.alert) {
    console.error(
      `Acima de ${String(ALERT_RATIO * 100)}% do limite diário (${String(result.threshold)}). Rever o uso ou o limite (RN-063).`,
    );
    process.exit(1);
  }
}
