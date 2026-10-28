// Formatos do "Meu treino" (UX-02 §8.4): "seg., 26 out.", horas "14:32", "há 3 dias".
import { daysBetween, toLocalDate } from "@forja/domain";
import { TEXTS } from "../app/texts.ts";

export function formatDay(localDate: string): string {
  // Meio-dia UTC evita mudança de dia ao formatar a data de calendário.
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${localDate}T12:00:00Z`))
    .replace(" de ", " ");
}

export function formatShortDate(localDate: string): string {
  const [, month, day] = localDate.split("-");
  return `${day ?? ""}/${month ?? ""}`;
}

export function formatClock(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone }).format(
    instant,
  );
}

/** "20 h" até um dia; depois "3 dias". */
export function formatAgo(hours: number): string {
  if (hours < 24) return `${String(Math.max(1, Math.floor(hours)))} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 dia" : `${String(days)} dias`;
}

/** "hoje às 19:10", "amanhã às 7:10" ou "qui., 29 out. às 7:10". */
export function formatRelease(instant: Date, now: Date, timeZone: string): string {
  const day = toLocalDate(instant, timeZone);
  const offset = daysBetween(toLocalDate(now, timeZone), day);
  const clock = formatClock(instant, timeZone);
  if (offset === 0) return `hoje às ${clock}`;
  if (offset === 1) return `amanhã às ${clock}`;
  return `${formatDay(day)} às ${clock}`;
}

/** "hoje", "ontem" ou "há 5 dias" a partir de uma data de calendário. */
export function formatDaysAgo(localDate: string, today: string): string {
  const days = daysBetween(localDate, today);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${String(days)} dias`;
}

export function formatKg(kg: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(kg);
}

/** "AAAA-MM-DDTHH:mm" no horário local do aparelho (campo datetime-local). */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valor do campo datetime-local (horário do aparelho) como instante ISO; null se inválido. */
export function fromLocalInput(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "Disponível offline · atualizado às 14:30" (RF-092); null sem download ainda. */
export function formatUpdatedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
  return TEXTS.catalog.updatedAt(time);
}
