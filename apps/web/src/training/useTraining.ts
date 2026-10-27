import { useEffect, useMemo, useState } from "react";
import { recommendWorkout, type Recommendation, type RestConfig } from "@forja/domain";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { readCachedCatalog, type CatalogExercise } from "../catalog/catalog.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import type { WeightRecord } from "../offline/offline.ts";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import type { VersionView } from "../program/program.ts";
import { readStoredRest, toRestConfig } from "./rest.ts";
import {
  readLocalSessions,
  readPlanProfile,
  summarizeWorkout,
  weekMarkers,
  type ActiveProgress,
  type LocalSessions,
  type PlanProfile,
  type WeekDay,
  type WorkoutSummary,
} from "./training.ts";

// Estado do "Meu treino" (TELA-010..013): programa ativo, catálogo, descanso, perfil e sessões
// do aparelho; a recomendação é recalculada a cada minuto e a cada mudança local.
export type TrainingState =
  | { readonly status: "loading" }
  | { readonly status: "no_program"; readonly updatedAt: string | undefined }
  | {
      readonly status: "ready";
      readonly program: VersionView;
      readonly workouts: readonly WorkoutSummary[];
      readonly exercises: ReadonlyMap<string, CatalogExercise>;
      readonly recommendation: Recommendation;
      readonly week: readonly WeekDay[];
      /** Progresso da sessão em andamento do aparelho, se houver. */
      readonly active: ActiveProgress | null;
      readonly sessionNames: ReadonlyMap<string, string>;
      readonly weights: readonly WeightRecord[];
      readonly updatedAt: string | undefined;
      readonly timeZone: string;
      readonly now: Date;
    };

interface LocalInputs {
  readonly db: unknown;
  readonly exercises: ReadonlyMap<string, CatalogExercise>;
  readonly rest: RestConfig;
  readonly profile: PlanProfile;
  readonly sessions: LocalSessions;
}

const MINUTE_MS = 60_000;

export function useTraining(): TrainingState {
  const local = useLocalData();
  const db = local?.db ?? null;
  const unsent = local?.unsent ?? 0;
  const { state: offline } = useOfflineData();
  const { state: userState } = useUserContext();
  const timeZone =
    userState.status === "ready"
      ? (userState.context.student?.timezone ?? "America/Sao_Paulo")
      : "America/Sao_Paulo";
  const program = offline.status === "ready" ? offline.program : null;
  const offlineStamp = offline.status === "ready" ? offline.updatedAt : undefined;
  const [now, setNow] = useState(() => new Date());
  const [inputs, setInputs] = useState<LocalInputs | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, MINUTE_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // Relê o aparelho ao abrir, após cada download e a cada mudança na fila de saída.
  useEffect(() => {
    if (db === null) return;
    // Objeto mutável: a limpeza do efeito pode ocorrer durante a leitura assíncrona.
    const run = { active: true };
    void (async () => {
      const { exercises } = await readCachedCatalog(db);
      const byId = new Map(exercises.map((e) => [e.id, e]));
      const groups = new Map(
        (program?.document.workouts ?? []).map((w) => [w.id, summarizeWorkout(w, byId).groups]),
      );
      const [stored, profile, sessions] = await Promise.all([
        readStoredRest(db),
        readPlanProfile(db),
        readLocalSessions(db, byId, groups),
      ]);
      if (run.active)
        setInputs({ db, exercises: byId, rest: toRestConfig(stored), profile, sessions });
    })().catch(() => {
      // Banco fechado (saída ou troca de usuário) durante a leitura: nada a mostrar.
    });
    return () => {
      run.active = false;
    };
  }, [db, program, offlineStamp, unsent]);

  return useMemo((): TrainingState => {
    if (offline.status !== "ready" || inputs?.db !== db) return { status: "loading" };
    if (program === null) return { status: "no_program", updatedAt: offline.updatedAt };
    const workouts = program.document.workouts.map((w) => summarizeWorkout(w, inputs.exercises));
    const recommendation = recommendWorkout({
      workouts: workouts.map((w) => ({ id: w.id, groups: w.groups })),
      publishedAt: program.published_at ?? program.updated_at,
      sessions: inputs.sessions.sessions,
      rest: inputs.rest,
      daysPerWeek: inputs.profile.daysPerWeek,
      preferredWeekdays: inputs.profile.preferredWeekdays,
      timeZone,
      now,
    });
    return {
      status: "ready",
      program,
      workouts,
      exercises: inputs.exercises,
      recommendation,
      week: weekMarkers(now, timeZone, inputs.sessions, inputs.profile.preferredWeekdays),
      active: inputs.sessions.active,
      sessionNames: inputs.sessions.names,
      weights: offline.weights,
      updatedAt: offline.updatedAt,
      timeZone,
      now,
    };
  }, [offline, inputs, db, program, timeZone, now]);
}
