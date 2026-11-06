// Resumo da semana (V12-09; RF-115..117, CA-407, RN-009): cartão em Hoje, fatos pelas regras e
// proposta de rotina com menos dias depois de 2 semanas abaixo da meta. A função de IA fica fora:
// a tela mostra os fatos do aparelho e a rotina sai do motor, sem gastar a cota do provedor.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { addDays, toLocalDate, weekBounds } from "../../../packages/domain/src/index.ts";
import { localStatus } from "../../../scripts/db/local.ts";
import { summaryUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });

const TZ = "America/Sao_Paulo";

test("cartão em Hoje, resumo só com fatos e proposta de 2 dias aceita com um toque", async ({
  page,
  browserName,
}) => {
  test.setTimeout(150_000);
  const user = summaryUser(browserName);
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${user.email}`;
    if (!student) throw new Error("aluno fictício ausente");
    const id = student.id;
    await sql`delete from public.weekly_summaries where student_id = ${id}`;
    await sql`delete from public.sessions where student_id = ${id}`;
    await sql`delete from public.programs where student_id = ${id}`;
    await sql`
      update public.training_profiles set
        app_mode = 'automatic', goal = 'hypertrophy', experience_level = 'intermediate',
        days_per_week = 4, minutes_per_session = 60, training_location = 'full_gym',
        equipment_codes = array['barbell','dumbbell','machine','cable','bench','pullup_bar','bodyweight'],
        restrictions_declared = 'none', restriction_codes = null, emphasis_groups = null,
        review_recommended_since = null
      where student_id = ${id}`;

    // Rotina em uso há 30 dias (a versão publicada é imutável: só o teste muda a data).
    const [bench] = await sql<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    const [programId, versionId, workoutId, itemId] = [
      crypto.randomUUID(),
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
      values (${itemId}, ${workoutId}, 1, ${bench?.id ?? ""}, 'reps', 3, 8, 12, 60)`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role = replica`;
      await tx`
        update public.program_versions set published_at = now() - interval '30 days'
        where id = ${versionId}`;
    });

    // Semana do resumo com 2 treinos; a anterior, com 1: abaixo da meta de 4 nas duas.
    const today = toLocalDate(new Date(), TZ);
    const lastWeek = addDays(weekBounds(today).start, -7);
    for (const day of [addDays(lastWeek, -7), lastWeek, addDays(lastWeek, 2)]) {
      const sessionId = crypto.randomUUID();
      const start = `${day}T13:00:00Z`;
      const end = `${day}T13:50:00Z`;
      await sql`
        insert into public.sessions
          (id, student_id, program_version_id, workout_id, status, started_at, ended_at,
           duration_min, last_activity_at, device_id)
        values (${sessionId}, ${id}, ${versionId}, ${workoutId}, 'completed', ${start}, ${end}, 50,
                ${end}, ${crypto.randomUUID()})`;
      const entryId = crypto.randomUUID();
      await sql`
        insert into public.session_exercises (id, session_id, workout_item_id, exercise_id, position, status)
        values (${entryId}, ${sessionId}, ${itemId}, ${bench?.id ?? ""}, 1, 'done')`;
      await sql`
        insert into public.set_logs (id, session_exercise_id, set_number, load_kg, reps, completed_at)
        values (${crypto.randomUUID()}, ${entryId}, 1, 40, 10, ${end})`;
    }
    await page.route("**/functions/v1/ai/**", (route) => route.abort());

    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha", { exact: true }).fill(user.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/hoje$/);

    // Cartão em Hoje enquanto o resumo não foi aberto.
    const card = page.getByRole("link", { name: /Resumo da semana passada/ });
    await expect(card).toContainText("2 de 4 treinos");
    await card.click();
    await expect(page).toHaveURL(/\/resumo$/);

    // Fatos pelas regras; sem texto da IA, a tela diz isso e mostra os números (RN-062).
    await expect(page.getByRole("heading", { name: "Rotina de 2 dias" })).toBeVisible();
    await expect(page.getByText(/foram 1 e 2 treinos, abaixo da meta de 4/)).toBeVisible();
    await expect(page.getByText("O texto não ficou pronto agora.", { exact: false })).toBeVisible();
    const numbers = page.getByRole("region", { name: "Os números" });
    await expect(numbers).toContainText("Séries registradas");
    await expect(numbers).toContainText("recomeça na próxima");
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

    // Aberto, o cartão sai de Hoje; o resumo segue em Meu plano.
    await page.getByRole("link", { name: "Hoje" }).filter({ visible: true }).click();
    await expect(
      page.getByRole("button", { name: /Iniciar treino|Treinar mesmo assim/ }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Resumo da semana passada/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Meu plano" }).filter({ visible: true }).click();
    await page.getByRole("link", { name: "Resumo da semana" }).click();

    // RF-116: a proposta só vira rascunho; publicar é o toque da pessoa (RN-009).
    await page.getByRole("button", { name: "Ver proposta" }).click();
    await expect(page).toHaveURL(/\/plano$/);
    await expect(page.getByRole("heading", { name: "Rotina proposta" })).toBeVisible();
    const versions = () => sql<{ status: string; days: number | null }[]>`
      select status, (generator_report -> 'inputs' ->> 'days_per_week')::int as days
      from public.program_versions where student_id = ${id} order by status`;
    expect(await versions()).toEqual([
      { status: "active", days: null },
      { status: "draft", days: 2 },
    ]);
    await page.getByRole("button", { name: "Usar esta rotina" }).click();
    await expect(page).toHaveURL(/\/hoje$/);
    const [profile] = await sql<{ days: number; review: Date | null }[]>`
      select days_per_week as days, review_recommended_since as review
      from public.training_profiles where student_id = ${id}`;
    expect(profile).toEqual({ days: 2, review: null });
  } finally {
    await sql.end();
  }
});
