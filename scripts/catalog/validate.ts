// Valida o catálogo curado (TAR-012): esquema de cada exercício e metas de DAD-06 §4.
// Uso: node scripts/catalog/validate.ts [--release]
// Com --release, textos ainda não revisados pelo usuário também reprovam (CA-038).
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  DIFFICULTIES,
  EQUIPMENT,
  LOAD_MARKERS,
  MEASURE_TYPES,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
  type Equipment,
  type MuscleGroup,
} from "../../packages/domain/src/index.ts";

/** TRN-03 §2 — grupos de porte grande exigem ≥ 3 exercícios como músculo primário. */
export const LARGE_GROUPS: readonly MuscleGroup[] = [
  "chest",
  "upper_back",
  "lats",
  "shoulders",
  "glutes",
  "quadriceps",
  "hamstrings",
];
export const MIN_EXERCISES = 80;
export const MIN_PER_LARGE_GROUP = 3;
export const MIN_PER_SMALL_GROUP = 2;
export const MIN_PER_EQUIPMENT_FAMILY = 10;

/** DAD-06 §4 — famílias de equipamento com meta própria. */
export const EQUIPMENT_FAMILIES = {
  peso_livre: ["barbell", "ez_bar", "dumbbell", "kettlebell"],
  maquina: ["machine", "smith_machine"],
  polia: ["cable"],
} as const satisfies Record<string, readonly Equipment[]>;

/** Alternativa a exercício de máquina (D4): peso livre, peso corporal ou equipamento portátil. */
const ALTERNATIVE_EQUIPMENT: ReadonlySet<Equipment> = new Set([
  "barbell",
  "ez_bar",
  "dumbbell",
  "kettlebell",
  "band",
  "bench",
  "pullup_bar",
  "dip_bars",
  "bodyweight",
]);
const MACHINE_EQUIPMENT: ReadonlySet<Equipment> = new Set(["machine", "smith_machine"]);

/** RN-030 — dicas e instruções não usam linguagem de diagnóstico ou tratamento. */
const CLINICAL_LANGUAGE = /\b(diagn[oó]stic|tratament|terap|cura[rs]?\b|prescrev|reabilita)/i;

const sentence = z.string().trim().min(3).max(240);

export const catalogEntrySchema = z
  .strictObject({
    codigo: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    source_ref: z.string().min(1),
    name: z.string().trim().min(2).max(120),
    difficulty: z.enum(DIFFICULTIES),
    movement_pattern: z.enum(MOVEMENT_PATTERNS),
    primary_muscles: z.array(z.enum(MUSCLE_GROUPS)).min(1),
    secondary_muscles: z.array(z.enum(MUSCLE_GROUPS)),
    equipment: z.array(z.enum(EQUIPMENT)).min(1),
    load_markers: z.array(z.enum(LOAD_MARKERS)),
    measure_type: z.enum(MEASURE_TYPES),
    is_bodyweight: z.boolean(),
    instructions: z.array(sentence).min(1).max(15),
    safety_tips: z.array(sentence),
    images: z.array(
      z.strictObject({
        file: z.string().min(1),
        license: z.string().min(1),
        attribution: z.string().min(1),
        source_url: z.url(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    ),
    image_status: z.enum(["procedencia-nao-comprovada", "comprovada", "risco-aceito-adr-094"]),
    text_review: z.enum(["pendente-usuario", "revisado"]),
  })
  .superRefine((entry, ctx) => {
    const issue = (path: string, message: string): void => {
      ctx.addIssue({ code: "custom", path: [path], message });
    };
    // ADR-052 — sem procedência comprovada, nenhuma imagem é publicada; a ADR-094 é a única
    // exceção, para as fotos do free-exercise-db.
    if (entry.image_status === "procedencia-nao-comprovada" && entry.images.length > 0) {
      issue("images", "Imagem sem procedência comprovada.");
    }
    if (entry.primary_muscles.some((m) => entry.secondary_muscles.includes(m))) {
      issue("secondary_muscles", "Músculo repetido como primário e secundário.");
    }
    for (const [field, list] of [
      ["primary_muscles", entry.primary_muscles],
      ["secondary_muscles", entry.secondary_muscles],
      ["equipment", entry.equipment],
      ["load_markers", entry.load_markers],
    ] as const) {
      if (new Set(list).size !== list.length) issue(field, "Valor repetido.");
    }
    if (entry.equipment.includes("bodyweight") && !entry.is_bodyweight) {
      issue("is_bodyweight", "Exercício com peso corporal não marcado como tal.");
    }
    const texts = [entry.name, ...entry.instructions, ...entry.safety_tips];
    if (texts.some((t) => CLINICAL_LANGUAGE.test(t))) {
      issue("safety_tips", "Linguagem clínica (RN-030).");
    }
  });

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

export interface CatalogReport {
  problems: string[];
  total: number;
  pendingReview: number;
  byPrimaryMuscle: Record<MuscleGroup, number>;
  byEquipmentFamily: Record<keyof typeof EQUIPMENT_FAMILIES | "peso_corporal", number>;
  byDifficulty: Record<(typeof DIFFICULTIES)[number], number>;
}

function countBy<K extends string>(
  keys: readonly K[],
  hits: (key: K) => number,
): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, hits(k)])) as Record<K, number>;
}

