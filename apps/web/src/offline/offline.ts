// Dados para uso offline (UX-08 §6.1–6.2; RF-091, RF-092; API-R02, R08): programa ativo
// completo, exercícios do catálogo e pesos dos últimos 12 meses, guardados no banco local do
// usuário; sessões dos últimos 90 dias e última execução (API-R06/R07 — TAR-019).
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, toLocalDate } from "@forja/domain";
import { cacheCatalog, fetchCatalog, type CatalogExercise } from "../catalog/catalog.ts";
import { fetchSessionData, mergeSessionData } from "../execution/download.ts";
import { readMeta, writeMeta, type LocalDatabase } from "../local/db.ts";
import {
  toVersionView,
  VERSION_SELECT,
  type VersionRow,
  type VersionView,
} from "../program/program.ts";

export interface WeightRecord {
  readonly id: string;
  readonly measured_on: string;
  readonly weight_kg: number;
  readonly source: "manual" | "assessment";
  readonly revision: number;
}

export interface OfflineSnapshot {
  /** Versão ativa (publicada) do programa; null = sem programa publicado. */
  readonly program: VersionView | null;
  readonly weights: readonly WeightRecord[];
  /** Último download bem-sucedido (ISO); base do "Disponível offline · atualizado às". */
  readonly updatedAt: string | undefined;
}

const UPDATED_KEY = "dados_offline_atualizados_em";
const PROGRAM_KEY = "ativo";
/** UX-08 §6.2 — janela de pesos mantidos no aparelho. */
export const WEIGHT_WINDOW_DAYS = 365;

/** Baixa tudo o que o aluno precisa offline e grava no aparelho numa transação. */
export async function refreshOfflineData(
  supabase: SupabaseClient,
  db: LocalDatabase,
  studentId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<OfflineSnapshot> {
  const since = addDays(toLocalDate(now, timeZone), -WEIGHT_WINDOW_DAYS);
  const [version, weights, catalog, sessionData] = await Promise.all([
    supabase
      .from("program_versions")
      .select(VERSION_SELECT)
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle<VersionRow>(),
    supabase
      .from("weight_entries")
      .select("id, measured_on, weight_kg, source, revision")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .gte("measured_on", since)
      .order("measured_on", { ascending: false })
      .overrideTypes<WeightRecord[], { merge: false }>(),
    fetchCatalog(supabase),
    fetchSessionData(supabase, studentId, now),
  ]);
  if (version.error) throw version.error;
  if (weights.error) throw weights.error;

  const program = version.data ? toVersionView(version.data) : null;
  const updatedAt = now.toISOString();
  await cacheCatalog(db, catalog, now);
  const programs = db.table("program");
  const weightTable = db.table<WeightRecord, string>("weights");
  await db.transaction("rw", [programs, weightTable, db.sync_meta], async () => {
    if (program) await programs.put({ key: PROGRAM_KEY, view: program });
    else await programs.delete(PROGRAM_KEY);
    await weightTable.clear();
    await weightTable.bulkPut([...weights.data]);
    await writeMeta(db, UPDATED_KEY, updatedAt);
  });
  await mergeSessionData(db, sessionData);
  return { program, weights: weights.data, updatedAt };
}

export async function readOfflineData(db: LocalDatabase): Promise<OfflineSnapshot> {
  const stored = (await db.table("program").get(PROGRAM_KEY)) as
    { key: string; view: VersionView } | undefined;
  const weights = await db
    .table<WeightRecord, string>("weights")
    .orderBy("measured_on")
    .reverse()
    .toArray();
  const program = stored?.view ?? null;
  return { program, weights, updatedAt: await readMeta<string>(db, UPDATED_KEY) };
}

/** Imagens dos exercícios do programa ativo, para pré-download (UX-08 §6.1). */
export function programImagePaths(
  program: VersionView | null,
  catalog: readonly CatalogExercise[],
): string[] {
  if (program === null) return [];
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const paths = new Set<string>();
  for (const workout of program.document.workouts) {
    for (const item of workout.items) {
      for (const image of byId.get(item.exercise_id)?.images ?? []) paths.add(image.path);
    }
  }
  return [...paths];
}

/** Cache dedicado das imagens do programa ativo (servido pelo service worker — TAR-006). */
export const IMAGE_CACHE = "forja-imagens-v1";

export async function prefetchImages(paths: readonly string[]): Promise<number> {
  if (paths.length === 0 || !("caches" in globalThis)) return 0;
  const cache = await caches.open(IMAGE_CACHE);
  let added = 0;
  for (const path of paths) {
    if (await cache.match(path)) continue;
    try {
      await cache.add(path);
      added++;
    } catch {
      // Imagem indisponível agora: tenta no próximo download; o placeholder cobre a falta.
    }
  }
  return added;
}
