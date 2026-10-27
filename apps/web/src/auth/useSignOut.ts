import { useCallback } from "react";
import { navigate } from "../app/router.tsx";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { getSupabase } from "./client.ts";
import { clearUserLocalData } from "./local-data.ts";

export type SignOutResult =
  { readonly status: "signed_out" } | { readonly status: "has_unsent"; readonly count: number };

// Saída (RF-002, RN-052). Sem pendências: encerra a sessão neste aparelho e remove os dados
// locais do usuário. Com pendências, nada é removido: o caminho completo (enviar, manter ou
// descartar — RF-101..103) chega na TAR-021; até lá a saída é recusada (CP-02 da ADR-027).
export function useSignOut(): () => Promise<SignOutResult> {
  const local = useLocalData();
  return useCallback(async () => {
    if (local !== null) {
      const count = await local.db.outbox.count();
      if (count > 0) return { status: "has_unsent", count };
    }
    // Apaga o banco do usuário antes de encerrar a sessão, enquanto ele ainda está aberto
    // por este usuário; "local" encerra só neste aparelho, mesmo sem conexão.
    await local?.destroy();
    clearUserLocalData();
    await getSupabase()?.auth.signOut({ scope: "local" });
    navigate("/entrar", { replace: true });
    return { status: "signed_out" };
  }, [local]);
}