/** Valida o conteúdo bruto do catálogo contra o esquema, a fonte e as metas de DAD-06 §4. */
export function validateCatalog(
  raw: unknown,
  sourceIds: ReadonlySet<string>,
  options: { release?: boolean } = {},
): CatalogReport {
  const problems: string[] = [];
  const parsed = z.array(z.unknown()).safeParse(raw);
  const items = parsed.success ? parsed.data : [];
  if (!parsed.success) problems.push("O catálogo deve ser uma lista de exercícios.");

  const entries: CatalogEntry[] = [];
  items.forEach((item, index) => {
    const result = catalogEntrySchema.safeParse(item);
    if (result.success) {
      entries.push(result.data);
      return;
    }
    for (const issue of result.error.issues) {
      problems.push(`#${String(index)} ${issue.path.join(".")}: ${issue.message}`);
    }
  });

  const seenCodes = new Set<string>();
  const seenRefs = new Set<string>();
  for (const entry of entries) {
    if (seenCodes.has(entry.codigo)) problems.push(`${entry.codigo}: código repetido.`);
    if (seenRefs.has(entry.source_ref)) problems.push(`${entry.codigo}: fonte repetida.`);
    if (!sourceIds.has(entry.source_ref)) {
      problems.push(`${entry.codigo}: "${entry.source_ref}" não existe no snapshot da fonte.`);
    }
    seenCodes.add(entry.codigo);
    seenRefs.add(entry.source_ref);
  }

  if (entries.length < MIN_EXERCISES) {
    problems.push(
      `Catálogo com ${String(entries.length)} exercícios; mínimo ${String(MIN_EXERCISES)}.`,
    );
  }

  const byPrimaryMuscle = countBy(
    MUSCLE_GROUPS,
    (m) => entries.filter((e) => e.primary_muscles.includes(m)).length,
  );
  for (const muscle of MUSCLE_GROUPS) {
    const min = LARGE_GROUPS.includes(muscle) ? MIN_PER_LARGE_GROUP : MIN_PER_SMALL_GROUP;
    if (byPrimaryMuscle[muscle] < min) {
      problems.push(
        `Grupo ${muscle}: ${String(byPrimaryMuscle[muscle])} exercícios; mínimo ${String(min)}.`,
      );
    }
  }

  const families = Object.keys(EQUIPMENT_FAMILIES) as (keyof typeof EQUIPMENT_FAMILIES)[];
  const byEquipmentFamily = {
    ...countBy(families, (f) => {
      const family: readonly Equipment[] = EQUIPMENT_FAMILIES[f];
      return entries.filter((e) => e.equipment.some((q) => family.includes(q))).length;
    }),
    peso_corporal: entries.filter((e) => e.is_bodyweight).length,
  };
  for (const [family, count] of Object.entries(byEquipmentFamily)) {
    if (count < MIN_PER_EQUIPMENT_FAMILY) {
      problems.push(
        `Equipamento ${family}: ${String(count)} exercícios; mínimo ${String(MIN_PER_EQUIPMENT_FAMILY)}.`,
      );
    }
  }

  const byDifficulty = countBy(
    DIFFICULTIES,
    (d) => entries.filter((e) => e.difficulty === d).length,
  );
  for (const difficulty of DIFFICULTIES) {
    if (byDifficulty[difficulty] === 0) problems.push(`Nenhum exercício de nível ${difficulty}.`);
  }

  // D4 — todo exercício de máquina tem alternativa sem máquina para um mesmo músculo primário.
  for (const entry of entries.filter((e) => e.equipment.some((q) => MACHINE_EQUIPMENT.has(q)))) {
    const hasAlternative = entries.some(
      (other) =>
        other !== entry &&
        other.equipment.every((q) => ALTERNATIVE_EQUIPMENT.has(q)) &&
        other.primary_muscles.some((m) => entry.primary_muscles.includes(m)),
    );
    if (!hasAlternative)
      problems.push(`${entry.codigo}: máquina sem alternativa livre ou corporal.`);
  }

  const pendingReview = entries.filter((e) => e.text_review !== "revisado").length;
  if (options.release && pendingReview > 0) {
    problems.push(`${String(pendingReview)} exercícios aguardam revisão do texto (CA-038).`);
  }

  return {
    problems,
    total: entries.length,
    pendingReview,
    byPrimaryMuscle,
    byEquipmentFamily,
    byDifficulty,
  };
}

/** Lê os identificadores do snapshot da fonte (free-exercise-db). */
export function readSourceIds(path: URL): Set<string> {
  const source = z
    .array(z.looseObject({ id: z.string() }))
    .parse(JSON.parse(readFileSync(path, "utf8")));
  return new Set(source.map((s) => s.id));
}

export const CATALOG_PATH = new URL("../../catalog/exercicios.json", import.meta.url);
export const SOURCE_PATH = new URL(
  "../../catalog/fontes/free-exercise-db/exercises.json",
  import.meta.url,
);

if (import.meta.main) {
  const report = validateCatalog(
    JSON.parse(readFileSync(CATALOG_PATH, "utf8")),
    readSourceIds(SOURCE_PATH),
    { release: process.argv.includes("--release") },
  );
  console.log(
    `Exercícios: ${String(report.total)} (revisão pendente: ${String(report.pendingReview)})`,
  );
  console.log("Por nível:", report.byDifficulty);
  console.log("Por família de equipamento:", report.byEquipmentFamily);
  console.log("Por grupo primário:", report.byPrimaryMuscle);
  for (const problem of report.problems) console.error(`✗ ${problem}`);
  process.exitCode = report.problems.length > 0 ? 1 : 0;
}
