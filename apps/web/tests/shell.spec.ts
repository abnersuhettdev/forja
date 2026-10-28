// Casca do app (TAR-005): rotas, navegação por área, foco, responsividade e acessibilidade.
// Critérios: CA-201 (sem rolagem horizontal), CA-202 (alvos de toque), CA-203 (axe), CA-205.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  "/hoje",
  "/treinos",
  "/treinos/00000000-0000-4000-8000-000000000001",
  "/exercicios/00000000-0000-4000-8000-000000000002",
  "/agenda",
  "/agenda/2026-10-26",
  "/sessoes/00000000-0000-4000-8000-000000000003/editar",
  "/evolucao",
  "/conta",
  "/conta/senha",
  "/conta/descanso",
  "/conta/sincronizacao",
  "/conta/instalar",
  "/gestao/programa",
  "/gestao/programa/rascunho",
  "/gestao/catalogo",
  "/gestao/catalogo/novo",
  "/gestao/catalogo/00000000-0000-4000-8000-000000000004/editar",
  "/gestao/perfil",
  "/gestao/perfil/avaliacao",
  "/entrar",
  "/configuracao-inicial",
  "/sessao",
  "/sessao/concluir",
  "/rota-inexistente",
];

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const scheme of ["light", "dark"] as const) {
  // Um bloco por tema: test.use vale para o bloco inteiro.
  test.describe(`todas as rotas (360 px, tema ${scheme})`, () => {
    test.use({ viewport: { width: 360, height: 740 }, colorScheme: scheme });
    for (const route of ROUTES) {
      test(route, async ({ page, browserName }) => {
        await page.goto(route);
        await expect(page.locator("h1")).toBeVisible();
        expect(await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches)).toBe(
          scheme === "dark",
        );
        await expectNoHorizontalScroll(page);
        if (browserName === "chromium") await expectAccessible(page);
      });
    }
  });
}

test.describe("larguras média e expandida", () => {
  for (const width of [768, 1280]) {
    test(`navegação e acessibilidade em ${String(width)} px`, async ({ page, browserName }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/hoje", "/gestao/programa", "/entrar", "/rota-inexistente"]) {
        await page.goto(route);
        await expectNoHorizontalScroll(page);
        if (browserName === "chromium") await expectAccessible(page);
      }
    });
  }
});

test("raiz redireciona para Hoje", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page.locator("h1")).toHaveText("Hoje");
});

test("barra inferior no celular e trilho lateral no desktop (UX-07 §2)", async ({ page }) => {
  const main = page.getByRole("navigation", { name: "Navegação principal" });
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/hoje");
  await expect(main).toHaveCount(1);
  const box = await main.boundingBox();
  expect(box?.y ?? 0).toBeGreaterThan(600);
  await page.setViewportSize({ width: 1280, height: 900 });
  // A troca barra → trilho acontece depois do redimensionamento: espera o trilho assentar.
  await expect.poll(async () => (await main.boundingBox())?.x).toBe(0);
  const rail = await main.boundingBox();
  expect(rail?.width ?? 0).toBeLessThan(120);
});

test("navegação por área, destino ativo, foco no título e voltar (UX-03)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/hoje");
  const nav = page.getByRole("navigation", { name: "Navegação principal" });

  await nav.getByRole("link", { name: "Treinos" }).click();
  await expect(page).toHaveURL(/\/treinos$/);
  await expect(nav.getByRole("link", { name: "Treinos" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("h1")).toBeFocused();

  await page
    .getByRole("navigation", { name: "Área" })
    .getByRole("link", { name: "Gestão" })
    .click();
  await expect(page).toHaveURL(/\/gestao\/programa$/);
  await expect(nav.getByRole("link", { name: "Catálogo" })).toBeVisible();

  // Conta mantém a navegação da última área visitada.
  await nav.getByRole("link", { name: "Conta" }).click();
  await expect(nav.getByRole("link", { name: "Catálogo" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/gestao\/programa$/);
});

test("alvos de toque da navegação têm ao menos 44 px (CA-202)", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/hoje");
  const links = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link");
  for (const link of await links.all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("tela em construção informa a tarefa que a entregará", async ({ page }) => {
  await page.goto("/conta/instalar");
  await expect(page.getByText("será entregue na TAR‑006")).toBeVisible();
});
