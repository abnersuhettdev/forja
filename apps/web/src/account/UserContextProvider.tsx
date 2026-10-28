import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "../auth/client.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { cacheContext, fetchUserContext, readCachedContext, type UserContext } from "./context.ts";

// Contexto do usuário conectado (API-R01). Abre com a cópia do aparelho e atualiza pelo
// servidor ao abrir e ao voltar a conexão; sem cópia e sem conexão, fica "indisponível".
export type UserContextState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly context: UserContext };

interface UserContextValue {
  readonly state: UserContextState;
  readonly refresh: () => Promise<void>;
}

const Context = createContext<UserContextValue>({
  state: { status: "loading" },
  refresh: () => Promise.resolve(),
});

export function UserContextProvider({ children }: { children: ReactNode }) {
  const local = useLocalData();
  const db = local?.db ?? null;
  const userId = local?.userId ?? null;
  // O estado guarda de qual usuário é; ao trocar de usuário, volta a "carregando" sem efeito.
  const [stored, setStored] = useState<{ userId: string | null; value: UserContextState }>({
    userId: null,
    value: { status: "loading" },
  });
  const state: UserContextState =
    stored.userId === userId && userId !== null ? stored.value : { status: "loading" };

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    if (db === null || userId === null || supabase === null) return;
    try {
      const data = await fetchUserContext(supabase, userId);
      await cacheContext(db, data);
      setStored({ userId, value: { status: "ready", context: data.context } });
    } catch {
      // Sem conexão ou erro do servidor: mantém a cópia do aparelho, se houver.
      setStored((previous) =>
        previous.userId === userId && previous.value.status === "ready"
          ? previous
          : { userId, value: { status: "unavailable" } },
      );
    }
  }, [db, userId]);

  useEffect(() => {
    if (db === null || userId === null) return;
    let active = true;
    readCachedContext(db)
      .then((cached) => {
        if (!active) return;
        if (cached?.userId === userId)
          setStored({ userId, value: { status: "ready", context: cached } });
        void refresh();
      })
      .catch(() => {
        // Banco fechado (saída ou troca de usuário) durante a leitura.
      });
    const onOnline = () => {
      void refresh();
    };
    window.addEventListener("online", onOnline);
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
    };
  }, [db, userId, refresh]);

  return <Context value={{ state, refresh }}>{children}</Context>;
}

export function useUserContext(): UserContextValue {
  return use(Context);
}
