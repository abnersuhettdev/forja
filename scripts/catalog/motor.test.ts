// Casos de referência do motor (TRN-02 §6, CT-GER-01..08; CA-021, CA-022, CA-035, CA-405), sobre o
// catálogo curado real: é ele que precisa dar certo.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LOCATION_EQUIPMENT_PRESETS,
  RESTRICTION_EXCLUDED_MARKERS,
  type Equipment,
  type LoadMarker,
  type MuscleGroup,
  type Restriction,
} from "../../packages/domain/src/index.ts";
import {
  generateProgram,
  regenerateWorkout,
  type GeneratedItem,
  type MotorExercise,
  type MotorProfile,
  type MotorResult,
} from "../../packages/domain/src/motor/index.ts";
import { draftIssues, workoutItemSchema } from "../../packages/domain/src/validacao/index.ts";

interface Entry {
  codigo: string;
  source_ref: string;
  name: string;
  difficulty: MotorExercise["difficulty"];
  measure_type: MotorExercise["measure_type"];
  movement_pattern: MotorExercise["movement_pattern"];
  load_markers: LoadMarker[];
  load_markers_v12: LoadMarker[];
  contraindications: Restriction[];
  primary_muscles: MuscleGroup[];
  secondary_muscles: MuscleGroup[];
  equipment: Equipment[];
}

const entries = JSON.parse(
  readFileSync(new URL("../../catalog/exercicios.json", import.meta.url), "utf8"),
) as Entry[];

const CATALOG: MotorExercise[] = entries.map((e) => ({
  id: e.codigo,
  code: e.source_ref,
  name: e.name,
  difficulty: e.difficulty,
  measure_type: e.measure_type,
  movement_pattern: e.movement_pattern,
  load_markers: [...e.load_markers, ...e.load_markers_v12],
  contraindications: e.contraindications,
  primary: e.primary_muscles,
  secondary: e.secondary_muscles,
  equipment: e.equipment,
}));
const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));
const REFERENCE = "2026-11-10";

const profile = (overrides: Partial<MotorProfile> = {}): MotorProfile => ({
  birth_date: "1992-01-15",
  goal: "hypertrophy",
  experience_level: "intermediate",
  days_per_week: 4,
  minutes_per_session: 60,
  equipment_codes: LOCATION_EQUIPMENT_PRESETS.full_gym,
  restrictions_declared: "none",
  restriction_codes: null,
  ...overrides,
});

function generate(overrides: Partial<MotorProfile> = {}, catalog = CATALOG) {
  const result: MotorResult = generateProgram({
    profile: profile(overrides),
    catalog,
    referenceDate: REFERENCE,
  });
  if (result.status !== "generated") throw new Error("esperava um rascunho");
  return result;
}

const items = (result: ReturnType<typeof generate>): readonly GeneratedItem[] =>
  result.program.workouts.flatMap((w) => w.items);
const exercises = (result: ReturnType<typeof generate>) =>
  items(result).flatMap((i) => {
    const exercise = BY_ID.get(i.exercise_id);
    return exercise ? [exercise] : [];
  });
const volume = (result: ReturnType<typeof generate>, group: MuscleGroup) =>
  result.report.weekly_volume.find((v) => v.group === group);

describe("CT-GER-01: dados faltando (CA-022)", () => {
  it("sem experiência, não gera e lista a pendência", () => {
    expect(
      generateProgram({
        profile: profile({ experience_level: null }),
        catalog: CATALOG,
        referenceDate: REFERENCE,
      }),
    ).toEqual({ status: "blocked", pending: ["experience_level"] });
  });

  it("lista tudo o que falta, e 'nenhuma restrição' precisa ser explícito (RN-006)", () => {
    const result = generateProgram({
      profile: profile({
        birth_date: null,
        goal: null,
        days_per_week: null,
        minutes_per_session: null,
        equipment_codes: [],
        restrictions_declared: null,
      }),
      catalog: CATALOG,
      referenceDate: REFERENCE,
    });
    expect(result).toEqual({
      status: "blocked",
      pending: [
        "birth_date",
        "goal",
        "days_per_week",
        "minutes_per_session",
        "equipment",
        "restrictions",
      ],
    });
  });

  it("menor de 18 anos não é atendido (RN-010)", () => {
    expect(
      generateProgram({
        profile: profile({ birth_date: "2010-01-01" }),
        catalog: CATALOG,
        referenceDate: REFERENCE,
      }),
    ).toEqual({ status: "blocked", pending: ["under_age"] });
  });
});

