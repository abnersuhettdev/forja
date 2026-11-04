// Motor de geração de treinos (TRN-02, ADR-061, ADR-062, ADR-064; RN-006..009, RN-064).
// Função pura e determinística: mesmas entradas e versões, mesma saída. Sem relógio, sem sorteio
// e sem identificadores gerados: quem chama cria os ids. Nunca publica nem sugere carga.
// Fica em ponto de entrada próprio para não pesar no JS inicial do app (SEG-04 §1).
import {
  RESTRICTION_EXCLUDED_MARKERS,
  type Difficulty,
  type Equipment,
  type ExperienceLevel,
  type Goal,
  type LoadMarker,
  type MeasureType,
  type MovementPattern,
  type MuscleGroup,
  type Restriction,
  type SplitType,
} from "../enums.ts";
import {
  ESTIMATE_SECONDS_PER_SET,
  ESTIMATE_TRANSITION_SECONDS,
  PARAMETERS_VERSION,
} from "../parameters.ts";
import { RANGES } from "../ranges.ts";

export const ENGINE_VERSION = "1.0.0";

const WARMUP_MINUTES = 5;
const MIN_ITEMS = 3;
const MAX_ITEMS = 9;
const SENIOR_AGE = 60;
const MIN_AGE = 18;

// ---------- Entrada e saída (TRN-02 §2) ----------

export interface MotorExercise {
  readonly id: string;
  /** Código estável para o desempate final (TRN-03 §6): `source_ref` ou o id. */
  readonly code: string;
  readonly name: string;
  readonly difficulty: Difficulty;
  readonly measure_type: MeasureType;
  readonly movement_pattern: MovementPattern;
  readonly load_markers: readonly LoadMarker[];
  readonly contraindications: readonly Restriction[];
  readonly primary: readonly MuscleGroup[];
  readonly secondary: readonly MuscleGroup[];
  readonly equipment: readonly Equipment[];
}

export interface MotorProfile {
  readonly birth_date: string | null;
  readonly goal: Goal | null;
  readonly experience_level: ExperienceLevel | null;
  readonly days_per_week: number | null;
  readonly minutes_per_session: number | null;
  readonly equipment_codes: readonly Equipment[] | null;
  readonly restrictions_declared: "none" | "listed" | null;
  readonly restriction_codes: readonly Restriction[] | null;
  readonly emphasis_groups?: readonly MuscleGroup[] | null;
}

export interface MotorInput {
  readonly profile: MotorProfile;
  /** Só exercícios ativos e visíveis ao usuário (RN-007). */
  readonly catalog: readonly MotorExercise[];
  /** Data local AAAA-MM-DD: o motor não lê o relógio. */
  readonly referenceDate: string;
  /** Exercícios da versão anterior, para continuidade (TRN-03 §6, critério 2). */
  readonly previousExerciseIds?: readonly string[];
  /** Dados desatualizados (RN-016): aviso, sem bloquear. */
  readonly staleData?: boolean;
}

export type MotorPendingCode =
  | "birth_date"
  | "under_age"
  | "goal"
  | "experience_level"
  | "days_per_week"
  | "minutes_per_session"
  | "equipment"
  | "restrictions";

export interface GeneratedItem {
  readonly exercise_id: string;
  readonly measure_type: MeasureType;
  readonly sets: number;
  readonly reps_min: number | null;
  readonly reps_max: number | null;
  readonly duration_s: number | null;
  readonly rest_s: number;
  readonly suggested_load_kg: null;
  readonly notes: string;
}

export interface GeneratedWorkout {
  readonly name: string;
  readonly items: readonly GeneratedItem[];
}

export type ExclusionReason =
  | { readonly kind: "restriction"; readonly restriction: Restriction; readonly detail: string }
  | { readonly kind: "equipment"; readonly equipment: Equipment }
  | { readonly kind: "difficulty" }
  | { readonly kind: "age"; readonly detail: LoadMarker };

export type UnfilledReason = "restriction" | "equipment" | "difficulty" | "age" | "time" | "none";

