// Faixas válidas de RN-018 e RN-035, usadas pelos esquemas e pelas telas.

export interface Range {
  readonly min: number;
  readonly max: number;
  /** Incremento permitido; ausente = qualquer valor dentro da faixa. */
  readonly step?: number;
}

export const RANGES = {
  heightCm: { min: 120, max: 230, step: 0.1 },
  weightKg: { min: 30, max: 300, step: 0.1 },
  loadKg: { min: 0, max: 500, step: 0.5 },
  reps: { min: 0, max: 100, step: 1 },
  rpe: { min: 0, max: 10, step: 1 },
  circumferenceCm: { min: 10, max: 250, step: 0.1 },
  bodyFatPct: { min: 2, max: 70, step: 0.1 },
  minutesPerSession: { min: 15, max: 180, step: 1 },
  daysPerWeek: { min: 1, max: 7, step: 1 },
  restHours: { min: 0, max: 168, step: 1 },
  // RN-035 — prescrição
  prescribedSets: { min: 1, max: 10, step: 1 },
  prescribedReps: { min: 1, max: 100, step: 1 },
  prescribedRestSeconds: { min: 0, max: 600, step: 1 },
  durationSeconds: { min: 1, max: 3600, step: 1 },
  workoutsPerProgram: { min: 1, max: 7, step: 1 },
  sessionDurationMinutes: { min: 1, max: 300, step: 1 },
  setNumber: { min: 1, max: 20, step: 1 },
  // DAD-02 ENT-024 — duração registrada numa série
  durationSecondsLogged: { min: 0, max: 3600, step: 1 },
} as const satisfies Record<string, Range>;

export type RangeName = keyof typeof RANGES;

/** Verifica faixa e incremento, tolerando imprecisão de ponto flutuante (ex.: 82.3). */
export function isWithinRange(value: number, range: Range): boolean {
  if (!Number.isFinite(value) || value < range.min || value > range.max) return false;
  if (range.step === undefined) return true;
  const steps = (value - range.min) / range.step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}
