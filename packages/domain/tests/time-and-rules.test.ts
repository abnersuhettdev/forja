import { describe, expect, it } from "vitest";
import {
  addDays,
  ageOn,
  daysBetween,
  hoursBetween,
  isAdult,
  isClockSuspect,
  isoWeekday,
  isValidLocalDate,
  isValidTimeZone,
  isWithinEditWindow,
  toLocalDate,
  weekBounds,
} from "../src/index.ts";

describe("dia no fuso do aluno (RN-028)", () => {
  it("usa o fuso para decidir o dia de uma sessão", () => {
    // 01:30 UTC de 27/10 ainda é 26/10 em São Paulo (UTC−3).
    const instant = new Date("2026-10-27T01:30:00Z");
    expect(toLocalDate(instant)).toBe("2026-10-26");
    expect(toLocalDate(instant, "UTC")).toBe("2026-10-27");
  });

  it("valida fusos e datas", () => {
    expect(isValidTimeZone("America/Manaus")).toBe(true);
    expect(isValidTimeZone("Marte/Base")).toBe(false);
    expect(isValidLocalDate("2026-02-28")).toBe(true);
    expect(isValidLocalDate("2026-02-30")).toBe(false);
    expect(isValidLocalDate("26/10/2026")).toBe(false);
  });
});

describe("aritmética de datas", () => {
  it("soma dias atravessando meses e anos", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("conta dias e horas", () => {
    expect(daysBetween("2026-10-01", "2026-10-31")).toBe(30);
    expect(daysBetween("2026-10-31", "2026-10-01")).toBe(-30);
    expect(hoursBetween(new Date("2026-10-26T10:00:00Z"), new Date("2026-10-28T10:00:00Z"))).toBe(
      48,
    );
  });

  it("semana de segunda a domingo (ADR-021)", () => {
    expect(isoWeekday("2026-10-26")).toBe(1); // segunda
    expect(isoWeekday("2026-11-01")).toBe(7); // domingo
    expect(weekBounds("2026-10-29")).toEqual({ start: "2026-10-26", end: "2026-11-01" });
    expect(weekBounds("2026-11-01")).toEqual({ start: "2026-10-26", end: "2026-11-01" });
  });
});

describe("regras de tempo", () => {
  it("RN-048 — horário futuro além de 5 minutos é suspeito", () => {
    const server = new Date("2026-10-26T12:00:00Z");
    expect(isClockSuspect(new Date("2026-10-26T12:04:59Z"), server)).toBe(false);
    expect(isClockSuspect(new Date("2026-10-26T12:05:01Z"), server)).toBe(true);
  });

  it("RN-027 — janela de 60 dias para edição", () => {
    expect(isWithinEditWindow("2026-08-27", "2026-10-26")).toBe(true);
    expect(isWithinEditWindow("2026-08-26", "2026-10-26")).toBe(false);
    expect(isWithinEditWindow("2026-10-27", "2026-10-26")).toBe(false);
  });
});

describe("idade (RN-010)", () => {
  it("calcula a idade completa considerando o aniversário", () => {
    expect(ageOn("2008-10-27", "2026-10-26")).toBe(17);
    expect(ageOn("2008-10-26", "2026-10-26")).toBe(18);
    expect(isAdult("2008-10-27", "2026-10-26")).toBe(false);
    expect(isAdult("1992-05-10", "2026-10-26")).toBe(true);
  });

  it("recusa nascimento posterior à data de referência", () => {
    expect(() => ageOn("2026-10-27", "2026-10-26")).toThrow(RangeError);
  });
});
