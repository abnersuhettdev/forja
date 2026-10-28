import { useCallback, useEffect, useState } from "react";
import { LOCAL_SESSIONS_WINDOW_DAYS } from "@forja/domain";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { getSupabase } from "../auth/client.ts";
import { readCachedCatalog, type CatalogExercise } from "../catalog/catalog.ts";
import { fetchSessionsInRange } from "../execution/download.ts";
import type { SessionBundle } from "../execution/session.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { readPlanProfile } from "../training/training.ts";
import { useOnline } from "../app/useOnline.ts";
import { readHistory } from "./history.ts";

export type RemoteState = "none" | "loading" | "ok" | "offline" | "failed";

export interface HistoryState {
  readonly status: "loading" | "ready";
  readonly bundles: readonly SessionBundle[];
  readonly pending: ReadonlySet<string>;
  readonly exercises: ReadonlyMap<string, CatalogExercise>;
  readonly preferredWeekdays: readonly number[];
  readonly timeZone: string;
  /** Consulta ao servidor para o período fora da janela de 90 dias do aparelho. */
  readonly remote: RemoteState;
}

const EMPTY: HistoryState = {
  status: "loading",
  bundles: [],
  pending: new Set(),
  exercises: new Map(),
  preferredWeekdays: [],
  timeZone: "America/Sao_Paulo",
  remote: "none",
};

// Sessões do aparelho (sincronizadas e pendentes — RN-049) e, para períodos anteriores à janela
// de 90 dias, consulta ao servidor quando houver conexão (API-R06), sem gravar no aparelho.
export function useHistory(range: { from: Date; to: Date }) {
  const local = useLocalData();
  const online = useOnline();
  const { state: user } = useUserContext();
  const db = local?.db ?? null;
  const unsent = local?.unsent ?? 0;
  const student = user.status === "ready" ? user.context.student : null;
  const studentId = student?.id ?? null;
  const timeZone = student?.timezone ?? "America/Sao_Paulo";
  const fromMs = range.from.getTime();
  const toMs = range.to.getTime();
  const [state, setState] = useState<HistoryState>(EMPTY);

  /** Lê o aparelho (e o servidor, se preciso) sem tocar no estado da tela. */
  const load = useCallback(async (): Promise<HistoryState | null> => {
    if (db === null) return null;
    const [history, catalog, profile] = await Promise.all([
      readHistory(db),
      readCachedCatalog(db),
      readPlanProfile(db),
    ]);
    const windowStart = Date.now() - LOCAL_SESSIONS_WINDOW_DAYS * 86_400_000;
    const needsRemote = fromMs < windowStart;
    let bundles = history.bundles;
    let remote: RemoteState = "none";
    if (needsRemote) {
      const supabase = getSupabase();
      if (!online || supabase === null || studentId === null) {
        remote = "offline";
      } else {
        try {
          const fetched = await fetchSessionsInRange(
            supabase,
            studentId,
            new Date(fromMs).toISOString(),
            new Date(toMs).toISOString(),
          );
          const known = new Set(bundles.map((b) => b.session.id));
          bundles = [...bundles, ...fetched.filter((b) => !known.has(b.session.id))];
          remote = "ok";
        } catch {
          remote = "failed";
        }
      }
    }
    return {
      status: "ready",
      bundles,
      pending: history.pending,
      exercises: new Map(catalog.exercises.map((e) => [e.id, e])),
      preferredWeekdays: profile.preferredWeekdays,
      timeZone,
      remote,
    };
  }, [db, fromMs, toMs, online, studentId, timeZone]);

  const reload = useCallback(async () => {
    const next = await load();
    if (next) setState(next);
  }, [load]);

  // Relê ao abrir, a cada mudança na fila (envio confirmado, nova edição) e de período.
  useEffect(() => {
    let active = true;
    load()
      .then((next) => {
        if (active && next) setState(next);
      })
      .catch(() => {
        // Banco fechado (saída) durante a leitura.
      });
    return () => {
      active = false;
    };
  }, [load, unsent]);

  return { state, reload };
}
