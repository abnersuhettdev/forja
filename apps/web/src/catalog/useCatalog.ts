import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../auth/client.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { cacheCatalog, fetchCatalog, readCachedCatalog, type CatalogExercise } from "./catalog.ts";

export type CatalogState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | {
      readonly status: "ready";
      readonly exercises: readonly CatalogExercise[];
      readonly updatedAt: string | undefined;
    };

// Abre com a cópia do aparelho e atualiza pelo servidor quando houver conexão; sem cópia e
// sem conexão, o catálogo fica indisponível (UX-08 §6.2: "itens já vistos").
export function useCatalog(): { state: CatalogState; reload: () => Promise<void> } {
  const local = useLocalData();
  const db = local?.db ?? null;
  const [state, setState] = useState<CatalogState>({ status: "loading" });

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    if (db === null || supabase === null) return;
    try {
      const exercises = await fetchCatalog(supabase);
      const now = new Date();
      await cacheCatalog(db, exercises, now);
      setState({ status: "ready", exercises, updatedAt: now.toISOString() });
    } catch {
      setState((previous) => (previous.status === "ready" ? previous : { status: "unavailable" }));
    }
  }, [db]);

  useEffect(() => {
    if (db === null) return;
    let active = true;
    readCachedCatalog(db)
      .then((cached) => {
        if (!active) return;
        if (cached.exercises.length > 0) {
          setState({ status: "ready", exercises: cached.exercises, updatedAt: cached.updatedAt });
        }
        void reload();
      })
      .catch(() => {
        // Banco fechado (saída ou troca de usuário) durante a leitura.
      });
    return () => {
      active = false;
    };
  }, [db, reload]);

  return { state, reload };
}
