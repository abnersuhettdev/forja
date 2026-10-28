// App instalável no build de produção (TAR-006; ADR-090 estendida): service worker, manifest,
// cabeçalhos de SEG-01 §5 (aplicados pelo `vite preview`, como no `_headers` publicado), abertura
// offline e atualização. Só Chromium: o WebKit do Playwright não reproduz o service worker do
// Safari; iPhone e Android ficam com a verificação em aparelho (TAR-025).
import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const env = Object.fromEntries(
  readFileSync(new URL("./.env.development.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.startsWith("VITE_"))
    .map((line) => line.trim().split(/=(.*)/s).slice(0, 2)),
) as Record<string, string>;

export default defineConfig({
  testDir: "./tests/pwa",
  // Um teste troca o service worker publicado para simular uma versão nova: execução em série.
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: 1,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${String(PORT)}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    serviceWorkers: "allow",
  },
  webServer: {
    command: `npx vite build --outDir dist-pwa --emptyOutDir && npx vite preview --outDir dist-pwa --port ${String(PORT)} --strictPort`,
    cwd: import.meta.dirname,
    port: PORT,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ?? "",
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ?? "",
    },
  },
});
