// Verifica as licenças das dependências instaladas (ARQ-04 §8, VH-10).
// - Dependências de produção (vão para o pacote distribuído): só licenças permissivas.
// - Dependências de desenvolvimento: copyleft forte (GPL/AGPL/LGPL/SSPL) é recusado;
//   licenças fora da lista permissiva geram aviso, sem falhar.
import { execFileSync } from "node:child_process";

const PERMISSIVE = new Set([
  "MIT",
  "MIT-0",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "0BSD",
  "OFL-1.1",
  "CC0-1.0",
  "Unlicense",
  "BlueOak-1.0.0",
  "Python-2.0",
  "CC-BY-4.0",
]);
const STRONG_COPYLEFT = /\b(A?GPL|LGPL|SSPL)/i;

interface PackageInfo {
  name: string;
  versions: string[];
}
type LicenseReport = Record<string, PackageInfo[]>;

function listLicenses(scope: "--prod" | "--dev"): LicenseReport {
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error("Execute por meio do pnpm: pnpm licenses:check");
  // O pnpm pode ser um script JavaScript (executado pelo Node) ou um executável nativo.
  const args = ["licenses", "list", "--json", scope];
  const isScript = /\.[cm]?js$/i.test(pnpm);
  const output = execFileSync(
    isScript ? process.execPath : pnpm,
    isScript ? [pnpm, ...args] : args,
    {
      encoding: "utf8",
    },
  );
  return output.trim() === "" ? {} : (JSON.parse(output) as LicenseReport);
}

// Aceita expressões SPDX simples: "A OR B" basta uma permissiva; "A AND B" exige todas.
function isPermissive(expression: string): boolean {
  const clean = expression.replace(/[()]/g, "").trim();
  if (clean.includes(" OR ")) return clean.split(" OR ").some((part) => isPermissive(part));
  if (clean.includes(" AND ")) return clean.split(" AND ").every((part) => isPermissive(part));
  return PERMISSIVE.has(clean);
}

const problems: string[] = [];
const warnings: string[] = [];

for (const [license, packages] of Object.entries(listLicenses("--prod"))) {
  if (!isPermissive(license)) {
    problems.push(`produção: ${license} → ${packages.map((p) => p.name).join(", ")}`);
  }
}
for (const [license, packages] of Object.entries(listLicenses("--dev"))) {
  if (isPermissive(license)) continue;
  const names = packages.map((p) => p.name).join(", ");
  if (STRONG_COPYLEFT.test(license)) problems.push(`desenvolvimento: ${license} → ${names}`);
  else warnings.push(`desenvolvimento (não distribuída): ${license} → ${names}`);
}

for (const warning of warnings) console.warn(`aviso: ${warning}`);
if (problems.length > 0) {
  for (const problem of problems) console.error(`licença não permitida — ${problem}`);
  process.exit(1);
}
console.log("Licenças verificadas: nenhuma incompatível.");
