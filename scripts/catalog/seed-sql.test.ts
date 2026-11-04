// O seed e as listas da migração do catálogo coincidem com o arquivo curado e o domínio.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOAD_MARKERS, MOVEMENT_PATTERNS } from "../../packages/domain/src/index.ts";
import {
  exerciseId,
  readCatalog,
  renderCatalogSeed,
  renderImagesSeed,
  renderSafetySeed,
  stableUuid,
} from "./seed-sql.ts";

const migration = (name: string) =>
  readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8");

/** Valores entre aspas simples dentro do trecho que começa em `marker` e termina em `end`. */
function quotedValues(text: string, marker: string, end: string): string[] {
  const start = text.indexOf(marker);
  const block = text.slice(start, text.indexOf(end, start));
  return [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1] ?? "");
}

describe("seed do catálogo (DAD-07 §3)", () => {
  it("a migração contém exatamente o seed gerado do arquivo curado", () => {
    expect(migration("20261027140100_seed_catalog_v1.sql")).toContain(renderCatalogSeed());
  });

  it("a migração das fotos contém exatamente o seed gerado do arquivo curado (ADR-094)", () => {
    expect(migration("20261104120000_seed_catalog_images.sql")).toContain(renderImagesSeed());
  });

  it("a migração de segurança contém exatamente o seed gerado do arquivo curado (V12-06)", () => {
    expect(migration("20261104130000_catalog_contraindications.sql")).toContain(renderSafetySeed());
  });

  it("identificadores são estáveis, únicos e no formato UUID", () => {
    const ids = readCatalog().map((e) => exerciseId(e.codigo));
    expect(new Set(ids).size).toBe(ids.length);
    expect(stableUuid("x")).toBe(stableUuid("x"));
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  it("padrões de movimento e marcadores da migração são os de TRN-03", () => {
    const schema = migration("20261027140000_catalog.sql");
    expect(quotedValues(schema, "movement_pattern text not null check", "))")).toEqual([
      ...MOVEMENT_PATTERNS,
    ]);
    expect(quotedValues(schema, "load_markers text[]", "]::text[]")).toEqual([...LOAD_MARKERS]);
  });
});
