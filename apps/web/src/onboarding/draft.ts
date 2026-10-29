// Rascunho da configuração inicial (TELA-003, RF-009): validação por etapa e montagem da
// operação onboarding.complete (DAD-04 API-002). Puro: data de hoje e identificadores entram
// por parâmetro. Os identificadores ficam no rascunho para reenvios serem idempotentes.
import {
  DEFAULT_TIME_ZONE,
  isAdult,
  isValidLocalDate,
  isWithinRange,
  RANGES,
  type ActivityLevel,
  type Equipment,
  type ExperienceLevel,
  type Goal,
  type OnboardingPayload,
  type RangeName,
  type Restriction,
  type Sex,
  type TrainingLocation,
} from "@forja/domain";
import { onboardingPayloadSchema } from "@forja/domain/validacao";

export const ONBOARDING_STEPS = 7;

export interface OnboardingDraft {
  readonly step: number;
  /** Operação de envio: novo valor só depois de uma recusa (a recusa fica guardada no servidor). */
  readonly opId: string;
  readonly studentId: string;
  readonly assessmentId: string;
  readonly weightEntryId: string;
  // 1. Sobre você
  readonly fullName: string;
  readonly birthDate: string;
  readonly sex: Sex | null;
  // 2. Objetivo
  readonly goal: Goal | null;
  readonly experienceLevel: ExperienceLevel | null;
  readonly activityLevel: ActivityLevel | null;
  // 3. Disponibilidade
  readonly daysPerWeek: string;
  readonly minutesPerSession: string;
  readonly preferredWeekdays: readonly number[];
  // 4. Onde você treina
  readonly trainingLocation: TrainingLocation | null;
  readonly equipment: readonly Equipment[];
  // 5. Restrições
  readonly restrictionsDeclared: "none" | "listed" | null;
  readonly restrictions: readonly Restriction[];
  readonly restrictionsNote: string;
  // 6. Medidas (texto digitado, com vírgula decimal)
  readonly heightCm: string;
  readonly weightKg: string;
  readonly goalWeightKg: string;
}

export function newDraft(ids: {
  opId: string;
  studentId: string;
  assessmentId: string;
  weightEntryId: string;
}): OnboardingDraft {
  return {
    step: 1,
    ...ids,
    fullName: "",
    birthDate: "",
    sex: null,
    goal: null,
    experienceLevel: null,
    activityLevel: null,
    daysPerWeek: "",
    minutesPerSession: "",
    preferredWeekdays: [],
    trainingLocation: null,
    equipment: [],
    restrictionsDeclared: null,
    restrictions: [],
    restrictionsNote: "",
    heightCm: "",
    weightKg: "",
    goalWeightKg: "",
  };
}

/** Número digitado em pt-BR ("82,5"); vazio → null; inválido → NaN. */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) return Number.NaN;
  return Number(trimmed.replace(",", "."));
}

export type FieldErrors = Readonly<Partial<Record<keyof OnboardingDraft, string>>>;

const rangeMessage = (name: RangeName, unit: string) => {
  const { min, max } = RANGES[name];
  return `Informe um valor entre ${String(min)} e ${String(max)} ${unit}.`;
};

function checkRange(
  errors: Partial<Record<keyof OnboardingDraft, string>>,
  field: keyof OnboardingDraft,
  text: string,
  name: RangeName,
  unit: string,
  required = false,
): void {
  const value = parseNumber(text);
  if (value === null) {
    if (required) errors[field] = "Preencha este campo.";
    return;
  }
  if (!isWithinRange(value, RANGES[name])) errors[field] = rangeMessage(name, unit);
}

/** Erros da etapa atual (RN-010, RN-018); vazio = pode continuar. */
export function stepErrors(draft: OnboardingDraft, step: number, today: string): FieldErrors {
  const errors: Partial<Record<keyof OnboardingDraft, string>> = {};
  if (step === 1) {
    const name = draft.fullName.trim();
    if (name === "") errors.fullName = "Preencha este campo.";
    else if (name.length > 120) errors.fullName = "Use no máximo 120 caracteres.";
    if (draft.birthDate === "") errors.birthDate = "Preencha este campo.";
    else if (!isValidLocalDate(draft.birthDate) || draft.birthDate > today) {
      errors.birthDate = "Informe uma data de nascimento válida.";
    } else if (!isAdult(draft.birthDate, today)) {
      errors.birthDate = "O app é destinado a maiores de 18 anos.";
    }
  }
  if (step === 3) {
    checkRange(errors, "daysPerWeek", draft.daysPerWeek, "daysPerWeek", "dias");
    checkRange(errors, "minutesPerSession", draft.minutesPerSession, "minutesPerSession", "min");
  }
  if (step === 5 && draft.restrictionsNote.length > 500) {
    errors.restrictionsNote = "Use no máximo 500 caracteres.";
  }
  if (step === 6) {
    checkRange(errors, "heightCm", draft.heightCm, "heightCm", "cm");
    checkRange(errors, "weightKg", draft.weightKg, "weightKg", "kg", true);
    checkRange(errors, "goalWeightKg", draft.goalWeightKg, "weightKg", "kg");
  }
  return errors;
}

/** Primeira etapa com erro (para voltar a ela antes de concluir), ou null. */
export function firstInvalidStep(draft: OnboardingDraft, today: string): number | null {
  for (let step = 1; step < ONBOARDING_STEPS; step++) {
    if (Object.keys(stepErrors(draft, step, today)).length > 0) return step;
  }
  return null;
}

/** Conteúdo da operação onboarding.complete, validado com o esquema do domínio. */
export function toOnboardingPayload(draft: OnboardingDraft, today: string): OnboardingPayload {
  const listed = draft.restrictionsDeclared === "listed" && draft.restrictions.length > 0;
  return onboardingPayloadSchema.parse({
    student: {
      full_name: draft.fullName.trim(),
      birth_date: draft.birthDate,
      sex: draft.sex,
      height_cm: parseNumber(draft.heightCm),
      timezone: DEFAULT_TIME_ZONE,
    },
    profile: {
      goal: draft.goal,
      goal_weight_kg: parseNumber(draft.goalWeightKg),
      experience_level: draft.experienceLevel,
      activity_level: draft.activityLevel,
      days_per_week: parseNumber(draft.daysPerWeek),
      minutes_per_session: parseNumber(draft.minutesPerSession),
      preferred_weekdays: draft.preferredWeekdays.length > 0 ? [...draft.preferredWeekdays] : null,
      training_location: draft.trainingLocation,
      equipment_codes: draft.equipment.length > 0 ? [...draft.equipment] : null,
      // "Listado" sem nenhuma categoria marcada equivale a não declarado (RN-006).
      restrictions_declared:
        draft.restrictionsDeclared === "none" ? "none" : listed ? "listed" : null,
      restriction_codes: listed ? [...draft.restrictions] : null,
      restrictions_note:
        draft.restrictionsNote.trim() === "" ? null : draft.restrictionsNote.trim(),
      preferences_note: null,
    },
    assessment_id: draft.assessmentId,
    weight_entry_id: draft.weightEntryId,
    assessed_on: today,
    weight_kg: parseNumber(draft.weightKg),
  });
}
