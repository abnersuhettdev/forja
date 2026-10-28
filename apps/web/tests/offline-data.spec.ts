// Disponibilidade offline (TAR-017): após o primeiro carregamento, o programa ativo, os pesos e
// o catálogo ficam no aparelho e continuam acessíveis sem rede (RF-091, RF-092); ações de
// gestão ficam desabilitadas com explicação (CA-093). Abrir o app offline depois de recarregar
// depende do service worker (TAR-006).
import { expect, test, type Page } from "@playwright/test";
import { offlineUser } from "./fixtures.ts";
import { publishProgram } from "./program-fixture.ts";

test.use({ storageState: { cookies: [], origins: [] } });

type HookWindow = Window & {
  __forjaLocal?: { read: (table: string) => Promise<unknown[]> };
};

const readTable = (page: Page, table: string) =>
  page.evaluate((name) => (window as HookWindow).__forjaLocal?.read(name) ?? [], table);

test("programa, pesos e catálogo ficam disponíveis sem rede após o primeiro carregamento", async ({
  page,
  context,
  browserName,
}) => {
  const user = offlineUser(browserName);
  await publishProgram(user.email);
  // PR-DES-01 P-1: no primeiro acesso do aparelho, Hoje nunca mostra "sem programa" enquanto
  // o programa ainda está chegando (observa o documento inteiro, inclusive aparições breves).
  await page.addInitScript(() => {
    (window as Window & { __semPrograma?: boolean }).__semPrograma = false;
    new MutationObserver(() => {
      if (document.body.innerText.includes("Montar programa"))
        (window as Window & { __semPrograma?: boolean }).__semPrograma = true;
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page.getByText("Treino A").first()).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { __semPrograma?: boolean }).__semPrograma),
  ).toBe(false);

  // Carimbo do último download (RF-092) na Conta.
  await page.getByRole("link", { name: "Conta" }).first().click();
  const sync = page.getByRole("link", { name: /Sincronização/ });
  await expect(sync).toContainText(/Disponível offline · atualizado às \d{2}:\d{2}/);

  // O que ficou guardado no aparelho.
  const programs = (await readTable(page, "program")) as {
    view: { document: { name: string; workouts: { items: unknown[] }[] } };
  }[];
  expect(programs[0]?.view.document.name).toBe("Programa offline fictício");
  expect(programs[0]?.view.document.workouts[0]?.items).toHaveLength(1);
  expect(await readTable(page, "weights")).toHaveLength(1);
  expect((await readTable(page, "catalog_cache")).length).toBeGreaterThanOrEqual(110);

  // Sem rede: catálogo e detalhe seguem consultáveis pela cópia do aparelho.
  await context.setOffline(true);
  await page.getByRole("link", { name: "Gestão" }).first().click();
  await page.getByRole("link", { name: "Catálogo" }).first().click();
  await expect(page.getByText("110 exercícios")).toBeVisible();
  await page.getByLabel("Buscar por nome").fill("agachamento livre com barra");
  await page.getByRole("link", { name: /Agachamento livre com barra/ }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Agachamento livre com barra" }),
  ).toBeVisible();

  // Gestão exige conexão: aviso e ação indisponível (CA-093).
  await page.getByRole("link", { name: "Perfil" }).first().click();
  await expect(page.getByText(/A área de gestão precisa de conexão/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);

  // Ao reconectar, a cópia é atualizada de novo.
  await context.setOffline(false);
  await page.getByRole("link", { name: "Conta" }).first().click();
  await expect(page.getByRole("link", { name: /Sincronização/ })).toContainText(
    /Disponível offline · atualizado às/,
  );
});
