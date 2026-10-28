// Agenda (TELA-018; RF-070, RF-071; RN-011, RN-012, RN-029, RN-049; TRN-04 §6): grade do mês
// de segunda a domingo e o estado de cada dia, com um marcador principal e a marca de
// "aguardando envio". Planejado é só projeção pelos dias preferidos e nunca conta como presença.
import type { SessionStatus } from "./enums.ts";
import { SESSION_ABANDON_HOURS } from "./parameters.ts";
import { addDays, hoursBetween, isoWeekday, toLocalDate } from "./time.ts";

/** Semanas do mês (segunda a domingo); null fora do mês. `month` é 1–12. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = `${String(year)}-${String(month).padStart(2, "0")}-01`;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: isoWeekday(first) - 1 }, () => null);
  for (let day = 0; day < days; day++) cells.push(addDays(first, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Mês anterior/seguinte: deslocamento em meses a partir de (ano, mês 1–12). */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export interface CalendarSession {
  readonly status: SessionStatus;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  /** Alguma operação desta sessão ainda na fila de saída (RN-049). */
  readonly pending: boolean;
}

export type DayMark = "in_progress" | "abandoned" | "completed" | "manual" | "planned" | "none";

export interface DayStatus {
  readonly mark: DayMark;
  readonly pending: boolean;
  /** Presença (RN-011): sessão concluída ou registrada no dia. */
  readonly presence: boolean;
}

/** Ordem do marcador principal quando há várias sessões no dia. */
const PRIORITY: readonly DayMark[] = ["in_progress", "abandoned", "completed", "manual"];

/**
 * Estado de um dia: o marcador principal segue a sessão mais relevante; sem sessão, dias de hoje
 * em diante que estão nos dias preferidos aparecem como planejados (RN-029).
 */
export function dayStatus(
  date: string,
  sessions: readonly CalendarSession[],
  today: string,
  preferredWeekdays: readonly number[],
  now: Date,
  timeZone: string,
): DayStatus {
  const ofDay = sessions.filter((s) => toLocalDate(new Date(s.startedAt), timeZone) === date);
  const marks = ofDay.map((s): DayMark => {
    if (s.status === "in_progress")
      return hoursBetween(new Date(s.lastActivityAt), now) > SESSION_ABANDON_HOURS
        ? "abandoned"
        : "in_progress";
    return s.status === "abandoned" ? "abandoned" : s.status;
  });
  const main = PRIORITY.find((mark) => marks.includes(mark));
  const presence = marks.includes("completed") || marks.includes("manual");
  const planned = date >= today && !presence && preferredWeekdays.includes(isoWeekday(date));
  return {
    mark: main ?? (planned ? "planned" : "none"),
    pending: ofDay.some((s) => s.pending),
    presence,
  };
}

/** Sessões que contam como treino no resumo do mês ("12 treinos em outubro"). */
export function countWorkouts(
  sessions: readonly CalendarSession[],
  year: number,
  month: number,
  timeZone: string,
): number {
  const prefix = `${String(year)}-${String(month).padStart(2, "0")}-`;
  return sessions.filter(
    (s) =>
      (s.status === "completed" || s.status === "manual") &&
      toLocalDate(new Date(s.startedAt), timeZone).startsWith(prefix),
  ).length;
}
