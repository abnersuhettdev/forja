// A migração de taxonomias deve conter exatamente o seed gerado do pacote de domínio.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderTaxonomySeed } from "./taxonomies.ts";

const migration = readFileSync(
  new URL("../../supabase/migrations/20261027120100_taxonomies.sql", import.meta.url),
  "utf8",
);

describe("seed de taxonomias", () => {
  it("coincide com códigos e rótulos de TRN-01/TRN-03 do pacote de domínio", () => {
    expect(migration).toContain(renderTaxonomySeed());
  });
});
