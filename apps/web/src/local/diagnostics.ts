// Relato técnico (API-030; SEG-05 §5; ADR-038): código, rota lógica, versão e plataforma —
// nunca dados pessoais, identificadores de registros ou textos digitados. Falha em silêncio:
// o relato nunca atrapalha o uso.
import { platformOf, type DiagnosticCode } from "@forja/domain";
import { getSupabase } from "../auth/client.ts";
import { matchRoute } from "../app/route-match.ts";
import { ROUTES } from "../app/routes.ts";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "0.0.0";
/** Mesmo código e contexto no máximo uma vez por minuto neste aparelho. */
const REPEAT_MS = 60_000;
const recent = new Map<string, number>();

/** Padrão da rota atual ("/sessoes/:id/editar"); endereço desconhecido vira "desconhecida". */
export function logicalRoute(pathname: string): string {
  const route = ROUTES.find((r) => matchRoute(r.pattern, pathname) !== null);
  return route?.pattern ?? "desconhecida";
}

export async function reportDiagnostic(code: DiagnosticCode, context: string): Promise<void> {
  try {
    const key = `${code}|${context}`;
    const now = Date.now();
    if (now - (recent.get(key) ?? 0) < REPEAT_MS) return;
    recent.set(key, now);
    const supabase = getSupabase();
    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!token || !baseUrl) return;
    await fetch(new URL("/functions/v1/sync/diagnostics", baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_version: APP_VERSION,
        error_code: code,
        context,
        platform: platformOf(navigator.userAgent),
      }),
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // Sem conexão ou serviço indisponível: o relato é descartado.
  }
}
