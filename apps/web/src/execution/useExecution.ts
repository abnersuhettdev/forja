import { useCallback, useEffect, useState } from "react";
import { prefillSet, type SetValues } from "@forja/domain";
import { readCachedCatalog, type CatalogExercise } from "../catalog/catalog.ts";
import { readMeta, writeMeta, type LocalDatabase } from "../local/db.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import {
  deleteSet,
  discardSession,
  findActiveSession,
  lastExecution,
  readSession,
  saveSet,
  setPlannedSets,
  updateSessionExercise,
  type CachedLastExecution,
  type LocalSessionExercise,
  type SessionBundle,
} from "./session.ts";

// Estado do modo foco (TELA-015/016): sessão em andamento do aparelho, exercício atual e
// descanso. Posição e fim do descanso ficam gravados no aparelho: fechar, recarregar ou ir
// para segundo plano retoma no mesmo ponto (CA-062, CA-066).
const UI_KEY = "execucao.posicao";

export interface RestState {
  /** Horário de término (ms) — o tempo restante é sempre recalculado a partir dele. */
  readonly endsAt: number;
  readonly next: string | null;
}

interface UiState {
  readonly sessionId: string;
  readonly currentExerciseId: string | null;
  readonly rest: RestState | null;
}

export interface ExerciseView {
  readonly entry: LocalSessionExercise;
  readonly exercise: CatalogExercise | undefined;
  readonly last: CachedLastExecution | null;
}

export type ExecutionState =
  | { readonly status: "loading" }
  | { readonly status: "none" }
  | {
      readonly status: "ready";
      readonly bundle: SessionBundle;
      readonly exercises: readonly ExerciseView[];
      readonly current: ExerciseView;
      readonly currentIndex: number;
      readonly rest: RestState | null;
    };

async function load(db: LocalDatabase): Promise<ExecutionState> {
  const active = await findActiveSession(db);
  if (!active) return { status: "none" };
  const bundle = await readSession(db, active.id);
  if (!bundle || bundle.exercises.length === 0) return { status: "none" };
  const { exercises: catalog } = await readCachedCatalog(db);
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const views: ExerciseView[] = [];
  for (const entry of bundle.exercises) {
    views.push({
      entry,
      exercise: byId.get(entry.exercise_id),
      last: await lastExecution(db, entry.exercise_id, active.id),
    });
  }
  const stored = await readMeta<UiState>(db, UI_KEY);
  const ui = stored?.sessionId === active.id ? stored : null;
  const firstOpen = views.find((v) => v.entry.status === "pending") ?? views[0];
  const current = views.find((v) => v.entry.id === ui?.currentExerciseId) ?? firstOpen;
  if (!current) return { status: "none" };
  return {
    status: "ready",
    bundle,
    exercises: views,
    current,
    currentIndex: views.indexOf(current),
    rest: ui?.rest ?? null,
  };
}

export function setsOf(bundle: SessionBundle, exerciseId: string) {
  return bundle.sets.filter((s) => s.session_exercise_id === exerciseId);
}

/**
 * Valores iniciais da série (TRN-04 §3). Sem carga no pré-preenchimento (sem histórico nem
 * sugestão), repete a carga da série anterior desta sessão, para não pedir o valor a cada série.
 */
export function initialValues(
  view: ExerciseView,
  bundle: SessionBundle,
  setNumber: number,
): SetValues {
  const prescription = view.entry.prescription;
  const values = prefillSet(
    setNumber,
    {
      measure_type: prescription?.measure_type ?? view.exercise?.measure_type ?? "reps",
      reps_min: prescription?.reps_min ?? null,
      duration_s: prescription?.duration_s ?? null,
      suggested_load_kg: prescription?.suggested_load_kg ?? null,
    },
    view.exercise?.is_bodyweight ?? false,
    view.last?.sets ?? null,
  );
  if (values.load_kg !== null) return values;
  const previous = setsOf(bundle, view.entry.id).at(-1);
  return previous ? { ...values, load_kg: previous.load_kg } : values;
}

export function useExecution() {
  const local = useLocalData();
  const db = local?.db ?? null;
  const [state, setState] = useState<ExecutionState>({ status: "loading" });
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    if (db === null) return;
    setState(await load(db));
  }, [db]);

  useEffect(() => {
    if (db === null) return;
    let active = true;
    load(db)
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        // Banco fechado (saída) durante a leitura.
      });
    return () => {
      active = false;
    };
  }, [db]);

  const saveUi = useCallback(
    async (change: Partial<Omit<UiState, "sessionId">>) => {
      if (db === null || state.status !== "ready") return;
      const sessionId = state.bundle.session.id;
      const stored = await readMeta<UiState>(db, UI_KEY);
      const base: UiState =
        stored?.sessionId === sessionId
          ? stored
          : { sessionId, currentExerciseId: state.current.entry.id, rest: null };
      await writeMeta(db, UI_KEY, { ...base, ...change });
    },
    [db, state],
  );

  /**
   * Executa uma gravação local; falha vira aviso imediato (RN-043). `onSaved` roda logo após a
   * gravação, antes de reler a tela, para a confirmação aparecer sem espera (CA-061).
   */
  const run = useCallback(
    async <T>(action: () => Promise<T>, onSaved?: (result: T) => void): Promise<T | undefined> => {
      try {
        const result = await action();
        setFailed(false);
        onSaved?.(result);
        await reload();
        void local?.engine.syncNow();
        return result;
      } catch {
        setFailed(true);
        return undefined;
      }
    },
    [reload, local],
  );

  return { state, failed, reload, saveUi, run, local };
}

export const executionActions = {
  saveSet,
  deleteSet,
  discardSession,
  setPlannedSets,
  updateSessionExercise,
};