describe("CT-GER-02: intermediário, hipertrofia, 4 dias, academia completa", () => {
  const result = generate();

  it("Superior/Inferior com 4 treinos distintos e 6 a 8 itens", () => {
    expect(result.report.split).toBe("upper_lower_4");
    expect(result.program.workouts.map((w) => w.name)).toEqual([
      "A — Superior",
      "B — Inferior",
      "C — Superior",
      "D — Inferior",
    ]);
    for (const workout of result.program.workouts) {
      expect(workout.items.length).toBeGreaterThanOrEqual(6);
      expect(workout.items.length).toBeLessThanOrEqual(8);
    }
    const [a, , c] = result.program.workouts;
    expect(a?.items[0]?.exercise_id).not.toBe(c?.items[0]?.exercise_id);
  });

  it("compostos em barra primeiro, e compostos antes de isolados", () => {
    expect(BY_ID.get(result.program.workouts[0]?.items[0]?.exercise_id ?? "")?.equipment).toContain(
      "barbell",
    );
    for (const workout of result.program.workouts) {
      const classes = workout.items.map((i) => BY_ID.get(i.exercise_id)?.movement_pattern);
      const firstIsolated = classes.findIndex(
        (p) =>
          !["squat", "hinge", "lunge", "h_push", "v_push", "h_pull", "v_pull"].includes(p ?? ""),
      );
      const compounds = classes.filter((p) =>
        ["squat", "hinge", "lunge", "h_push", "v_push", "h_pull", "v_pull"].includes(p ?? ""),
      );
      if (firstIsolated >= 0) expect(firstIsolated).toBe(compounds.length);
    }
  });

  it("costas e pernas ficam na faixa de 10 a 20 séries", () => {
    const back = (volume(result, "lats")?.sets ?? 0) + (volume(result, "upper_back")?.sets ?? 0);
    expect(back).toBeGreaterThanOrEqual(10);
    expect(back).toBeLessThanOrEqual(20);
    expect(volume(result, "quadriceps")?.status).toBe("ok");
    expect(volume(result, "chest")).toMatchObject({ sets: 12, status: "ok" });
    // Posteriores ficam em 9, abaixo dos 10 de CT-GER-02: o relatório sinaliza (TRN-02 §3A).
    expect(volume(result, "hamstrings")).toMatchObject({ sets: 9, status: "low" });
  });

  it("com pouco tempo, bíceps e tríceps se alternam entre os dois treinos Superior", () => {
    const patterns = (index: number) =>
      result.program.workouts[index]?.items.map((i) => BY_ID.get(i.exercise_id)?.movement_pattern);
    expect(patterns(0)).toContain("chest_iso");
    expect(patterns(0)).toContain("elbow_flex");
    expect(patterns(2)).toContain("chest_iso");
    expect(patterns(2)).toContain("elbow_ext");
  });

  it("não sugere carga e passa nas regras de publicação (RN-026, RN-035)", () => {
    expect(new Set(items(result).map((i) => i.suggested_load_kg))).toEqual(new Set([null]));
    const withIds = result.program.workouts.map((w, wi) => ({
      id: `w${String(wi)}`,
      name: w.name,
      items: w.items.map((item, ii) => ({
        ...item,
        id: "00000000-0000-4000-8000-000000000001",
        position: ii + 1,
        exercise_id: "00000000-0000-4000-8000-000000000002",
      })),
    }));
    expect(draftIssues({ workouts: withIds }, () => true)).toEqual([]);
    for (const workout of withIds) {
      for (const item of workout.items)
        expect(workoutItemSchema.safeParse(item).success).toBe(true);
    }
  });
});

