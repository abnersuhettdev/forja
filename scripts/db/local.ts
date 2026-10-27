// Utilidades do ambiente local (ADR-090): leitura do estado do Supabase local pela CLI.
// Recusa qualquer endereço que não seja desta máquina.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export interface LocalStatus {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
}

const CLI = fileURLToPath(new URL("../../node_modules/supabase/dist/supabase.js", import.meta.url));

export function localStatus(): LocalStatus {
  const raw = execFileSync(process.execPath, [CLI, "status", "-o", "json"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const status = JSON.parse(raw.slice(raw.indexOf("{"))) as LocalStatus;
  const host = new URL(status.API_URL).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("O ambiente local deve apontar para esta máquina.");
  }
  return status;
}
