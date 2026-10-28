// Função de sincronização (API-001 e API-030; DAD-04 §4, ADR-034, ADR-038, ADR-050). Único
// caminho de escrita.
// Identidade sempre do token verificado no serviço de autenticação; escrita como sync_writer.
import { createSyncDb } from "./db.ts";
import { processDiagnostics } from "./diagnostics.ts";
import { processRequest, type Identity } from "./process.ts";

const env = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável ausente: ${name}`);
  return value;
};

const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_ANON_KEY = env("SUPABASE_ANON_KEY");
const db = createSyncDb(env("SYNC_DB_URL"));
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin !== "");

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin === null || !allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function json(request: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      // Respostas com dados pessoais nunca vão para cache (ADR-028 L5).
      "Cache-Control": "no-store",
    },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Confere o token no serviço de autenticação; null = inválido ou expirado. */
async function verify(request: Request): Promise<Identity | null> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token === "") return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: unknown; email?: unknown };
  if (typeof user.id !== "string") return null;
  return { userId: user.id, email: typeof user.email === "string" ? user.email : null };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return json(request, 405, { code: "VALIDATION_FAILED" });
  try {
    const identity = await verify(request);
    if (identity === null) return json(request, 401, { code: "AUTH_REQUIRED" });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(request, 400, { code: "VALIDATION_FAILED" });
    }
    // API-030 — relatos técnicos chegam pela mesma função (ARQ-05 §3).
    if (new URL(request.url).pathname.endsWith("/diagnostics")) {
      const report = await processDiagnostics(body, identity, { db, hash: sha256Hex });
      return json(request, report.status, report.body);
    }
    const result = await processRequest(body, identity, { db, hash: sha256Hex });
    return json(request, result.status, result.body);
  } catch (error) {
    // Sem conteúdo da requisição no log (SEG-01): só o tipo do erro.
    console.error("sync: falha interna", error instanceof Error ? error.name : "desconhecido");
    return json(request, 500, { code: "INTERNAL" });
  }
});