describe("CT-GER-03: iniciante, emagrecimento, 3 dias, academia básica", () => {
  const result = generate({
    goal: "weight_loss",
    experience_level: "beginner",
    days_per_week: 3,
    minutes_per_session: 50,
    equipment_codes: LOCATION_EQUIPMENT_PRESETS.basic_gym,
    birth_date: "1998-03-10",
  });

  it("corpo inteiro A/B/C, com máquinas primeiro, 2 séries de 10–15 e 60 s", () => {
    expect(result.program.workouts.map((w) => w.name)).toEqual([
      "A — Corpo inteiro",
      "B — Corpo inteiro",
      "C — Corpo inteiro",
    ]);
    const first = result.program.workouts[0]?.items[0];
    expect(BY_ID.get(first?.exercise_id ?? "")?.equipment).toContain("machine");
    expect(first).toMatchObject({ sets: 2, reps_min: 10, reps_max: 15, rest_s: 60 });
  });

  it("só usa exercícios de iniciante", () => {
    expect(exercises(result).every((e) => e.difficulty === "beginner")).toBe(true);
  });

  it("o treino B varia os estímulos do A", () => {
    const patterns = (index: number) =>
      result.program.workouts[index]?.items.map((i) => BY_ID.get(i.exercise_id)?.movement_pattern);
    expect(patterns(0)?.[0]).toBe("squat");
    expect(patterns(1)?.[0]).toBe("lunge");
  });
});

describe("CT-GER-04: restrição lombar (RN-008, CA-021)", () => {
  const result = generate({
    restrictions_declared: "listed",
    restriction_codes: ["lower_back"],
    birth_date: "1985-05-20",
  });

  it("nenhum exercício com marcador excluído ou contraindicação", () => {
    for (const exercise of exercises(result)) {
      for (const marker of RESTRICTION_EXCLUDED_MARKERS.lower_back) {
        expect(exercise.load_markers).not.toContain(marker);
      }
      expect(exercise.contraindications).not.toContain("lower_back");
    }
  });

  it("lista as exclusões com motivo e traz aviso de saúde", () => {
    expect(result.report.excluded).toContainEqual(
      expect.objectContaining({
        exercise: "Agachamento livre com barra",
        reason: { kind: "restriction", restriction: "lower_back", detail: "axial_spine_load" },
      }),
    );
    expect(result.report.warnings.join(" ")).toContain("profissional de saúde");
  });
});

describe("CA-035: contraindicação explícita exclui e é listada", () => {
  it("mesmo sem marcador nenhum", () => {
    const result = generate({ restrictions_declared: "listed", restriction_codes: ["knee"] });
    expect(exercises(result).map((e) => e.id)).not.toContain("cadeira-extensora");
    expect(result.report.excluded).toContainEqual(
      expect.objectContaining({
        exercise_id: "cadeira-extensora",
        reason: { kind: "restriction", restriction: "knee", detail: "contraindication" },
      }),
    );
  });

  it("marcadores e contraindicações se somam em todas as regiões", () => {
    for (const restriction of [
      "shoulder",
      "elbow",
      "wrist",
      "neck",
      "thoracic",
      "lower_back",
      "hip",
      "knee",
      "ankle",
    ] as const) {
      const result = generate({
        restrictions_declared: "listed",
        restriction_codes: [restriction],
      });
      expect(result.program.workouts.length).toBeGreaterThan(0);
      for (const exercise of exercises(result)) {
        expect(exercise.contraindications).not.toContain(restriction);
        for (const marker of RESTRICTION_EXCLUDED_MARKERS[restriction]) {
          expect(exercise.load_markers).not.toContain(marker);
        }
      }
    }
  });
});

describe("CT-GER-05: em casa, só peso corporal e elástico", () => {
  const result = generate({ equipment_codes: ["bodyweight", "band"] });

  it("nenhum exercício com equipamento ausente e vagas vazias registradas", () => {
    for (const exercise of exercises(result)) {
      expect(exercise.equipment.every((e) => e === "bodyweight" || e === "band")).toBe(true);
    }
    expect(result.report.unfilled_slots.length).toBeGreaterThan(0);
    expect(result.report.unfilled_slots.some((s) => s.reason === "equipment")).toBe(true);
  });
});

describe("CT-GER-06: 65 anos, iniciante", () => {
  const result = generate({
    birth_date: "1961-02-01",
    experience_level: "beginner",
    days_per_week: 2,
  });

  it("séries reduzidas, sem técnica alta nem impacto, com aviso", () => {
    expect(result.report.inputs.age).toBe(65);
    for (const exercise of exercises(result)) {
      expect(exercise.load_markers).not.toContain("technical_high");
      expect(exercise.load_markers).not.toContain("knee_impact");
    }
    // Iniciante em hipertrofia: 2 séries; o composto não baixa de 2, o isolado vai a 1.
    expect(items(result).every((i) => i.sets >= 1 && i.sets <= 2)).toBe(true);
    expect(result.report.warnings.join(" ")).toContain("60 anos");
  });
});

