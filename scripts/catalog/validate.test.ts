// Testes do validador do catálogo (TAR-012; DAD-06 §4).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CATALOG_PATH,
  MIN_EXERCISES,
  SOURCE_PATH,
  readSourceIds,
  validateCatalog,
  type CatalogEntry,
} from "./validate.ts";

const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as CatalogEntry[];
const sourceIds = readSourceIds(SOURCE_PATH);

describe("catálogo curado", () => {
  it("atende ao esquema e às metas de DAD-06 §4", () => {
    const report = validateCatalog(catalog, sourceIds);
    expect(report.problems).toEqual([]);
    expect(report.total).toBeGreaterThanOrEqual(MIN_EXERCISES);
  });

  it("não publica imagens sem procedência comprovada (ADR-052)", () => {
    expect(catalog.filter((e) => e.images.length > 0)).toEqual([]);
  });

  it("em modo de lançamento, exige textos revisados (CA-038)", () => {
    const report = validateCatalog(catalog, sourceIds, { release: true });
    const pending = catalog.filter((e) => e.text_review !== "revisado").length;
    expect(report.problems.some((p) => p.includes("aguardam revisão"))).toBe(pending > 0);
  });
});

describe("validador", () => {
  const base = catalog[0];
  if (base === undefined) throw new Error("catálogo vazio");

  it("recusa código repetido, fonte inexistente e imagem sem procedência", () => {
    const report = validateCatalog(
      [
        ...catalog,
        { ...base, source_ref: "Inexistente" },
        {
          ...base,
          codigo: "outro",
          images: [{ file: "a.jpg", license: "CC0", attribution: "x", source_url: "https://a.b" }],
        },
      ],
      sourceIds,
    );
    expect(report.problems).toEqual(
      expect.arrayContaining([
        `${base.codigo}: código repetido.`,
        `${base.codigo}: "Inexistente" não existe no snapshot da fonte.`,
        expect.stringContaining("Imagem sem procedência comprovada."),
      ]),
    );
  });

  it("aponta cobertura insuficiente e máquina sem alternativa", () => {
    const machines = catalog.filter((e) => e.codigo === "cadeira-extensora");
    const report = validateCatalog(machines, sourceIds);
    expect(report.problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`mínimo ${String(MIN_EXERCISES)}`),
        "Grupo chest: 0 exercícios; mínimo 3.",
        "Nenhum exercício de nível advanced.",
        "cadeira-extensora: máquina sem alternativa livre ou corporal.",
      ]),
    );
  });

  it("recusa linguagem clínica e lista que não é catálogo", () => {
    const clinical = { ...base, safety_tips: ["Serve como tratamento da dor."] };
    expect(validateCatalog([clinical], sourceIds).problems).toEqual(
      expect.arrayContaining([expect.stringContaining("Linguagem clínica")]),
    );
    expect(validateCatalog({}, sourceIds).problems).toContain(
      "O catálogo deve ser uma lista de exercícios.",
    );
  });
});
