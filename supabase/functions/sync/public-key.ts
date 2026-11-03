// Chave publishable para falar com o serviço de autenticação. Na nuvem, o provedor a entrega em
// SUPABASE_PUBLISHABLE_KEYS, um JSON por nome ({"default": "sb_publishable_..."}); a CLI local
// (ADR-090) ainda não fornece essa variável, só SUPABASE_INTERNAL_PUBLISHABLE_KEY.
export function publishableKey(keysJson: string | undefined, localKey?: string): string {
  if (keysJson === undefined && localKey !== undefined && localKey !== "") return localKey;
  let keys: unknown;
  try {
    keys = JSON.parse(keysJson ?? "");
  } catch {
    throw new Error("SUPABASE_PUBLISHABLE_KEYS ausente ou inválida.");
  }
  const values = (keys ?? {}) as Record<string, unknown>;
  const key = values.default ?? Object.values(values)[0];
  if (typeof key !== "string" || key === "") {
    throw new Error("SUPABASE_PUBLISHABLE_KEYS sem chave.");
  }
  return key;
}
