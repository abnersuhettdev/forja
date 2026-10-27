// Testes de ponta a ponta (SEG-03 §2): Chromium (Android/desktop) e WebKit (motor do iPhone).
// Exigem o Supabase local em execução (pnpm db:start — ADR-090).
import { defineConfig, devices } from "@playwright/test";
import { SESSION_FILE } from "./tests/fixtures.ts";

const PORT = 5199;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // O servidor de desenvolvimento entrega módulos sem empacotar; com vários WebKit em paralelo
  // (Windows) uma tela leva alguns segundos para abrir. Esperas e paralelismo ajustados.
  workers: 4,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  // Uma nova tentativa também localmente: sob carga, a função local pode ser interrompida pelo
  // limite de CPU do edge runtime. Repetições aparecem como "flaky" no relatório.
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  // Telas com login usam a sessão salva pelo setup; tests/auth.spec.ts começa sem sessão.
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: SESSION_FILE },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], storageState: SESSION_FILE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `npx vite --port ${String(PORT)} --strictPort`,
    cwd: import.meta.dirname,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
