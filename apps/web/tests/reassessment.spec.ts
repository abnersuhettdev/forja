// Reavaliação (TAR-030 na versão 1.2, V12-09): lembrete em Hoje, adiamento por data e assistente
// de 4 etapas (CA-083, CA-084, CA-085; RN-014, RN-015, RN-025).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { addDays, toLocalDate } from "../../../packages/domain/src/index.ts";
import { localStatus } from "../../../scripts/db/local.ts";
import { reassessmentUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });

const TZ = "America/Sao_Paulo";

/** Programa publicado, avaliação de 31 dias atrás e um peso recente; sem adiamentos. */
async function setUp(sql: postgres.Sql, email: string): Promise<string> {
  const [student] = await sql<{ id: string }[]>`
    select s.id from public.students s join auth.users u on u.id = s.user_id
    where u.email = ${email}`;
  if (!student) throw new Error("aluno fictício ausente");
  const id = student.id;
  const today = toLocalDate(new Date(), TZ);
  await sql`delete from public.reassessment_postponements where student_id = ${id}`;
  await sql`delete from public.weight_entries where student_id = ${id}`;
  await sql`delete from public.assessments where student_id = ${id}`;
  await sql`delete from public.programs where student_id = ${id}`;
  await sql`
    update public.training_profiles set
      goal = 'hypertrophy', goal_weight_kg = 78, experience_level = 'intermediate',
      days_per_week = 4, minutes_per_session = 60, preferred_weekdays = '{1,3,5,6}',
      training_location = 'full_gym', equipment_codes = array['barbell','dumbbell','bench'],
      restrictions_declared = 'none', restriction_codes = null, reassessment_snooze_until = null
    where student_id = ${id}`;
  const [bench] = await sql<{ id: string }[]>`
    select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
  const [programId, versionId, workoutId] = [
    crypto.randomUUID(),
    crypto.randomUUID(),
    crypto.randomUUID(),
  ];
  await sql`insert into public.programs (id, student_id) values (${programId}, ${id})`;
  await sql`
    insert into public.program_versions (id, program_id, student_id, name)
    values (${versionId}, ${programId}, ${id}, 'Programa fictício')`;
  await sql`
    insert into public.workouts (id, program_version_id, position, name)
    values (${workoutId}, ${versionId}, 1, 'Treino A')`;
  await sql`
    insert into public.workout_items
      (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
    values (${crypto.randomUUID()}, ${workoutId}, 1, ${bench?.id ?? ""}, 'reps', 3, 8, 12, 60)`;
  await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
  const assessment = crypto.randomUUID();
  await sql`
    insert into public.assessments (id, student_id, assessed_on, kind, weight_kg, profile_snapshot)
    values (${assessment}, ${id}, ${addDays(today, -31)}, 'initial', 84, '{}'::jsonb)`;
  await sql`
    insert into public.weight_entries (id, student_id, measured_on, weight_kg, source, assessment_id)
    values (${crypto.randomUUID()}, ${id}, ${addDays(today, -31)}, 84, 'assessment', ${assessment})`;
  await sql`
    insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
    values (${crypto.randomUUID()}, ${id}, ${addDays(today, -2)}, 83, 'manual')`;
  return id;
}

async function signIn(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}

test("lembrete, adiamento por data e reavaliação em 4 etapas (CA-083..085)", async ({
  page,
  browserName,
}) => {
  test.setTimeout(120_000);
  const user = reassessmentUser(browserName);
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    const studentId = await setUp(sql, user.email);
    const today = toLocalDate(new Date(), TZ);
    await signIn(page, user.email, user.senha);

    // CA-083: 31 dias depois da última avaliação, o lembrete aparece sem bloquear nada.
    const notice = page.getByRole("region", { name: "Hora da reavaliação" });
    await expect(notice).toContainText("Faz 31 dias desde a última");
    await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();

    // CA-085: adiar para a data sugerida (7 dias) esconde o lembrete e registra o adiamento.
    await notice.getByRole("button", { name: "Lembrar depois" }).click();
    const sheet = page.getByRole("dialog", { name: "Lembrar da reavaliação em…" });
    await expect(sheet.getByLabel("Data")).toHaveValue(addDays(today, 7));
    await sheet.getByRole("button", { name: "Lembrar nessa data" }).click();
    await expect(page.getByText(/Vamos lembrar em/)).toBeVisible();
    await expect(notice).toHaveCount(0);
    await expect
      .poll(
        async () =>
          sql`select reassessment_snooze_until::text as snooze,
                     (select count(*)::int from public.reassessment_postponements
                      where student_id = ${studentId}) as postponements
              from public.training_profiles where student_id = ${studentId}`,
        { timeout: 30_000 },
      )
      .toEqual([{ snooze: addDays(today, 7), postponements: 1 }]);

    // CA-084: as 4 etapas; só a etapa alterada muda o perfil, e a avaliação reinicia o prazo.
    await page.goto("/reavaliacao");
    await expect(page.getByRole("heading", { name: "Seu peso hoje" })).toBeVisible();
    await expect(page.getByText("Etapa 1 de 4")).toBeVisible();
    const weight = page.getByLabel("Peso (kg)");
    await expect(weight).toHaveValue("83");
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
    await weight.fill("82,5");
    await page.getByRole("button", { name: "Próximo" }).click();
    await expect(page.getByRole("heading", { name: "Objetivo e meta de peso" })).toBeVisible();
    await page.getByRole("button", { name: "Continua igual" }).click();
    await expect(page.getByRole("heading", { name: "Seus dias e seu tempo" })).toBeVisible();
    await page.getByLabel("Dias de treino por semana").fill("3");
    await page.getByRole("button", { name: "Próximo" }).click();
    await expect(page.getByRole("heading", { name: "Onde treina e restrições" })).toBeVisible();
    await page.getByRole("button", { name: "Continua igual" }).click();

    await expect(page).toHaveURL(/\/hoje$/);
    await expect(page.getByText(/Reavaliação registrada/)).toBeVisible();
    await expect(page.getByRole("region", { name: "Hora da reavaliação" })).toHaveCount(0);
    const [row] = await sql<
      { periodic: number; weight: number; days: number; goal: string; snooze: string | null }[]
    >`
      select (select count(*)::int from public.assessments
              where student_id = ${studentId} and kind = 'periodic') as periodic,
             (select weight_kg::float8 from public.assessments
              where student_id = ${studentId} and kind = 'periodic') as weight,
             p.days_per_week as days, p.goal, p.reassessment_snooze_until::text as snooze
      from public.training_profiles p where p.student_id = ${studentId}`;
    expect(row).toEqual({ periodic: 1, weight: 82.5, days: 3, goal: "hypertrophy", snooze: null });
  } finally {
    await sql.end();
  }
});
