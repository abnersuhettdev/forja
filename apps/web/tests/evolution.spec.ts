// Peso e evolução (TAR-023): registro (online e offline), exclusão com confirmação, peso de
// avaliação protegido, gráfico com inicial e meta e a alternativa em lista (CA-080, CA-081).
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { addDays, toLocalDate } from "../../../packages/domain/src/index.ts";
import { localStatus } from "../../../scripts/db/local.ts";
import { evolutionUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 360, height: 740 } });
test.describe.configure({ mode: "serial", timeout: 120_000 });

const TZ = "America/Sao_Paulo";
const short = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

async function withDb<T>(run: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

/** Avaliação inicial de 85 kg há 100 dias, meta 78 kg e pesos manuais há 50, 40 e 3 dias. */
async function setUp(email: string): Promise<{ studentId: string; today: string }> {
  return withDb(async (sql) => {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    const studentId = student.id;
    const today = toLocalDate(new Date(), TZ);
    await sql`delete from public.weight_entries where student_id = ${studentId}`;
    await sql`delete from public.assessments where student_id = ${studentId}`;
    await sql`update public.training_profiles set goal_weight_kg = 78 where student_id = ${studentId}`;
    // Programa mínimo: Hoje mostra a linha de peso só com programa publicado (TELA-010).
    await sql`delete from public.sessions where student_id = ${studentId}`;
    await sql`delete from public.programs where student_id = ${studentId}`;
    const [bench] = await sql<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    const [programId, versionId, workoutId] = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ];
    await sql`insert into public.programs (id, student_id) values (${programId}, ${studentId})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${studentId}, 'Programa de evolução fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
      values (${crypto.randomUUID()}, ${workoutId}, 1, ${bench?.id ?? ""}, 'reps', 3, 8, 12, 90)`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    const assessment = crypto.randomUUID();
    await sql`
      insert into public.assessments (id, student_id, assessed_on, kind, weight_kg, profile_snapshot)
      values (${assessment}, ${studentId}, ${addDays(today, -100)}, 'initial', 85, '{}'::jsonb)`;
    await sql`
      insert into public.weight_entries (id, student_id, measured_on, weight_kg, source, assessment_id)
      values (${crypto.randomUUID()}, ${studentId}, ${addDays(today, -100)}, 85, 'assessment', ${assessment})`;
    for (const [days, kg] of [
      [50, 84.2],
      [40, 83.6],
      [3, 82.4],
    ] as const) {
      await sql`
        insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
        values (${crypto.randomUUID()}, ${studentId}, ${addDays(today, -days)}, ${kg}, 'manual')`;
    }
    return { studentId, today };
  });
}

const weightsOf = (studentId: string) =>
  withDb(
    (sql) =>
      sql<{ day: string; kg: number }[]>`
        select measured_on::text as day, weight_kg::float8 as kg from public.weight_entries
        where student_id = ${studentId} and deleted_at is null order by measured_on`,
  );

async function signIn(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}

test("evolução: peso atual, variação, gráfico com inicial e meta, lista e períodos (CA-081)", async ({
  page,
  browserName,
}) => {
  const user = evolutionUser(browserName);
  const { today } = await setUp(user.email);
  await signIn(page, user.email, user.senha);
  await page.getByRole("link", { name: "Evolução" }).first().click();

  const summary = page.getByRole("region", { name: "Peso atual" });
  await expect(summary).toContainText("82,4 kg");
  await expect(summary).toContainText(`−2,6 kg desde ${short(addDays(today, -100))}`);

  // Padrão 90 dias: três registros manuais; inicial e meta como linhas de referência.
  const chart = page.getByRole("img", { name: /Gráfico de peso com 3 registros/ });
  await expect(chart).toBeVisible();
  await expect(chart).toContainText("Inicial 85 kg");
  await expect(chart).toContainText("Meta 78 kg");

  // Alternativa em lista.
  await page.getByRole("button", { name: "Ver como lista" }).click();
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(4);
  await expect(table).toContainText(short(addDays(today, -40)));
  await page.getByRole("button", { name: "Ver gráfico" }).click();

  // 30 dias: um só registro → mensagem no lugar do gráfico; Tudo inclui a avaliação.
  await page.getByRole("radio", { name: "30 dias" }).check();
  await expect(page.getByText("Registre seu peso mais vezes para ver a evolução.")).toBeVisible();
  await page.getByRole("radio", { name: "Tudo" }).check();
  await expect(page.getByRole("img", { name: /Gráfico de peso com 4 registros/ })).toBeVisible();
});

