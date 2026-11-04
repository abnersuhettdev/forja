// Catálogo (API-R04/R05, RF-030, RF-031): leitura dos exercícios ativos visíveis pela API de
// dados, cópia no banco local (consulta offline) e filtros feitos no aparelho.
import type { DataClient } from "../auth/data-client.ts";
import type {
  Difficulty,
  Equipment,
  LoadMarker,
  MeasureType,
  MovementPattern,
  MuscleGroup,
  Restriction,
} from "@forja/domain";
import { readMeta, writeMeta, type LocalDatabase } from "../local/db.ts";

export interface ContentSource {
  readonly name: string;
  readonly url: string | null;
  readonly license_name: string;
  readonly license_url: string | null;
  readonly attribution_text: string | null;
}

export interface ExerciseImage {
  readonly id: string;
  readonly path: string;
  readonly position: number;
  readonly alt_text: string;
  readonly license_name: string;
  readonly attribution_text: string | null;
  readonly width: number | null;
  readonly height: number | null;
}

export interface CatalogExercise {
  readonly id: string;
  readonly origin: "imported" | "custom";
  readonly name: string;
  readonly instructions: readonly string[];
  readonly safety_tips: readonly string[];
  readonly difficulty: Difficulty;
  readonly measure_type: MeasureType;
  readonly is_bodyweight: boolean;
  readonly movement_pattern: MovementPattern;
  readonly edited_by_manager_at: string | null;
  /** Código estável da fonte (desempate do motor, TRN-03 §6); nulo em personalizados. */
  readonly source_ref: string | null;
  readonly load_markers: readonly LoadMarker[];
  readonly contraindications: readonly Restriction[];
  readonly primary: readonly MuscleGroup[];
  readonly secondary: readonly MuscleGroup[];
  readonly equipment: readonly Equipment[];
  readonly images: readonly ExerciseImage[];
  readonly source: ContentSource | null;
}

interface ExerciseRow {
  id: string;
  origin: "imported" | "custom";
  name: string;
  instructions: string[];
  safety_tips: string[] | null;
  difficulty: Difficulty;
  measure_type: MeasureType;
  is_bodyweight: boolean;
  movement_pattern: MovementPattern;
  edited_by_manager_at: string | null;
  source_ref: string | null;
  load_markers: LoadMarker[];
  exercise_contraindications: { restriction_code: Restriction }[];
  exercise_muscles: { muscle_group_code: MuscleGroup; role: "primary" | "secondary" }[];
  exercise_equipment: { equipment_code: Equipment }[];
  exercise_images: ExerciseImage[];
  content_sources: ContentSource | null;
}

const SELECT = `id, origin, name, instructions, safety_tips, difficulty, measure_type,
  is_bodyweight, movement_pattern, edited_by_manager_at, source_ref, load_markers,
  exercise_contraindications(restriction_code),
  exercise_muscles(muscle_group_code, role), exercise_equipment(equipment_code),
  exercise_images(id, path, position, alt_text, license_name, attribution_text, width, height),
  content_sources(name, url, license_name, license_url, attribution_text)`;

export function toCatalogExercise(row: ExerciseRow): CatalogExercise {
  return {
    id: row.id,
    origin: row.origin,
    name: row.name,
    instructions: row.instructions,
    safety_tips: row.safety_tips ?? [],
    difficulty: row.difficulty,
    measure_type: row.measure_type,
    is_bodyweight: row.is_bodyweight,
    movement_pattern: row.movement_pattern,
    edited_by_manager_at: row.edited_by_manager_at,
    source_ref: row.source_ref,
    load_markers: row.load_markers,
    contraindications: row.exercise_contraindications.map((c) => c.restriction_code),
    primary: row.exercise_muscles
      .filter((m) => m.role === "primary")
      .map((m) => m.muscle_group_code),
    secondary: row.exercise_muscles
      .filter((m) => m.role === "secondary")
      .map((m) => m.muscle_group_code),
    equipment: row.exercise_equipment.map((e) => e.equipment_code),
    images: [...row.exercise_images].sort((a, b) => a.position - b.position),
    source: row.content_sources,
  };
}

/** Exercícios ativos visíveis ao usuário (as políticas por linha decidem quais). */
export async function fetchCatalog(supabase: DataClient): Promise<CatalogExercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select(SELECT)
    .eq("active", true)
    .overrideTypes<ExerciseRow[], { merge: false }>();
  if (error) throw error;
  return data.map(toCatalogExercise);
}

const UPDATED_KEY = "catalogo_atualizado_em";

export async function cacheCatalog(
  db: LocalDatabase,
  exercises: readonly CatalogExercise[],
  now: Date = new Date(),
): Promise<void> {
  const table = db.table<CatalogExercise, string>("catalog_cache");
  await db.transaction("rw", [table, db.sync_meta], async () => {
    await table.clear();
    await table.bulkPut([...exercises]);
    await writeMeta(db, UPDATED_KEY, now.toISOString());
  });
}

export async function readCachedCatalog(
  db: LocalDatabase,
): Promise<{ exercises: CatalogExercise[]; updatedAt: string | undefined }> {
  const exercises = await db.table<CatalogExercise, string>("catalog_cache").toArray();
  return { exercises, updatedAt: await readMeta<string>(db, UPDATED_KEY) };
}

// ---------- Busca e filtros (RF-030) ----------

export interface CatalogFilters {
  readonly query: string;
  readonly muscle: MuscleGroup | "";
  readonly equipment: Equipment | "";
  readonly difficulty: Difficulty | "";
  readonly origin: "" | "imported" | "custom";
}

export const NO_FILTERS: CatalogFilters = {
  query: "",
  muscle: "",
  equipment: "",
  difficulty: "",
  origin: "",
};

/** Minúsculas e sem acentos: "SUPINO" e "supíno" encontram "Supino". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

/**
 * Filtra e ordena por nome. Grupo muscular considera o grupo **primário** (o que a lista
 * mostra); a busca exige todas as palavras digitadas no nome, em qualquer ordem.
 */
export function filterCatalog(
  exercises: readonly CatalogExercise[],
  filters: CatalogFilters,
): CatalogExercise[] {
  const words = normalizeText(filters.query)
    .split(/\s+/)
    .filter((w) => w !== "");
  return exercises
    .filter((e) => {
      if (filters.muscle && !e.primary.includes(filters.muscle)) return false;
      if (filters.equipment && !e.equipment.includes(filters.equipment)) return false;
      if (filters.difficulty && e.difficulty !== filters.difficulty) return false;
      if (filters.origin && e.origin !== filters.origin) return false;
      const name = normalizeText(e.name);
      return words.every((word) => name.includes(word));
    })
    .sort((a, b) => collator.compare(a.name, b.name));
}
