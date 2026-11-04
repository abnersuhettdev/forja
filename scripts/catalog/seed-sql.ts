// Seed versionado do catálogo (DAD-07 §3 seed_catalog_vN) a partir de catalog/exercicios.json.
// Identificadores derivados do código do exercício: o mesmo seed gera os mesmos ids em
// qualquer ambiente. A migração contém este SQL; o teste ao lado garante que não divergem.
// Uso: node scripts/catalog/seed-sql.ts  → imprime o SQL.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { CATALOG_PATH, catalogEntrySchema, type CatalogEntry } from "./validate.ts";

/** Data da revisão dos textos pelo usuário (TAR-012, GOV-02 §6). */
const REVIEWED_AT = "2026-10-27T00:00:00Z";

const SOURCE = {
  key: "free-exercise-db",
  name: "free-exercise-db (yuhonas)",
  url: "https://github.com/yuhonas/free-exercise-db",
  license_name: "Unlicense",
  license_url: "https://unlicense.org/",
  attribution_text:
    "Seleção e classificação a partir do free-exercise-db (domínio público, Unlicense); textos reescritos em pt-BR.",
  retrieved_on: "2026-10-26",
  notes: "Commit f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5. Imagens não usadas (ADR-052).",
};

/** UUID determinístico (formato de versão 5) a partir de um nome. */
export function stableUuid(name: string): string {
  const bytes = createHash("sha1").update(`forja:${name}`).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const exerciseId = (codigo: string) => stableUuid(`exercicio:${codigo}`);
export const SOURCE_ID = stableUuid(`fonte:${SOURCE.key}`);

const literal = (value: string | null): string =>
  value === null ? "null" : `'${value.replaceAll("'", "''")}'`;
const json = (value: unknown): string => `${literal(JSON.stringify(value))}::jsonb`;
const textArray = (values: readonly string[]): string =>
  `array[${values.map((v) => literal(v)).join(", ")}]::text[]`;

export function readCatalog(): CatalogEntry[] {
  return z.array(catalogEntrySchema).parse(JSON.parse(readFileSync(CATALOG_PATH, "utf8")));
}

export function renderCatalogSeed(entries: readonly CatalogEntry[] = readCatalog()): string {
  const source = `insert into public.content_sources
  (id, name, url, license_name, license_url, attribution_text, retrieved_on, notes)
values (${[
    literal(SOURCE_ID),
    literal(SOURCE.name),
    literal(SOURCE.url),
    literal(SOURCE.license_name),
    literal(SOURCE.license_url),
    literal(SOURCE.attribution_text),
    literal(SOURCE.retrieved_on),
    literal(SOURCE.notes),
  ].join(", ")});`;

  const exercises = entries.map((e) => {
    const values = [
      literal(exerciseId(e.codigo)),
      "'imported'",
      literal(SOURCE_ID),
      literal(e.source_ref),
      literal(e.name),
      json(e.instructions),
      json(e.safety_tips),
      literal(e.difficulty),
      literal(e.measure_type),
      String(e.is_bodyweight),
      literal(e.movement_pattern),
      textArray(e.load_markers),
      e.text_review === "revisado" ? literal(REVIEWED_AT) : "null",
    ];
    return `  (${values.join(", ")})`;
  });

  const muscles = entries.flatMap((e) => [
    ...e.primary_muscles.map(
      (m) => `  (${literal(exerciseId(e.codigo))}, ${literal(m)}, 'primary')`,
    ),
    ...e.secondary_muscles.map(
      (m) => `  (${literal(exerciseId(e.codigo))}, ${literal(m)}, 'secondary')`,
    ),
  ]);
  const equipment = entries.flatMap((e) =>
    e.equipment.map((q) => `  (${literal(exerciseId(e.codigo))}, ${literal(q)})`),
  );

  return [
    source,
    `insert into public.exercises
  (id, origin, source_id, source_ref, name, instructions, safety_tips, difficulty,
   measure_type, is_bodyweight, movement_pattern, load_markers, text_reviewed_at)
values
${exercises.join(",\n")};`,
    `insert into public.exercise_muscles (exercise_id, muscle_group_code, role) values
${muscles.join(",\n")};`,
    `insert into public.exercise_equipment (exercise_id, equipment_code) values
${equipment.join(",\n")};`,
  ].join("\n\n");
}

/** Fotos dos exercícios (ADR-094): seed próprio, porque o v1 já foi aplicado. */
export function renderImagesSeed(entries: readonly CatalogEntry[] = readCatalog()): string {
  const rows = entries.flatMap((e) =>
    e.images.map((image, index) => {
      const position = index + 1;
      const values = [
        literal(stableUuid(`imagem:${e.codigo}:${String(position)}`)),
        literal(exerciseId(e.codigo)),
        literal(`/exercicios/${image.file}`),
        String(position),
        literal(SOURCE_ID),
        literal(image.license),
        literal(image.attribution),
        String(image.width),
        String(image.height),
        literal(`${e.name}, foto ${String(position)} de ${String(e.images.length)}`),
      ];
      return `  (${values.join(", ")})`;
    }),
  );
  return [
    `update public.content_sources
set notes = ${literal(`Commit f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5. Fotos usadas sem comprovação de origem, com risco aceito (ADR-094).`)}
where id = ${literal(SOURCE_ID)};`,
    `insert into public.exercise_images
  (id, exercise_id, path, position, source_id, license_name, attribution_text, width, height, alt_text)
values
${rows.join(",\n")};`,
  ].join("\n\n");
}

if (import.meta.main) {
  console.log(process.argv.includes("--imagens") ? renderImagesSeed() : renderCatalogSeed());
}
