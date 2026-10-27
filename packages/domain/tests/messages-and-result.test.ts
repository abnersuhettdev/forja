import { describe, expect, it } from "vitest";
import {
  ERROR_MESSAGES,
  err,
  formatDurationMinutes,
  formatKg,
  formatLocalDate,
  formatTimer,
  messageFor,
  ok,
} from "../src/index.ts";

describe("formatos pt-BR (RNF-004, UX-02 §8.4)", () => {
  it("formata carga, data, duração e cronômetro", () => {
    expect(formatKg(82.5)).toBe("82,5 kg");
    expect(formatKg(60)).toBe("60 kg");
    expect(formatLocalDate("2026-10-26")).toBe("26/10/2026");
    expect(formatDurationMinutes(52)).toBe("52 min");
    expect(formatDurationMinutes(65)).toBe("1 h 05 min");
    expect(formatDurationMinutes(-3)).toBe("0 min");
    expect(formatTimer(90)).toBe("1:30");
    expect(formatTimer(5.2)).toBe("0:06");
    expect(formatTimer(-1)).toBe("0:00");
  });
});

describe("mensagens de erro (SEG-05)", () => {
  it("todo código tem mensagem em português não vazia", () => {
    for (const code of Object.keys(ERROR_MESSAGES) as (keyof typeof ERROR_MESSAGES)[]) {
      expect(messageFor(code).length).toBeGreaterThan(10);
    }
  });

  it("erros de rede nunca são apresentados como recusa (RN-051)", () => {
    expect(messageFor("NETWORK_UNAVAILABLE")).toContain("salvos neste aparelho");
  });
});

describe("resultado tipado (ARQ-04 §6)", () => {
  it("representa sucesso e erro como valores", () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 });
    expect(err({ code: "NOT_FOUND" })).toEqual({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
