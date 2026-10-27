// Exercício personalizado (TAR-014, CA-032 — parte de personalizados; a correção de importados
// aguarda decisão). Usa o segundo usuário fictício e apaga antes os exercícios deste teste.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { SECOND_USER } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });

async function login(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(SECOND_USER.email);
  await page.getByLabel("Senha", { exact: true }).fill(SECOND_USER.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}

test("gestão cria e edita exercício personalizado; nome repetido é recusado (CA-032)", async ({
  page,
  browserName,
}) => {
  test.setTimeout(90_000);
  const name = `Exercício fictício E2E ${browserName}`;
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    await sql`delete from public.exercises where origin = 'custom' and name like ${`Exercício fictício E2E ${browserName}%`}`;
  } finally {
    await sql.end();
  }

  await login(page);
  await page.goto("/gestao/catalogo");
  await page.getByRole("button", { name: "Novo exercício" }).click();
  await expect(page).toHaveURL(/\/gestao\/catalogo\/novo$/);

  // Obrigatórios.
  const save = page.getByRole("button", { name: "Salvar exercício" });
  await save.click();
  await expect(page.getByText("Preencha este campo.").first()).toBeVisible();
  await expect(page.getByText("Escolha ao menos uma opção.")).toHaveCount(2);
  if (browserName === "chromium") {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .map((v) => v.id),
    ).toEqual([]);
  }

  // Nome de exercício importado já existente.
  await page.getByLabel("Nome", { exact: true }).fill("Supino reto com barra");
  await page
    .getByRole("group", { name: /Grupos principais/ })
    .getByLabel("Peitoral")
    .check();
  await page
    .getByRole("group", { name: /Equipamentos/ })
    .getByLabel("Halteres")
    .check();
  await page.getByLabel("Padrão de movimento").selectOption({ label: "Empurrar horizontal" });
  await page
    .getByLabel("Passo 1", { exact: true })
    .fill("Deite no banco e empurre os halteres para cima.");
  await save.click();
  await expect(page.getByText("Já existe um exercício com esse nome.")).toBeVisible();

  // Criação.
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Adicionar dica" }).click();
  await page.getByLabel("Dica 1", { exact: true }).fill("Controle a descida.");
  await save.click();
  await expect(page).toHaveURL(/\/exercicios\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  await expect(page.getByText("Exercício personalizado criado na gestão.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Imagem indisponível" })).toBeVisible();

  // Edição.
  await page.getByRole("button", { name: "Editar" }).click();
  await expect(page).toHaveURL(/\/gestao\/catalogo\/[0-9a-f-]{36}\/editar$/);
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(name);
  await page.getByLabel("Nome", { exact: true }).fill(`${name} (editado)`);
  await page
    .getByRole("group", { name: /Grupos auxiliares/ })
    .getByLabel("Tríceps")
    .check();
  await save.click();
  await expect(page.getByRole("heading", { level: 2, name: `${name} (editado)` })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /^Tríceps$/ })).toBeVisible();

  // Aparece no filtro de personalizados do catálogo.
  await page.goto("/gestao/catalogo");
  await page.getByLabel("Origem").selectOption({ label: "Personalizados" });
  await expect(
    page.getByRole("list", { name: "Catálogo" }).getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
});
