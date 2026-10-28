// Forma do cliente usado pelo app: autenticação e consultas (PR-DES-02; ADR-039 alterada). Em
// arquivo próprio para que módulos que só precisam do tipo não carreguem a configuração de build.
import type { AuthClient } from "@supabase/auth-js";
import type { PostgrestClient } from "@supabase/postgrest-js";

/** Autenticação e consultas — a mesma forma de `auth` e `from` do cliente completo. */
export interface DataClient {
  readonly auth: InstanceType<typeof AuthClient>;
  readonly from: PostgrestClient["from"];
}
