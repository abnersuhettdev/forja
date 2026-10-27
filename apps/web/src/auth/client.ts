// Cliente do serviço de autenticação e dados (DAD-05 §3). Endereço e chave pública vêm da
// configuração de build (IMP-01 §2); a chave pública é pública por definição.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Chave do armazenamento local onde o cliente guarda a sessão (DAD-05 §3). */
export const AUTH_STORAGE_KEY = "forja.sessao";

let client: SupabaseClient | null | undefined;

/** Cliente único do app; `null` quando a configuração de build está ausente. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  client =
    typeof url === "string" && url !== "" && typeof key === "string" && key !== ""
      ? createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storageKey: AUTH_STORAGE_KEY,
          },
        })
      : null;
  return client;
}
