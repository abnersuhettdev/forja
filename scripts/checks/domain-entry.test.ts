// PR-DES-03 (SEG-04 §2): o ponto de entrada principal do domínio não carrega o Zod em tempo de
// execução — os esquemas ficam em "@forja/domain/validacao", carregado sob demanda pelo app.
import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../../packages/domain/src");

/** Módulos alcançados em tempo de execução (ignora `import type` e `export type`). */
function runtimeClosure(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    const source = readFileSync(file, "utf8");
    const specifiers = [
      ...source.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^;]*?\sfrom\s+)?"([^"]+)";/gm),
    ].map((m) => m[1] ?? "");
    seen.set(file, specifiers);
    for (const spec of specifiers) {
      if (spec.startsWith(".")) visit(normalize(join(dirname(file), spec)));
    }
  };
  visit(normalize(entry));
  return seen;
}

describe("pontos de entrada do domínio (PR-DES-03)", () => {
  it("o ponto de entrada principal não alcança o Zod", () => {
    const closure = runtimeClosure(join(SRC, "index.ts"));
    const withZod = [...closure].filter(([, specs]) => specs.some((s) => s === "zod"));
    expect(withZod.map(([file]) => file)).toEqual([]);
    expect(closure.size).toBeGreaterThan(10);
  });

  it("o motor fica fora do ponto de entrada principal e não alcança o Zod (SEG-04 §1)", () => {
    const main = runtimeClosure(join(SRC, "index.ts"));
    expect([...main.keys()].filter((file) => file.includes("motor"))).toEqual([]);
    const motor = runtimeClosure(join(SRC, "motor/index.ts"));
    expect([...motor].filter(([, specs]) => specs.includes("zod"))).toEqual([]);
  });

  it("a validação continua com o Zod (o teste acima não é vazio por engano)", () => {
    const closure = runtimeClosure(join(SRC, "validacao/index.ts"));
    expect([...closure].some(([, specs]) => specs.includes("zod"))).toBe(true);
  });
});
