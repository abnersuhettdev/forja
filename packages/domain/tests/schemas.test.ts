// Dados de teste fictícios (RN-037).
import { describe, expect, it } from "vitest";
import {
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  GOALS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
} from "../src/index.ts";
import {
  exerciseSchema,
  programDraftSchema,
  restSettingsSchema,
  sessionSchema,
  setLogSchema,
  studentSchema,
  trainingProfileSchema,
  weightEntrySchema,
  workoutItemSchema,
} from "../src/validacao/index.ts";

const ID = "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b";
const ID2 = "7a2e3d4c-5b6f-4071-9b8c-0d1e2f3a4b5c";

const item = {
  id: ID,
  position: 1,
  exercise_id: ID2,
  measure_type: "reps" as const,
  sets: 3,
  reps_min: 8,
  reps_max: 12,
  duration_s: null,
  rest_s: 90,
  suggested_load_kg: null,
  notes: null,
};

describe("aluno e perfil", () => {
  it("aceita aluno válido e recusa fuso inválido", () => {
    const student = {
      id: ID,
      manager_id: ID2,
      user_id: ID2,
      is_self: true,
      full_name: "Pessoa Fictícia",
      email: "ficticio@example.com",
      birth_date: "1990-01-15",
      sex: "undisclosed",
      height_cm: 178.5,
      timezone: "America/Sao_Paulo",
      status: "active",
    };
    expect(studentSchema.safeParse(student).success).toBe(true);
    expect(studentSchema.safeParse({ ...student, timezone: "Lua/Base" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...student, height_cm: 300 }).success).toBe(false);
  });

  it("perfil aceita campos opcionais vazios e recusa dias fora de 1–7", () => {
    const profile = {
      student_id: ID,
      goal: null,
      goal_weight_kg: null,
      experience_level: null,
      activity_level: null,
      days_per_week: null,
      minutes_per_session: null,
      preferred_weekdays: null,
      training_location: null,
      equipment_codes: null,
      restrictions_declared: null,
      restriction_codes: null,
      restrictions_note: null,
      preferences_note: null,
      reassessment_interval_days: 30,
      reassessment_snooze_until: null,
      revision: 0,
    };
    expect(trainingProfileSchema.safeParse(profile).success).toBe(true);
    expect(trainingProfileSchema.safeParse({ ...profile, days_per_week: 8 }).success).toBe(false);
    expect(trainingProfileSchema.safeParse({ ...profile, preferred_weekdays: [0] }).success).toBe(
      false,
    );
  });
});

describe("peso e descanso", () => {
  it("peso fora de 30–300 é recusado com mensagem citando a faixa", () => {
    const entry = {
      id: ID,
      student_id: ID2,
      measured_on: "2026-10-26",
      weight_kg: 25,
      source: "manual",
      assessment_id: null,
    };
    const result = weightEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("30 a 300");
  });

  it("descanso aceita 0 h (desativa) e recusa acima de 168 h", () => {
    const base = {
      student_id: ID,
      default_hours: 48,
      overrides: [{ muscle_group_code: "abs", hours: 0 }],
    };
    expect(restSettingsSchema.safeParse(base).success).toBe(true);
    expect(restSettingsSchema.safeParse({ ...base, default_hours: 169 }).success).toBe(false);
  });
});

describe("exercício (RN-037)", () => {
  const exercise = {
    id: ID,
    origin: "custom" as const,
    manager_id: ID2,
    source_id: null,
    name: "Remada fictícia",
    instructions: ["Passo 1"],
    safety_tips: null,
    difficulty: "beginner" as const,
    measure_type: "reps" as const,
    is_bodyweight: false,
    movement_pattern: "h_pull" as const,
    load_markers: [],
    primary_muscles: ["upper_back" as const],
    secondary_muscles: [],
    equipment: ["cable" as const],
    active: true,
  };

  it("personalizado exige gestor; importado exige fonte", () => {
    expect(exerciseSchema.safeParse(exercise).success).toBe(true);
    expect(exerciseSchema.safeParse({ ...exercise, manager_id: null }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...exercise, origin: "imported" }).success).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...exercise, origin: "imported", source_id: ID2 }).success,
    ).toBe(true);
  });
});

