// Disponibilidade offline (TAR-017): após o primeiro carregamento, o programa ativo, os pesos e
// o catálogo ficam no aparelho e continuam acessíveis sem rede (RF-091, RF-092); ações de
// gestão ficam desabilitadas com explicação (CA-093). Abrir o app offline depois de recarregar
// depende do service worker (TAR-006).
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { offlineUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });

type HookWindow = Window & {
  __forjaLocal?: { read: (table: string) => Promise<unknown[]> };
};

const readTable = (page: Page, table: string) =>
  page.evaluate((name) => (window as HookWindow).__forjaLocal?.read(name) ?? [], table);

/** Publica, direto no banco local, um programa fictício de um treino para o usuário. */
async function publishProgram(email: string) {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    await sql`delete from public.programs where student_id = ${student.id}`;
    await sql`delete from public.weight_entries where student_id = ${student.id}`;
    const programId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const workoutId = crypto.randomUUID();
    await sql`insert into public.programs (id, student_id) values (${programId}, ${student.id})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${student.id}, 'Programa offline fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
      select ${crypto.randomUUID()}, ${workoutId}, 1, id, 'reps', 3, 8, 12, 90
      from public.exercises where source_ref = 'Barbell_Squat'`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    await sql`
      insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
      values (${crypto.randomUUID()}, ${student.id}, current_date - 3, 81.4, 'manual')`;
  } finally {
    await sql.end();
  }
}

test("programa, pesos e catálogo ficam disponíveis sem rede após o primeiro carregamento", async ({
  page,
  context,
  browserName,
}) => {
  const user = offlineUser(browserName);
  await publishProgram(user.email);

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  // Carimbo do último download (RF-092) na Conta.
  await page.getByRole("link", { name: "Conta" }).first().click();
  const sync = page.getByRole("link", { name: /Sincronização/ });
  await expect(sync).toContainText(/Disponível offline · atualizado às \d{2}:\d{2}/);

  // O que ficou guardado no aparelho.
  const programs = (await readTable(page, "program")) as {
    view: { document: { name: string; workouts: { items: unknown[] }[] } };
  }[];
  expect(programs[0]?.view.document.name).toBe("Programa offline fictício");
  expect(programs[0]?.view.document.workouts[0]?.items).toHaveLength(1);
  expect(await readTable(page, "weights")).toHaveLength(1);
  expect((await readTable(page, "catalog_cache")).length).toBeGreaterThanOrEqual(110);

  // Sem rede: catálogo e detalhe seguem consultáveis pela cópia do aparelho.
  await context.setOffline(true);
  await page.getByRole("link", { name: "Gestão" }).first().click();
  await page.getByRole("link", { name: "Catálogo" }).first().click();
  await expect(page.getByText("110 exercícios")).toBeVisible();
  await page.getByLabel("Buscar por nome").fill("agachamento livre com barra");
  await page.getByRole("link", { name: /Agachamento livre com barra/ }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Agachamento livre com barra" }),
  ).toBeVisible();

  // Gestão exige conexão: aviso e ação indisponível (CA-093).
  await page.getByRole("link", { name: "Perfil" }).first().click();
  await expect(page.getByText(/A área de gestão precisa de conexão/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);

  // Ao reconectar, a cópia é atualizada de novo.
  await context.setOffline(false);
  await page.getByRole("link", { name: "Conta" }).first().click();
  await expect(page.getByRole("link", { name: /Sincronização/ })).toContainText(
    /Disponível offline · atualizado às/,
  );
});
