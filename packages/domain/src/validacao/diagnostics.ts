// Validação do relato técnico (DAD-04 API-030), usada pela função do servidor.
import { z } from "zod";
import { DIAGNOSTIC_CODES, DIAGNOSTIC_PLATFORMS } from "../diagnostics.ts";

export const diagnosticReportSchema = z.strictObject({
  app_version: z.string().regex(/^[0-9A-Za-z.+-]{1,20}$/),
  error_code: z.enum(DIAGNOSTIC_CODES),
  // Padrão da rota ("/sessoes/:id/editar") ou contexto lógico ("fila"); nunca um endereço real.
  context: z.string().regex(/^[a-z0-9/:._-]{0,80}$/),
  platform: z.enum(DIAGNOSTIC_PLATFORMS),
});

export type DiagnosticReport = z.infer<typeof diagnosticReportSchema>;
