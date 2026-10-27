// Gestão (TAR-016): JOR-02 (CA-302), editor (CA-020, CA-024, CA-025), cópia e descarte
// (CA-027, CA-028), perfil com revisão recomendada (CA-012) e avaliação (CA-016).
// Usuário fictício exclusivo por navegador, com o programa apagado antes do teste.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { managementUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations
      .filter((v) => v.impact === "critical" || v.impact === "serious")
      .map((v) => `${v.id}: ${v.help}`),
  ).toEqual([]);
}

async function addExercise(page: Page, workout: string, exercise: string) {
  await page
    .getByRole("listitem")
    .filter({ has: page.getByRole("textbox", { name: "Nome do treino" }) })
    .filter({ has: page.locator(`input[value="${workout}"]`) })
    .getByRole("button", { name: "Adicionar exercício" })
    .click();
  const picker = page.getByRole("dialog", { name: "Escolher exercício" });
  await picker.getByLabel("Buscar por nome").fill(exercise);
  await picker
    .getByRole("list", { name: "Todos os exercícios" })
    .getByRole("button", { name: new RegExp(`^${exercise}`) })
    .click();
  const sheet = page.getByRole("dialog", { name: "Prescrição" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Salvar" }).click();
  await expect(sheet).toBeHidden();
}

test("JOR-02: monta, salva sozinho, publica, copia e descarta; perfil e avaliação", async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000);
  const user = managementUser(browserName);
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  const userId = sql`select id from auth.users where email = ${user.email}`;
  try {
    await sql`
      delete from public.programs
      where student_id = (select id from public.students where user_id = (${userId}))`;
    await sql`
      delete from public.assessments
      where student_id = (select id from public.students where user_id = (${userId}))`;
    await sql`
      update public.training_profiles set review_recommended_since = null, days_per_week = null
      where student_id = (select id from public.students where user_id = (${userId}))`;

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha", { exact: true }).fill(user.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/hoje$/);

    // TELA-030 sem programa → criar.
    await page.goto("/gestao/programa");
    await expect(page.getByText("Você ainda não tem um programa")).toBeVisible();
    await page.getByRole("button", { name: "Criar programa" }).click();
    await expect(page).toHaveURL(/\/gestao\/programa\/rascunho$/);

    // Publicar vazio mostra pendências (RN-035).
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText("Adicione ao menos um treino.")).toBeVisible();

    // Treino A com dois exercícios; reordenar e remover com desfazer (CA-024).
    await page.getByRole("button", { name: "Adicionar treino" }).click();
    await addExercise(page, "Treino A", "Supino reto com barra");
    await addExercise(page, "Treino A", "Remada baixa sentada na polia");
    const treinoA = page.getByRole("list", { name: "Treino A" });
    await treinoA.getByRole("button", { name: "Subir Remada baixa sentada na polia" }).click();
    await expect(treinoA.getByRole("listitem").first()).toContainText("Remada baixa");
    if (browserName === "chromium") {
      // Arrastar pela alça (atalho de mouse) desfaz a troca de posição.
      const rows = treinoA.getByRole("listitem");
      await rows.nth(1).locator("[draggable=true]").dragTo(rows.nth(0));
      await expect(rows.first()).toContainText("Supino reto");
      await rows.nth(1).locator("[draggable=true]").dragTo(rows.nth(0));
      await expect(rows.first()).toContainText("Remada baixa");
    }
    await treinoA.getByRole("button", { name: "Remover Supino reto com barra" }).click();
    await expect(treinoA.getByText("Supino reto com barra")).toHaveCount(0);
    await page.getByRole("status").getByRole("button", { name: "Desfazer" }).click();
    await expect(treinoA.getByText("Supino reto com barra")).toBeVisible();

    // Trocar exercício sugere alternativas (RF-024).
    await treinoA.getByRole("button", { name: "Editar Supino reto com barra" }).click();
    await page
      .getByRole("dialog", { name: "Prescrição" })
      .getByRole("button", { name: "Trocar" })
      .click();
    const picker = page.getByRole("dialog", { name: "Escolher exercício" });
    await expect(picker.getByRole("list", { name: "Alternativas sugeridas" })).toBeVisible();
    await picker.getByRole("button", { name: "Fechar" }).click();

    // Treino B vazio → pendência com atalho; depois removido.
    await page.getByRole("button", { name: "Adicionar treino" }).click();
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Treino B não tem exercícios." })).toBeVisible();
    if (browserName === "chromium") await expectAccessible(page);
    await page.getByRole("button", { name: "Remover Treino B" }).click();

    // Salvamento automático e persistência (CA-020).
    await expect(page.getByText(/^Salvo às \d{2}:\d{2}/)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("list", { name: "Treino A" }).getByRole("listitem")).toHaveCount(2);

    // Publicar com confirmação (CA-025).
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "Publicar o programa?" });
    await confirm.getByRole("button", { name: "Publicar" }).click();
    await expect(page).toHaveURL(/\/gestao\/programa$/);
    await expect(page.getByText(/Versão 1 · publicada em/)).toBeVisible();

    // Editar programa cria cópia; descartar mantém a ativa (CA-027, CA-028).
    await page.getByRole("button", { name: "Editar programa" }).click();
    await expect(page.getByRole("list", { name: "Treino A" }).getByRole("listitem")).toHaveCount(2);
    await page.getByRole("button", { name: "Descartar rascunho" }).click();
    await page
      .getByRole("dialog", { name: "Descartar o rascunho?" })
      .getByRole("button", { name: "Descartar" })
      .click();
    await expect(page).toHaveURL(/\/gestao\/programa$/);
    await expect(page.getByText(/Versão 1 · publicada em/)).toBeVisible();
    const versions = await sql<{ status: string }[]>`
      select status from public.program_versions
      where student_id = (select id from public.students where user_id = (${userId}))`;
    expect(versions.map((v) => v.status)).toEqual(["active"]);

    // Perfil: mudança de disponibilidade com programa ativo marca revisão (CA-012).
    await page.goto("/gestao/perfil");
    await page.getByRole("button", { name: "Editar disponibilidade" }).click();
    const sheet = page.getByRole("dialog", { name: "Disponibilidade" });
    await sheet.getByLabel("Dias de treino por semana").fill("3");
    await sheet.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(/3 dias\/semana/)).toBeVisible();
    if (browserName === "chromium") await expectAccessible(page);
    const [profile] = await sql<{ review: boolean }[]>`
      select review_recommended_since is not null as review from public.training_profiles
      where student_id = (select id from public.students where user_id = (${userId}))`;
    expect(profile?.review).toBe(true);

    // Avaliação com peso de origem "avaliação" (CA-016).
    await page.getByRole("button", { name: "Registrar avaliação" }).click();
    await page.getByLabel("Peso (kg)").fill("79,5");
    await page.getByRole("button", { name: "Salvar avaliação" }).click();
    await expect(page).toHaveURL(/\/gestao\/perfil$/);
    await expect(page.getByText(/Última: .* · 79,5 kg/)).toBeVisible();
    const [weight] = await sql<{ source: string; snapshot: boolean }[]>`
      select w.source, a.profile_snapshot ? 'goal' as snapshot
      from public.assessments a join public.weight_entries w on w.assessment_id = a.id
      where a.student_id = (select id from public.students where user_id = (${userId}))`;
    expect(weight).toEqual({ source: "assessment", snapshot: true });
  } finally {
    await sql.end();
  }
});
