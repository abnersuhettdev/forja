import { useCallback } from "react";
import { navigate } from "../app/router.tsx";
import { getSupabase } from "./client.ts";
import { clearUserLocalData } from "./local-data.ts";

// Saída sem pendências (RF-002, RN-052 a): encerra a sessão neste aparelho e remove os dados
// locais do usuário. O caminho com pendências (RF-101..103) chega na TAR-021.
export function useSignOut(): () => Promise<void> {
  return useCallback(async () => {
    const supabase = getSupabase();
    // "local": encerra só neste aparelho; o token é descartado mesmo sem conexão.
    await supabase?.auth.signOut({ scope: "local" });
    clearUserLocalData();
    navigate("/entrar", { replace: true });
  }, []);
}
