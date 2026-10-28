// Orçamento de JavaScript inicial (SEG-04 §2: ≤ 200 KB comprimido; PR-DES-02 item 3): soma o
// gzip dos scripts que a página carrega de início (script de entrada + modulepreload).
// Mede o build CONFIGURADO com o endereço do backend: sem ele, o empacotador elimina o cliente
// do provedor como inalcançável e o número sai menor do que o real (erro já cometido uma vez).
//
// Uso: node apps/web/scripts/check-budget.ts <pasta do build>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

export const BUDGET_BYTES = 200_000;

/** Scripts carregados de início, na ordem em que aparecem no HTML. */
export function initialScripts(html: string): string[] {
  return [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(
    (m) => m[1] ?? "",
  );
}

export function measure(dir: string): { files: { file: string; gzip: number }[]; total: number } {
  const files = initialScripts(readFileSync(join(dir, "index.html"), "utf8")).map((file) => ({
    file,
    gzip: gzipSync(readFileSync(join(dir, file)), { level: 9 }).length,
  }));
  return { files, total: files.reduce((sum, f) => sum + f.gzip, 0) };
}

/** O build mede o app real só se o cliente do provedor estiver no pacote inicial. */
export function hasBackendClient(dir: string): boolean {
  return initialScripts(readFileSync(join(dir, "index.html"), "utf8")).some((file) =>
    readFileSync(join(dir, file), "utf8").includes("/auth/v1"),
  );
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (dir === undefined) throw new Error("Informe a pasta do build.");
  if (!hasBackendClient(dir)) {
    console.error(
      "Build sem o endereço do backend: a medição não representa o app. Gere o build com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
    process.exit(1);
  }
  const { files, total } = measure(dir);
  for (const f of files) console.log(`${f.file}: ${String(f.gzip)} bytes gzip`);
  const kb = (n: number) => (n / 1000).toFixed(1);
  console.log(`JS inicial: ${kb(total)} KB gzip (orçamento ${kb(BUDGET_BYTES)} KB)`);
  if (total > BUDGET_BYTES) {
    console.error(`Acima do orçamento em ${kb(total - BUDGET_BYTES)} KB (SEG-04 §2).`);
    process.exit(1);
  }
}
