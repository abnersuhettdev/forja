import { describe, expect, it } from "vitest";
import { platformOf } from "../src/index.ts";
import { diagnosticReportSchema } from "../src/validacao/index.ts";

describe("relato técnico (API-030)", () => {
  const valid = {
    app_version: "0.1.0",
    error_code: "UNEXPECTED",
    context: "/sessoes/:id/editar",
    platform: "android",
  };

  it("aceita só campos técnicos, sem identificadores nem textos livres", () => {
    expect(diagnosticReportSchema.safeParse(valid).success).toBe(true);
    // Endereço real (com identificador e letras maiúsculas) não é contexto lógico.
    expect(
      diagnosticReportSchema.safeParse({
        ...valid,
        context: "/sessoes/0F5D7C3E-1E2A-4B8A-9F61-6C1D2E3F4A5B/editar",
      }).success,
    ).toBe(false);
    expect(diagnosticReportSchema.safeParse({ ...valid, context: "e-mail pessoa@x" }).success).toBe(
      false,
    );
    expect(diagnosticReportSchema.safeParse({ ...valid, error_code: "QUALQUER" }).success).toBe(
      false,
    );
    expect(diagnosticReportSchema.safeParse({ ...valid, mensagem: "texto" }).success).toBe(false);
  });

  it("deduz a plataforma sem guardar o agente", () => {
    expect(platformOf("Mozilla/5.0 (Linux; Android 14)")).toBe("android");
    expect(platformOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)")).toBe("ios");
    expect(platformOf("Mozilla/5.0 (Windows NT 10.0; Win64)")).toBe("desktop");
    expect(platformOf("robô")).toBe("other");
  });
});
