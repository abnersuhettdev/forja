// Pede o resumo da semana à função de IA (API-033). Sem resposta útil, a tela usa os fatos do
// aparelho (RN-062): a pessoa nunca fica sem os números por causa da IA.
import type { WeeklyFacts } from "@forja/domain/resumo";
import { getSupabase } from "../auth/client.ts";

const TIMEOUT_MS = 35_000;

export type SummaryResponse =
  | { readonly status: "none" }
  | {
      readonly status: "ready";
      readonly facts: WeeklyFacts;
      readonly text: string | null;
      readonly model: string | null;
    };

export async function requestSummary(): Promise<SummaryResponse | null> {
  const supabase = getSupabase();
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (supabase === null || !baseUrl || !key) return null;
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return null;
  try {
    const response = await fetch(new URL("/functions/v1/ai/summary", baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<SummaryResponse>;
    return body.status === "ready" || body.status === "none" ? (body as SummaryResponse) : null;
  } catch {
    return null;
  }
}
