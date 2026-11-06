import { describe, expect, it } from "vitest";
import { ALERT_RATIO, evaluateQuota, previousUtcDay } from "./ai-quota.ts";

describe("alerta de cota da IA (V12-10, RN-063)", () => {
  const row = (neurons: number) => ({ kind: "routine", outcome: "ok", calls: 1, neurons });

  it("alerta só acima de 80% do limite", () => {
    expect(ALERT_RATIO).toBe(0.8);
    expect(evaluateQuota([row(4000), row(2400)], 8000)).toEqual({
      total: 6400,
      threshold: 6400,
      alert: false,
    });
    expect(evaluateQuota([row(4000), row(2400.5)], 8000).alert).toBe(true);
    expect(evaluateQuota([], 8000)).toEqual({ total: 0, threshold: 6400, alert: false });
  });

  it("confere o dia anterior em UTC, como a cota do provedor", () => {
    expect(previousUtcDay(new Date("2026-11-06T07:00:00Z"))).toEqual({
      start: "2026-11-05T00:00:00.000Z",
      end: "2026-11-06T00:00:00.000Z",
    });
  });
});
