// Gerar treino (TAR-032; CA-021, CA-022, CA-023, CA-035, CA-405; RN-009): pendências, rascunho com
// premissas e exclusões, e nada publicado sem a ação da pessoa. Usa um usuário fictício exclusivo.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { generatorUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });

test("pendências, geração com restrição e ênfase, e nada publicado sozinho", async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000);
  const user = generatorUser(browserName);
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  const student = sql`select id from public.students
    where user_id = (select id from auth.users where email = ${user.email})`;
  try {
    await sql`delete from public.programs where student_id = (${student})`;
    await sql`
      update public.training_profiles set
        goal = 'hypertrophy', experience_level = 'intermediate', days_per_week = null,
        minutes_per_session = 60, training_location = 'full_gym',
        equipment_codes = array['barbell','dumbbell','machine','cable','bench','pullup_bar','bodyweight'],
        restrictions_declared = 'listed', restriction_codes = array['knee'],
        emphasis_groups = array['glutes']
      where student_id = (${student})`;

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha", { exact: true }).fill(user.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/hoje$/);

    await page.goto("/gestao/programa");
    await page.getByRole("button", { name: "Gerar treino automaticamente" }).click();
    await expect(page).toHaveURL(/\/gestao\/programa\/gerar$/);

    // CA-022: sem dias por semana, não gera e aponta o perfil.
    const generate = page.getByRole("button", { name: "Gerar rotina" });
    await expect(page.getByText("Informe quantos dias por semana pode treinar")).toBeVisible();
    await expect(generate).toBeDisabled();
    await expect(page.getByRole("button", { name: "Completar perfil" })).toBeVisible();
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

    await sql`update public.training_profiles set days_per_week = 4 where student_id = (${student})`;
    await page.reload();
    await expect(page.getByText("Ênfase pedida: Glúteos")).toBeVisible();
    await generate.click();

    // CA-021, CA-023: rascunho no editor, com premissas, exclusões e aviso.
    await expect(page).toHaveURL(/\/gestao\/programa\/rascunho$/);
    await expect(page.getByRole("list", { name: "A — Superior" })).toBeVisible();
    await page.getByText("Como esta rotina foi montada").click();
    await expect(page.getByText(/Hipertrofia · Intermediário · 4 dias/)).toBeVisible();
    await expect(
      page.getByRole("listitem").filter({ hasText: /Cadeira extensora: .*Joelho/ }),
    ).toBeVisible();
    await expect(page.getByText(/sugestão de organização para uso próprio/)).toBeVisible();

    // RN-009: nada publicado; origem e relatório gravados; contraindicação de fora (CA-035).
    const [version] = await sql<{ status: string; origin: string; has_report: boolean }[]>`
      select status, origin, generator_report is not null as has_report
      from public.program_versions where student_id = (${student})`;
    expect(version).toEqual({ status: "draft", origin: "generated", has_report: true });
    const used = await sql<{ name: string }[]>`
      select e.name from public.workout_items i
      join public.workouts w on w.id = i.workout_id
      join public.program_versions v on v.id = w.program_version_id
      join public.exercises e on e.id = i.exercise_id
      where v.student_id = (${student})`;
    expect(used.length).toBeGreaterThan(0);
    expect(used.map((row) => row.name)).not.toContain("Cadeira extensora");

    // RF-119, CA-410: outro treino A com os mesmos grupos, sem tocar no B; dá para desfazer.
    const listA = page.getByRole("list", { name: "A — Superior" });
    const listB = page.getByRole("list", { name: "B — Inferior" });
    const firstA = await listA.getByRole("listitem").allInnerTexts();
    const firstB = await listB.getByRole("listitem").allInnerTexts();
    await page.getByRole("button", { name: "Gerar outro A — Superior" }).click();
    await expect(page.getByText(/mesmo movimento, com os mesmos músculos/)).toBeVisible();
    await expect(page.getByText(/→/).first()).toBeVisible();
    expect(await listA.getByRole("listitem").allInnerTexts()).not.toEqual(firstA);
    expect(await listB.getByRole("listitem").allInnerTexts()).toEqual(firstB);
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect.poll(() => listA.getByRole("listitem").allInnerTexts()).toEqual(firstA);

    // O rascunho é editável e publicável pelo caminho de sempre.
    await page.getByRole("button", { name: "Publicar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publicar" }).click();
    await expect(page).toHaveURL(/\/gestao\/programa$/);
    await expect(page.getByText(/Versão 1 · publicada/)).toBeVisible();
  } finally {
    await sql.end();
  }
});
