// Validação da resposta da sincronização (DAD-04 §4): carregada sob demanda pelo app na
// primeira resposta do servidor (PR-DES-03).
import { z } from "zod";
import { ERROR_MESSAGES, type ErrorCode } from "../messages.ts";

const errorCode = z
  .string()
  .transform((code): ErrorCode => (code in ERROR_MESSAGES ? (code as ErrorCode) : "UNEXPECTED"));

export const resultError = z.object({
  code: errorCode,
  message: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

/** Resposta do servidor: dado externo, sempre validado antes de usar. */
export const syncResponseSchema = z.object({
  server_time: z.string(),
  results: z.array(
    z.discriminatedUnion("status", [
      z.object({
        op_id: z.string(),
        status: z.enum(["accepted", "duplicate"]),
        entity_id: z.string().optional(),
        revision: z.number().int().optional(),
      }),
      z.object({ op_id: z.string(), status: z.literal("rejected"), error: resultError }),
      z.object({
        op_id: z.string(),
        status: z.literal("conflict"),
        error: resultError,
        server_record: z.record(z.string(), z.unknown()).nullable().optional(),
      }),
      z.object({
        op_id: z.string(),
        status: z.literal("deferred"),
        error: resultError.optional(),
      }),
    ]),
  ),
});

export type SyncResponse = z.infer<typeof syncResponseSchema>;
export type ResultError = z.infer<typeof resultError>;
