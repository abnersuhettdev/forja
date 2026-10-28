// API-R03 — rascunho e versão ativa do aluno (Gestão). Leitura pela API de dados: o aluno
// nunca recebe rascunhos (RN-005); o gestor recebe os dois.
import type { DataClient } from "../auth/data-client.ts";
import type { MeasureType, SplitType } from "@forja/domain";
import type { EditorDocument } from "./editor.ts";

export interface VersionView {
  readonly id: string;
  readonly status: "draft" | "active" | "archived";
  readonly revision: number;
  readonly version_number: number | null;
  readonly published_at: string | null;
  readonly updated_at: string;
  readonly document: EditorDocument;
}

export interface ProgramView {
  readonly active: VersionView | null;
  readonly draft: VersionView | null;
}

interface ItemRow {
  id: string;
  position: number;
  exercise_id: string;
  measure_type: MeasureType;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  duration_s: number | null;
  rest_s: number;
  suggested_load_kg: number | null;
  notes: string | null;
}

export interface VersionRow {
  id: string;
  status: "draft" | "active" | "archived";
  revision: number;
  version_number: number | null;
  published_at: string | null;
  updated_at: string;
  name: string;
  split_type: SplitType | null;
  workouts: { id: string; position: number; name: string; workout_items: ItemRow[] }[];
}

export const VERSION_SELECT = `id, status, revision, version_number, published_at, updated_at, name, split_type,
  workouts(id, position, name, workout_items(id, position, exercise_id, measure_type, sets,
    reps_min, reps_max, duration_s, rest_s, suggested_load_kg, notes))`;

export function toVersionView(row: VersionRow): VersionView {
  return {
    id: row.id,
    status: row.status,
    revision: row.revision,
    version_number: row.version_number,
    published_at: row.published_at,
    updated_at: row.updated_at,
    document: {
      name: row.name,
      split_type: row.split_type,
      workouts: [...row.workouts]
        .sort((a, b) => a.position - b.position)
        .map((w) => ({
          id: w.id,
          name: w.name,
          items: [...w.workout_items]
            .sort((a, b) => a.position - b.position)
            .map((item) => ({
              id: item.id,
              exercise_id: item.exercise_id,
              measure_type: item.measure_type,
              sets: item.sets,
              reps_min: item.reps_min,
              reps_max: item.reps_max,
              duration_s: item.duration_s,
              rest_s: item.rest_s,
              suggested_load_kg: item.suggested_load_kg,
              notes: item.notes,
            })),
        })),
    },
  };
}

export async function fetchProgram(supabase: DataClient, studentId: string): Promise<ProgramView> {
  const { data, error } = await supabase
    .from("program_versions")
    .select(VERSION_SELECT)
    .eq("student_id", studentId)
    .in("status", ["draft", "active"])
    .overrideTypes<VersionRow[], { merge: false }>();
  if (error) throw error;
  const views = data.map(toVersionView);
  return {
    active: views.find((v) => v.status === "active") ?? null,
    draft: views.find((v) => v.status === "draft") ?? null,
  };
}
