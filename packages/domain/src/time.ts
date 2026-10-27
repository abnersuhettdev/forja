// Datas e fuso horário (RN-028): instantes em UTC; "dia" calculado no fuso do aluno.
// Datas de calendário são strings "AAAA-MM-DD" para evitar ambiguidades de fuso.
import { CLIENT_CLOCK_TOLERANCE_MINUTES, SESSION_EDIT_WINDOW_DAYS } from "./parameters.ts";

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Dia de calendário ("AAAA-MM-DD") de um instante no fuso informado. */
export function toLocalDate(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  // "en-CA" formata no padrão AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function parseLocalDate(localDate: string): number {
  const match = LOCAL_DATE.exec(localDate);
  if (!match) throw new RangeError(`Data inválida: ${localDate}`);
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const time = Date.UTC(y, m - 1, d);
  if (new Date(time).getUTCDate() !== d) throw new RangeError(`Data inexistente: ${localDate}`);
  return time;
}

export function isValidLocalDate(localDate: string): boolean {
  try {
    parseLocalDate(localDate);
    return true;
  } catch {
    return false;
  }
}

export function addDays(localDate: string, days: number): string {
  return new Date(parseLocalDate(localDate) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Dias de `from` até `to` (positivo se `to` for posterior). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseLocalDate(to) - parseLocalDate(from)) / MS_PER_DAY);
}

/** Dia da semana ISO: 1 = segunda … 7 = domingo (DAD-02 `preferred_weekdays`). */
export function isoWeekday(localDate: string): number {
  const day = new Date(parseLocalDate(localDate)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Semana de segunda a domingo que contém a data (ADR-021). */
export function weekBounds(localDate: string): { start: string; end: string } {
  const start = addDays(localDate, 1 - isoWeekday(localDate));
  return { start, end: addDays(start, 6) };
}

export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 3_600_000;
}

/** RN-048 — horário do aparelho no futuro além da tolerância em relação ao servidor. */
export function isClockSuspect(clientInstant: Date, serverNow: Date): boolean {
  return clientInstant.getTime() - serverNow.getTime() > CLIENT_CLOCK_TOLERANCE_MINUTES * 60_000;
}

/** RN-027 — sessão ainda editável (data da sessão até 60 dias antes de hoje). */
export function isWithinEditWindow(sessionDate: string, today: string): boolean {
  const age = daysBetween(sessionDate, today);
  return age >= 0 && age <= SESSION_EDIT_WINDOW_DAYS;
}
