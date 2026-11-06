// Fatos da semana com os dados do aparelho (TELA-061 sem conexão; sequência e cartão em Hoje). Fica
// fora do pacote inicial: Hoje carrega este módulo depois de abrir.
import { addDays, toLocalDate } from "@forja/domain";
import { weeklyFacts, type WeeklyFacts } from "@forja/domain/resumo";
import { readCachedCatalog } from "../catalog/catalog.ts";
import type { LocalSession, LocalSessionExercise, LocalSet } from "../execution/session.ts";
import type { LocalDatabase } from "../local/db.ts";
import type { OfflineSnapshot } from "../offline/offline.ts";

/** Janela de sessões guardadas no aparelho (UX-08 §6.2). */
const DEVICE_DAYS = 90;

export async function localWeeklyFacts(input: {
  readonly db: LocalDatabase;
  readonly snapshot: OfflineSnapshot;
  readonly goal: number | null;
  readonly timeZone: string;
  readonly now?: Date;
}): Promise<WeeklyFacts | null> {
  const { db, snapshot, timeZone } = input;
  const today = toLocalDate(input.now ?? new Date(), timeZone);
  const [sessions, entries, sets, catalog] = await Promise.all([
    db.table<LocalSession, string>("sessions").toArray(),
    db.table<LocalSessionExercise, string>("session_exercises").toArray(),
    db.table<LocalSet, string>("set_logs").toArray(),
    readCachedCatalog(db),
  ]);
  const names = new Map(catalog.exercises.map((e) => [e.id, e.name]));
  const setsByEntry = new Map<string, LocalSet[]>();
  for (const set of sets) {
    setsByEntry.set(set.session_exercise_id, [
      ...(setsByEntry.get(set.session_exercise_id) ?? []),
      set,
    ]);
  }
  const published = snapshot.program?.published_at ?? null;
  return weeklyFacts({
    today,
    timeZone,
    goal: input.goal,
    routineSince: published === null ? null : toLocalDate(new Date(published), timeZone),
    dataSince: addDays(today, -DEVICE_DAYS),
    sessions: sessions.map((s) => ({
      id: s.id,
      started_at: s.started_at,
      ended_at: s.ended_at,
      status: s.status,
    })),
    exercises: entries.map((entry) => {
      const logged = setsByEntry.get(entry.id) ?? [];
      return {
        session_id: entry.session_id,
        exercise_name: names.get(entry.exercise_id) ?? "",
        status: entry.status,
        max_load_kg: logged.length === 0 ? null : Math.max(...logged.map((l) => l.load_kg)),
        sets: logged.length,
      };
    }),
    weights: snapshot.weights.map((w) => ({ measured_on: w.measured_on, weight_kg: w.weight_kg })),
  });
}
