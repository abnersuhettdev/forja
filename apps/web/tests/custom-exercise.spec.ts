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
  await page
    .getByRole("group", { name: /Evitar para quem declarou/ })
    .getByLabel("Joelho")
    .check();
  await save.click();
  await expect(page).toHaveURL(/\/exercicios\/[0-9a-f-]{36}$/);

  // A contraindicação foi gravada no banco (RF-035).
  const check = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    const rows = await check`
      select c.restriction_code from public.exercise_contraindications c
      join public.exercises e on e.id = c.exercise_id where e.name = ${name}`;
    expect(rows.map((r) => r.restriction_code as string)).toEqual(["knee"]);
  } finally {
    await check.end();
  }
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

test("gestão corrige texto de importado e a fonte original é preservada (CA-032, ADR-091)", async ({
  page,
  browserName,
}) => {
  test.setTimeout(90_000);
  // Um exercício por navegador (rodam em paralelo); restaurado antes e depois.
  const sourceRef = browserName === "chromium" ? "Concentration_Curls" : "Hammer_Curls";
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  const restore = () => sql`
    update public.exercises set
      name = coalesce(original_text ->> 'name', name),
      instructions = coalesce(original_text -> 'instructions', instructions),
      safety_tips = coalesce(original_text -> 'safety_tips', safety_tips),
      original_text = null, edited_by_manager_at = null
    where origin = 'imported' and source_ref = ${sourceRef}`;
  try {
    await restore();
    const [row] = await sql<{ name: string }[]>`
      select name from public.exercises where source_ref = ${sourceRef}`;
    const original = row?.name ?? "";

    await login(page);
    await page.goto("/gestao/catalogo");
    await page.getByLabel("Buscar por nome").fill(original);
    await page
      .getByRole("list", { name: "Catálogo" })
      .getByRole("link", { name: new RegExp(original) })
      .click();
    await page.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByText(/Importado de free-exercise-db/)).toBeVisible();
    await expect(page.getByRole("group", { name: /Grupos principais/ })).toHaveCount(0);

    await page.getByLabel("Nome", { exact: true }).fill(`${original} (corrigido)`);
    await page.getByLabel("Passo 1", { exact: true }).fill("Passo corrigido pelo gestor no teste.");
    await page.getByRole("button", { name: "Salvar exercício" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: `${original} (corrigido)` }),
    ).toBeVisible();
    await expect(
      page.getByText("Texto editado na gestão; o original da fonte foi preservado."),
    ).toBeVisible();

    const [saved] = await sql<{ original: string }[]>`
      select original_text ->> 'name' as original from public.exercises where source_ref = ${sourceRef}`;
    expect(saved?.original).toBe(original);
  } finally {
    await restore();
    await sql.end();
  }
});