describe("CT-GER-07: determinismo", () => {
  it("mesma entrada, saída idêntica, em qualquer ordem do catálogo", () => {
    const first = JSON.stringify(generate());
    expect(JSON.stringify(generate())).toBe(first);
    expect(JSON.stringify(generate({}, [...CATALOG].reverse()))).toBe(first);
  });
});

describe("CT-GER-08: restrição 'other'", () => {
  it("gera com aviso de revisão manual, sem excluir por isso", () => {
    const result = generate({ restrictions_declared: "listed", restriction_codes: ["other"] });
    expect(result.report.warnings.join(" ")).toContain("revise cada exercício");
    expect(result.report.excluded.some((e) => e.reason.kind === "restriction")).toBe(false);
  });
});

describe("divisões por dias e experiência (TRN-02 §3)", () => {
  it.each([
    [1, "beginner", "full_body_1", 1],
    [2, "advanced", "full_body_2", 2],
    [3, "intermediate", "ppl_3", 3],
    [4, "beginner", "upper_lower_2", 2],
    [5, "intermediate", "ppl_upper_lower_5", 5],
    [6, "advanced", "ppl_6", 6],
    [7, "beginner", "upper_lower_2", 2],
    [7, "intermediate", "ppl_6", 6],
  ] as const)("%i dias, %s", (days, level, split, count) => {
    const result = generate({ days_per_week: days, experience_level: level });
    expect(result.report.split).toBe(split);
    expect(result.program.workouts).toHaveLength(count);
  });

  it("respeita o tempo, com ao menos 3 e no máximo 9 itens", () => {
    for (const minutes of [15, 30, 45, 60, 90, 180]) {
      const result = generate({ minutes_per_session: minutes });
      for (const workout of result.program.workouts) {
        expect(workout.items.length).toBeGreaterThanOrEqual(3);
        expect(workout.items.length).toBeLessThanOrEqual(9);
      }
    }
  });
});

describe("CA-405: ênfase (RN-064)", () => {
  const plain = generate();
  const focused = generate({ emphasis_groups: ["glutes"] });

  it("aumenta o volume do grupo, dentro do teto semanal", () => {
    const before = volume(plain, "glutes")?.sets ?? 0;
    const after = volume(focused, "glutes")?.sets ?? 0;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(20);
    expect(focused.report.emphasis[0]).toMatchObject({ group: "glutes", sets_before: before });
  });

  it("nunca sobrepõe restrição", () => {
    const result = generate({
      emphasis_groups: ["glutes", "quadriceps"],
      restrictions_declared: "listed",
      restriction_codes: ["knee", "lower_back"],
    });
    for (const exercise of exercises(result)) {
      expect(exercise.contraindications).not.toContain("knee");
      expect(exercise.contraindications).not.toContain("lower_back");
      for (const marker of [
        ...RESTRICTION_EXCLUDED_MARKERS.knee,
        ...RESTRICTION_EXCLUDED_MARKERS.lower_back,
      ]) {
        expect(exercise.load_markers).not.toContain(marker);
      }
    }
  });

  it("não passa do tempo disponível", () => {
    const result = generate({ emphasis_groups: ["chest", "glutes"], minutes_per_session: 45 });
    for (const workout of result.program.workouts) {
      const seconds = workout.items.reduce(
        (total, i) => total + i.sets * ((i.duration_s ?? 45) + i.rest_s) + 60,
        0,
      );
      expect(seconds).toBeLessThanOrEqual(40 * 60);
    }
  });

  it("continua determinística", () => {
    expect(JSON.stringify(generate({ emphasis_groups: ["glutes"] }))).toBe(JSON.stringify(focused));
  });
});

describe("continuidade (TRN-03 §6, critério 2)", () => {
  it("prefere o exercício já usado, entre os da mesma família", () => {
    const result = generateProgram({
      profile: profile(),
      catalog: CATALOG,
      referenceDate: REFERENCE,
      previousExerciseIds: ["supino-declinado-barra"],
    });
    if (result.status !== "generated") throw new Error("esperava um rascunho");
    expect(result.program.workouts[0]?.items[0]?.exercise_id).toBe("supino-declinado-barra");
  });
});

