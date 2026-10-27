// Meu treino (TAR-018): Hoje com recomendação determinística, escolha de treino com aviso de
// descanso não bloqueante, Treinos, detalhe do treino e Descanso entre treinos (CA-050..053,
// CA-055). A sessão fictícia é gravada no servidor e chega ao aparelho pelo download (API-R06).
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { trainingUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 360, height: 640 } });
// Os dois testes usam o mesmo aluno fictício por navegador.
test.describe.configure({ mode: "serial" });

type HookWindow = Window & {
  __forjaLocal?: {
    read: (table: string) => Promise<unknown[]>;
    outbox: () => Promise<{ type: string }[]>;
  };
};

interface Program {
  studentId: string;
  versionId: string;
  workoutA: string;
  workoutB: string;
  bench: string;
}

async function withDb<T>(run: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

/** Zera o aluno fictício: sem programa, descanso padrão e meta de 3 dias. */
async function resetStudent(email: string): Promise<string> {
  return withDb(async (sql) => {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    await sql`delete from public.sessions where student_id = ${student.id}`;
    await sql`delete from public.programs where student_id = ${student.id}`;
    await sql`delete from public.rest_overrides where student_id = ${student.id}`;
    await sql`update public.rest_settings set default_hours = 48 where student_id = ${student.id}`;
    await sql`
      update public.training_profiles set days_per_week = 3, preferred_weekdays = null
      where student_id = ${student.id}`;
    return student.id;
  });
}

/** Programa fictício: A = supino (peitoral); B = agachamento + supino (quadríceps e peitoral). */
async function publishProgram(studentId: string): Promise<Program> {
  return withDb(async (sql) => {
    const programId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const workoutA = crypto.randomUUID();
    const workoutB = crypto.randomUUID();
    const [bench] = await sql<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    const [squat] = await sql<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Squat'`;
    if (!bench || !squat) throw new Error("exercícios do catálogo ausentes");
    await sql`insert into public.programs (id, student_id) values (${programId}, ${studentId})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${studentId}, 'Programa de treino fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutA}, ${versionId}, 1, 'Treino A'), (${workoutB}, ${versionId}, 2, 'Treino B')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s,
         suggested_load_kg)
      values
        (${crypto.randomUUID()}, ${workoutA}, 1, ${bench.id}, 'reps', 3, 8, 12, 90, 40),
        (${crypto.randomUUID()}, ${workoutB}, 1, ${squat.id}, 'reps', 4, 6, 10, 120, null),
        (${crypto.randomUUID()}, ${workoutB}, 2, ${bench.id}, 'reps', 3, 8, 12, 90, null)`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    // Publicação há 3 dias, para a sessão fictícia de ontem contar no ciclo. Versões publicadas
    // são imutáveis (RN-004): só no banco local de teste, com gatilhos suspensos na transação.
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role = replica`;
      await tx`
        update public.program_versions set published_at = now() - interval '3 days'
        where id = ${versionId}`;
    });
    return { studentId, versionId, workoutA, workoutB, bench: bench.id };
  });
}

async function signIn(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}

/** Sessão concluída fictícia do Treino A no servidor, terminada há 20 h, com uma série de supino. */
async function addFinishedSessionA(program: Program, versionId: string) {
  await withDb(async (sql) => {
    const sessionId = crypto.randomUUID();
    const sessionExerciseId = crypto.randomUUID();
    await sql`
      insert into public.sessions
        (id, student_id, program_version_id, workout_id, status, started_at, ended_at,
         duration_min, last_activity_at, device_id)
      values
        (${sessionId}, ${program.studentId}, ${versionId}, ${program.workoutA}, 'completed',
         now() - interval '20 hours 50 minutes', now() - interval '20 hours', 50,
         now() - interval '20 hours', ${crypto.randomUUID()})`;
    await sql`
      insert into public.session_exercises (id, session_id, exercise_id, position, status)
      values (${sessionExerciseId}, ${sessionId}, ${program.bench}, 1, 'done')`;
    await sql`
      insert into public.set_logs (id, session_exercise_id, set_number, load_kg, reps, completed_at)
      values (${crypto.randomUUID()}, ${sessionExerciseId}, 1, 40, 10, now() - interval '20 hours')`;
  });
}

test("Hoje recomenda o treino, respeita o descanso e a configuração por grupo", async ({
  page,
  browserName,
}) => {
  const user = trainingUser(browserName);
  const studentId = await resetStudent(user.email);
  await signIn(page, user.email, user.senha);

  // Sem programa: estado vazio com "Montar programa" (CA-050).
  await expect(page.getByText("Você ainda não tem um programa")).toBeVisible();
  await expect(page.getByRole("button", { name: "Montar programa" })).toBeVisible();

  // Programa publicado: recomenda o primeiro treino (CT-REC-01) sem rolar em 360 × 640.
  const program = await publishProgram(studentId);
  await page.reload();
  const hero = page.getByRole("region", { name: "Treino A" });
  await expect(hero).toBeVisible();
  await expect(hero).toContainText("Próximo da sequência");
  await expect(hero).toContainText("1 exercício · ~10 min");
  await expect(hero.getByText("Peitoral")).toBeVisible();
  const start = page.getByRole("button", { name: "Iniciar treino" });
  await expect(start).toBeInViewport();
  await expect(page.getByText("0 de 3 treinos nesta semana")).toBeInViewport();
  const weight = page.getByText("Peso", { exact: true });
  await expect(weight).toBeInViewport();
  // Nem coberto pela barra inferior de navegação.
  const weightBox = await weight.boundingBox();
  const navBox = await page
    .getByRole("navigation", { name: "Navegação principal" })
    .filter({ visible: true })
    .boundingBox();
  expect((weightBox?.y ?? 0) + (weightBox?.height ?? 0)).toBeLessThanOrEqual(navBox?.y ?? 0);

  // A feito há 20 h: B divide o peitoral (48 h) → descanso sugerido com horário (CT-REC-03).
  await addFinishedSessionA(program, program.versionId);
  await page.reload();
  await expect(page.getByText("Descanso sugerido")).toBeVisible();
  await expect(
    page.getByText(/Próximo treino fica disponível (hoje|amanhã) às \d{2}:\d{2}/),
  ).toBeVisible();
  await expect(page.getByText("1 de 3 treinos nesta semana")).toBeVisible();

  // Treinar mesmo assim: aviso não bloqueante que cita grupo, horas e descanso (CA-051).
  await page.getByRole("button", { name: "Treinar mesmo assim" }).click();
  const sheet = page.getByRole("dialog", { name: "Escolher treino" });
  await expect(sheet.getByText(/Feito neste ciclo \(\d{2}\/\d{2}\)/)).toBeVisible();
  const optionB = sheet.getByRole("button", { name: /Treino B/ });
  await expect(optionB).toContainText("Peitoral treinado há 20 h · descanso configurado 48 h");
  await optionB.click();
  await expect(sheet.getByText("Iniciar mesmo assim?")).toBeVisible();
  await expect(
    sheet.getByText(
      "O Treino B trabalha peitoral, que você treinou há 20 h. Seu descanso configurado é 48 h.",
    ),
  ).toBeVisible();
  await sheet.getByRole("button", { name: "Cancelar" }).click();
  await sheet.getByRole("button", { name: "Fechar" }).click();

  // Descanso: peitoral = 0 h vale na hora para a recomendação (CA-055, CT-REC-05).
  await page.getByRole("link", { name: "Conta" }).first().click();
  await page.getByRole("link", { name: /Descanso entre treinos/ }).click();
  await expect(page.getByText(/preferências pessoais, não recomendação médica/)).toBeVisible();
  await page.getByRole("button", { name: /^Peitoral/ }).click();
  const groupSheet = page.getByRole("dialog", { name: "Peitoral" });
  await groupSheet.getByText("Valor próprio").click();
  await groupSheet.getByRole("textbox", { name: "Horas" }).fill("0");
  await groupSheet.getByRole("textbox", { name: "Horas" }).press("Enter");
  await groupSheet.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("button", { name: /^Peitoral/ })).toContainText("0 h");

  await page.getByRole("link", { name: "Hoje" }).first().click();
  const heroB = page.getByRole("region", { name: "Treino B" });
  await expect(heroB).toBeVisible();
  await expect(heroB).toContainText(/peitoral descansado há 20 h/);

  // O ajuste chegou ao servidor pela fila (API-007).
  await expect
    .poll(() =>
      withDb(
        (sql) => sql`
          select hours from public.rest_overrides
          where student_id = ${studentId} and muscle_group_code = 'chest'`,
      ).then((rows) => rows[0]?.hours as number | undefined),
    )
    .toBe(0);
});

test("Treinos e detalhe mostram duração, grupos e prescrição; descanso offline vai depois", async ({
  page,
  context,
  browserName,
}) => {
  const user = trainingUser(browserName);
  const studentId = await resetStudent(user.email);
  await publishProgram(studentId);
  await signIn(page, user.email, user.senha);

  // TELA-012 (CA-052).
  await page.getByRole("link", { name: "Treinos" }).first().click();
  await expect(page.getByRole("heading", { name: "Programa de treino fictício" })).toBeVisible();
  await expect(page.getByText(/^versão de \d{2}\/\d{2}$/)).toBeVisible();
  const cardB = page.getByRole("link", { name: /Treino B/ });
  await expect(cardB).toContainText("2 exercícios · ~20 min");
  await expect(cardB).toContainText("Quadríceps");
  await expect(cardB).toContainText("Peitoral");
  await expect(page.getByText("Disponível offline", { exact: true })).toBeVisible();

  // TELA-013 (CA-053): exercícios em ordem com prescrição.
  await cardB.click();
  await expect(page.getByRole("heading", { name: "Treino B" })).toBeVisible();
  const items = page.getByRole("list", { name: "Exercícios" }).getByRole("link");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("Agachamento livre com barra");
  await expect(items.nth(0)).toContainText("4 × 6–10 · descanso 120 s");
  await expect(items.nth(1)).toContainText("Supino reto com barra");
  await page.getByRole("link", { name: "Treinos" }).first().click();
  await page.getByRole("link", { name: /Treino A/ }).click();
  await expect(page.getByText("3 × 8–12 · descanso 90 s · carga sugerida 40 kg")).toBeVisible();
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page).toHaveURL(/\/sessao$/);

  // Descanso offline: salvo no aparelho e enviado ao reconectar (TELA-006).
  await page.goto("/conta/descanso");
  await expect(page.getByRole("group", { name: "Descanso padrão" })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Aumentar descanso padrão" }).click();
  await expect(page.getByRole("textbox", { name: "Descanso padrão" })).toHaveValue("54");
  await expect(
    page.getByText("Salvo neste aparelho. Será enviado quando houver conexão."),
  ).toBeVisible();
  const queued = await page.evaluate(() => (window as HookWindow).__forjaLocal?.outbox() ?? []);
  expect(queued.map((op) => op.type)).toContain("rest.update");
  await context.setOffline(false);
  await expect
    .poll(() =>
      withDb(
        (sql) =>
          sql`select default_hours from public.rest_settings where student_id = ${studentId}`,
      ).then((rows) => rows[0]?.default_hours as number | undefined),
    )
    .toBe(54);

  // Restaurar padrões.
  await page.getByRole("button", { name: "Restaurar padrões" }).click();
  await expect(page.getByRole("textbox", { name: "Descanso padrão" })).toHaveValue("48");
});
