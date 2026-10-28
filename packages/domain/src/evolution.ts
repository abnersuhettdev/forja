// Evolução do peso (TRN-05 §2; RF-080, RF-081; RN-017, RN-018; DAD-04 API-005/006): registro,
// peso atual, variação, progresso em direção à meta e série do gráfico por período.
import { z } from "zod";
import { inRange } from "./schemas.ts";
import { addDays } from "./time.ts";

/** API-005 `weight.create` (entity_id = id do registro; data não futura conferida no servidor). */
export const weightCreatePayloadSchema = z.strictObject({
  measured_on: z.iso.date(),
  weight_kg: inRange("weightKg"),
});

export type WeightCreatePayload = z.infer<typeof weightCreatePayloadSchema>;

export interface WeightPoint {
  readonly measured_on: string;
  readonly weight_kg: number;
  /** Ordem de gravação (ISO), para escolher o último do dia; ausente = ordem de entrada. */
  readonly created_at?: string;
}

/**
 * Progresso (RN-017): (inicial − atual) / (inicial − meta) × 100, limitado a 0–100%; null sem
 * meta ou com meta igual ao inicial. Vale para perder e para ganhar peso.
 */
export function weightProgress(
  initial: number,
  current: number,
  goal: number | null,
): number | null {
  if (goal === null || goal === initial) return null;
  const progress = ((initial - current) / (initial - goal)) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/** Variação atual − inicial, com uma casa decimal. */
export function weightVariation(initial: number, current: number): number {
  return Math.round((current - initial) * 10) / 10;
}

export type WeightPeriod = "30d" | "90d" | "1y" | "all";

const PERIOD_DAYS: Readonly<Record<Exclude<WeightPeriod, "all">, number>> = {
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

/** Primeiro dia do período (null = tudo). */
export function periodStart(period: WeightPeriod, today: string): string | null {
  return period === "all" ? null : addDays(today, -PERIOD_DAYS[period]);
}

/**
 * Série do gráfico: registros do período em ordem de data; vários no mesmo dia → o último
 * gravado (TRN-05 §2).
 */
export function weightSeries(points: readonly WeightPoint[], from: string | null): WeightPoint[] {
  const byDay = new Map<string, WeightPoint>();
  for (const point of points) {
    if (from !== null && point.measured_on < from) continue;
    const previous = byDay.get(point.measured_on);
    // Com os dois horários de gravação, vale o mais recente; senão, o que vem depois na lista.
    const earlier =
      previous?.created_at !== undefined &&
      point.created_at !== undefined &&
      point.created_at < previous.created_at;
    if (!earlier) byDay.set(point.measured_on, point);
  }
  return [...byDay.values()].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
}

/** Peso atual (RN-017): o registro mais recente pela data e, no mesmo dia, o último gravado. */
export function currentWeight(points: readonly WeightPoint[]): WeightPoint | null {
  return weightSeries(points, null).at(-1) ?? null;
}
