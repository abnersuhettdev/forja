// Regras do Stepper (UX-06 §4): passo, limites e arredondamento ao incremento da faixa.
import { isWithinRange, type Range } from "@forja/domain";

/** Soma `direction` passos, prende aos limites e alinha ao incremento (evita 62,499999). */
export function stepValue(value: number, step: number, direction: 1 | -1, range: Range): number {
  const next = value + step * direction;
  return clampToRange(next, range);
}

export function clampToRange(value: number, range: Range): number {
  const clamped = Math.min(range.max, Math.max(range.min, value));
  if (range.step === undefined) return clamped;
  const steps = Math.round((clamped - range.min) / range.step);
  return Number((range.min + steps * range.step).toFixed(6));
}

/** Converte o texto digitado (vírgula ou ponto decimal) em número válido, ou null. */
export function parseTypedValue(text: string, range: Range): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "" || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return isWithinRange(value, range) ? value : null;
}
