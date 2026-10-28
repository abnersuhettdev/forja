// Relato técnico (API-030): só a rota lógica sai do aparelho, nunca o endereço real.
import { describe, expect, it } from "vitest";
import { logicalRoute, reportDiagnostic } from "./diagnostics.ts";

describe("rota lógica do relato", () => {
  it("troca identificadores pelo padrão da rota", () => {
    expect(logicalRoute("/sessoes/0f5d7c3e-1e2a-4b8a-9f61-6c1d2e3f4a5b/editar")).toBe(
      "/sessoes/:id/editar",
    );
    expect(logicalRoute("/agenda/2026-10-27")).toBe("/agenda/:data");
    expect(logicalRoute("/hoje")).toBe("/hoje");
    expect(logicalRoute("/qualquer/coisa")).toBe("desconhecida");
  });

  it("sem sessão de acesso, o relato é descartado em silêncio", async () => {
    await expect(reportDiagnostic("UNEXPECTED", "/hoje")).resolves.toBeUndefined();
  });
});
