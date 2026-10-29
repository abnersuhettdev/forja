// Transporte do envio para a função de sincronização (DAD-04 §4). Classifica a resposta HTTP
// em SyncOutcome; a resposta é dado externo e passa pelo esquema do domínio.
import type { SyncOutcome, SyncRequest } from "@forja/domain";

export type SyncTransport = (request: SyncRequest) => Promise<SyncOutcome>;

const TIMEOUT_MS = 20_000;

export interface HttpTransportOptions {
  readonly baseUrl: string;
  readonly publicKey: string;
  /** Token de acesso atual; null = sem sessão válida. */
  readonly accessToken: () => Promise<string | null>;
  readonly fetchImpl?: typeof fetch;
}

export function createHttpTransport(options: HttpTransportOptions): SyncTransport {
  const fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  return async (request) => {
    const token = await options.accessToken();
    if (token === null) return { kind: "unauthorized" };

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchImpl(new URL("/functions/v1/sync", options.baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: options.publicKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      return {
        kind: "transport_failure",
        code: controller.signal.aborted ? "TIMEOUT" : "NETWORK_UNAVAILABLE",
      };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401) return { kind: "unauthorized" };
    if (response.status === 429) return { kind: "rate_limited" };
    if (!response.ok) return { kind: "transport_failure", code: "INTERNAL" };
    try {
      // Validação carregada sob demanda na primeira resposta (PR-DES-03): fora do JS inicial.
      const { syncResponseSchema } = await import("@forja/domain/validacao");
      const parsed = syncResponseSchema.safeParse(await response.json());
      return parsed.success
        ? { kind: "response", response: parsed.data }
        : { kind: "transport_failure", code: "INTERNAL" };
    } catch {
      return { kind: "transport_failure", code: "INTERNAL" };
    }
  };
}
