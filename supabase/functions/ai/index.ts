// Função de IA (API-032; ADR-093). Identidade sempre do token verificado no serviço de
// autenticação; banco como sync_writer, com o ator fixado (ADR-050). Sem conteúdo no log (SEG-01).
import { createSyncDb } from "../sync/db.ts";
import { publishableKey } from "../sync/public-key.ts";
import { generateRoutine } from "./routine.ts";
import { createWorkersAi } from "./workers-ai.ts";

const env = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável ausente: ${name}`);
  return value;
};

const SUPABASE_URL = env("SUPABASE_URL");
const PUBLISHABLE_KEY = publishableKey(
  Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
  Deno.env.get("SUPABASE_INTERNAL_PUBLISHABLE_KEY"),
);
const db = createSyncDb(env("SYNC_DB_URL"));
const provider = createWorkersAi(
  Deno.env.get("CLOUDFLARE_ACCOUNT_ID"),
  Deno.env.get("CLOUDFLARE_AI_TOKEN"),
);
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
      "Cache-Control": "no-store",
    },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function verify(request: Request): Promise<{ userId: string; email: string | null } | null> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token === "") return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: PUBLISHABLE_KEY },
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
  if (request.method !== "POST" || !new URL(request.url).pathname.endsWith("/routine")) {
    return json(request, 404, { code: "NOT_FOUND" });
  }
  try {
    const identity = await verify(request);
    if (identity === null) return json(request, 401, { code: "AUTH_REQUIRED" });
    const result = await generateRoutine(identity, { db, provider, hash: sha256Hex });
    return json(request, result.status, result.body);
  } catch (error) {
    console.error("ai: falha interna", error instanceof Error ? error.name : "desconhecido");
    return json(request, 500, { code: "INTERNAL" });
  }
});
