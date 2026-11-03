import { describe, expect, it } from "vitest";
import { publishableKey } from "./public-key.ts";

describe("chave publishable da função", () => {
  it("usa a chave default do JSON do provedor", () => {
    expect(publishableKey('{"outra":"sb_publishable_b","default":"sb_publishable_a"}')).toBe(
      "sb_publishable_a",
    );
  });

  it("sem default, usa a primeira chave", () => {
    expect(publishableKey('{"app":"sb_publishable_c"}')).toBe("sb_publishable_c");
  });

  it("a chave local só vale quando a variável da nuvem está ausente", () => {
    expect(publishableKey(undefined, "sb_publishable_local")).toBe("sb_publishable_local");
    expect(publishableKey('{"default":"sb_publishable_a"}', "sb_publishable_local")).toBe(
      "sb_publishable_a",
    );
    expect(() => publishableKey("inválida", "sb_publishable_local")).toThrow();
  });

  it("ausente, inválida ou vazia: falha ao iniciar, em vez de operar sem chave", () => {
    for (const value of [undefined, "", "não é json", "{}", "null", '{"default":""}']) {
      expect(() => publishableKey(value)).toThrow("SUPABASE_PUBLISHABLE_KEYS");
    }
  });
});
