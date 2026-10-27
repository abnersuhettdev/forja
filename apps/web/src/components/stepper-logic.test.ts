import { RANGES } from "@forja/domain";
import { describe, expect, it } from "vitest";
import { clampToRange, parseTypedValue, stepValue } from "./stepper-logic.ts";

describe("Stepper (UX-06 §4)", () => {
  it("soma e subtrai passos de carga de 2,5 kg respeitando os limites (RN-018)", () => {
    expect(stepValue(60, 2.5, 1, RANGES.loadKg)).toBe(62.5);
    expect(stepValue(1, 2.5, -1, RANGES.loadKg)).toBe(0);
    expect(stepValue(499, 2.5, 1, RANGES.loadKg)).toBe(500);
  });

  it("alinha ao incremento da faixa", () => {
    expect(clampToRange(62.3, RANGES.loadKg)).toBe(62.5);
    expect(clampToRange(0.1 + 0.2, { min: 0, max: 1, step: 0.1 })).toBe(0.3);
    expect(clampToRange(7.7, { min: 0, max: 10 })).toBe(7.7);
  });

  it("aceita vírgula decimal e recusa valores inválidos", () => {
    expect(parseTypedValue("82,5", RANGES.weightKg)).toBe(82.5);
    expect(parseTypedValue(" 10 ", RANGES.reps)).toBe(10);
    expect(parseTypedValue("", RANGES.reps)).toBeNull();
    expect(parseTypedValue("abc", RANGES.reps)).toBeNull();
    expect(parseTypedValue("-5", RANGES.loadKg)).toBeNull();
    expect(parseTypedValue("62,3", RANGES.loadKg)).toBeNull();
  });
});
