import { describe, expect, it } from "vitest";
import {
  countWorkouts,
  dayStatus,
  monthGrid,
  shiftMonth,
  type CalendarSession,
} from "../src/index.ts";

const TZ = "America/Sao_Paulo";
const NOW = new Date("2026-10-27T15:00:00Z"); // terça, 12 h em São Paulo
const TODAY = "2026-10-27";

const session = (
  status: CalendarSession["status"],
  startedAt: string,
  extra: Partial<CalendarSession> = {},
): CalendarSession => ({ status, startedAt, lastActivityAt: startedAt, pending: false, ...extra });

describe("grade do mês (TELA-018)", () => {
  it("começa na segunda-feira e completa as semanas", () => {
    const october = monthGrid(2026, 10);
    expect(october[0]).toEqual([
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(october.at(-1)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      null,
    ]);
    expect(october.flat().filter(Boolean)).toHaveLength(31);
    expect(monthGrid(2027, 2).flat().filter(Boolean)).toHaveLength(28);
    expect(monthGrid(2026, 6)[0]?.[0]).toBe("2026-06-01");
  });

  it("navega entre meses e anos", () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 10, 0)).toEqual({ year: 2026, month: 10 });
  });
});

describe("estado do dia (RN-011, RN-012, RN-029, RN-049)", () => {
  it("presença por concluída ou registrada; o dia é o do início, no fuso do aluno", () => {
    // 01:30 UTC de 27/10 ainda é 26/10 em São Paulo.
    const late = session("completed", "2026-10-27T01:30:00Z");
    expect(dayStatus("2026-10-26", [late], TODAY, [], NOW, TZ)).toEqual({
      mark: "completed",
      pending: false,
      presence: true,
    });
    expect(dayStatus("2026-10-27", [late], TODAY, [], NOW, TZ).mark).toBe("none");
    const manual = session("manual", "2026-10-20T12:00:00Z", { pending: true });
    expect(dayStatus("2026-10-20", [manual], TODAY, [], NOW, TZ)).toEqual({
      mark: "manual",
      pending: true,
      presence: true,
    });
  });

  it("em andamento, abandonada após 6 h, e prioridade com várias sessões no dia", () => {
    const active = session("in_progress", "2026-10-27T13:00:00Z", {
      lastActivityAt: "2026-10-27T14:30:00Z",
    });
    expect(dayStatus(TODAY, [active], TODAY, [], NOW, TZ)).toMatchObject({
      mark: "in_progress",
      presence: false,
    });
    const stale = session("in_progress", "2026-10-26T12:00:00Z");
    const done = session("completed", "2026-10-26T18:00:00Z");
    expect(dayStatus("2026-10-26", [done, stale], TODAY, [], NOW, TZ)).toMatchObject({
      mark: "abandoned",
      presence: true,
    });
    const stored = session("abandoned", "2026-10-25T12:00:00Z");
    expect(dayStatus("2026-10-25", [stored], TODAY, [], NOW, TZ).mark).toBe("abandoned");
  });

  it("planejado só de hoje em diante, nos dias preferidos e sem presença", () => {
    const preferred = [2, 4]; // terça e quinta
    expect(dayStatus("2026-10-29", [], TODAY, preferred, NOW, TZ).mark).toBe("planned");
    expect(dayStatus(TODAY, [], TODAY, preferred, NOW, TZ).mark).toBe("planned");
    expect(dayStatus("2026-10-22", [], TODAY, preferred, NOW, TZ).mark).toBe("none");
    expect(dayStatus("2026-10-28", [], TODAY, preferred, NOW, TZ).mark).toBe("none");
    const done = session("completed", "2026-10-27T13:00:00Z");
    expect(dayStatus(TODAY, [done], TODAY, preferred, NOW, TZ).mark).toBe("completed");
  });

  it("conta os treinos do mês (concluídos e registrados)", () => {
    const sessions = [
      session("completed", "2026-10-01T12:00:00Z"),
      session("manual", "2026-10-15T12:00:00Z"),
      session("in_progress", "2026-10-27T12:00:00Z"),
      session("completed", "2026-11-01T02:00:00Z"), // 31/10 em São Paulo
      session("completed", "2026-11-02T12:00:00Z"),
    ];
    expect(countWorkouts(sessions, 2026, 10, TZ)).toBe(3);
    expect(countWorkouts(sessions, 2026, 11, TZ)).toBe(1);
  });
});
