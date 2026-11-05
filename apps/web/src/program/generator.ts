// Liga o editor ao motor (TRN-02): converte o catálogo do app e aplica o "gerar outro treino"
// ao documento do rascunho (RF-119). Fora do pacote inicial: só as telas de gestão importam.
import { toLocalDate } from "@forja/domain";
import {
  generateProgram,
  regenerateWorkout,
  type MotorExercise,
  type MotorResult,
  type RegenerationOutcome,
  type RegenerationReason,
} from "@forja/domain/motor";
import { motorOnlyReport } from "@forja/domain/motor/ia";
import type { StudentProfile } from "../account/profile.ts";
import { sendDirect } from "../local/direct.ts";
import type { LocalData } from "../local/LocalDataProvider.tsx";
import { requestRoutine } from "./routine-client.ts";
import type { CatalogExercise } from "../catalog/catalog.ts";
import type { EditorDocument, EditorItem } from "./editor.ts";

export function toMotorExercise(exercise: CatalogExercise): MotorExercise {
  return {
    id: exercise.id,
    code: exercise.source_ref ?? exercise.id,
    name: exercise.name,
    difficulty: exercise.difficulty,
    measure_type: exercise.measure_type,
    movement_pattern: exercise.movement_pattern,
    load_markers: exercise.load_markers,
    contraindications: exercise.contraindications,
    primary: exercise.primary,
    secondary: exercise.secondary,
    equipment: exercise.equipment,
  };
}

/** O que aconteceu no treino, para mostrar o motivo de cada mudança. */
export interface RegenerationSummary {
  readonly changed: readonly { readonly from: string; readonly to: string }[];
  readonly kept: readonly string[];
  readonly removed: readonly { readonly name: string; readonly reason: RegenerationReason }[];
}

/**
 * Aplica o resultado ao treino, sem tocar nos outros. Mantém séries, repetições e descanso do
 * item, que são a prescrição da pessoa; a medida e a carga acompanham o novo exercício.
 */
export function applyRegeneration(
  doc: EditorDocument,
  workoutId: string,
  outcomes: readonly RegenerationOutcome[],
  nameOf: (id: string) => string,
): { doc: EditorDocument; summary: RegenerationSummary } {
  const changed: { from: string; to: string }[] = [];
  const kept: string[] = [];
  const removed: { name: string; reason: RegenerationReason }[] = [];
  const next = (item: EditorItem, index: number): EditorItem[] => {
    const outcome = outcomes[index];
    if (outcome === undefined || outcome.kind === "kept") {
      kept.push(nameOf(item.exercise_id));
      return [item];
    }
    if (outcome.kind === "removed") {
      removed.push({ name: nameOf(item.exercise_id), reason: outcome.reason });
      return [];
    }
    changed.push({ from: nameOf(item.exercise_id), to: nameOf(outcome.exercise_id) });
    const { prescription } = outcome;
    const sameMeasure = prescription.measure_type === item.measure_type;
    return [
      {
        ...item,
        exercise_id: outcome.exercise_id,
        measure_type: prescription.measure_type,
        reps_min: sameMeasure ? item.reps_min : prescription.reps_min,
        reps_max: sameMeasure ? item.reps_max : prescription.reps_max,
        duration_s: sameMeasure ? item.duration_s : prescription.duration_s,
        // Carga e observação eram do exercício anterior (RN-026).
        suggested_load_kg: null,
        notes: prescription.notes,
      },
    ];
  };
  return {
    doc: {
      ...doc,
      workouts: doc.workouts.map((w) =>
        w.id === workoutId ? { ...w, items: w.items.flatMap(next) } : w,
      ),
    },
    summary: { changed, kept, removed },
  };
}

/** Outro treino no documento (RF-119). `null` = perfil incompleto. `seen` guarda o já mostrado. */
export function regenerateInDocument(input: {
  readonly doc: EditorDocument;
  readonly workoutId: string;
  readonly profile: StudentProfile;
  readonly catalog: readonly CatalogExercise[];
  readonly seen: Set<string>;
  readonly nameOf: (id: string) => string;
  readonly now?: Date;
}): { doc: EditorDocument; summary: RegenerationSummary } | null {
  const { doc, workoutId, profile, catalog, seen, nameOf } = input;
  const target = doc.workouts.find((w) => w.id === workoutId);
  if (target === undefined) return null;
  const ids = target.items.map((i) => i.exercise_id);
  const result = regenerateWorkout({
    profile: { ...profile.student, ...profile.profile },
    catalog: catalog.map(toMotorExercise),
    referenceDate: toLocalDate(input.now ?? new Date(), profile.student.timezone),
    workoutExerciseIds: ids,
    otherExerciseIds: doc.workouts
      .filter((w) => w.id !== workoutId)
      .flatMap((w) => w.items.map((i) => i.exercise_id)),
    avoidExerciseIds: [...seen],
  });
  if (result.status === "blocked") return null;
  for (const id of ids) seen.add(id);
  return applyRegeneration(doc, workoutId, result.outcomes, nameOf);
}

/**
 * Pede a rotina à função de IA e cria o rascunho pela sincronização. Sem a função, o motor roda no
 * aparelho, e o relatório diz que foi só por regras (RN-062). Nunca publica (RN-009).
 */
export async function createProposal(input: {
  readonly local: LocalData;
  readonly studentId: string;
  readonly profile: StudentProfile;
  readonly catalog: readonly CatalogExercise[];
  readonly previousExerciseIds: readonly string[];
}): Promise<
  | { readonly ok: true }
  | { readonly ok: false; readonly pending: true }
  | { readonly ok: false; readonly pending: false; readonly message: string }
> {
  const { local, studentId, profile, catalog } = input;
  const remote = await requestRoutine();
  const result: MotorResult =
    remote ??
    generateProgram({
      profile: { ...profile.student, ...profile.profile },
      catalog: catalog.map(toMotorExercise),
      referenceDate: toLocalDate(new Date(), profile.student.timezone),
      previousExerciseIds: input.previousExerciseIds,
      staleData: profile.profile.review_recommended_since !== null,
    });
  if (result.status !== "generated") return { ok: false, pending: true };
  const final = remote === null ? motorOnlyReport(result, "unavailable") : result;
  const outcome = await sendDirect(local, {
    opId: crypto.randomUUID(),
    type: "draft.create",
    entityId: crypto.randomUUID(),
    baseRevision: null,
    payload: {
      student_id: studentId,
      source: "generated",
      name: final.program.name,
      generated: {
        split_type: final.program.split_type,
        report: final.report,
        workouts: final.program.workouts.map((workout, index) => ({
          id: crypto.randomUUID(),
          position: index + 1,
          name: workout.name,
          items: workout.items.map((item, itemIndex) => ({
            ...item,
            id: crypto.randomUUID(),
            position: itemIndex + 1,
          })),
        })),
      },
    },
  });
  return outcome.ok ? { ok: true } : { ok: false, pending: false, message: outcome.message };
}
