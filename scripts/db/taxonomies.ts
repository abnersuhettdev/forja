// Taxonomias de referência (TRN-01 §3, TRN-03 §2–§3) a partir do pacote de domínio.
// A migração de taxonomias contém o SQL gerado aqui; o teste ao lado garante que não divergem.
// Uso: node scripts/db/taxonomies.ts  → imprime o bloco de inserção.
import {
  ACTIVITY_LABELS,
  ACTIVITY_LEVELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  EXPERIENCE_LEVELS,
  GOAL_LABELS,
  GOALS,
  LOCATION_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  RESTRICTION_LABELS,
  RESTRICTIONS,
  TRAINING_LOCATIONS,
} from "../../packages/domain/src/index.ts";

interface Taxonomy {
  table: string;
  codes: readonly string[];
  labels: Readonly<Record<string, string>>;
}

export const TAXONOMIES: readonly Taxonomy[] = [
  { table: "goals", codes: GOALS, labels: GOAL_LABELS },
  { table: "experience_levels", codes: EXPERIENCE_LEVELS, labels: EXPERIENCE_LABELS },
  { table: "activity_levels", codes: ACTIVITY_LEVELS, labels: ACTIVITY_LABELS },
  { table: "training_locations", codes: TRAINING_LOCATIONS, labels: LOCATION_LABELS },
  { table: "restriction_categories", codes: RESTRICTIONS, labels: RESTRICTION_LABELS },
  { table: "muscle_groups", codes: MUSCLE_GROUPS, labels: MUSCLE_GROUP_LABELS },
  { table: "equipment", codes: EQUIPMENT, labels: EQUIPMENT_LABELS },
];

const literal = (text: string): string => `'${text.replaceAll("'", "''")}'`;

/** SQL de inserção das taxonomias, na ordem de exibição de TRN-01/TRN-03. */
export function renderTaxonomySeed(): string {
  return TAXONOMIES.map(({ table, codes, labels }) => {
    const rows = codes.map((code, index) => {
      const name = labels[code];
      if (name === undefined) throw new Error(`Sem rótulo: ${table}.${code}`);
      return `  (${literal(code)}, ${literal(name)}, ${String(index + 1)})`;
    });
    return `insert into public.${table} (code, name, sort_order) values\n${rows.join(",\n")};`;
  }).join("\n\n");
}

if (import.meta.main) console.log(renderTaxonomySeed());
