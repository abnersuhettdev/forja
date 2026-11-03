// Gera apps/web/.env.development.local com o endereço e a chave pública do Supabase local
// (ADR-090). O arquivo é ignorado pelo git; a chave pública é pública por definição.
import { writeFileSync } from "node:fs";
import { localStatus } from "./local.ts";

const status = localStatus();
writeFileSync(
  new URL("../../apps/web/.env.development.local", import.meta.url),
  `# Gerado por scripts/db/write-local-env.ts — ambiente local\nVITE_SUPABASE_URL=${status.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}\n`,
);
console.log("Configuração local do app gravada em apps/web/.env.development.local");
