// Cliente do serviço de autenticação e dados (DAD-05 §3). Endereço e chave pública vêm da
// configuração de build (IMP-01 §2); a chave pública é pública por definição.
//
// Só o que o app usa do provedor: autenticação e consultas (PR-DES-02; ADR-039 alterada). O
// cliente completo traria também tempo real, armazenamento de arquivos e funções, que o app
// não usa (a sincronização chama a função por `fetch` próprio) — ~20 KiB a mais no pacote.
import { AuthClient } from "@supabase/auth-js";
import { PostgrestClient } from "@supabase/postgrest-js";
import type { DataClient } from "./data-client.ts";

export type { DataClient } from "./data-client.ts";

/** Chave do armazenamento local onde o cliente guarda a sessão (DAD-05 §3). */
export const AUTH_STORAGE_KEY = "forja.sessao";

/** Limite de espera de cada requisição ao servidor. */
export const REQUEST_TIMEOUT_MS = 15_000;

let client: DataClient | null | undefined;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function createDataClient(url: string, key: string): DataClient {
  const base = url.replace(/\/+$/, "");
  const auth = new AuthClient({
    url: `${base}/auth/v1`,
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Sem resposta em 15 s, a leitura falha e a tela mostra o erro com "Tentar de novo"
    // (ou a cópia do aparelho) em vez de carregar para sempre (UX-02 §8.3).
    fetch: fetchWithTimeout,
  });
  // Consultas como o próprio usuário: o token da sessão (ou a chave pública, sem sessão), como
  // faz o cliente completo; as políticas por linha decidem o que cada um vê (DAD-03 §7).
  const withSession = async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data } = await auth.getSession();
    const headers = new Headers(init?.headers);
    if (!headers.has("apikey")) headers.set("apikey", key);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${data.session?.access_token ?? key}`);
    }
    return fetchWithTimeout(input, { ...init, headers });
  };
  const rest = new PostgrestClient(`${base}/rest/v1`, { fetch: withSession });
  return { auth, from: rest.from.bind(rest) };
}

/** Cliente único do app; `null` quando a configuração de build está ausente. */
export function getSupabase(): DataClient | null {
  if (client !== undefined) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  client =
    typeof url === "string" && url !== "" && typeof key === "string" && key !== ""
      ? createDataClient(url, key)
      : null;
  return client;
}
