// Provedor de IA (ADR-093; ARQ-01): atrás desta interface, para poder ser trocado. Chamado só pelo
// servidor; o token fica nos segredos da função e nunca vai para o log nem para o app.
import { workersAiReplyContent } from "../../../packages/domain/src/motor/ia.ts";

export interface AiAnswer {
  readonly content: unknown;
  readonly neurons: number;
}

export interface AiProvider {
  readonly model: string;
  complete(system: string, user: string): Promise<AiAnswer>;
}

/** Modelo da prova de qualidade (PLN-06 §3.4); neurônios por milhão de tokens em 2026-11-04. */
export const GEMMA = {
  id: "@cf/google/gemma-4-26b-a4b-it",
  input: 9_091,
  output: 27_273,
} as const;
const MAX_TOKENS = 1_500;
const TIMEOUT_MS = 20_000;

export function createWorkersAi(
  accountId: string | undefined,
  token: string | undefined,
  fetcher: typeof fetch = fetch,
): AiProvider | null {
  if (!accountId || !token) return null;
  return {
    model: GEMMA.id,
    async complete(system, user) {
      const response = await fetcher(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${GEMMA.id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            max_tokens: MAX_TOKENS,
            temperature: 0.2,
            // Sem isto, o raciocínio consome o limite e a resposta vem vazia (prova de qualidade).
            chat_template_kwargs: { enable_thinking: false },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      if (!response.ok) throw new Error(`Workers AI: HTTP ${String(response.status)}`);
      const body: unknown = await response.json();
      const usage = (
        body as { result?: { usage?: { prompt_tokens?: number; completion_tokens?: number } } }
      ).result?.usage;
      return {
        content: workersAiReplyContent(body),
        neurons:
          ((usage?.prompt_tokens ?? 0) * GEMMA.input +
            (usage?.completion_tokens ?? 0) * GEMMA.output) /
          1_000_000,
      };
    },
  };
}
