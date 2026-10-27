import { describe, expect, it } from "vitest";
import {
  firstInvalidStep,
  newDraft,
  parseNumber,
  stepErrors,
  toOnboardingPayload,
  type OnboardingDraft,
} from "./draft.ts";

const TODAY = "2026-10-27";
const IDS = {
  opId: "44444444-4444-4444-8444-444444444444",
  studentId: "11111111-1111-4111-8111-111111111111",
  assessmentId: "22222222-2222-4222-8222-222222222222",
  weightEntryId: "33333333-3333-4333-8333-333333333333",
};

function filled(overrides: Partial<OnboardingDraft> = {}): OnboardingDraft {
  return {
    ...newDraft(IDS),
    fullName: "  Pessoa Fictícia ",
    birthDate: "1990-05-10",
    sex: "undisclosed",
    goal: "hypertrophy",
    daysPerWeek: "4",
    minutesPerSession: "60",
    preferredWeekdays: [1, 3, 5],
    trainingLocation: "home",
    equipment: ["dumbbell", "band"],
    restrictionsDeclared: "listed",
    restrictions: ["knee"],
    restrictionsNote: "",
    heightCm: "175,5",
    weightKg: "82,4",
    goalWeightKg: "",
    ...overrides,
  };
}

describe("parseNumber", () => {
  it("aceita vírgula ou ponto e distingue vazio de inválido", () => {
    expect(parseNumber("82,4")).toBe(82.4);
    expect(parseNumber(" 175.5 ")).toBe(175.5);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("8,2,1")).toBeNaN();
    expect(parseNumber("-3")).toBeNaN();
  });
});

describe("validação por etapa", () => {
  it("etapa 1 exige nome e nascimento e recusa menores de 18 (RN-010)", () => {
    expect(stepErrors(newDraft(IDS), 1, TODAY)).toEqual({
      fullName: "Preencha este campo.",
      birthDate: "Preencha este campo.",
    });
    expect(stepErrors(filled({ birthDate: "2008-10-28" }), 1, TODAY).birthDate).toBe(
      "O app é destinado a maiores de 18 anos.",
    );
    expect(stepErrors(filled({ birthDate: "2008-10-27" }), 1, TODAY)).toEqual({});
    expect(stepErrors(filled({ birthDate: "2027-01-01" }), 1, TODAY).birthDate).toBe(
      "Informe uma data de nascimento válida.",
    );
    expect(stepErrors(filled({ fullName: "x".repeat(121) }), 1, TODAY).fullName).toBeDefined();
  });

  it("etapas sem obrigatórios passam vazias, mas validam faixas (RN-018)", () => {
    expect(stepErrors(newDraft(IDS), 2, TODAY)).toEqual({});
    expect(stepErrors(newDraft(IDS), 3, TODAY)).toEqual({});
    expect(stepErrors(filled({ daysPerWeek: "8", minutesPerSession: "10" }), 3, TODAY)).toEqual({
      daysPerWeek: "Informe um valor entre 1 e 7 dias.",
      minutesPerSession: "Informe um valor entre 15 e 180 min.",
    });
    expect(stepErrors(filled({ restrictionsNote: "a".repeat(501) }), 5, TODAY)).toHaveProperty(
      "restrictionsNote",
    );
  });

  it("etapa 6 exige o peso atual e valida altura e meta", () => {
    expect(stepErrors(filled({ weightKg: "" }), 6, TODAY)).toEqual({
      weightKg: "Preencha este campo.",
    });
    expect(stepErrors(filled({ heightCm: "300", goalWeightKg: "20" }), 6, TODAY)).toEqual({
      heightCm: "Informe um valor entre 120 e 230 cm.",
      goalWeightKg: "Informe um valor entre 30 e 300 kg.",
    });
  });

  it("aponta a primeira etapa com pendência", () => {
    expect(firstInvalidStep(filled(), TODAY)).toBeNull();
    expect(firstInvalidStep(filled({ weightKg: "" }), TODAY)).toBe(6);
    expect(firstInvalidStep(newDraft(IDS), TODAY)).toBe(1);
  });
});

describe("toOnboardingPayload (API-002)", () => {
  it("monta o conteúdo com identificadores estáveis e números convertidos", () => {
    const payload = toOnboardingPayload(filled(), TODAY);
    expect(payload).toMatchObject({
      student: {
        full_name: "Pessoa Fictícia",
        height_cm: 175.5,
        timezone: "America/Sao_Paulo",
      },
      profile: {
        goal: "hypertrophy",
        days_per_week: 4,
        equipment_codes: ["dumbbell", "band"],
        restrictions_declared: "listed",
        restriction_codes: ["knee"],
        goal_weight_kg: null,
      },
      assessment_id: IDS.assessmentId,
      weight_entry_id: IDS.weightEntryId,
      assessed_on: TODAY,
      weight_kg: 82.4,
    });
  });

  it("'nenhuma restrição' e 'listar sem marcar' seguem RN-006", () => {
    expect(
      toOnboardingPayload(filled({ restrictionsDeclared: "none", restrictions: [] }), TODAY)
        .profile,
    ).toMatchObject({ restrictions_declared: "none", restriction_codes: null });
    expect(
      toOnboardingPayload(filled({ restrictionsDeclared: "listed", restrictions: [] }), TODAY)
        .profile,
    ).toMatchObject({ restrictions_declared: null, restriction_codes: null });
  });
});
