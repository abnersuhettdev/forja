// Prepara o ambiente dos testes: usuários fictícios no Supabase local e uma sessão salva
// para as telas que exigem login (ADR-090).
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test as setup } from "@playwright/test";
import { MAIN_USER, SESSION_FILE } from "./fixtures.ts";

setup("usuários fictícios e sessão", async ({ page }) => {
  execFileSync(process.execPath, ["scripts/db/seed-fixtures.ts"], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    stdio: "inherit",
  });
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(MAIN_USER.email);
  await page.getByLabel("Senha", { exact: true }).fill(MAIN_USER.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await page.context().storageState({ path: SESSION_FILE });
});
