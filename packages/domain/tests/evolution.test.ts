import { describe, expect, it } from "vitest";
import {
  currentWeight,
  periodStart,
  weightProgress,
  weightSeries,
  weightVariation,
} from "../src/index.ts";
import { weightCreatePayloadSchema } from "../src/validacao/index.ts";

describe("progresso em direção à meta (TRN-05 §2, RN-017)", () => {
  it("CT-EVO-01: inicial 90, meta 80, atual 85 → 50%", () => {
    expect(weightProgress(90, 85, 80)).toBe(50);
  });

  it("CT-EVO-02: ganho de peso — inicial 70, meta 75, atual 72 → 40%", () => {
    expect(weightProgress(70, 72, 75)).toBe(40);
  });

  it("CT-EVO-03: atual além da meta → 100%; no sentido contrário → 0%", () => {
    expect(weightProgress(90, 78, 80)).toBe(100);
    expect(weightProgress(90, 93, 80)).toBe(0);
  });

  it("sem meta ou com meta igual ao inicial não há progresso", () => {
    expect(weightProgress(90, 85, null)).toBeNull();
    expect(weightProgress(90, 85, 90)).toBeNull();
  });

  it("variação com sinal e uma casa decimal", () => {
    expect(weightVariation(85.4, 82.2)).toBe(-3.2);
    expect(weightVariation(70, 71.25)).toBe(1.3);
  });
});

describe("série do gráfico e peso atual", () => {
  const points = [
    { measured_on: "2026-10-20", weight_kg: 82, created_at: "2026-10-20T08:00:00Z" },
    { measured_on: "2026-10-20", weight_kg: 83, created_at: "2026-10-20T07:00:00Z" },
    { measured_on: "2026-07-01", weight_kg: 85 },
    { measured_on: "2026-10-20", weight_kg: 81.5, created_at: "2026-10-20T19:00:00Z" },
    { measured_on: "2026-10-25", weight_kg: 81 },
    { measured_on: "2026-10-26", weight_kg: 80.8 },
    { measured_on: "2026-10-26", weight_kg: 80.6 },
  ];

  it("ordena por data e usa o último registro do dia", () => {
    expect(weightSeries(points, null).map((p) => [p.measured_on, p.weight_kg])).toEqual([
      ["2026-07-01", 85],
      ["2026-10-20", 81.5],
      ["2026-10-25", 81],
      ["2026-10-26", 80.6],
    ]);
    expect(currentWeight(points)?.weight_kg).toBe(80.6);
    expect(currentWeight([])).toBeNull();
  });

  it("filtra pelo período (padrão 90 dias)", () => {
    const today = "2026-10-27";
    expect(periodStart("30d", today)).toBe("2026-09-27");
    expect(periodStart("90d", today)).toBe("2026-07-29");
    expect(periodStart("1y", today)).toBe("2025-10-27");
    expect(periodStart("all", today)).toBeNull();
    expect(weightSeries(points, periodStart("90d", today))).toHaveLength(3);
  });

  it("registro: data e peso de 30 a 300 kg com uma casa decimal (RN-018)", () => {
    expect(
      weightCreatePayloadSchema.safeParse({ measured_on: "2026-10-27", weight_kg: 82.4 }).success,
    ).toBe(true);
    expect(
      weightCreatePayloadSchema.safeParse({ measured_on: "2026-10-27", weight_kg: 82.45 }).success,
    ).toBe(false);
    expect(
      weightCreatePayloadSchema.safeParse({ measured_on: "2026-10-27", weight_kg: 29.9 }).success,
    ).toBe(false);
    expect(
      weightCreatePayloadSchema.safeParse({ measured_on: "27/10/2026", weight_kg: 82 }).success,
    ).toBe(false);
  });
});
