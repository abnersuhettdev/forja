// Prova de qualidade da IA (V12-05, PLN-06 §3.4): roda os 20 perfis fictícios nos modelos gratuitos
// do Workers AI e mede formato, respeito às restrições, português, tempo e custo.
//
// Uso: pnpm ia:prova [--limite 2] [--modelos gemma,qwen]
// Credenciais em .env.ia.local, fora do Git: CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_AI_TOKEN.
//
// Para antes de gastar a cota diária e continua de onde parou na próxima execução. O token nunca é
// impresso; os resultados ficam em .ia-prova/, também fora do Git.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { RESTRICTION_EXCLUDED_MARKERS } from "../../packages/domain/src/index.ts";
import { generateProgram, type MotorExercise } from "../../packages/domain/src/motor/index.ts";
import {
  buildAiRequest,
  validateAiReply,
  type AiReply,
} from "../../packages/domain/src/motor/ia.ts";
import { readCatalog } from "../catalog/seed-sql.ts";
import { PROFILES, type ProofProfile } from "./perfis.ts";

const REFERENCE_DATE = "2026-11-10";
/** Margem sobre a cota de 10.000 neurônios por dia, para não atrapalhar outros usos. */
export const NEURON_BUDGET = 8_000;
const MAX_TOKENS = 1_500;
const OUT_DIR = new URL("../../.ia-prova/", import.meta.url);
const RESULTS = new URL("resultados.json", OUT_DIR);
const REPORT = new URL("relatorio.md", OUT_DIR);

/** Neurônios por milhão de tokens (entrada, saída), da página de preços em 2026-11-04. */
export const MODELS = {
  gemma: { id: "@cf/google/gemma-4-26b-a4b-it", input: 9_091, output: 27_273 },
  qwen: { id: "@cf/qwen/qwen3-30b-a3b-fp8", input: 4_625, output: 30_475 },
  gptoss: { id: "@cf/openai/gpt-oss-20b", input: 18_182, output: 27_273 },
  llama: { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", input: 26_668, output: 204_805 },
} as const;
export type ModelKey = keyof typeof MODELS;

export interface RunResult {
  readonly model: ModelKey;
  readonly profile: string;
  readonly ok: boolean;
  readonly problem: string | null;
  readonly swaps: number;
  readonly violations: number;
  readonly portuguese: boolean;
  readonly ms: number;
  readonly neurons: number;
  readonly summary: string;
  readonly reasons: readonly string[];
}

const toMotor = (): MotorExercise[] =>
  readCatalog().map((e) => ({
    id: e.codigo,
    code: e.source_ref,
    name: e.name,
    difficulty: e.difficulty,
    measure_type: e.measure_type,
    movement_pattern: e.movement_pattern,
    load_markers: [...e.load_markers, ...e.load_markers_v12],
    contraindications: e.contraindications,
    primary: e.primary_muscles,
    secondary: e.secondary_muscles,
    equipment: e.equipment,
  }));

/** Heurística simples: palavras comuns de português e nenhuma frase típica de inglês. */
export function looksPortuguese(text: string): boolean {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length === 0) return false;
  const common = new Set(["a", "o", "e", "de", "da", "do", "para", "com", "que", "em", "os", "as"]);
  const english = new Set(["the", "and", "with", "for", "this", "your", "is", "of"]);
  const pt = words.filter((w) => common.has(w)).length;
  const en = words.filter((w) => english.has(w)).length;
  return pt > en && pt / words.length >= 0.1;
}

/** Texto da resposta nos formatos que os modelos usam. */
export function replyText(body: unknown): unknown {
  const result = (body as { result?: Record<string, unknown> }).result;
  if (result === undefined) return undefined;
  if (result.response !== undefined) return result.response;
  const choices = result.choices as { message?: { content?: unknown } }[] | undefined;
  return choices?.[0]?.message?.content;
}

export function neuronsOf(model: ModelKey, body: unknown): number {
  const usage = (
    body as { result?: { usage?: { prompt_tokens?: number; completion_tokens?: number } } }
  ).result?.usage;
  const price = MODELS[model];
  return (
    ((usage?.prompt_tokens ?? 0) * price.input + (usage?.completion_tokens ?? 0) * price.output) /
    1_000_000
  );
}

/** Conta as trocas fora das regras: a validação já as recusa, mas o número mede o modelo. */
function countViolations(reply: AiReply, profile: ProofProfile, catalog: readonly MotorExercise[]) {
  if (!reply.ok) return reply.problem === "option_not_allowed" ? 1 : 0;
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const restrictions = profile.profile.restriction_codes ?? [];
  return reply.swaps.filter((swap) => {
    const exercise = byId.get(swap.exercise_id);
    if (exercise === undefined) return true;
    return restrictions.some(
      (r) =>
        exercise.contraindications.includes(r) ||
        RESTRICTION_EXCLUDED_MARKERS[r].some((m) => exercise.load_markers.includes(m)),
    );
  }).length;
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export async function runOne(
  model: ModelKey,
  entry: ProofProfile,
  catalog: readonly MotorExercise[],
  credentials: { readonly accountId: string; readonly token: string },
  fetcher: Fetcher = fetch,
): Promise<RunResult | "quota" | "failed"> {
  const generated = generateProgram({
    profile: entry.profile,
    catalog,
    referenceDate: REFERENCE_DATE,
  });
  if (generated.status !== "generated") throw new Error(`Perfil inválido: ${entry.id}`);
  const request = buildAiRequest({
    profile: entry.profile,
    catalog,
    referenceDate: REFERENCE_DATE,
    workouts: generated.program.workouts,
    extras: entry.extras,
  });
  if (request === null) throw new Error(`Perfil inválido: ${entry.id}`);

  const started = performance.now();
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/ai/run/${MODELS[model].id}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
      }),
    },
  );
  const ms = Math.round(performance.now() - started);
  if (response.status === 429) return "quota";
  if (!response.ok) {
    console.error(`${MODELS[model].id}: resposta HTTP ${String(response.status)}`);
    return "failed";
  }
  const body: unknown = await response.json();
  const reply = validateAiReply(replyText(body), request);
  const text = reply.ok ? [reply.summary, ...reply.reasons].join(" ") : "";
  return {
    model,
    profile: entry.id,
    ok: reply.ok,
    problem: reply.ok ? null : reply.problem,
    swaps: reply.ok ? reply.swaps.length : 0,
    violations: countViolations(reply, entry, catalog),
    portuguese: reply.ok && looksPortuguese(text),
    ms,
    neurons: Math.round(neuronsOf(model, body) * 10) / 10,
    summary: reply.ok ? reply.summary : "",
    reasons: reply.ok ? reply.reasons : [],
  };
}

