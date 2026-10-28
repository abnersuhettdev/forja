// Agenda e histórico (TAR-022; JOR-04): mês com estados, dia com detalhes, edição e exclusão na
// janela de 60 dias e somente leitura fora dela (CA-069..072, CA-304).
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { addDays, toLocalDate } from "../../../packages/domain/src/index.ts";
import { localStatus } from "../../../scripts/db/local.ts";
import { agendaUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 360, height: 740 } });
test.describe.configure({ mode: "serial", timeout: 120_000 });

const TZ = "America/Sao_Paulo";
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

async function withDb<T>(run: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

interface Fixture {
  studentId: string;
  recent: string;
  recentDay: string;
  oldDay: string;
  sets: string[];
}

/** Programa publicado, todos os dias preferidos e duas sessões no servidor (3 e 100 dias). */
async function setUp(email: string): Promise<Fixture> {
  return withDb(async (sql) => {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    const studentId = student.id;
    await sql.begin(async (tx) => {
      // Sessões antigas ficam fora da janela de edição: limpeza só no banco de teste.
      await tx`set local session_replication_role = replica`;
      await tx`delete from public.set_logs where session_exercise_id in (
        select se.id from public.session_exercises se join public.sessions s on s.id = se.session_id
        where s.student_id = ${studentId})`;
      await tx`delete from public.session_exercises where session_id in (
        select id from public.sessions where student_id = ${studentId})`;
      await tx`delete from public.sessions where student_id = ${studentId}`;
    });
    await sql`delete from public.programs where student_id = ${studentId}`;
    await sql`
      update public.training_profiles set preferred_weekdays = '{1,2,3,4,5,6,7}', days_per_week = 3
      where student_id = ${studentId}`;
    const [bench] = await sql<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    const [programId, versionId, workoutId, itemId] = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ];
    await sql`insert into public.programs (id, student_id) values (${programId}, ${studentId})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${studentId}, 'Programa de agenda fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s,
         suggested_load_kg)
      values (${itemId}, ${workoutId}, 1, ${bench?.id ?? ""}, 'reps', 2, 8, 12, 0, 40)`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;

    const session = async (daysAgo: number, rpe: number | null, notes: string | null) => {
      const id = crypto.randomUUID();
      const se = crypto.randomUUID();
      const start = new Date(Date.now() - daysAgo * 86_400_000);
      start.setUTCHours(13, 0, 0, 0); // 10 h em São Paulo
      const end = new Date(start.getTime() + 50 * 60_000);
      await sql`
        insert into public.sessions
          (id, student_id, program_version_id, workout_id, status, started_at, ended_at,
           duration_min, last_activity_at, rpe, notes, device_id)
        values (${id}, ${studentId}, ${versionId}, ${workoutId}, 'completed', ${start}, ${end}, 50,
                ${end}, ${rpe}, ${notes}, ${crypto.randomUUID()})`;
      await sql`
        insert into public.session_exercises (id, session_id, workout_item_id, exercise_id, position, status)
        values (${se}, ${id}, ${itemId}, ${bench?.id ?? ""}, 1, 'done')`;
      const setIds = [crypto.randomUUID(), crypto.randomUUID()];
      await sql`
        insert into public.set_logs (id, session_exercise_id, set_number, load_kg, reps, completed_at)
        values (${setIds[0] ?? ""}, ${se}, 1, 40, 10, ${end}), (${setIds[1] ?? ""}, ${se}, 2, 42.5, 8, ${end})`;
      return { id, day: toLocalDate(start, TZ), setIds };
    };
    const recent = await session(3, 7, "Sessão fictícia de agenda");
    const old = await session(100, null, null);
    return {
      studentId,
      recent: recent.id,
      recentDay: recent.day,
      oldDay: old.day,
      sets: recent.setIds,
    };
  });
}

async function signIn(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(
    page.getByRole("button", { name: /Iniciar treino|Escolher outro treino/ }).first(),
  ).toBeVisible();
}

