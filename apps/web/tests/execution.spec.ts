// Execução do treino (TAR-019): modo foco com registro de séries, desfazer, descanso pelo
// horário de término, pular, retomar após recarregar, sessão completa sem rede e envio sem
// duplicatas ao reconectar (CA-060..063, CA-065..067, T-PWA-03, T-PWA-04 parcial).
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { executionUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 360, height: 740 } });
// Os dois testes usam o mesmo aluno fictício por navegador.
test.describe.configure({ mode: "serial" });

async function withDb<T>(run: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

/** Zera o aluno e publica: A = supino (40 kg sugeridos, descanso 90 s) + agachamento; B = remada. */
async function setUp(email: string): Promise<string> {
  return withDb(async (sql) => {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    await sql`delete from public.sessions where student_id = ${student.id}`;
    await sql`delete from public.programs where student_id = ${student.id}`;
    await sql`update public.training_profiles set days_per_week = 3 where student_id = ${student.id}`;
    const ids = await sql<{ source_ref: string; id: string }[]>`
      select source_ref, id from public.exercises
      where source_ref in ('Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Squat', 'Bent_Over_Barbell_Row')`;
    const id = (ref: string) => ids.find((row) => row.source_ref === ref)?.id ?? "";
    const programId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
    await sql`insert into public.programs (id, student_id) values (${programId}, ${student.id})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${student.id}, 'Programa de execução fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${a}, ${versionId}, 1, 'Treino A'), (${b}, ${versionId}, 2, 'Treino B')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s,
         suggested_load_kg)
      values
        (${crypto.randomUUID()}, ${a}, 1, ${id("Barbell_Bench_Press_-_Medium_Grip")}, 'reps', 3, 8, 12, 90, 40),
        (${crypto.randomUUID()}, ${a}, 2, ${id("Barbell_Squat")}, 'reps', 2, 6, 10, 0, null),
        (${crypto.randomUUID()}, ${b}, 1, ${id("Bent_Over_Barbell_Row")}, 'reps', 3, 8, 12, 60, 30)`;
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
}

const loadField = (page: Page) => page.getByRole("textbox", { name: "Carga", exact: true });

test("sessão completa: séries, desfazer, descanso, pular, retomar e concluir sem rede", async ({
  page,
  context,
  browserName,
}) => {
  const user = executionUser(browserName);
  const studentId = await setUp(user.email);
  await page.clock.install();
  await signIn(page, user.email, user.senha);

  // CA-060: inicia o recomendado e entra no modo foco.
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page).toHaveURL(/\/sessao$/);
  await expect(page.getByRole("heading", { level: 1, name: "Treino A" })).toBeVisible();
  await expect(page.getByText("Exercício 1 de 2")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Supino reto com barra" })).toBeVisible();
  await expect(page.getByText("3 × 8–12 · descanso 90 s")).toBeVisible();

  // Pré-preenchimento sem histórico: carga sugerida e mínimo da faixa (RF-061).
  await expect(loadField(page)).toHaveValue("40");
  await expect(page.getByRole("textbox", { name: "Repetições" })).toHaveValue("8");

  // Decisão de 2026-11-06: a foto pequena abre as duas posições do exercício.
  await page.getByRole("button", { name: /^Ver as posições de / }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // CA-061: confirmação com "Desfazer"; desfazer remove a série.
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await expect(page.getByText("Série registrada.")).toBeVisible();
  await expect(page.getByRole("timer", { name: "Descanso" })).toBeVisible();
  await expect(page.getByText("A seguir: série 2 · 40 kg × 8")).toBeVisible();
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByRole("button", { name: "Concluir série 1" })).toBeVisible();

  // CA-062: o descanso conta pelo horário de término; ±15 s e Pular.
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  const timer = page.getByRole("timer", { name: "Descanso" });
  // Segundos restantes lidos da tela; comparações relativas toleram a lentidão do ambiente.
  const remaining = async () => {
    const match = /(\d+):(\d{2})/.exec((await timer.textContent()) ?? "");
    return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
  };
  const within = (low: number, high: number) => async () => {
    const value = await remaining();
    return value >= low && value <= high;
  };
  const start = await remaining();
  expect(start).toBeGreaterThan(60);
  expect(start).toBeLessThanOrEqual(90);
  await page.clock.fastForward("01:00");
  await expect.poll(within(start - 66, start - 60)).toBe(true);
  const afterMinute = await remaining();
  await page.getByRole("button", { name: "Mais 15 segundos" }).click();
  await expect.poll(within(afterMinute + 9, afterMinute + 15)).toBe(true);
  const afterPlus = await remaining();
  await page.getByRole("button", { name: "Menos 15 segundos" }).click();
  await expect.poll(within(afterPlus - 21, afterPlus - 15)).toBe(true);
  await page.getByRole("button", { name: "Pular" }).click();
  await expect(page.getByRole("button", { name: "Concluir série 2" })).toBeVisible();

  // CA-066: recarregar retoma no mesmo ponto.
  await page.reload();
  await expect(page.getByRole("button", { name: "Concluir série 2" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Séries" })).toContainText("40 kg × 8");

  // Sem rede daqui até concluir (T-PWA-03).
  await context.setOffline(true);
  await page.getByRole("button", { name: "Aumentar carga" }).click();
  await expect(loadField(page)).toHaveValue("42,5");
  await page.getByRole("button", { name: "Concluir série 2" }).click();
  await page.getByRole("button", { name: "Pular" }).click();
  await page.getByRole("button", { name: "Concluir série 3" }).click();
  await page.getByRole("button", { name: "Pular" }).click();
  await page.getByRole("button", { name: "Próximo exercício" }).click();

  // Agachamento sem histórico nem sugestão: carga exigida antes de confirmar.
  await expect(page.getByText("Exercício 2 de 2")).toBeVisible();
  await expect(loadField(page)).toHaveValue("");
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await expect(page.getByText("Informe a carga antes de concluir a série.")).toBeVisible();

  // CA-063: pular fica registrado como não realizado.
  await page.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("button", { name: "Pular exercício" }).click();
  await expect(page.getByText("Exercício pulado.")).toBeVisible();
  await page.getByRole("button", { name: "Concluir treino" }).click();

  // CA-065: PSE e observação opcionais; resumo com duração, séries e volume.
  await expect(page).toHaveURL(/\/sessao\/concluir$/);
  await page.getByRole("radio", { name: "7" }).check();
  await expect(page.getByText("7 · intenso")).toBeVisible();
  await page.getByLabel("Observação (opcional)").fill("Sessão fictícia offline");
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await expect(page.getByRole("heading", { name: "Treino A concluído" })).toBeVisible();
  await expect(page.getByText("1 realizados · 1 pulados")).toBeVisible();
  // 40 × 8 + 42,5 × 8 + 40 × 8: a série 3 volta à carga sugerida (TRN-04 §3).
  await expect(page.getByText("980 kg")).toBeVisible();
  await expect(page.getByText("Salvo neste aparelho · será enviado")).toBeVisible();

  // Reconectar: tudo vai ao servidor, sem duplicatas.
  await context.setOffline(false);
  await expect
    .poll(
      () =>
        withDb(
          (sql) => sql<{ status: string; sets: number; rpe: number; skipped: number }[]>`
            select s.status, s.rpe,
              (select count(*)::int from public.set_logs l join public.session_exercises se
                 on se.id = l.session_exercise_id where se.session_id = s.id) as sets,
              (select count(*)::int from public.session_exercises se
                 where se.session_id = s.id and se.status = 'skipped') as skipped
            from public.sessions s where s.student_id = ${studentId}`,
        ),
      { timeout: 30_000 },
    )
    .toEqual([{ status: "completed", rpe: 7, sets: 3, skipped: 1 }]);

  // Presença do dia em Hoje.
  await page.getByRole("button", { name: "Voltar para Hoje" }).click();
  await expect(page.getByRole("heading", { name: "Treino A concluído hoje" })).toBeVisible();
  await expect(page.getByText("1 de 3 treinos nesta semana")).toBeVisible();

  // De novo o Treino A: "Última vez" e pré-preenchimento pela última execução (RF-061, CT-PRE-01).
  await page.getByRole("button", { name: "Escolher outro treino" }).click();
  const sheet = page.getByRole("dialog", { name: "Escolher treino" });
  await sheet.getByRole("button", { name: /Treino A/ }).click();
  await sheet.getByRole("button", { name: "Iniciar", exact: true }).click();
  await expect(page.getByText("Última vez: 40 kg × 8, 42,5 kg × 8, 40 kg × 8")).toBeVisible();
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await page.getByRole("button", { name: "Pular" }).click();
  await expect(loadField(page)).toHaveValue("42,5");
  await page.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("button", { name: "Descartar sessão" }).click();
  await page
    .getByRole("dialog", { name: "Descartar a sessão?" })
    .getByRole("button", { name: "Descartar sessão" })
    .click();
  await expect(page).toHaveURL(/\/hoje$/);
});

test("com sessão em andamento não inicia outra; descartar pede confirmação e remove", async ({
  page,
  browserName,
}) => {
  const user = executionUser(browserName);
  const studentId = await setUp(user.email);
  await signIn(page, user.email, user.senha);

  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await expect(page.getByText("Série registrada.")).toBeVisible();
  await page.getByRole("button", { name: "Minimizar" }).click();

  // Hoje mostra a sessão em andamento com o progresso.
  const hero = page.getByRole("region", { name: "Treino A em andamento" });
  await expect(hero).toContainText(/\d+ min · 1 de 5 séries/);

  // CA-060: iniciar outro treino exige concluir ou descartar o atual.
  await page.getByRole("link", { name: "Treinos" }).first().click();
  await page.getByRole("link", { name: /Treino B/ }).click();
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  const blocked = page.getByRole("dialog", { name: "Treino A em andamento" });
  await expect(blocked).toContainText("Concluir ou descartar antes de iniciar outro.");
  await blocked.getByRole("button", { name: "Ir para o treino em andamento" }).click();
  await expect(page).toHaveURL(/\/sessao$/);

  // CA-067: sem confirmação nada muda; confirmando, sessão e séries saem.
  await page.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("button", { name: "Descartar sessão" }).click();
  const confirm = page.getByRole("dialog", { name: "Descartar a sessão?" });
  await confirm.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("list", { name: "Séries" })).toContainText("40 kg × 8");
  await page.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("button", { name: "Descartar sessão" }).click();
  await confirm.getByRole("button", { name: "Descartar sessão" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page.getByRole("region", { name: "Treino A" })).toBeVisible();
  await expect
    .poll(() =>
      withDb(
        (sql) =>
          sql<{ count: number }[]>`
            select count(*)::int as count from public.sessions where student_id = ${studentId}`,
      ).then((rows) => rows[0]?.count),
    )
    .toBe(0);
});