const percent = (part: number, total: number) =>
  total === 0 ? "—" : `${String(Math.round((part / total) * 100))}%`;

export function renderReport(results: readonly RunResult[]): string {
  const lines = [
    "# Prova de qualidade da IA (perfis fictícios)",
    "",
    "| Modelo | Perfis | Formato válido | Fora das regras | Em português | Trocas | Tempo médio | Neurônios por geração | Gerações por dia |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const key of Object.keys(MODELS) as ModelKey[]) {
    const rows = results.filter((r) => r.model === key);
    if (rows.length === 0) continue;
    const avg = (pick: (r: RunResult) => number) =>
      rows.reduce((sum, r) => sum + pick(r), 0) / rows.length;
    const neurons = avg((r) => r.neurons);
    lines.push(
      `| ${MODELS[key].id} | ${String(rows.length)} | ${percent(rows.filter((r) => r.ok).length, rows.length)} | ${String(rows.reduce((s, r) => s + r.violations, 0))} | ${percent(rows.filter((r) => r.portuguese).length, rows.length)} | ${String(rows.reduce((s, r) => s + r.swaps, 0))} | ${(avg((r) => r.ms) / 1000).toFixed(1)} s | ${neurons.toFixed(0)} | ${neurons > 0 ? String(Math.floor(10_000 / neurons)) : "—"} |`,
    );
  }
  lines.push("", "## Textos para ler", "");
  for (const row of results) {
    lines.push(
      `### ${row.model} · ${row.profile}${row.ok ? "" : ` · descartada: ${row.problem ?? ""}`}`,
    );
    if (row.ok) lines.push("", row.summary, "", ...row.reasons.map((r) => `- ${r}`));
    lines.push("");
  }
  return lines.join("\n");
}

function readCredentials() {
  const file = new URL("../../.env.ia.local", import.meta.url);
  if (!existsSync(file)) return null;
  const values = new Map(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()] as const;
      }),
  );
  const accountId = values.get("CLOUDFLARE_ACCOUNT_ID");
  const token = values.get("CLOUDFLARE_AI_TOKEN");
  return accountId && token ? { accountId, token } : null;
}

async function main() {
  const { values } = parseArgs({
    options: { limite: { type: "string" }, modelos: { type: "string" } },
  });
  const credentials = readCredentials();
  if (credentials === null) {
    console.error("Crie .env.ia.local com CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_AI_TOKEN.");
    process.exitCode = 1;
    return;
  }
  const keys = (values.modelos?.split(",") ?? ["qwen", "gemma", "gptoss", "llama"]) as ModelKey[];
  const profiles = PROFILES.slice(0, values.limite ? Number(values.limite) : PROFILES.length);
  const catalog = toMotor();
  mkdirSync(OUT_DIR, { recursive: true });
  const results: RunResult[] = existsSync(RESULTS)
    ? (JSON.parse(readFileSync(RESULTS, "utf8")) as RunResult[])
    : [];
  let spent = 0;
  let stopped = false;
  for (const model of keys) {
    for (const entry of profiles) {
      if (results.some((r) => r.model === model && r.profile === entry.id)) continue;
      if (spent >= NEURON_BUDGET) {
        stopped = true;
        break;
      }
      const outcome = await runOne(model, entry, catalog, credentials);
      if (outcome === "quota") {
        console.log("Cota do dia esgotada. Rode de novo amanhã: a prova continua de onde parou.");
        stopped = true;
        break;
      }
      // Modelo fora do ar ou token recusado: não adianta insistir neste modelo.
      if (outcome === "failed") break;
      results.push(outcome);
      spent += outcome.neurons;
      writeFileSync(RESULTS, JSON.stringify(results, null, 2));
      console.log(
        `${model} ${entry.id}: ${outcome.ok ? "ok" : (outcome.problem ?? "")} · ${String(outcome.neurons)} neurônios`,
      );
    }
    if (stopped) break;
  }
  writeFileSync(REPORT, renderReport(results));
  console.log(`Gastos nesta execução: ${String(Math.round(spent))} neurônios.`);
  console.log(
    stopped
      ? "Parou antes do fim, para não passar da cota. Rode de novo amanhã."
      : "Fim. Veja .ia-prova/relatorio.md",
  );
}

if (import.meta.main) await main();
