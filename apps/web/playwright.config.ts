// Testes de ponta a ponta (SEG-03 §2): Chromium (Android/desktop) e WebKit (motor do iPhone).
import { defineConfig, devices } from "@playwright/test";

const PORT = 5199;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npx vite --port ${String(PORT)} --strictPort`,
    cwd: import.meta.dirname,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
