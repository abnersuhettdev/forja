// Gerar treino (TAR-032; CA-021, CA-022, CA-023, CA-035, CA-405; RN-009): pendências, rascunho com
// premissas e exclusões, e nada publicado sem a ação da pessoa. Usa um usuário fictício exclusivo.
import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { generatorUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });
// Os três testes usam o mesmo usuário fictício e apagam o programa dele.
test.describe.configure({ mode: "serial" });

/**
 * Cota do dia cheia para o usuário destes testes: a função devolve o motor sem chamar o provedor de
 * IA, e nenhuma rodada gasta cota real (decisão de 2026-11-06). O trecho da IA é simulado onde o
 * teste precisa dele.
 */
async function withFullQuota(email: string, fill: boolean): Promise<void> {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    const [owner] = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`;
    const subject = createHash("sha256")
      .update(owner?.id ?? "")
      .digest("hex");
    await sql`delete from public.ai_usage where subject_hash = ${subject}`;
    if (fill) {
      await sql`
        insert into public.ai_usage (subject_hash, kind, model, outcome, neurons)
        select ${subject}, 'routine', 'teste', 'ok', 0 from generate_series(1, 10)`;
    }
  } finally {
    await sql.end();
  }
}

test.beforeEach(async ({ browserName }) => {
  await withFullQuota(generatorUser(browserName).email, true);
});

test.afterEach(async ({ browserName }) => {
  await withFullQuota(generatorUser(browserName).email, false);
});

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

    // RN-062: com ou sem IA, a origem da rotina fica registrada.
    const [aiRow] = await sql<{ source: string | null }[]>`
      select generator_report -> 'ai' ->> 'source' as source
      from public.program_versions where student_id = (${student})`;
    expect(["motor", "motor+ia"]).toContain(aiRow?.source);

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

test("função de IA fora do ar: a rotina sai só das regras, avisando (CA-403, RN-062)", async ({
  page,
  browserName,
}) => {
  test.setTimeout(90_000);
  const user = generatorUser(browserName);
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  const student = sql`select id from public.students
    where user_id = (select id from auth.users where email = ${user.email})`;
  try {
    await sql`delete from public.programs where student_id = (${student})`;
    await sql`
      update public.training_profiles set
        goal = 'hypertrophy', experience_level = 'intermediate', days_per_week = 4,
        minutes_per_session = 60, training_location = 'full_gym',
        equipment_codes = array['barbell','dumbbell','machine','cable','bench','pullup_bar','bodyweight'],
        restrictions_declared = 'none', restriction_codes = null, emphasis_groups = null
      where student_id = (${student})`;
    await page.route("**/functions/v1/ai/routine", (route) => route.abort());
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha", { exact: true }).fill(user.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/hoje$/);
    await page.goto("/gestao/programa/gerar");
    await page.getByRole("button", { name: "Gerar rotina" }).click();
    await expect(page).toHaveURL(/\/gestao\/programa\/rascunho$/);
    await expect(page.getByText(/montada só com as regras do app/)).toBeVisible();
    await expect(page.getByRole("list", { name: "A — Superior" })).toBeVisible();
  } finally {
    await sql.end();
  }
});

test("rotina com IA mostra resumo, motivos, trocas e o aviso (CA-401, RF-111)", async ({
  page,
  browserName,
}) => {
  test.setTimeout(90_000);
  const user = generatorUser(browserName);
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  const student = sql`select id from public.students
    where user_id = (select id from auth.users where email = ${user.email})`;
  try {
    await sql`delete from public.programs where student_id = (${student})`;
    // Resposta da função com o trecho da IA simulado (a cota cheia evita o provedor).
    await page.route("**/functions/v1/ai/routine", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { report: Record<string, unknown> };
      body.report.ai = {
        source: "motor+ia",
        model: "modelo-ficticio",
        fallback: null,
        summary: "Com 4 dias por semana, a rotina divide superior e inferior.",
        reasons: ["O objetivo é hipertrofia."],
        swaps: [
          {
            workout: "A — Superior",
            from: "Exercício X",
            to: "Exercício Y",
            reason: "Varia o treino.",
          },
        ],
      };
      await route.fulfill({ response, json: body });
    });
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha", { exact: true }).fill(user.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/hoje$/);
    await page.goto("/gestao/programa/gerar");
    await page.getByRole("button", { name: "Gerar rotina" }).click();
    await expect(page).toHaveURL(/\/gestao\/programa\/rascunho$/);
    await expect(
      page.getByText("Com 4 dias por semana, a rotina divide superior e inferior."),
    ).toBeVisible();
    await expect(page.getByText("O objetivo é hipertrofia.")).toBeVisible();
    await expect(page.getByText(/Exercício X → Exercício Y/)).toBeVisible();
    await expect(page.getByText(/Texto escrito por IA/)).toBeVisible();
  } finally {
    await sql.end();
  }
});
