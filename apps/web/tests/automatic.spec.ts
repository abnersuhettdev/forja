// Modos Automático e Manual e Meu plano (TAR V12-04; CA-406, RF-113, RF-114, RN-009, ADR-095). A
// função de IA fica fora nestes testes: a rotina sai das regras, sem gastar a cota do provedor.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { automaticUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });

test("Automático sem Gestão, proposta com um toque, gerar outro treino e troca de modo", async ({
  page,
  browserName,
}) => {
  test.setTimeout(150_000);
  const user = automaticUser(browserName);
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  const student = sql`select id from public.students
    where user_id = (select id from auth.users where email = ${user.email})`;
  try {
    await sql`delete from public.programs where student_id = (${student})`;
    await sql`
      update public.training_profiles set
        app_mode = 'automatic', goal = 'hypertrophy', experience_level = 'intermediate',
        days_per_week = 4, minutes_per_session = 60, training_location = 'full_gym',
        equipment_codes = array['barbell','dumbbell','machine','cable','bench','pullup_bar','bodyweight'],
        restrictions_declared = 'none', restriction_codes = null, emphasis_groups = null
      where student_id = (${student})`;
    await page.route("**/functions/v1/ai/routine", (route) => route.abort());

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha", { exact: true }).fill(user.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/hoje$/);

    // CA-406: sem Gestão à vista; Hoje leva ao plano.
    await expect(page.getByRole("link", { name: "Gestão" })).toHaveCount(0);
    await page.goto("/gestao/programa");
    await expect(page).toHaveURL(/\/plano$/);
    await expect(page.getByRole("link", { name: "Meu plano" }).first()).toBeVisible();

    // Sem rotina: gerar cria só a proposta (RN-009).
    await page.getByRole("button", { name: "Gerar minha rotina" }).click();
    await expect(page.getByRole("heading", { name: "Rotina proposta" })).toBeVisible();
    await expect(page.getByText(/sugestão de organização para uso próprio/)).toBeVisible();
    await expect(page.getByText(/montada só com as regras do app/)).toBeVisible();
    const statusOf = () => sql<{ status: string }[]>`
      select status from public.program_versions where student_id = (${student})`;
    expect(await statusOf()).toEqual([{ status: "draft" }]);

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

    // RF-119: outro treino só no A.
    const listA = page.getByRole("list", { name: "A — Superior" });
    const listB = page.getByRole("list", { name: "B — Inferior" });
    const firstA = await listA.getByRole("listitem").allInnerTexts();
    const firstB = await listB.getByRole("listitem").allInnerTexts();
    await page.getByRole("button", { name: "Gerar outro A — Superior" }).click();
    await expect(page.getByText(/mesmo movimento, com os mesmos músculos/)).toBeVisible();
    await expect.poll(() => listA.getByRole("listitem").allInnerTexts()).not.toEqual(firstA);
    expect(await listB.getByRole("listitem").allInnerTexts()).toEqual(firstB);

    // Só o toque publica; a pessoa vai para Hoje com a rotina.
    await page.getByRole("button", { name: "Usar esta rotina" }).click();
    await expect(page).toHaveURL(/\/hoje$/);
    expect(await statusOf()).toEqual([{ status: "active" }]);
    await page.goto("/plano");
    await expect(page.getByRole("heading", { name: "Sua rotina atual" })).toBeVisible();

    // Gerar outra não troca a atual até o novo toque.
    await page.getByRole("button", { name: "Gerar outra" }).click();
    await expect(page.getByRole("heading", { name: "Rotina proposta" })).toBeVisible();
    await expect(page.getByText(/continua valendo até/)).toBeVisible();
    const both = (await statusOf()).map((row) => row.status).sort();
    expect(both).toEqual(["active", "draft"]);
    await page.getByRole("button", { name: "Descartar proposta" }).click();
    await expect(page.getByRole("heading", { name: "Rotina proposta" })).toHaveCount(0);

    // Meus dados continua acessível, com a navegação de Meu treino.
    await page.getByRole("link", { name: "Meus dados" }).click();
    await expect(page).toHaveURL(/\/gestao\/perfil$/);
    await expect(page.getByRole("link", { name: "Meu plano" }).first()).toBeVisible();

    // Manual, opção discreta em Conta: volta a Gestão como hoje.
    await page.goto("/conta");
    await page.getByRole("radio", { name: "Manual" }).click();
    await expect(page.getByRole("link", { name: "Gestão" })).toBeVisible();
    await page.goto("/plano");
    await expect(page).toHaveURL(/\/gestao\/programa$/);
    await page.goto("/conta");
    await page.getByRole("radio", { name: "Automático" }).click();
    await expect(page.getByRole("link", { name: "Gestão" })).toHaveCount(0);
  } finally {
    await sql.end();
  }
});