describe("prescrição e rascunho (RN-035)", () => {
  it("repetições exigem faixa com mínimo ≤ máximo", () => {
    expect(workoutItemSchema.safeParse(item).success).toBe(true);
    expect(workoutItemSchema.safeParse({ ...item, reps_min: 12, reps_max: 8 }).success).toBe(false);
    expect(workoutItemSchema.safeParse({ ...item, reps_min: null }).success).toBe(false);
  });

  it("duração exige segundos; séries e descanso respeitam faixas", () => {
    const timed = { ...item, measure_type: "duration" as const, reps_min: null, reps_max: null };
    expect(workoutItemSchema.safeParse(timed).success).toBe(false);
    expect(workoutItemSchema.safeParse({ ...timed, duration_s: 45 }).success).toBe(true);
    expect(workoutItemSchema.safeParse({ ...item, sets: 11 }).success).toBe(false);
    expect(workoutItemSchema.safeParse({ ...item, rest_s: 601 }).success).toBe(false);
  });

  it("rascunho aceita até 7 treinos", () => {
    const workout = { id: ID2, position: 1, name: "A — Superiores", items: [item] };
    const draft = {
      id: ID,
      student_id: ID2,
      status: "draft",
      name: "Programa",
      split_type: "ab",
      workouts: [workout],
      revision: 0,
    };
    expect(programDraftSchema.safeParse(draft).success).toBe(true);
    const eight = Array.from({ length: 8 }, (_, i) => ({
      ...workout,
      position: Math.min(i + 1, 7),
    }));
    expect(programDraftSchema.safeParse({ ...draft, workouts: eight }).success).toBe(false);
  });
});

describe("sessão e séries", () => {
  const session = {
    id: ID,
    student_id: ID2,
    program_version_id: ID2,
    workout_id: ID2,
    status: "completed" as const,
    started_at: "2026-10-26T10:00:00Z",
    ended_at: "2026-10-26T11:00:00Z",
    duration_min: 60,
    last_activity_at: "2026-10-26T10:55:00Z",
    rpe: 7,
    notes: null,
    device_id: ID,
  };

  it("sessão concluída exige término posterior ao início", () => {
    expect(sessionSchema.safeParse(session).success).toBe(true);
    expect(sessionSchema.safeParse({ ...session, ended_at: null }).success).toBe(false);
    expect(sessionSchema.safeParse({ ...session, ended_at: "2026-10-26T09:00:00Z" }).success).toBe(
      false,
    );
    expect(
      sessionSchema.safeParse({ ...session, status: "in_progress", ended_at: null }).success,
    ).toBe(true);
  });

  it("instantes precisam estar em UTC", () => {
    expect(
      sessionSchema.safeParse({ ...session, started_at: "2026-10-26T10:00:00-03:00" }).success,
    ).toBe(false);
  });

  it("série exige repetições ou duração, e carga em passos de 0,5 kg", () => {
    const set = {
      id: ID,
      session_exercise_id: ID2,
      set_number: 1,
      load_kg: 62.5,
      reps: 10,
      duration_s: null,
      completed_at: "2026-10-26T10:05:00Z",
    };
    expect(setLogSchema.safeParse(set).success).toBe(true);
    expect(setLogSchema.safeParse({ ...set, reps: null }).success).toBe(false);
    expect(setLogSchema.safeParse({ ...set, duration_s: 30 }).success).toBe(false);
    expect(setLogSchema.safeParse({ ...set, load_kg: 62.3 }).success).toBe(false);
  });
});

describe("rótulos (TRN-01, TRN-03)", () => {
  it("toda enumeração tem rótulo em português", () => {
    for (const goal of GOALS) expect(GOAL_LABELS[goal]).toBeTruthy();
    for (const group of MUSCLE_GROUPS) expect(MUSCLE_GROUP_LABELS[group]).toBeTruthy();
    expect(EXPERIENCE_LABELS.beginner).toBe("Iniciante");
  });
});