export interface GeneratorReport {
  readonly engine_version: string;
  readonly parameters_version: string;
  readonly reference_date: string;
  readonly inputs: {
    readonly goal: Goal;
    readonly experience: ExperienceLevel;
    readonly age: number;
    readonly days_per_week: number;
    readonly minutes_per_session: number;
    readonly equipment: readonly Equipment[];
    readonly restrictions: readonly Restriction[];
    readonly emphasis: readonly MuscleGroup[];
  };
  readonly split: string;
  readonly excluded: readonly {
    readonly exercise: string;
    readonly exercise_id: string;
    readonly reason: ExclusionReason;
  }[];
  readonly unfilled_slots: readonly {
    readonly workout: string;
    readonly slot: MovementPattern;
    readonly optional: boolean;
    readonly reason: UnfilledReason;
  }[];
  readonly weekly_volume: readonly {
    readonly group: MuscleGroup;
    readonly sets: number;
    readonly min: number;
    readonly max: number;
    readonly status: "low" | "ok" | "high";
  }[];
  readonly emphasis: readonly {
    readonly group: MuscleGroup;
    readonly sets_before: number;
    readonly sets_after: number;
    readonly limited: boolean;
  }[];
  readonly insufficient_workouts: readonly string[];
  readonly warnings: readonly string[];
}

export type MotorResult =
  | { readonly status: "blocked"; readonly pending: readonly MotorPendingCode[] }
  | {
      readonly status: "generated";
      readonly program: {
        readonly name: string;
        readonly split_type: SplitType;
        readonly workouts: readonly GeneratedWorkout[];
      };
      readonly report: GeneratorReport;
    };

// ---------- Passo 1: dados mínimos (RN-006, RN-010) ----------

export function ageOn(birthDate: string, referenceDate: string): number {
  const [by = 0, bm = 0, bd = 0] = birthDate.split("-").map(Number);
  const [ry = 0, rm = 0, rd = 0] = referenceDate.split("-").map(Number);
  return ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0);
}

export function motorPending(profile: MotorProfile, referenceDate: string): MotorPendingCode[] {
  const pending: MotorPendingCode[] = [];
  if (profile.birth_date === null) pending.push("birth_date");
  else if (ageOn(profile.birth_date, referenceDate) < MIN_AGE) pending.push("under_age");
  if (profile.goal === null) pending.push("goal");
  if (profile.experience_level === null) pending.push("experience_level");
  if (profile.days_per_week === null) pending.push("days_per_week");
  if (profile.minutes_per_session === null) pending.push("minutes_per_session");
  if ((profile.equipment_codes ?? []).length === 0) pending.push("equipment");
  if (profile.restrictions_declared === null) pending.push("restrictions");
  return pending;
}

// ---------- Elegibilidade (TRN-03 §6; RN-007, RN-008, ADR-064) ----------

interface Context {
  readonly experience: ExperienceLevel;
  readonly age: number;
  readonly equipment: ReadonlySet<Equipment>;
  readonly restrictions: readonly Restriction[];
}

const DIFFICULTY_RANK: Readonly<Record<Difficulty, number>> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/** Primeiro motivo que tira o exercício da seleção; `null` = elegível. */
export function exclusionReason(exercise: MotorExercise, ctx: Context): ExclusionReason | null {
  // A restrição vem primeiro: é o motivo que a pessoa precisa ver (RN-008).
  for (const restriction of ctx.restrictions) {
    if (exercise.contraindications.includes(restriction)) {
      return { kind: "restriction", restriction, detail: "contraindication" };
    }
    const marker = RESTRICTION_EXCLUDED_MARKERS[restriction].find((m) =>
      exercise.load_markers.includes(m),
    );
    if (marker !== undefined) return { kind: "restriction", restriction, detail: marker };
  }
  const missing = exercise.equipment.find((e) => !ctx.equipment.has(e));
  if (missing !== undefined) return { kind: "equipment", equipment: missing };
  if (ctx.age >= SENIOR_AGE) {
    const marker = (["technical_high", "knee_impact"] as const).find((m) =>
      exercise.load_markers.includes(m),
    );
    if (marker !== undefined) return { kind: "age", detail: marker };
  }
  if (DIFFICULTY_RANK[exercise.difficulty] > DIFFICULTY_RANK[ctx.experience]) {
    return { kind: "difficulty" };
  }
  return null;
}