describe("gerar outro treino (RF-119, CA-410)", () => {
  const program = generate();
  const ids = program.program.workouts.map((w) => w.items.map((i) => i.exercise_id));
  const regenerate = (
    overrides: Partial<MotorProfile> = {},
    workout: readonly string[] = ids[0] ?? [],
    others: readonly string[] = ids.slice(1).flat(),
    avoid: readonly string[] = [],
  ) => {
    const result = regenerateWorkout({
      profile: profile(overrides),
      catalog: CATALOG,
      referenceDate: REFERENCE,
      workoutExerciseIds: workout,
      otherExerciseIds: others,
      avoidExerciseIds: avoid,
    });
    if (result.status !== "regenerated") throw new Error("esperava um treino novo");
    return result.outcomes;
  };
  const chosen = (outcomes: ReturnType<typeof regenerate>) =>
    outcomes.flatMap((o) => (o.kind === "changed" ? [o.exercise_id] : []));

  it("troca por exercícios do mesmo padrão e com grupo primário em comum", () => {
    const workout = ids[0] ?? [];
    const outcomes = regenerate();
    expect(chosen(outcomes).length).toBeGreaterThan(0);
    outcomes.forEach((outcome, index) => {
      if (outcome.kind !== "changed") return;
      const before = BY_ID.get(workout[index] ?? "");
      const after = BY_ID.get(outcome.exercise_id);
      expect(after?.movement_pattern).toBe(before?.movement_pattern);
      expect(after?.primary.some((m) => before?.primary.includes(m))).toBe(true);
      expect(workout).not.toContain(outcome.exercise_id);
    });
  });

  it("não repete dentro do treino e evita o que está nos outros treinos", () => {
    const picks = chosen(regenerate());
    expect(new Set(picks).size).toBe(picks.length);
    const repeated = picks.filter((id) => ids.slice(1).flat().includes(id));
    expect(repeated.length).toBeLessThan(picks.length);
  });

  it("nunca sobrepõe restrição (RN-008)", () => {
    for (const restriction of ["knee", "shoulder", "lower_back"] as const) {
      const overrides = {
        restrictions_declared: "listed",
        restriction_codes: [restriction],
      } as const;
      const base = generate(overrides).program.workouts.map((w) =>
        w.items.map((i) => i.exercise_id),
      );
      for (const workout of base) {
        for (const id of chosen(regenerate(overrides, workout, []))) {
          const exercise = BY_ID.get(id);
          expect(exercise?.contraindications).not.toContain(restriction);
          for (const marker of RESTRICTION_EXCLUDED_MARKERS[restriction]) {
            expect(exercise?.load_markers).not.toContain(marker);
          }
        }
      }
    }
  });

  it("sem alternativa, mantém o atual; se ele não serve, tira e diz o motivo", () => {
    const solo = ["pallof-press"];
    expect(regenerate({ equipment_codes: ["cable"] }, solo, [])).toEqual([
      expect.objectContaining({ kind: "changed" }),
    ]);
    expect(regenerate({ equipment_codes: ["bodyweight"] }, ["cadeira-extensora"], [])).toEqual([
      { kind: "removed", reason: { kind: "equipment", equipment: "machine" } },
    ]);
    expect(regenerate({}, ["inexistente"], [])).toEqual([
      { kind: "removed", reason: { kind: "not_available" } },
    ]);
    expect(regenerate({}, ["cadeira-extensora"], [])).toEqual([{ kind: "kept" }]);
  });

  it("gerar de novo traz outra opção e, esgotadas, volta às já vistas", () => {
    const workout = ["supino-reto-barra"];
    const first = chosen(regenerate({}, workout, []));
    const second = chosen(regenerate({}, first, [], workout));
    expect(second[0]).not.toBe(first[0]);
    expect(second[0]).not.toBe(workout[0]);
    const everything = CATALOG.filter((e) => e.movement_pattern === "h_push").map((e) => e.id);
    expect(chosen(regenerate({}, workout, [], everything)).length).toBe(1);
  });

  it("é determinística e bloqueia com perfil incompleto", () => {
    expect(JSON.stringify(regenerate())).toBe(JSON.stringify(regenerate()));
    expect(
      regenerateWorkout({
        profile: profile({ goal: null }),
        catalog: CATALOG,
        referenceDate: REFERENCE,
        workoutExerciseIds: ["supino-reto-barra"],
        otherExerciseIds: [],
      }),
    ).toEqual({ status: "blocked", pending: ["goal"] });
  });
});
