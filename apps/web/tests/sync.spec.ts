// Sincronização (TAR-020): indicador (CA-092), pendências antigas (T-PWA-10), recusados,
// conflito entre dois aparelhos (T-PWA-05), possível duplicidade (T-PWA-06) e envio após
// novo login (T-PWA-07) — CA-100. Dois aparelhos = dois contextos do navegador.
import { expect, test, type Browser, type Page } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { syncUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 360, height: 740 } });
// Mesmo aluno por navegador; fluxos longos (dois aparelhos, rede liga/desliga).
test.describe.configure({ mode: "serial", timeout: 120_000 });

type HookWindow = Window & {
  __forjaLocal?: {
    enqueue: (op: {
      type: string;
      entityId: string;
      payload?: Record<string, unknown>;
      createdAt?: number;
    }) => Promise<string>;
  };
};

async function withDb<T>(run: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

/** Zera o aluno: sem sessões, descanso padrão e um programa com um treino de supino. */
async function setUp(email: string): Promise<string> {
  return withDb(async (sql) => {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    await sql`delete from public.sessions where student_id = ${student.id}`;
    await sql`delete from public.programs where student_id = ${student.id}`;
    await sql`delete from public.rest_overrides where student_id = ${student.id}`;
    await sql`update public.rest_settings set default_hours = 48 where student_id = ${student.id}`;
    const [bench] = await sql<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    const programId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const workoutId = crypto.randomUUID();
    await sql`insert into public.programs (id, student_id) values (${programId}, ${student.id})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${student.id}, 'Programa de sincronização fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s,
         suggested_load_kg)
      values (${crypto.randomUUID()}, ${workoutId}, 1, ${bench?.id ?? ""}, 'reps', 1, 8, 12, 0, 40)`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    return student.id;
  });
}

async function signIn(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  // Programa baixado para uso offline.
  await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();
}

const indicator = (page: Page) => page.getByRole("link", { name: /Abrir sincronização/ }).first();

async function device(browser: Browser, email: string, senha: string): Promise<Page> {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    viewport: { width: 360, height: 740 },
  });
  const page = await context.newPage();
  await signIn(page, email, senha);
  return page;
}