/** Perfil com tudo o que RN-006 exige; `null` enquanto faltar algo. */
function completeProfile(profile: MotorProfile, referenceDate: string) {
  const { birth_date, goal, experience_level, days_per_week, minutes_per_session } = profile;
  if (
    birth_date === null ||
    goal === null ||
    experience_level === null ||
    days_per_week === null ||
    minutes_per_session === null ||
    motorPending(profile, referenceDate).length > 0
  ) {
    return null;
  }
  return { birth_date, goal, experience_level, days_per_week, minutes_per_session };
}

/** Contexto a partir do perfil completo; o peso corporal está sempre disponível (TRN-03 §3). */
export function eligibilityContext(profile: MotorProfile, referenceDate: string): Context | null {
  const complete = completeProfile(profile, referenceDate);
  if (complete === null) return null;
  return {
    experience: complete.experience_level,
    age: ageOn(complete.birth_date, referenceDate),
    equipment: new Set<Equipment>([...(profile.equipment_codes ?? []), "bodyweight"]),
    restrictions:
      profile.restrictions_declared === "listed" ? [...(profile.restriction_codes ?? [])] : [],
  };
}

// ---------- Ordenação (TRN-03 §6) ----------

type EquipmentFamily = "guided" | "bodyweight" | "dumbbell" | "cable" | "barbell";

function familyOf(exercise: MotorExercise): EquipmentFamily {
  const has = (...codes: Equipment[]) => codes.some((c) => exercise.equipment.includes(c));
  if (has("machine", "smith_machine")) return "guided";
  if (has("bodyweight", "band")) return "bodyweight";
  if (has("barbell", "ez_bar")) return "barbell";
  if (has("dumbbell", "kettlebell", "medicine_ball")) return "dumbbell";
  if (has("cable")) return "cable";
  return "bodyweight";
}

const FAMILY_ORDER: Readonly<Record<"beginner" | "other", readonly EquipmentFamily[]>> = {
  beginner: ["guided", "bodyweight", "dumbbell", "cable", "barbell"],
  other: ["barbell", "dumbbell", "cable", "guided", "bodyweight"],
};

const compareCodes = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function compareForSelection(
  a: MotorExercise,
  b: MotorExercise,
  experience: ExperienceLevel,
  previous: ReadonlySet<string>,
): number {
  const order = FAMILY_ORDER[experience === "beginner" ? "beginner" : "other"];
  const byFamily = order.indexOf(familyOf(a)) - order.indexOf(familyOf(b));
  if (byFamily !== 0) return byFamily;
  const byContinuity = Number(previous.has(b.id)) - Number(previous.has(a.id));
  if (byContinuity !== 0) return byContinuity;
  const byDifficulty = DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty];
  if (byDifficulty !== 0) return experience === "advanced" ? -byDifficulty : byDifficulty;
  return compareCodes(a.code, b.code);
}

// ---------- Passo 3: divisão ----------

type WorkoutKind = "full" | "push" | "pull" | "legs" | "upper" | "lower";

interface Split {
  readonly key: string;
  readonly splitType: SplitType;
  readonly kinds: readonly WorkoutKind[];
}

function chooseSplit(days: number, experience: ExperienceLevel): Split {
  const beginner = experience === "beginner";
  if (days === 1) return { key: "full_body_1", splitType: "full_body", kinds: ["full"] };
  if (days === 2) return { key: "full_body_2", splitType: "full_body", kinds: ["full", "full"] };
  if (days === 3) {
    return beginner
      ? { key: "full_body_3", splitType: "full_body", kinds: ["full", "full", "full"] }
      : { key: "ppl_3", splitType: "abc", kinds: ["push", "pull", "legs"] };
  }
  if (beginner)
    return { key: "upper_lower_2", splitType: "upper_lower", kinds: ["upper", "lower"] };
  if (days === 4) {
    return {
      key: "upper_lower_4",
      splitType: "upper_lower",
      kinds: ["upper", "lower", "upper", "lower"],
    };
  }
  if (days === 5) {
    return {
      key: "ppl_upper_lower_5",
      splitType: "other",
      kinds: ["push", "pull", "legs", "upper", "lower"],
    };
  }
  return {
    key: "ppl_6",
    splitType: "other",
    kinds: ["push", "pull", "legs", "push", "pull", "legs"],
  };
}

