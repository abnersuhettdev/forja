// Autenticação (TAR-008): login, saída sem pendências, troca de senha e espera progressiva.
// Critérios: CA-001, CA-002, CA-007, CA-213. Usuários fictícios (RN-037).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { MAIN_USER, passwordChangeUser } from "./fixtures.ts";

// Estes testes começam sem sessão.
test.use({ storageState: { cookies: [], origins: [] } });

async function login(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Simula a resposta do serviço de autenticação, sem gastar o limite de tentativas real. */
async function mockTokenEndpoint(page: Page, status: number, code: string) {
  await page.route("**/auth/v1/token**", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ code, error_code: code, msg: "simulado" }),
    }),
  );
}

test("sem sessão, qualquer tela leva ao login", async ({ page }) => {
  await page.goto("/hoje");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { level: 1, name: "Forja" })).toBeVisible();
  await expect(page.getByText("A rotina certa, sem você precisar pensar nela.")).toBeVisible();
});

for (const scheme of ["light", "dark"] as const) {
  test(`login acessível no tema ${scheme} (CA-203)`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "axe roda no Chromium");
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Entrar" }).click(); // mostra erros de campo
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test("campos obrigatórios e senha visível sob demanda", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Preencha este campo.")).toHaveCount(2);
  const password = page.getByLabel("Senha", { exact: true });
  await password.fill("qualquer");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
});

test("credenciais erradas mostram erro genérico; corretas entram e a sessão persiste (CA-001, CA-213)", async ({
  page,
}) => {
  const logs: string[] = [];
  page.on("console", (message) => logs.push(message.text()));
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));

  await login(page, MAIN_USER.email, "Senha-errada-123");
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos");
  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByLabel("Senha", { exact: true }).fill(MAIN_USER.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  await page.reload();
  await expect(page).toHaveURL(/\/hoje$/);

  // Senha nunca em URL nem em log do console (CA-213).
  for (const text of [...logs, ...urls]) {
    expect(text).not.toContain(MAIN_USER.senha);
    expect(text).not.toContain("Senha-errada-123");
  }
});

test("após 5 falhas seguidas o app impõe espera progressiva (CA-007, RN-031)", async ({ page }) => {
  await mockTokenEndpoint(page, 400, "invalid_credentials");
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("alguem@exemplo.test");
  const submit = page.getByRole("button", { name: "Entrar" });
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.getByLabel("Senha", { exact: true }).fill(`errada-${String(attempt)}`);
    await submit.click();
    await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos");
  }
  await expect(submit).toBeEnabled();
  await page.getByLabel("Senha", { exact: true }).fill("errada-5");
  await submit.click();
  await expect(page.getByRole("status").filter({ hasText: "Muitas tentativas" })).toContainText(
    /Aguarde (30|29|28) s/,
  );
  await expect(submit).toBeDisabled();

  // A espera sobrevive a recarregar a página.
  await page.reload();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();
});

test("limite do serviço de autenticação mostra aviso de muitas tentativas", async ({ page }) => {
  await mockTokenEndpoint(page, 429, "over_request_rate_limit");
  await login(page, "alguem@exemplo.test", "qualquer-senha-1");
  await expect(page.getByRole("alert")).toHaveText("Muitas tentativas. Aguarde alguns minutos.");
});

test("sem conexão, o login explica que é preciso estar conectado", async ({ page, context }) => {
  await page.goto("/entrar");
  await context.setOffline(true);
  await expect(page.getByText("Para entrar é preciso estar conectado.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeDisabled();
  await context.setOffline(false);
});

test("sair sem pendências encerra a sessão e remove os dados locais (CA-002, RN-052 a)", async ({
  page,
}) => {
  await login(page, MAIN_USER.email, MAIN_USER.senha);
  await expect(page).toHaveURL(/\/hoje$/);
  await page.evaluate(() => {
    localStorage.setItem("forja.u.exemplo", "dado do usuário");
    localStorage.setItem("forja.tema", "dark");
  });
  await page.goto("/conta");

  await page.getByRole("button", { name: "Sair" }).click();
  const dialog = page.getByRole("dialog", { name: "Sair da conta?" });
  await expect(dialog).toContainText("Os dados do app serão removidos deste aparelho.");
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await dialog.getByRole("button", { name: "Sair" }).click();

  await expect(page).toHaveURL(/\/entrar$/);
  const stored = await page.evaluate(() => Object.keys(localStorage).sort());
  // Ficam só dados do aparelho: identidade aleatória (nome dos bancos) e tema.
  expect(stored).toEqual(["forja.aparelho", "forja.tema"]);
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(dbs.filter((name) => name?.startsWith("forja-u-"))).toEqual([]);
  await page.goto("/hoje");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("troca de senha valida RN-031 em tempo real e exige a senha atual (CA-007)", async ({
  page,
  browserName,
}) => {
  const user = passwordChangeUser(browserName);
  const newPassword = `Nova-senha-${browserName}-27`;
  await login(page, user.email, user.senha);
  await expect(page).toHaveURL(/\/hoje$/);
  await page.goto("/conta");
  await page.getByRole("link", { name: "Alterar senha" }).click();
  await expect(page).toHaveURL(/\/conta\/senha$/);

  const next = page.getByLabel("Nova senha", { exact: true });
  await next.fill("curta");
  await expect(page.getByText("A senha precisa ter pelo menos 10 caracteres.")).toBeVisible();
  await next.fill(user.email.toUpperCase());
  await expect(page.getByText("A senha não pode ser igual ao e-mail.")).toBeVisible();
  await next.fill("Password1234");
  await expect(page.getByText("Esta senha é muito comum. Escolha outra.")).toBeVisible();

  await next.fill(newPassword);
  await page.getByLabel("Confirmar nova senha").fill(`${newPassword}x`);
  await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
  await page.getByLabel("Confirmar nova senha").fill(newPassword);

  await page.getByLabel("Senha atual").fill("Senha-atual-errada");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Senha atual incorreta.")).toBeVisible();

  await page.getByLabel("Senha atual").fill(user.senha);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Senha alterada." })).toBeVisible();
  await expect(page).toHaveURL(/\/conta$/);

  // A nova senha passa a valer; depois volta à original para manter o usuário fictício estável.
  await page.goto("/conta/senha");
  await page.getByLabel("Senha atual").fill(newPassword);
  await page.getByLabel("Nova senha", { exact: true }).fill(user.senha);
  await page.getByLabel("Confirmar nova senha").fill(user.senha);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/conta$/);
});
