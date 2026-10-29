import { describe, expect, it } from "vitest";
import {
  isAbandoned,
  prefillSet,
  restRemainingSeconds,
  sessionDurationMinutes,
  sessionTimesIssue,
  sessionVolumeKg,
  type Prescription,
} from "../src/index.ts";
import {
  sessionCompletePayloadSchema,
  sessionExerciseUpdatePayloadSchema,
  sessionStartPayloadSchema,
  sessionUpdatePayloadSchema,
  setUpsertPayloadSchema,
} from "../src/validacao/index.ts";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const reps: Prescription = {
  measure_type: "reps",
  reps_min: 8,
  duration_s: null,
  suggested_load_kg: 40,
};

describe("pré-preenchimento (TRN-04 §3, RF-061)", () => {
  const last = [
    { set_number: 1, load_kg: 40, reps: 10, duration_s: null },
    { set_number: 2, load_kg: 42.5, reps: 9, duration_s: null },
    { set_number: 3, load_kg: 42.5, reps: 8, duration_s: null },
  ];

  it("CT-PRE-01: última execução com 3 séries, hoje 4 → série 4 recebe os valores da série 3", () => {
    expect(prefillSet(2, reps, false, last)).toEqual({ load_kg: 42.5, reps: 9, duration_s: null });
    expect(prefillSet(4, reps, false, last)).toEqual({ load_kg: 42.5, reps: 8, duration_s: null });
  });

  it("sem histórico: carga sugerida e mínimo da faixa; sem sugestão, carga vazia ou 0", () => {
    expect(prefillSet(1, reps, false, null)).toEqual({ load_kg: 40, reps: 8, duration_s: null });
    const noLoad = { ...reps, suggested_load_kg: null };
    expect(prefillSet(1, noLoad, false, [])).toEqual({ load_kg: null, reps: 8, duration_s: null });
    expect(prefillSet(1, noLoad, true, null)).toEqual({ load_kg: 0, reps: 8, duration_s: null });
  });

  it("por duração usa segundos no lugar de repetições", () => {
    const plank: Prescription = {
      measure_type: "duration",
      reps_min: null,
      duration_s: 30,
      suggested_load_kg: null,
    };
    expect(prefillSet(1, plank, true, null)).toEqual({ load_kg: 0, reps: null, duration_s: 30 });
    expect(
      prefillSet(2, plank, true, [{ set_number: 1, load_kg: 0, reps: null, duration_s: 45 }]),
    ).toEqual({ load_kg: 0, reps: null, duration_s: 45 });
    // Histórico sem o valor da medida atual: volta à prescrição.
    expect(
      prefillSet(1, plank, true, [{ set_number: 1, load_kg: 5, reps: 10, duration_s: null }]),
    ).toEqual({ load_kg: 5, reps: null, duration_s: 30 });
    expect(
      prefillSet(1, reps, false, [{ set_number: 1, load_kg: 5, reps: null, duration_s: 20 }]),
    ).toEqual({ load_kg: 5, reps: 8, duration_s: null });
  });
});

describe("resumo e cronômetro (TRN-04 §5)", () => {
  it("duração em minutos inteiros entre 1 e 300", () => {
    expect(sessionDurationMinutes("2026-10-27T10:00:00Z", "2026-10-27T10:58:20Z")).toBe(58);
    expect(sessionDurationMinutes("2026-10-27T10:00:00Z", "2026-10-27T10:00:10Z")).toBe(1);
    expect(sessionDurationMinutes("2026-10-27T10:00:00Z", "2026-10-28T10:00:00Z")).toBe(300);
  });

  it("volume soma carga × repetições", () => {
    expect(
      sessionVolumeKg([
        { set_number: 1, load_kg: 40, reps: 10, duration_s: null },
        { set_number: 2, load_kg: 0, reps: 15, duration_s: null },
        { set_number: 3, load_kg: 0, reps: null, duration_s: 30 },
      ]),
    ).toBe(400);
  });

  it("abandono após 6 h sem nova série e descanso pelo horário de término", () => {
    const now = new Date("2026-10-27T18:00:00Z");
    expect(isAbandoned("2026-10-27T12:30:00Z", now)).toBe(false);
    expect(isAbandoned("2026-10-27T11:59:00Z", now)).toBe(true);
    expect(restRemainingSeconds(10_500, 1_000)).toBe(10);
    expect(restRemainingSeconds(1_000, 5_000)).toBe(0);
  });
});

describe("operações de sessão (API-008..013)", () => {
  it("valida início, série, exercício, conclusão e edição", () => {
    expect(
      sessionStartPayloadSchema.safeParse({
        program_version_id: uuid(1),
        workout_id: uuid(2),
        started_at: "2026-10-27T10:00:00.000Z",
        exercises: [{ id: uuid(3), workout_item_id: uuid(4), exercise_id: uuid(5), position: 1 }],
      }).success,
    ).toBe(true);
    const set = {
      session_exercise_id: uuid(3),
      set_number: 1,
      load_kg: 42.5,
      reps: 10,
      duration_s: null,
      completed_at: "2026-10-27T10:05:00.000Z",
    };
    expect(setUpsertPayloadSchema.safeParse(set).success).toBe(true);
    expect(setUpsertPayloadSchema.safeParse({ ...set, duration_s: 30 }).success).toBe(false);
    expect(setUpsertPayloadSchema.safeParse({ ...set, load_kg: 42.3 }).success).toBe(false);
    expect(setUpsertPayloadSchema.safeParse({ ...set, reps: 101 }).success).toBe(false);
    expect(sessionExerciseUpdatePayloadSchema.safeParse({ status: "skipped" }).success).toBe(true);
    expect(sessionExerciseUpdatePayloadSchema.safeParse({}).success).toBe(false);
    expect(
      sessionCompletePayloadSchema.safeParse({
        ended_at: "2026-10-27T11:00:00.000Z",
        duration_min: 60,
        rpe: 7,
        notes: null,
      }).success,
    ).toBe(true);
    expect(sessionUpdatePayloadSchema.safeParse({ rpe: 11 }).success).toBe(false);
    expect(sessionUpdatePayloadSchema.safeParse({}).success).toBe(false);
    expect(sessionUpdatePayloadSchema.safeParse({ notes: "ok" }).success).toBe(true);
  });
});

describe("horários editados (TELA-020; RN-027, RN-048)", () => {
  const now = new Date("2026-10-27T15:00:00Z");
  it("término depois do início, até 300 min e não no futuro", () => {
    expect(sessionTimesIssue("2026-10-27T10:00:00Z", "2026-10-27T11:00:00Z", now)).toBeNull();
    expect(sessionTimesIssue("2026-10-27T10:00:00Z", "2026-10-27T09:59:00Z", now)).toBe(
      "end_before_start",
    );
    expect(sessionTimesIssue("2026-10-27T05:00:00Z", "2026-10-27T10:01:00Z", now)).toBe("too_long");
    expect(sessionTimesIssue("2026-10-27T14:30:00Z", "2026-10-27T15:10:00Z", now)).toBe("future");
    expect(sessionTimesIssue("2026-10-27T14:30:00Z", "2026-10-27T15:04:00Z", now)).toBeNull();
  });
});