const KIND_LABEL: Readonly<Record<WorkoutKind, string>> = {
  full: "Corpo inteiro",
  push: "Empurrar",
  pull: "Puxar",
  legs: "Pernas",
  upper: "Superior",
  lower: "Inferior",
};

// ---------- Passo 5: vagas ----------

interface Slot {
  readonly pattern: MovementPattern;
  readonly optional?: true;
  /** Ombro posterior: precisa ter a parte alta das costas entre os grupos (TRN-02 §3, Puxar). */
  readonly rear?: true;
}

const req = (pattern: MovementPattern): Slot => ({ pattern });
const opt = (pattern: MovementPattern): Slot => ({ pattern, optional: true });

const FULL_A: readonly Slot[] = [
  req("squat"),
  req("h_push"),
  req("h_pull"),
  req("hinge"),
  req("v_pull"),
  opt("v_push"),
  opt("core_stability"),
  opt("lunge"),
  opt("elbow_flex"),
  opt("elbow_ext"),
  opt("calf"),
];

/** Treino B de corpo inteiro: troca `squat`→`lunge` e `h_push`→`v_push` para variar estímulos. */
const FULL_B: readonly Slot[] = [
  req("lunge"),
  req("v_push"),
  req("h_pull"),
  req("hinge"),
  req("v_pull"),
  opt("h_push"),
  opt("core_stability"),
  opt("squat"),
  opt("elbow_flex"),
  opt("elbow_ext"),
  opt("calf"),
];

const SLOTS: Readonly<Record<Exclude<WorkoutKind, "full">, readonly Slot[]>> = {
  push: [
    req("h_push"),
    req("v_push"),
    req("h_push"),
    req("shoulder_iso"),
    req("elbow_ext"),
    opt("chest_iso"),
    opt("elbow_ext"),
  ],
  pull: [
    req("v_pull"),
    req("h_pull"),
    req("h_pull"),
    { pattern: "shoulder_iso", optional: true, rear: true },
    req("elbow_flex"),
    opt("elbow_flex"),
    opt("carry_grip"),
  ],
  legs: [
    req("squat"),
    req("hinge"),
    req("lunge"),
    req("knee_flex"),
    opt("knee_ext"),
    req("calf"),
    opt("core_stability"),
    opt("hip_abd_add"),
  ],
  upper: [
    req("h_push"),
    req("h_pull"),
    req("v_push"),
    req("v_pull"),
    opt("elbow_flex"),
    opt("elbow_ext"),
    opt("shoulder_iso"),
  ],
  lower: [
    req("squat"),
    req("hinge"),
    req("lunge"),
    opt("knee_flex"),
    opt("knee_ext"),
    opt("calf"),
    opt("core_stability"),
  ],
};

function slotsFor(kind: WorkoutKind, index: number): readonly Slot[] {
  if (kind !== "full") return SLOTS[kind];
  return index === 1 ? FULL_B : FULL_A;
}

// ---------- Passo 8: prescrição (TRN-02 §5.1, §5.3) ----------

type ExerciseClass = "compound" | "isolated" | "core";

const COMPOUND: ReadonlySet<MovementPattern> = new Set([
  "squat",
  "hinge",
  "lunge",
  "h_push",
  "v_push",
  "h_pull",
  "v_pull",
]);

function classOf(pattern: MovementPattern): ExerciseClass {
  if (COMPOUND.has(pattern)) return "compound";
  return pattern === "core_stability" || pattern === "core_flexion" ? "core" : "isolated";
}

interface Prescription {
  /** Séries: iniciante, intermediário, avançado. */
  readonly sets: readonly [number, number, number];
  readonly reps: readonly [number, number];
  readonly beginnerReps?: readonly [number, number];
  readonly rest: number;
}