/** Abre a Agenda no mês do dia indicado, navegando a partir do mês atual. */
async function openMonth(page: Page, day: string) {
  await page.getByRole("link", { name: "Agenda" }).first().click();
  await page.getByRole("button", { name: "Hoje", exact: true }).click();
  const today = toLocalDate(new Date(), TZ);
  const diff =
    (Number(today.slice(0, 4)) - Number(day.slice(0, 4))) * 12 +
    (Number(today.slice(5, 7)) - Number(day.slice(5, 7)));
  for (let i = 0; i < diff; i++) await page.getByRole("button", { name: "Mês anterior" }).click();
  const title = `${MONTHS[Number(day.slice(5, 7)) - 1] ?? ""} de ${day.slice(0, 4)}`;
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

const dayLink = (page: Page, day: string) => page.locator(`a[href="/agenda/${day}"]`);

test("agenda com estados, navegação de meses e detalhe do dia (CA-070..072)", async ({
  page,
  context,
  browserName,
}) => {
  const user = agendaUser(browserName);
  const fixture = await setUp(user.email);
  await signIn(page, user.email, user.senha);

  // Treino de hoje concluído sem conexão: concluído + aguardando envio (RN-049).
  await context.setOffline(true);
  // Um só treino, descansado há 3 dias: Hoje recomenda e inicia direto.
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page).toHaveURL(/\/sessao$/);
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await page.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("button", { name: "Visão geral" }).click();
  await page
    .getByRole("dialog", { name: "Visão geral" })
    .getByRole("button", { name: "Concluir treino" })
    .click();
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await page.getByRole("button", { name: "Voltar para Hoje" }).click();

  const today = toLocalDate(new Date(), TZ);
  await openMonth(page, today);
  await expect(dayLink(page, today)).toHaveAttribute("aria-label", /Concluída, Aguardando envio/);
  const tomorrow = addDays(today, 1);
  if (tomorrow.slice(0, 7) === today.slice(0, 7))
    await expect(dayLink(page, tomorrow)).toHaveAttribute("aria-label", /Planejado/);
  await expect(page.getByText(/\d+ treinos? em [a-zç]+/)).toBeVisible();
  await context.setOffline(false);

  // Sessão de 3 dias atrás: concluída; o detalhe mostra versão, horários, PSE, nota e séries.
  await openMonth(page, fixture.recentDay);
  await expect(dayLink(page, fixture.recentDay)).toHaveAttribute("aria-label", /Concluída/);
  await dayLink(page, fixture.recentDay).click();
  const article = page.getByRole("article", { name: "Treino A" });
  await expect(article).toContainText("Treino A · versão 1");
  await expect(article).toContainText(/10:00–10:50 · 50 min · PSE 7/);
  await expect(article).toContainText("Sessão fictícia de agenda");
  await expect(article).toContainText("40 kg × 10, 42,5 kg × 8");
  await expect(article.getByRole("button", { name: "Editar" })).toBeVisible();

  // Sessão de 100 dias atrás: vem do servidor e é somente leitura (CA-069).
  await openMonth(page, fixture.oldDay);
  await expect(dayLink(page, fixture.oldDay)).toHaveAttribute("aria-label", /Concluída/);
  await dayLink(page, fixture.oldDay).click();
  await expect(page.getByText("Registros com mais de 60 dias são somente leitura.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Excluir" })).toHaveCount(0);
});

test("editar e excluir sessão na janela de 60 dias (CA-069)", async ({ page, browserName }) => {
  const user = agendaUser(browserName);
  const fixture = await setUp(user.email);
  await signIn(page, user.email, user.senha);
  await page.goto(`/agenda/${fixture.recentDay}`);
  await page
    .getByRole("article", { name: "Treino A" })
    .getByRole("button", { name: "Editar" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/sessoes/${fixture.recent}/editar$`));

  // Término antes do início é recusado na tela.
  const end = page.getByLabel("Término");
  const original = await end.inputValue();
  await end.fill(`${fixture.recentDay}T09:00`);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("O término deve ser depois do início.")).toBeVisible();
  await end.fill(original.replace(/T\d{2}:\d{2}$/, "T11:00"));

  // Remove a série 1, corrige a 2 e acrescenta uma; PSE e observação.
  await page.getByRole("button", { name: "Remover série 1" }).click();
  await page.getByLabel("Repetições da série 1").fill("9");
  await page.getByRole("button", { name: "Adicionar série" }).click();
  await page.getByLabel("Carga da série 2 (kg)").fill("45");
  await page.getByLabel("Repetições da série 2").fill("6");
  await page.getByRole("radio", { name: "9" }).check();
  await page.getByLabel("Observação (opcional)").fill("Ajustada na agenda");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(new RegExp(`/agenda/${fixture.recentDay}$`));
  const article = page.getByRole("article", { name: "Treino A" });
  await expect(article).toContainText("42,5 kg × 9, 45 kg × 6");
  await expect(article).toContainText(/10:00–11:00 · 60 min · PSE 9/);

  // No servidor: horários, PSE, séries renumeradas e a removida com marca de exclusão.
  await expect
    .poll(
      () =>
        withDb(async (sql) => {
          const [session] = await sql<{ rpe: number; duration_min: number; notes: string }[]>`
            select rpe, duration_min, notes from public.sessions where id = ${fixture.recent}`;
          const sets = await sql<{ n: number; load: number; reps: number }[]>`
            select l.set_number as n, l.load_kg::float8 as load, l.reps from public.set_logs l
            join public.session_exercises se on se.id = l.session_exercise_id
            where se.session_id = ${fixture.recent} and l.deleted_at is null order by l.set_number`;
          return { session, sets };
        }),
      { timeout: 30_000 },
    )
    .toEqual({
      session: { rpe: 9, duration_min: 60, notes: "Ajustada na agenda" },
      sets: [
        { n: 1, load: 42.5, reps: 9 },
        { n: 2, load: 45, reps: 6 },
      ],
    });

  // Excluir com confirmação que nomeia data e treino.
  await article.getByRole("button", { name: "Excluir" }).click();
  const dialog = page.getByRole("dialog", { name: "Excluir esta sessão?" });
  await expect(dialog).toContainText(/A sessão de \d{2}\/\d{2} \(Treino A\)/);
  await dialog.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Sessão excluída.")).toBeVisible();
  await expect(page.getByRole("article", { name: "Treino A" })).toHaveCount(0);
  await expect
    .poll(() =>
      withDb(
        (sql) =>
          sql<{ deleted: boolean }[]>`
            select deleted_at is not null as deleted from public.sessions where id = ${fixture.recent}`,
      ).then((rows) => rows[0]?.deleted),
    )
    .toBe(true);
});
