// Validação do registro de peso (DAD-04 API-005).
import { z } from "zod";
import { inRange } from "./schemas.ts";

/** API-005 `weight.create` (entity_id = id do registro; data não futura conferida no servidor). */
export const weightCreatePayloadSchema = z.strictObject({
  measured_on: z.iso.date(),
  weight_kg: inRange("weightKg"),
});

export type WeightCreatePayload = z.infer<typeof weightCreatePayloadSchema>;
