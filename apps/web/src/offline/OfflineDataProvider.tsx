import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { getSupabase } from "../auth/client.ts";
import { readCachedCatalog } from "../catalog/catalog.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import {
  prefetchImages,
  programImagePaths,
  readOfflineData,
  refreshOfflineData,
  type OfflineSnapshot,
} from "./offline.ts";

// Dados do aluno disponíveis offline (TAR-017): abre com a cópia do aparelho e atualiza ao
// abrir, ao voltar ao primeiro plano e ao reconectar (UX-08 §6.3). Falha de rede mantém a
// cópia; o carimbo "atualizado às" mostra o último download bem-sucedido (RF-092).
export type OfflineState =
  | { readonly status: "loading" }
  | ({ readonly status: "ready"; readonly refreshing: boolean } & OfflineSnapshot);

interface OfflineValue {
  readonly state: OfflineState;
  readonly refresh: () => Promise<void>;
}

const Context = createContext<OfflineValue>({
  state: { status: "loading" },
  refresh: () => Promise.resolve(),
});

export function OfflineDataProvider({ children }: { children: ReactNode }) {
  const local = useLocalData();
  const { state: userState } = useUserContext();
  const db = local?.db ?? null;
  const student = userState.status === "ready" ? userState.context.student : null;
  const studentId = student?.id ?? null;
  const timeZone = student?.timezone ?? "America/Sao_Paulo";
  const [stored, setStored] = useState<{ db: typeof db; value: OfflineState }>({
    db: null,
    value: { status: "loading" },
  });
  const state: OfflineState =
    stored.db === db && db !== null ? stored.value : { status: "loading" };

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    if (db === null || studentId === null || supabase === null) return;
    setStored((previous) =>
      previous.db === db && previous.value.status === "ready"
        ? { db, value: { ...previous.value, refreshing: true } }
        : previous,
    );
    try {
      const snapshot = await refreshOfflineData(supabase, db, studentId, timeZone);
      setStored({ db, value: { status: "ready", refreshing: false, ...snapshot } });
      const { exercises } = await readCachedCatalog(db);
      await prefetchImages(programImagePaths(snapshot.program, exercises));
    } catch {
      // Sem conexão ou servidor indisponível: segue com a cópia do aparelho.
      const cached = await readOfflineData(db);
      setStored({ db, value: { status: "ready", refreshing: false, ...cached } });
    }
  }, [db, studentId, timeZone]);

  useEffect(() => {
    if (db === null) return;
    let active = true;
    void readOfflineData(db).then((cached) => {
      if (!active) return;
      setStored({ db, value: { status: "ready", refreshing: false, ...cached } });
      void refresh();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOnline = () => {
      void refresh();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [db, refresh]);

  return <Context value={{ state, refresh }}>{children}</Context>;
}

export function useOfflineData(): OfflineValue {
  return use(Context);
}
