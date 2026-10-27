// Enumerações finais de TRN-01 §3 e TRN-03 §2–§5. Rótulos em pt-BR ficam em labels.ts.

export const GOALS = [
  "hypertrophy",
  "weight_loss",
  "strength",
  "conditioning",
  "maintenance",
  "quality_of_life",
] as const;
export type Goal = (typeof GOALS)[number];

export const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "high"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const TRAINING_LOCATIONS = ["full_gym", "basic_gym", "home", "outdoor"] as const;
export type TrainingLocation = (typeof TRAINING_LOCATIONS)[number];

export const RESTRICTIONS = [
  "shoulder",
  "elbow",
  "wrist",
  "neck",
  "thoracic",
  "lower_back",
  "hip",
  "knee",
  "ankle",
  "cardiovascular",
  "pregnancy",
  "other",
] as const;
export type Restriction = (typeof RESTRICTIONS)[number];

export const MUSCLE_GROUPS = [
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
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  "barbell",
  "ez_bar",
  "dumbbell",
  "kettlebell",
  "machine",
  "smith_machine",
  "cable",
  "band",
  "bench",
  "pullup_bar",
  "dip_bars",
  "medicine_ball",
  "bodyweight",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const MOVEMENT_PATTERNS = [
  "squat",
  "hinge",
  "lunge",
  "h_push",
  "v_push",
  "h_pull",
  "v_pull",
  "knee_ext",
  "knee_flex",
  "hip_abd_add",
  "calf",
  "elbow_flex",
  "elbow_ext",
  "shoulder_iso",
  "chest_iso",
  "core_stability",
  "core_flexion",
  "carry_grip",
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export const LOAD_MARKERS = [
  "overhead",
  "shoulder_end_range",
  "axial_spine_load",
  "spine_flexion_loaded",
  "spine_rotation_loaded",
  "deep_knee_flexion_loaded",
  "knee_impact",
  "hip_deep_flexion_loaded",
  "wrist_loaded_extension",
  "elbow_loaded_extension",
  "neck_load",
  "ankle_loaded",
  "technical_high",
] as const;
export type LoadMarker = (typeof LOAD_MARKERS)[number];

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const SEXES = ["female", "male", "undisclosed"] as const;
export type Sex = (typeof SEXES)[number];

export const SPLIT_TYPES = ["full_body", "ab", "abc", "abcd", "upper_lower", "other"] as const;
export type SplitType = (typeof SPLIT_TYPES)[number];

export const MEASURE_TYPES = ["reps", "duration"] as const;
export type MeasureType = (typeof MEASURE_TYPES)[number];

export const SESSION_STATUSES = ["in_progress", "completed", "manual", "abandoned"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_EXERCISE_STATUSES = ["pending", "done", "skipped"] as const;
export type SessionExerciseStatus = (typeof SESSION_EXERCISE_STATUSES)[number];

export const PROGRAM_VERSION_STATUSES = ["draft", "active", "archived"] as const;
export type ProgramVersionStatus = (typeof PROGRAM_VERSION_STATUSES)[number];

/** TRN-01 §3.4 — equipamentos pré-selecionados por local. */
export const LOCATION_EQUIPMENT_PRESETS: Readonly<Record<TrainingLocation, readonly Equipment[]>> =
  {
    full_gym: EQUIPMENT,
    basic_gym: ["barbell", "dumbbell", "bench", "machine", "cable", "pullup_bar", "bodyweight"],
    home: ["dumbbell", "band", "bodyweight"],
    outdoor: ["bodyweight", "pullup_bar", "band"],
  };

/** TRN-03 §5.2 — marcadores excluídos por restrição (vazio = só aviso e revisão manual). */
export const RESTRICTION_EXCLUDED_MARKERS: Readonly<Record<Restriction, readonly LoadMarker[]>> = {
  shoulder: ["overhead", "shoulder_end_range"],
  elbow: ["elbow_loaded_extension"],
  wrist: ["wrist_loaded_extension"],
  neck: ["neck_load", "overhead", "axial_spine_load"],
  thoracic: ["spine_rotation_loaded", "axial_spine_load"],
  lower_back: [
    "axial_spine_load",
    "spine_flexion_loaded",
    "spine_rotation_loaded",
    "hip_deep_flexion_loaded",
  ],
  hip: ["hip_deep_flexion_loaded", "knee_impact"],
  knee: ["deep_knee_flexion_loaded", "knee_impact"],
  ankle: ["ankle_loaded", "knee_impact"],
  cardiovascular: [],
  pregnancy: [],
  other: [],
};