const PRESCRIPTIONS: Readonly<Record<Goal, Readonly<Record<ExerciseClass, Prescription>>>> = {
  hypertrophy: {
    compound: { sets: [2, 3, 4], reps: [6, 10], beginnerReps: [8, 12], rest: 120 },
    isolated: { sets: [2, 3, 3], reps: [10, 15], rest: 75 },
    core: { sets: [2, 3, 3], reps: [10, 15], rest: 60 },
  },
  strength: {
    compound: { sets: [2, 3, 4], reps: [3, 6], beginnerReps: [6, 8], rest: 180 },
    isolated: { sets: [2, 2, 3], reps: [8, 12], rest: 90 },
    core: { sets: [2, 3, 3], reps: [8, 12], rest: 60 },
  },
  weight_loss: {
    compound: { sets: [2, 3, 3], reps: [10, 15], rest: 60 },
    isolated: { sets: [2, 3, 3], reps: [12, 15], rest: 45 },
    core: { sets: [2, 3, 3], reps: [12, 20], rest: 45 },
  },
  conditioning: {
    compound: { sets: [2, 3, 3], reps: [12, 20], rest: 45 },
    isolated: { sets: [2, 2, 3], reps: [15, 20], rest: 30 },
    core: { sets: [2, 3, 3], reps: [15, 20], rest: 30 },
  },
  maintenance: {
    compound: { sets: [2, 2, 3], reps: [8, 12], rest: 90 },
    isolated: { sets: [2, 2, 2], reps: [10, 15], rest: 60 },
    core: { sets: [2, 2, 3], reps: [10, 15], rest: 60 },
  },
  quality_of_life: {
    compound: { sets: [2, 2, 3], reps: [10, 15], rest: 75 },
    isolated: { sets: [2, 2, 2], reps: [12, 15], rest: 60 },
    core: { sets: [2, 2, 3], reps: [10, 15], rest: 60 },
  },
};

const LEVEL_INDEX: Readonly<Record<ExperienceLevel, 0 | 1 | 2>> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const NOTE_REPS = "Escolha uma carga que permita completar a faixa de repetições com boa execução.";

function prescribe(
  exercise: MotorExercise,
  goal: Goal,
  experience: ExperienceLevel,
  age: number,
): GeneratedItem {
  const kind = classOf(exercise.movement_pattern);
  const table = PRESCRIPTIONS[goal][kind];
  const base = table.sets[LEVEL_INDEX[experience]];
  const minimum = kind === "compound" ? 2 : 1;
  const sets = age >= SENIOR_AGE ? Math.max(base - 1, minimum) : base;
  if (exercise.measure_type === "duration") {
    const [low, high] = experience === "beginner" ? [20, 45] : [30, 60];
    return {
      exercise_id: exercise.id,
      measure_type: "duration",
      sets,
      reps_min: null,
      reps_max: null,
      duration_s: low,
      rest_s: table.rest,
      suggested_load_kg: null,
      notes: `Comece com ${String(low)} s e avance até ${String(high)} s, mantendo a boa execução.`,
    };
  }
  const [min, max] = experience === "beginner" ? (table.beginnerReps ?? table.reps) : table.reps;
  return {
    exercise_id: exercise.id,
    measure_type: "reps",
    sets,
    reps_min: min,
    reps_max: max,
    duration_s: null,
    rest_s: table.rest,
    suggested_load_kg: null,
    notes: NOTE_REPS,
  };
}

/** Passo 4: mesma fórmula de TRN-04 §5. */
function itemSeconds(item: GeneratedItem): number {
  const work = item.duration_s ?? ESTIMATE_SECONDS_PER_SET;
  return item.sets * (work + item.rest_s) + ESTIMATE_TRANSITION_SECONDS;
}

// ---------- Passo 9: volume (TRN-02 §5.2) ----------

const LARGE_GROUPS: ReadonlySet<MuscleGroup> = new Set([
  "chest",
  "upper_back",
  "lats",
  "shoulders",
  "glutes",
  "quadriceps",
  "hamstrings",
]);

function volumeReference(group: MuscleGroup, goal: Goal, experience: ExperienceLevel) {
  const large = LARGE_GROUPS.has(group);
  const [min, max] =
    goal === "hypertrophy"
      ? large
        ? [10, 20]
        : [6, 12]
      : goal === "strength"
        ? large
          ? [6, 15]
          : [4, 10]
        : large
          ? [4, 12]
          : [2, 8];
  return { min: experience === "beginner" ? Math.floor(min / 2) : min, max };
}

