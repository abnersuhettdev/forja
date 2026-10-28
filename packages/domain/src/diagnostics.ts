// Relato técnico do app (DAD-04 API-030; SEG-04 §3; SEG-05 §5): sem dados pessoais — versão,
// código de erro, rota lógica (padrão, sem identificadores) e plataforma.
import { z } from "zod";

/** Códigos que geram relato: aparelho, inesperado e dono divergente (SEG-05 §3 e §5). */
export const DIAGNOSTIC_CODES = [
  "LOCAL_WRITE_FAILED",
  "LOCAL_QUOTA_EXCEEDED",
  "LOCAL_MIGRATION_FAILED",
  "DECRYPT_FAILED",
  "SW_UPDATE_FAILED",
  "UNEXPECTED",
  "OWNER_MISMATCH",
] as const;
export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

export const DIAGNOSTIC_PLATFORMS = ["android", "ios", "desktop", "other"] as const;
export type DiagnosticPlatform = (typeof DIAGNOSTIC_PLATFORMS)[number];

/** SEG-04 §3 / ADR-038 — limite por usuário. */
export const DIAGNOSTICS_PER_HOUR = 20;

export const diagnosticReportSchema = z.strictObject({
  app_version: z.string().regex(/^[0-9A-Za-z.+-]{1,20}$/),
  error_code: z.enum(DIAGNOSTIC_CODES),
  // Padrão da rota ("/sessoes/:id/editar") ou contexto lógico ("fila"); nunca um endereço real.
  context: z.string().regex(/^[a-z0-9/:._-]{0,80}$/),
  platform: z.enum(DIAGNOSTIC_PLATFORMS),
});

export type DiagnosticReport = z.infer<typeof diagnosticReportSchema>;

/** Plataforma a partir do agente do navegador, sem guardar o agente. */
export function platformOf(userAgent: string): DiagnosticPlatform {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Windows|Macintosh|Linux|CrOS/i.test(userAgent)) return "desktop";
  return "other";
}
