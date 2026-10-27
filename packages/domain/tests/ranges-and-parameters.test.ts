import { describe, expect, it } from "vitest";
import {
  DEFAULT_REST_HOURS,
  EQUIPMENT,
  LOAD_MARKERS,
  LOCATION_EQUIPMENT_PRESETS,
  PASSWORD_MIN_LENGTH,
  RANGES,
  REASSESSMENT_INTERVAL_DAYS,
  RESTRICTION_EXCLUDED_MARKERS,
  RESTRICTIONS,
  isWithinRange,
} from "../src/index.ts";

describe("faixas (RN-018, RN-035)", () => {
  it("aceita limites e incrementos válidos", () => {
    expect(isWithinRange(30, RANGES.weightKg)).toBe(true);
    expect(isWithinRange(300, RANGES.weightKg)).toBe(true);
    expect(isWithinRange(82.3, RANGES.weightKg)).toBe(true);
    expect(isWithinRange(62.5, RANGES.loadKg)).toBe(true);
    expect(isWithinRange(0, RANGES.loadKg)).toBe(true);
  });

  it("recusa valores fora da faixa, fora do incremento ou não finitos", () => {
    expect(isWithinRange(29.9, RANGES.weightKg)).toBe(false);
    expect(isWithinRange(500.5, RANGES.loadKg)).toBe(false);
    expect(isWithinRange(62.3, RANGES.loadKg)).toBe(false);
    expect(isWithinRange(10.5, RANGES.reps)).toBe(false);
    expect(isWithinRange(Number.NaN, RANGES.reps)).toBe(false);
    expect(isWithinRange(Number.POSITIVE_INFINITY, RANGES.loadKg)).toBe(false);
  });

  it("aceita qualquer valor dentro da faixa quando não há incremento", () => {
    expect(isWithinRange(1.234, { min: 0, max: 2 })).toBe(true);
  });
});

describe("parâmetros (PRD-07 §11)", () => {
  it("são coerentes com as faixas e decisões aprovadas", () => {
    expect(isWithinRange(DEFAULT_REST_HOURS, RANGES.restHours)).toBe(true);
    expect(DEFAULT_REST_HOURS).toBe(48); // ADR-021
    expect(REASSESSMENT_INTERVAL_DAYS).toBe(30); // ADR-008
    expect(PASSWORD_MIN_LENGTH).toBe(10); // RN-031
  });
});

describe("enumerações (TRN-01, TRN-03)", () => {
  it("presets de local usam apenas equipamentos conhecidos e sempre incluem peso corporal", () => {
    for (const preset of Object.values(LOCATION_EQUIPMENT_PRESETS)) {
      for (const item of preset) expect(EQUIPMENT).toContain(item);
      expect(preset).toContain("bodyweight");
    }
  });

  it("toda restrição tem mapa de marcadores; só categorias sem mapeamento seguro ficam vazias", () => {
    for (const restriction of RESTRICTIONS) {
      const markers = RESTRICTION_EXCLUDED_MARKERS[restriction];
      for (const marker of markers) expect(LOAD_MARKERS).toContain(marker);
      const reviewOnly = ["cardiovascular", "pregnancy", "other"].includes(restriction);
      expect(markers.length === 0).toBe(reviewOnly);
    }
  });
});
