// Cliente do serviço de autenticação e dados (DAD-05 §3). Endereço e chave pública vêm da
// configuração de build (IMP-01 §2); a chave pública é pública por definição.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Chave do armazenamento local onde o cliente guarda a sessão (DAD-05 §3). */
export const AUTH_STORAGE_KEY = "forja.sessao";

let client: SupabaseClient | null | undefined;

/** Limite de espera de cada requisição ao servidor. */
export const REQUEST_TIMEOUT_MS = 15_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

/** Cliente único do app; `null` quando a configuração de build está ausente. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  client =
    typeof url === "string" && url !== "" && typeof key === "string" && key !== ""
      ? createClient(url, key, {
          // Sem resposta em 15 s, a leitura falha e a tela mostra o erro com "Tentar de novo"
          // (ou a cópia do aparelho) em vez de carregar para sempre (UX-02 §8.3).
          global: { fetch: fetchWithTimeout },
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
