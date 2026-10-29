export * from "./calendar.ts";
export * from "./credentials.ts";
export * from "./diagnostics.ts";
export * from "./enums.ts";
export * from "./evolution.ts";
export * from "./labels.ts";
export * from "./messages.ts";
export * from "./parameters.ts";
export * from "./ranges.ts";
export * from "./recommendation.ts";
export * from "./result.ts";
export * from "./rules.ts";
export * from "./sessions.ts";
export * from "./sync.ts";
export * from "./time.ts";

// Tipos dos esquemas: só tipos (apagados na compilação). Os esquemas (Zod) ficam no ponto de
// entrada "@forja/domain/validacao", fora do JS inicial do app (PR-DES-03).
export type {
  Student,
  TrainingProfile,
  Assessment,
  WeightEntry,
  BodyMeasurement,
  RestSettings,
  Exercise,
  WorkoutItem,
  Workout,
  ProgramDraft,
  Session,
  SessionExercise,
  SetLog,
} from "./validacao/schemas.ts";
export type {
  CustomExercisePayload,
  ImportedCorrectionPayload,
  AssessmentCreatePayload,
  OnboardingPayload,
  ProfileUpdatePayload,
  RestUpdatePayload,
} from "./validacao/operations.ts";
export type {
  DraftCreatePayload,
  DraftSavePayload,
  DraftItem,
  DraftIssue,
  DraftForIssues,
} from "./validacao/programs.ts";
