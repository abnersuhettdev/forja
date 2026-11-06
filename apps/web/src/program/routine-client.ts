// Pede a rotina à função de IA (API-032). Sem resposta útil, o app gera só com o motor no aparelho
// (RN-062): a pessoa nunca fica sem rotina por causa da IA.
import type { MotorResult } from "@forja/domain/motor";
import { getSupabase } from "../auth/client.ts";

const TIMEOUT_MS = 35_000;

/** `daysPerWeek`: dias da proposta de ajuste (RF-116), no lugar dos do perfil. */
export async function requestRoutine(daysPerWeek?: number): Promise<MotorResult | null> {
  const supabase = getSupabase();
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (supabase === null || !baseUrl || !key) return null;
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return null;
  try {
    const response = await fetch(new URL("/functions/v1/ai/routine", baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(daysPerWeek === undefined ? {} : { days_per_week: daysPerWeek }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as Partial<MotorResult>;
    return body.status === "generated" || body.status === "blocked" ? (body as MotorResult) : null;
  } catch {
    return null;
  }
}