/** Quantas vezes cada treino acontece na semana, pela rotação da sequência (RN-013). */
function weeklyOccurrences(days: number, workouts: number): number[] {
  const counts = Array.from({ length: workouts }, () => 0);
  for (let day = 0; day < days; day += 1) {
    const index = day % workouts;
    counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts;
}

// ---------- Ênfase (RN-064): só onde o grupo já pertence ao tipo de treino ----------

const KIND_GROUPS: Readonly<Record<WorkoutKind, ReadonlySet<MuscleGroup> | null>> = {
  full: null,
  push: new Set(["chest", "shoulders", "triceps"]),
  pull: new Set(["lats", "upper_back", "biceps", "forearms", "shoulders"]),
  legs: new Set([
    "quadriceps",
    "hamstrings",
    "glutes",
    "calves",
    "adductors",
    "abductors",
    "abs",
    "obliques",
    "lower_back",
  ]),
  upper: new Set(["chest", "lats", "upper_back", "shoulders", "biceps", "triceps", "forearms"]),
  lower: new Set([
    "quadriceps",
    "hamstrings",
    "glutes",
    "calves",
    "adductors",
    "abductors",
    "abs",
    "obliques",
    "lower_back",
  ]),
};

// ---------- Montagem ----------

interface Placed {
  readonly exercise: MotorExercise;
  item: GeneratedItem;
  readonly optional: boolean;
}

interface Draft {
  readonly name: string;
  readonly kind: WorkoutKind;
  placed: Placed[];
}

const CLASS_ORDER: Readonly<Record<ExerciseClass, number>> = { compound: 0, isolated: 1, core: 2 };

/** Passo 7: compostos, isolados e core, mantendo a ordem das vagas (a ordenação é estável). */
function organize(placed: readonly Placed[]): Placed[] {
  return [...placed].sort(
    (a, b) =>
      CLASS_ORDER[classOf(a.exercise.movement_pattern)] -
      CLASS_ORDER[classOf(b.exercise.movement_pattern)],
  );
}

const usedSeconds = (placed: readonly Placed[]) =>
  placed.reduce((total, p) => total + itemSeconds(p.item), 0);

export function generateProgram(input: MotorInput): MotorResult {
  const { profile, referenceDate } = input;

  // Passo 1
  const pending = motorPending(profile, referenceDate);
  const complete = completeProfile(profile, referenceDate);
  const ctx = eligibilityContext(profile, referenceDate);
  if (complete === null || ctx === null) return { status: "blocked", pending };
  const { goal, days_per_week: days, minutes_per_session: minutes } = complete;
  const experience = ctx.experience;
  const emphasis = [...new Set(profile.emphasis_groups ?? [])];

  // Independe da ordem em que o catálogo chegou.
  const catalog = [...input.catalog].sort((a, b) => compareCodes(a.code, b.code));
  const previous = new Set(input.previousExerciseIds ?? []);

  const reasons = new Map<string, ExclusionReason>();
  for (const exercise of catalog) {
    const reason = exclusionReason(exercise, ctx);
    if (reason !== null) reasons.set(exercise.id, reason);
  }
  const eligible = catalog
    .filter((e) => !reasons.has(e.id))
    .sort((a, b) => compareForSelection(a, b, experience, previous));

  // Passos 3 a 8
  const split = chooseSplit(days, experience);
  const budget = (minutes - WARMUP_MINUTES) * 60;
  const uses = new Map<string, number>();
  const unfilled: {
    workout: string;
    slot: MovementPattern;
    optional: boolean;
    reason: UnfilledReason;
  }[] = [];

  /** Motivo de uma vaga sem candidato: o que tirou os exercícios daquele padrão. */
  const whyEmpty = (pattern: MovementPattern): UnfilledReason => {
    const found = catalog.flatMap((e) => {
      const reason = reasons.get(e.id);
      return e.movement_pattern === pattern && reason ? [reason.kind] : [];
    });
    for (const kind of ["restriction", "equipment", "age", "difficulty"] as const) {
      if (found.includes(kind)) return kind;
    }
    return "none";
  };

  /** Regra 1 do Passo 6: o menos usado no programa, na ordem de TRN-03 §6, sem repetir no treino. */
  const pick = (
    candidates: readonly MotorExercise[],
    placed: readonly Placed[],
  ): MotorExercise | undefined => {
    let best: MotorExercise | undefined;
    let bestUses = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      if (placed.some((p) => p.exercise.id === candidate.id)) continue;
      const count = uses.get(candidate.id) ?? 0;
      if (count < bestUses) {
        best = candidate;
        bestUses = count;
      }
    }
    return best;
  };
  const markUse = (exercise: MotorExercise, delta: number) => {
    uses.set(exercise.id, (uses.get(exercise.id) ?? 0) + delta);
  };

  const drafts: Draft[] = split.kinds.map((kind, index) => {
    const name = `${String.fromCharCode(65 + index)} — ${KIND_LABEL[kind]}`;
    const placed: Placed[] = [];
    for (const slot of slotsFor(kind, index)) {
      const candidates = eligible.filter(
        (e) =>
          e.movement_pattern === slot.pattern &&
          (!slot.rear || e.secondary.includes("upper_back")) &&
          // Encolhimento e semelhantes não contam como ombro isolado desta vaga.
          (slot.pattern !== "shoulder_iso" || e.primary.includes("shoulders")),
      );
      const exercise = pick(candidates, placed);
      if (exercise === undefined) {
        unfilled.push({
          workout: name,
          slot: slot.pattern,
          optional: slot.optional === true,
          reason: whyEmpty(slot.pattern),
        });
        continue;
      }
      const item = prescribe(exercise, goal, experience, ctx.age);
      const fits = usedSeconds(placed) + itemSeconds(item) <= budget;
      if (placed.length >= MAX_ITEMS || (placed.length >= MIN_ITEMS && !fits)) {
        if (slot.optional !== true) {
          unfilled.push({ workout: name, slot: slot.pattern, optional: false, reason: "time" });
        }
        continue;
      }
      placed.push({ exercise, item, optional: slot.optional === true });
      markUse(exercise, 1);
    }
    return { name, kind, placed: organize(placed) };
  });

  const occurrences = weeklyOccurrences(days, drafts.length);
  const weeklySets = (group: MuscleGroup): number =>
    drafts.reduce(
      (total, draft, index) =>
        total +
        (occurrences[index] ?? 0) *
          draft.placed.reduce(
            (sum, p) => sum + (p.exercise.primary.includes(group) ? p.item.sets : 0),
            0,
          ),
      0,
    );

  // Ênfase (RN-064): sobe o volume do grupo sem passar do teto semanal, do tempo nem do limite
  // de itens; restrições já estão fora de `eligible`, então nunca são sobrepostas.
  const displaced: string[] = [];
  const emphasisReport = emphasis.map((group) => {
    const before = weeklySets(group);
    const { max } = volumeReference(group, goal, experience);
    let limited = false;
    const sameWeek = (index: number) => occurrences[index] ?? 0;
    for (const [index, draft] of drafts.entries()) {
      const allowed = KIND_GROUPS[draft.kind];
      if (allowed !== null && !allowed.has(group)) continue;
      const candidates = eligible.filter((e) => e.primary.includes(group));
      const extra = pick(candidates, draft.placed);
      if (extra === undefined) continue;
      const item = prescribe(extra, goal, experience, ctx.age);
      if (weeklySets(group) + item.sets * sameWeek(index) > max) {
        limited = true;
        continue;
      }
      // Sem tempo: dá lugar ao último opcional de outro grupo não enfatizado.
      const roomFor = () =>
        usedSeconds(draft.placed) + itemSeconds(item) <= budget && draft.placed.length < MAX_ITEMS;
      while (!roomFor()) {
        const removable = draft.placed.findLastIndex(
          (p) => p.optional && !p.exercise.primary.some((m) => emphasis.includes(m)),
        );
        const [removed] = removable >= 0 ? draft.placed.splice(removable, 1) : [];
        if (removed === undefined) break;
        markUse(removed.exercise, -1);
        displaced.push(removed.exercise.name);
      }
      if (!roomFor()) {
        limited = true;
        continue;
      }
      draft.placed = organize([...draft.placed, { exercise: extra, item, optional: true }]);
      markUse(extra, 1);
    }
    // Uma série a mais nos itens do grupo, se couber em tudo.
    for (const [index, draft] of drafts.entries()) {
      for (const placed of draft.placed) {
        if (!placed.exercise.primary.includes(group)) continue;
        const raised = { ...placed.item, sets: placed.item.sets + 1 };
        const seconds = usedSeconds(draft.placed) - itemSeconds(placed.item) + itemSeconds(raised);
        const over =
          weeklySets(group) + sameWeek(index) > max ||
          raised.sets > RANGES.prescribedSets.max ||
          seconds > budget;
        if (over) {
          limited = true;
          continue;
        }
        placed.item = raised;
      }
    }
    return { group, sets_before: before, sets_after: weeklySets(group), limited };
  });

  // Passo 9
  const trained = new Set(drafts.flatMap((d) => d.placed.flatMap((p) => p.exercise.primary)));
  const groups: readonly MuscleGroup[] = [
    "chest",
    "upper_back",
    "lats",
    "shoulders",
    "biceps",
    "triceps",
    "forearms",
    "abs",
    "obliques",
    "lower_back",
    "glutes",
    "quadriceps",
    "hamstrings",
    "adductors",
    "abductors",
    "calves",
  ];
  const weeklyVolume = groups
    .filter((group) => trained.has(group) || LARGE_GROUPS.has(group))
    .map((group) => {
      const { min, max } = volumeReference(group, goal, experience);
      const sets = weeklySets(group);
      const status: "low" | "ok" | "high" = sets < min ? "low" : sets > max ? "high" : "ok";
      return { group, sets, min, max, status };
    });

  const insufficient = drafts.filter((d) => d.placed.length < MIN_ITEMS).map((d) => d.name);

  // Passos 2 e 9: avisos
  const warnings: string[] = [];
  const declared = ctx.restrictions;
  if (input.staleData === true) {
    warnings.push("Seus dados estão desatualizados. Atualize o perfil para uma rotina mais fiel.");
  }
  if (declared.some((r) => RESTRICTION_EXCLUDED_MARKERS[r].length > 0)) {
    warnings.push(
      "Exercícios que costumam sobrecarregar a região informada foram retirados. Em caso de dor, procure um profissional de saúde.",
    );
  }
  if (declared.includes("cardiovascular") || declared.includes("pregnancy")) {
    warnings.push("Com a condição informada, busque avaliação de saúde antes de começar.");
  }
  if (declared.includes("other")) {
    warnings.push(
      "Sua restrição não é tratada automaticamente: revise cada exercício e, se tiver dúvida, fale com um profissional de saúde.",
    );
  }
  if (ctx.age >= SENIOR_AGE) {
    warnings.push("A partir de 60 anos, busque avaliação de saúde antes de iniciar.");
  }
  if (days === 1 && (goal === "hypertrophy" || goal === "strength")) {
    warnings.push("Volume semanal baixo para o objetivo: um dia por semana rende pouco.");
  }
  if (days === 7) {
    warnings.push("Com 7 dias, a recomendação considera o descanso configurado e a meta semanal.");
  }
  if (displaced.length > 0) {
    warnings.push(`Para dar lugar à ênfase, saíram: ${[...new Set(displaced)].join(", ")}.`);
  }
  if (insufficient.length > 0) {
    warnings.push("Alguns treinos ficaram com poucos exercícios: revise antes de usar.");
  }

  return {
    status: "generated",
    program: {
      name: "Rotina sugerida",
      split_type: split.splitType,
      workouts: drafts.map((d) => ({ name: d.name, items: d.placed.map((p) => p.item) })),
    },
    report: {
      engine_version: ENGINE_VERSION,
      parameters_version: PARAMETERS_VERSION,
      reference_date: referenceDate,
      inputs: {
        goal,
        experience,
        age: ctx.age,
        days_per_week: days,
        minutes_per_session: minutes,
        equipment: [...ctx.equipment].sort(compareCodes),
        restrictions: declared,
        emphasis,
      },
      split: split.key,
      excluded: catalog.flatMap((e) => {
        const reason = reasons.get(e.id);
        // RN-008: dificuldade não é exclusão a explicar; restrição, equipamento e idade são.
        return reason && reason.kind !== "difficulty"
          ? [{ exercise: e.name, exercise_id: e.id, reason }]
          : [];
      }),
      unfilled_slots: unfilled,
      weekly_volume: weeklyVolume,
      emphasis: emphasisReport,
      insufficient_workouts: insufficient,
      warnings,
    },
  };
}
