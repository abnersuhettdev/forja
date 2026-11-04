// Catálogo (TAR-013): busca e filtros (CA-030), detalhe com créditos (CA-031) e placeholder
// (CA-034), consulta offline pela cópia do aparelho. Usa o seed v1 do catálogo.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

const list = (page: Page) => page.getByRole("list", { name: "Catálogo" });

test("busca por nome com filtros de grupo e equipamento mostra só os correspondentes (CA-030)", async ({
  page,
  browserName,
}) => {
  await page.goto("/gestao/catalogo");
  await expect(page.getByText("110 exercícios")).toBeVisible();
  if (browserName === "chromium") await expectAccessible(page);

  await page.getByLabel("Buscar por nome").fill("SUPINO");
  await page.getByLabel("Grupo muscular").selectOption({ label: "Peitoral" });
  await page.getByLabel("Equipamento").selectOption({ label: "Barra" });
  const names = await list(page).getByRole("link").allInnerTexts();
  expect(names.length).toBeGreaterThan(0);
  for (const text of names) {
    expect(text).toMatch(/Supino/);
    expect(text).toMatch(/Peitoral/);
    expect(text).toMatch(/Barra/);
  }
  await expect(page.getByText(`${String(names.length)} exercício`)).toBeVisible();

  await page.getByLabel("Buscar por nome").fill("nenhum-exercicio-assim");
  await expect(page.getByText("Nenhum exercício encontrado")).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.getByText("110 exercícios")).toBeVisible();
});

test("detalhe mostra placeholder, grupos, equipamentos, instruções, dicas e créditos (CA-031, CA-034)", async ({
  page,
  browserName,
}) => {
  await page.goto("/gestao/catalogo");
  await page.getByLabel("Buscar por nome").fill("supino reto com barra");
  await list(page)
    .getByRole("link", { name: /Supino reto com barra/ })
    .click();
  await expect(page).toHaveURL(/\/exercicios\/[0-9a-f-]{36}$/);

  await expect(
    page.getByRole("heading", { level: 2, name: "Supino reto com barra" }),
  ).toBeVisible();
  for (const position of [1, 2]) {
    const photo = page.getByRole("img", {
      name: `Supino reto com barra, foto ${String(position)} de 2`,
    });
    await expect(photo).toBeVisible();
    await expect(photo).toHaveJSProperty("complete", true);
    expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.getByText(/Fotos do free-exercise-db/)).toHaveCount(1);
  await expect(page.getByRole("listitem").filter({ hasText: /^Peitoral$/ })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /^Tríceps$/ })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /^Banco$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como fazer" })).toBeVisible();
  await expect(page.getByText(/Deite no banco com os olhos sob a barra/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dicas de segurança" })).toBeVisible();
  const credits = page.locator("section").filter({ hasText: "Créditos e fonte" });
  await expect(credits.getByRole("link", { name: "free-exercise-db (yuhonas)" })).toBeVisible();
  await expect(credits.getByRole("link", { name: "Unlicense" })).toBeVisible();
  if (browserName === "chromium") await expectAccessible(page);
});

test("foto que não carrega dá lugar ao placeholder (CA-034, CA-408)", async ({ page }) => {
  await page.route("**/exercicios/*.webp", (route) => route.abort());
  await page.goto("/gestao/catalogo");
  await page.getByLabel("Buscar por nome").fill("supino reto com barra");
  await list(page)
    .getByRole("link", { name: /Supino reto com barra/ })
    .click();
  await expect(page.getByRole("img", { name: "Imagem indisponível" })).toBeVisible();
  await expect(page.getByText("Imagem indisponível", { exact: true })).toBeVisible();
});

test("sem conexão, o catálogo já baixado continua consultável (UX-08 §6.2)", async ({
  page,
  context,
}) => {
  await page.goto("/gestao/catalogo");
  await expect(page.getByText("110 exercícios")).toBeVisible();
  await expect(page.getByText(/Disponível offline · atualizado às/)).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel("Buscar por nome").fill("agachamento goblet");
  await list(page)
    .getByRole("link", { name: /Agachamento goblet/ })
    .click();
  await expect(page.getByRole("heading", { level: 2, name: "Agachamento goblet" })).toBeVisible();
  await context.setOffline(false);
});

test("exercício inexistente explica que não está disponível", async ({ page }) => {
  await page.goto("/exercicios/00000000-0000-4000-8000-0000000000ee");
  await expect(page.getByText("Exercício não encontrado")).toBeVisible();
});