test("registrar (online e offline) e excluir com confirmação; avaliação não se exclui (CA-080)", async ({
  page,
  context,
  browserName,
}) => {
  const user = evolutionUser(browserName);
  const { studentId, today } = await setUp(user.email);
  await signIn(page, user.email, user.senha);

  // Registrar pelo Hoje (TELA-010 → TELA-022), com validação de faixa.
  await page.getByRole("button", { name: "Registrar peso" }).click();
  const sheet = page.getByRole("dialog", { name: "Registrar peso" });
  await expect(sheet.getByLabel("Data")).toHaveValue(today);
  await sheet.getByLabel("Peso (kg)").fill("300,5");
  await sheet.getByRole("button", { name: "Salvar" }).click();
  await expect(sheet).toContainText("Informe um peso de 30 a 300 kg");
  await sheet.getByLabel("Peso (kg)").fill("81,9");
  await sheet.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Peso registrado.")).toBeVisible();
  await expect(page.getByText(/81,9 kg · hoje/)).toBeVisible();
  await expect
    .poll(async () => (await weightsOf(studentId)).at(-1))
    .toEqual({ day: today, kg: 81.9 });

  // Offline: fica no aparelho e vai ao reconectar.
  await page.getByRole("link", { name: "Evolução" }).first().click();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Registrar peso" }).click();
  await sheet.getByLabel("Data").fill(addDays(today, -1));
  await sheet.getByLabel("Peso (kg)").fill("82");
  await sheet.getByRole("button", { name: "Salvar" }).click();
  await expect(
    page.getByText("Salvo neste aparelho. Será enviado quando houver conexão."),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: `${short(addDays(today, -1))} · 82 kg` }),
  ).toContainText("aguardando envio");
  await context.setOffline(false);
  await expect
    .poll(async () => (await weightsOf(studentId)).map((w) => w.kg))
    .toEqual([85, 84.2, 83.6, 82.4, 82, 81.9]);

  // Avaliação não tem Excluir; manual exclui com confirmação nomeando data e valor.
  const assessment = page
    .getByRole("listitem")
    .filter({ hasText: `${short(addDays(today, -100))} · 85 kg` });
  await expect(assessment).toContainText("avaliação");
  await expect(assessment.getByRole("button")).toHaveCount(0);
  await page
    .getByRole("button", { name: `Excluir o peso de ${short(addDays(today, -40))} (83,6 kg)` })
    .click();
  const dialog = page.getByRole("dialog", { name: "Excluir este registro de peso?" });
  await expect(dialog).toContainText(`O registro de ${short(addDays(today, -40))} (83,6 kg)`);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText(`${short(addDays(today, -40))} · 83,6 kg`)).toBeVisible();
  await page
    .getByRole("button", { name: `Excluir o peso de ${short(addDays(today, -40))} (83,6 kg)` })
    .click();
  await dialog.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Registro de peso excluído.")).toBeVisible();
  await expect(page.getByText(`${short(addDays(today, -40))} · 83,6 kg`)).toHaveCount(0);
  await expect
    .poll(async () => (await weightsOf(studentId)).map((w) => w.kg))
    .toEqual([85, 84.2, 82.4, 82, 81.9]);
});
