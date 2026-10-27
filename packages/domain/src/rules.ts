// Regras simples reutilizadas por várias telas e pela função de sincronização.
import { daysBetween } from "./time.ts";

/** Idade completa em anos numa data de calendário. */
export function ageOn(birthDate: string, onDate: string): number {
  if (daysBetween(birthDate, onDate) < 0) throw new RangeError("Nascimento posterior à data.");
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [oy, om, od] = onDate.split("-").map(Number) as [number, number, number];
  const hadBirthday = om > bm || (om === bm && od >= bd);
  return oy - by - (hadBirthday ? 0 : 1);
}

/** RN-010 — o app atende apenas maiores de 18 anos. */
export function isAdult(birthDate: string, onDate: string): boolean {
  return ageOn(birthDate, onDate) >= 18;
}