/** Inicia o Treino A e registra a série. */
async function startWorkout(page: Page) {
  await page.getByRole("link", { name: "Hoje" }).first().click();
  await page
    .getByRole("button", { name: /Iniciar treino|Escolher outro treino/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/sessao$/);
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await expect(page.getByText("Série registrada.")).toBeVisible();
}

/** Conclui o treino em andamento até o resumo. */
async function finishWorkout(page: Page) {
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await expect(page.getByRole("heading", { name: "Treino A concluído" })).toBeVisible();
}

async function workout(page: Page) {
  await startWorkout(page);
  await finishWorkout(page);
}

test("indicador, pendência antiga e registro recusado com descarte confirmado", async ({
  page,
  context,
  browserName,
}) => {
  const user = syncUser(browserName);
  const studentId = await setUp(user.email);
  await signIn(page, user.email, user.senha);
  await expect(indicator(page)).toHaveAccessibleName(/^Sincronizado/);

  // Sem conexão: alteração fica aguardando envio (CA-092).
  await context.setOffline(true);
  await expect(indicator(page)).toHaveAccessibleName(/^Sem conexão/);
  await page.getByRole("link", { name: "Conta" }).first().click();
  await page.getByRole("link", { name: /Descanso entre treinos/ }).click();
  await page.getByRole("button", { name: "Aumentar descanso padrão" }).click();
  await expect(indicator(page)).toHaveAccessibleName(/^Sem conexão · 1 aguardando/);

  // Pendência antiga e inválida (fictícia): aviso em Hoje (T-PWA-10).
  await page.evaluate(
    async ({ entityId }) => {
      await (window as HookWindow).__forjaLocal?.enqueue({
        type: "rest.update",
        entityId,
        payload: { default_hours: 999, overrides: [] },
        createdAt: Date.now() - 30 * 3_600_000,
      });
    },
    { entityId: studentId },
  );
  await page.getByRole("link", { name: "Hoje" }).first().click();
  await expect(page.getByText(/Você tem treinos não enviados desde \d{2}\/\d{2}/)).toBeVisible();

  // Conexão de volta: o válido vai; o inválido é recusado e pede atenção.
  await context.setOffline(false);
  await expect(indicator(page)).toHaveAccessibleName(/^Precisa de atenção · 1/);
  await expect
    .poll(() =>
      withDb(
        (sql) =>
          sql<{ default_hours: number }[]>`
            select default_hours from public.rest_settings where student_id = ${studentId}`,
      ).then((rows) => rows[0]?.default_hours),
    )
    .toBe(54);

  // CA-100: recusado no grupo certo, com motivo; descartar mostra o conteúdo e pede confirmação.
  await indicator(page).click();
  await expect(page).toHaveURL(/\/conta\/sincronizacao$/);
  const attention = page.getByRole("region", { name: "Precisa da sua atenção" });
  await expect(attention).toContainText("Descanso entre treinos");
  await expect(attention).toContainText(/O servidor não aceitou este registro/);
  await attention.getByRole("button", { name: "Descartar" }).click();
  const confirm = page.getByRole("dialog", { name: "Descartar este registro?" });
  await expect(confirm).toContainText("Padrão 999 h");
  await confirm.getByRole("button", { name: "Cancelar" }).click();
  await expect(attention).toBeVisible();
  await attention.getByRole("button", { name: "Descartar" }).click();
  await confirm.getByRole("button", { name: "Descartar" }).click();
  await expect(page.getByText("Tudo sincronizado")).toBeVisible();
  await expect(indicator(page)).toHaveAccessibleName(/^Sincronizado/);
  await expect(page.getByText(/Conectado · último envio às \d{2}:\d{2}/)).toBeVisible();
});

test("conflito entre dois aparelhos: comparar e manter a versão deste aparelho (T-PWA-05)", async ({
  page,
  context,
  browser,
  browserName,
}) => {
  const user = syncUser(browserName);
  const studentId = await setUp(user.email);
  await signIn(page, user.email, user.senha);
  const other = await device(browser, user.email, user.senha);

  // Aparelho 1 offline altera o descanso; aparelho 2 altera online antes.
  await context.setOffline(true);
  await page.getByRole("link", { name: "Conta" }).first().click();
  await page.getByRole("link", { name: /Descanso entre treinos/ }).click();
  await page.getByRole("button", { name: "Aumentar descanso padrão" }).click();
  await other.getByRole("link", { name: "Conta" }).first().click();
  await other.getByRole("link", { name: /Descanso entre treinos/ }).click();
  await other.getByRole("button", { name: "Diminuir descanso padrão" }).click();
  await expect
    .poll(() =>
      withDb(
        (sql) =>
          sql<{ default_hours: number }[]>`
            select default_hours from public.rest_settings where student_id = ${studentId}`,
      ).then((rows) => rows[0]?.default_hours),
    )
    .toBe(42);

  // Aparelho 1 reconecta: conflito, nada se perde sem decisão.
  await context.setOffline(false);
  await expect(indicator(page)).toHaveAccessibleName(/^Precisa de atenção · 1/);
  await indicator(page).click();
  const attention = page.getByRole("region", { name: "Precisa da sua atenção" });
  await expect(attention).toContainText("Este registro foi alterado em outro aparelho.");
  await attention.getByRole("button", { name: "Comparar" }).click();
  const compare = page.getByRole("dialog", { name: "Comparar versões" });
  await expect(compare.getByRole("region", { name: "Neste aparelho" })).toContainText("54");
  await expect(compare.getByRole("region", { name: "No servidor" })).toContainText("42");
  await expect(compare.getByText("(diferente)").first()).toBeVisible();
  await compare
    .getByRole("region", { name: "Neste aparelho" })
    .getByRole("button", { name: "Manter esta" })
    .click();
  await expect
    .poll(() =>
      withDb(
        (sql) =>
          sql<{ default_hours: number }[]>`
            select default_hours from public.rest_settings where student_id = ${studentId}`,
      ).then((rows) => rows[0]?.default_hours),
    )
    .toBe(54);
  await expect(indicator(page)).toHaveAccessibleName(/^Sincronizado/);
  await other.context().close();
});

test("treinos offline em dois aparelhos: ambos salvos e marcados; manter ambas (T-PWA-06)", async ({
  page,
  context,
  browser,
  browserName,
}) => {
  const user = syncUser(browserName);
  const studentId = await setUp(user.email);
  await signIn(page, user.email, user.senha);
  const other = await device(browser, user.email, user.senha);

  await context.setOffline(true);
  await other.context().setOffline(true);
  // Horários sobrepostos: os dois começam antes de qualquer um terminar.
  await startWorkout(page);
  await startWorkout(other);
  await finishWorkout(page);
  await finishWorkout(other);
  await context.setOffline(false);
  await other.context().setOffline(false);

  // Ambas salvas; exatamente uma marcada (qual depende de quem chegou primeiro ao servidor).
  const marks = () =>
    withDb(
      (sql) =>
        sql<{ marked: boolean }[]>`
          select possible_duplicate_of is not null as marked from public.sessions
          where student_id = ${studentId}`,
    ).then((rows) => rows.map((r) => r.marked).sort());
  await expect.poll(marks, { timeout: 30_000 }).toEqual([false, true]);

  // Aparelho 1 baixa as duas sessões e mostra o par em "Para revisar".
  await page.goto("/conta/sincronizacao");
  const review = page.getByRole("region", { name: "Para revisar" });
  await expect(review).toContainText("Possível duplicidade");
  await review.getByRole("button", { name: "Manter ambas" }).click();
  await expect(page.getByText("Ambas mantidas.")).toBeVisible();
  await expect.poll(marks).toEqual([false, false]);
  await other.context().close();
});

test("sessão de acesso perdida: treino offline é enviado depois de entrar de novo (T-PWA-07)", async ({
  page,
  context,
  browserName,
}) => {
  const user = syncUser(browserName);
  const studentId = await setUp(user.email);
  await signIn(page, user.email, user.senha);

  await context.setOffline(true);
  await workout(page);
  // Sessão de acesso perdida neste aparelho (o banco local e a fila continuam).
  // Chave da sessão de acesso do app (AUTH_STORAGE_KEY em src/auth/client.ts).
  await page.evaluate(() => {
    localStorage.removeItem("forja.sessao");
  });
  await context.setOffline(false);
  await page.goto("/hoje");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect
    .poll(
      () =>
        withDb(
          (sql) =>
            sql<{ status: string; sets: number }[]>`
              select s.status,
                (select count(*)::int from public.set_logs l join public.session_exercises se
                   on se.id = l.session_exercise_id where se.session_id = s.id) as sets
              from public.sessions s where s.student_id = ${studentId}`,
        ),
      { timeout: 30_000 },
    )
    .toEqual([{ status: "completed", sets: 1 }]);
});
