// API-030 — relato técnico do app (ADR-038; SEG-04 §3): validado, sem dados pessoais e limitado
// a 20 por hora por usuário (contados pelo resumo do identificador, nunca pelo e-mail).
import {
  DIAGNOSTICS_PER_HOUR,
  diagnosticReportSchema,
} from "../../../packages/domain/src/index.ts";
import type { ProcessDeps, Identity } from "./process.ts";

export type DiagnosticsResult =
  | { readonly status: 202; readonly body: { readonly accepted: true } }
  | { readonly status: 400; readonly body: { readonly code: "VALIDATION_FAILED" } }
  | { readonly status: 429; readonly body: { readonly code: "RATE_LIMITED" } };

export async function processDiagnostics(
  body: unknown,
  identity: Identity,
  deps: ProcessDeps,
): Promise<DiagnosticsResult> {
  const parsed = diagnosticReportSchema.safeParse(body);
  if (!parsed.success) return { status: 400, body: { code: "VALIDATION_FAILED" } };
  const report = parsed.data;
  const subject = await deps.hash(identity.userId);
  return deps.db.inActorTransaction(identity.userId, async (tx) => {
    const [recent] = await tx<{ count: number }[]>`
      select count(*)::int as count from public.diagnostic_reports
      where subject_hash = ${subject} and occurred_at > now() - interval '1 hour'`;
    if ((recent?.count ?? 0) >= DIAGNOSTICS_PER_HOUR)
      return { status: 429, body: { code: "RATE_LIMITED" } } as const;
    await tx`
      insert into public.diagnostic_reports (subject_hash, app_version, error_code, context, platform)
      values (${subject}, ${report.app_version}, ${report.error_code}, ${report.context},
              ${report.platform})`;
    return { status: 202, body: { accepted: true } } as const;
  });
}
