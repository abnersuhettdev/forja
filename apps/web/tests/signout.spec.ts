// Saída da conta e troca de usuário (TAR-021; RF-002, RF-101..103; RN-052, RN-053; ADR-028 L6):
// T-PWA-11 (sem pendências), T-PWA-12 (falha parcial), T-PWA-13 (manter → outro usuário →
// dono), T-PWA-14 (descartar com confirmação digitada) e T-PWA-16 (só conteúdo cifrado;
// senha anterior) — CA-002, CA-101, CA-102, CA-103.
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { findUserByEmail, setUserPassword } from "../../../scripts/ops/managers.ts";
import { otherDeviceUser, signOutUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 360, height: 740 } });
test.describe.configure({ mode: "serial", timeout: 120_000 });

type HookWindow = Window & {
  __forjaLocal?: {
    dbName: string;
    enqueue: (op: {
      type: string;
      entityId: string;
      payload?: Record<string, unknown>;
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

/** Zera o aluno e publica um treino de uma série; devolve o id do aluno. */
async function setUp(email: string): Promise<string> {
  return withDb(async (sql) => {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    await sql`delete from public.sessions where student_id = ${student.id}`;
    await sql`delete from public.programs where student_id = ${student.id}`;
    await sql`update public.rest_settings set default_hours = 48 where student_id = ${student.id}`;
    const [bench] = await sql<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    const [programId, versionId, workoutId] = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ];
    await sql`insert into public.programs (id, student_id) values (${programId}, ${student.id})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${student.id}, 'Programa de saída fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s,
         suggested_load_kg)
      values (${crypto.randomUUID()}, ${workoutId}, 1, ${bench?.id ?? ""}, 'reps', 2, 8, 12, 0, 40)`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    return student.id;
  });
}

const sessionsOf = (studentId: string) =>
  withDb(
    (sql) =>
      sql<{ status: string; sets: number }[]>`
        select s.status,
          (select count(*)::int from public.set_logs l join public.session_exercises se
             on se.id = l.session_exercise_id where se.session_id = s.id) as sets
        from public.sessions s where s.student_id = ${studentId}`,
  );

async function signIn(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}

/** Inicia o Treino A e registra a série 1 (sessão em andamento). */
async function startWorkout(page: Page) {
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await page.getByRole("button", { name: "Concluir série 1" }).click();
  await expect(page.getByText("Série registrada.")).toBeVisible();
}

async function openSignOut(page: Page) {
  // Navegação dentro do app (offline não há como recarregar sem o service worker — TAR-006).
  if (page.url().endsWith("/sessao")) await page.getByRole("button", { name: "Minimizar" }).click();
  await page.getByRole("link", { name: "Conta" }).first().click();
  await page.getByRole("button", { name: "Sair" }).click();
}

const databases = (page: Page) =>
  page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ""));

test("sem pendências: confirma, remove os dados locais e o novo login baixa tudo (T-PWA-11)", async ({
  page,
  browserName,
}) => {
  const user = signOutUser(browserName);
  await setUp(user.email);
  await signIn(page, user.email, user.senha);
  await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();
  const name = await page.evaluate(() => (window as HookWindow).__forjaLocal?.dbName ?? "");
  await openSignOut(page);
  const dialog = page.getByRole("dialog", { name: "Sair da conta?" });
  await expect(dialog).toContainText("Seus dados sincronizados continuam na sua conta");
  await dialog.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect(await databases(page)).not.toContain(name);
  await signIn(page, user.email, user.senha);
  await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();
});

test("com pendências: falha parcial reapresenta as opções; recusado pede atenção; descartar exige DESCARTAR (T-PWA-12, T-PWA-14)", async ({
  page,
  browserName,
}) => {
  const user = signOutUser(browserName);
  const studentId = await setUp(user.email);
  await signIn(page, user.email, user.senha);

  // Servidor indisponível: o treino fica na fila.
  await page.route("**/functions/v1/sync", (route) => route.fulfill({ status: 503, body: "" }));
  await startWorkout(page);
  await page.evaluate(
    (entityId) =>
      (window as HookWindow).__forjaLocal?.enqueue({
        type: "rest.update",
        entityId,
        payload: { default_hours: 999, overrides: [] },
      }),
    studentId,
  );

  await openSignOut(page);
  const options = page.getByRole("dialog", { name: "Há registros não enviados" });
  await expect(options).toContainText("2 registros ainda não foram enviados à sua conta:");
  await expect(options).toContainText(/Sessão de \d{2}\/\d{2} — Treino A · 1 série/);
  await expect(options).toContainText("Sair e manter neste aparelho");
  await options.getByRole("button", { name: "Enviar e sair" }).click();
  await expect(options).toContainText("2 registros não puderam ser enviados agora.");

  // Servidor de volta: a sessão vai; o recusado precisa de atenção antes de sair.
  await page.unroute("**/functions/v1/sync");
  await options.getByRole("button", { name: "Enviar e sair" }).click();
  const attention = page.getByRole("dialog", { name: "Itens precisam da sua atenção" });
  await expect(attention).toContainText("1 item precisa da sua atenção antes de sair.");
  await expect.poll(() => sessionsOf(studentId)).toEqual([{ status: "in_progress", sets: 1 }]);
  await attention.getByRole("button", { name: "Outras opções" }).click();

  // Descartar: aviso de irreversibilidade e confirmação digitada; sem ela, nada é apagado.
  await options.getByRole("button", { name: "Descartar e sair" }).click();
  const discard = page.getByRole("dialog", { name: "Descartar e sair" });
  await expect(discard).toContainText("Esta ação é irreversível.");
  await expect(discard).toContainText("Descanso entre treinos · Padrão 999 h");
  const confirm = discard.getByRole("button", { name: "Apagar e sair" });
  await expect(confirm).toBeDisabled();
  await discard.getByLabel("Digite DESCARTAR para confirmar").fill("descartar");
  await expect(confirm).toBeDisabled();
  await discard.getByRole("button", { name: "Voltar" }).click();
  await expect(options).toBeVisible();
  await options.getByRole("button", { name: "Descartar e sair" }).click();
  await discard.getByLabel("Digite DESCARTAR para confirmar").fill("DESCARTAR");
  await confirm.click();
  await expect(page).toHaveURL(/\/entrar$/);
});

test("sair e manter offline; outra pessoa não vê nada; o dono entra e tudo é enviado (T-PWA-13, T-PWA-16)", async ({
  page,
  context,
  browserName,
}) => {
  const owner = signOutUser(browserName);
  const other = otherDeviceUser(browserName);
  const studentId = await setUp(owner.email);
  await setUp(other.email);
  await signIn(page, owner.email, owner.senha);
  await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();
  const ownerDb = await page.evaluate(() => (window as HookWindow).__forjaLocal?.dbName ?? "");

  await context.setOffline(true);
  await startWorkout(page);
  await openSignOut(page);
  const options = page.getByRole("dialog", { name: "Há registros não enviados" });
  await expect(options).toContainText(/Sessão de \d{2}\/\d{2} — Treino A/);
  await expect(options.getByRole("button", { name: "Enviar e sair" })).toBeDisabled();
  await expect(options).toContainText("Sem conexão — conecte-se para enviar antes de sair");
  await options.getByRole("button", { name: "Sair e manter neste aparelho" }).click();
  const keep = page.getByRole("dialog", { name: "Sair e manter neste aparelho" });
  await expect(keep).toContainText("ficam guardados e criptografados neste aparelho");
  await keep.getByLabel("Sua senha").fill(owner.senha);
  await keep.getByLabel("Repita a senha").fill("outra-coisa");
  await keep.getByRole("button", { name: "Guardar e sair" }).click();
  await expect(keep).toContainText("As senhas não conferem.");
  await keep.getByLabel("Repita a senha").fill(owner.senha);
  await keep.getByRole("button", { name: "Guardar e sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);

  // No aparelho: banco do dono removido; no cofre, só metadados e conteúdo cifrado.
  expect(await databases(page)).not.toContain(ownerDb);
  const vault = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const request = indexedDB.open("forja-cofre");
        request.onsuccess = () => {
          const read = request.result.transaction("records").objectStore("records").getAll();
          read.onsuccess = () => {
            const rows = read.result as Record<string, unknown>[];
            resolve(
              JSON.stringify(
                rows.map((row) => ({
                  keys: Object.keys(row).sort(),
                  text: new TextDecoder("utf-8", { fatal: false }).decode(
                    row.ciphertext as ArrayBuffer,
                  ),
                })),
              ),
            );
          };
          read.onerror = () => {
            reject(new Error("cofre ilegível"));
          };
        };
        request.onerror = () => {
          reject(new Error("cofre ausente"));
        };
      }),
  );
  const rows = JSON.parse(vault) as { keys: string[]; text: string }[];
  const mine = rows.filter((row) => row.keys.includes("ciphertext"));
  expect(mine.length).toBeGreaterThanOrEqual(1);
  expect(mine[0]?.keys).toEqual([
    "ciphertext",
    "created_at",
    "id",
    "iterations",
    "iv",
    "owner",
    "salt",
    "version",
  ]);
  for (const row of mine) {
    expect(row.text).not.toContain("Treino A");
    expect(row.text).not.toContain("session.start");
  }

  // Outra pessoa entra no mesmo aparelho: não vê nem envia nada do dono (CA-102).
  await context.setOffline(false);
  await signIn(page, other.email, other.senha);
  await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Abrir sincronização/ }).first(),
  ).toHaveAccessibleName(/^Sincronizado/);
  expect(await sessionsOf(studentId)).toEqual([]);
  await openSignOut(page);
  await page
    .getByRole("dialog", { name: "Sair da conta?" })
    .getByRole("button", { name: "Sair" })
    .click();
  await expect(page).toHaveURL(/\/entrar$/);

  // O dono entra: a senha do login libera as pendências, que são enviadas; a sessão é retomada.
  await signIn(page, owner.email, owner.senha);
  await expect
    .poll(() => sessionsOf(studentId), { timeout: 30_000 })
    .toEqual([{ status: "in_progress", sets: 1 }]);
  await expect(page.getByRole("region", { name: "Treino A em andamento" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Concluir série 2" })).toBeVisible();
});

test("senha trocada em outro aparelho: pede a senha anterior para liberar (ADR-028 L6)", async ({
  page,
  browserName,
}) => {
  const owner = signOutUser(browserName);
  const studentId = await setUp(owner.email);
  const status = localStatus();
  const creds = { url: status.API_URL, serviceKey: status.SERVICE_ROLE_KEY };
  const account = await findUserByEmail(creds, owner.email);
  if (!account) throw new Error("usuário fictício ausente");
  const newPassword = `${owner.senha}-nova`;

  await signIn(page, owner.email, owner.senha);
  await page.route("**/functions/v1/sync", (route) => route.fulfill({ status: 503, body: "" }));
  await startWorkout(page);
  await openSignOut(page);
  const options = page.getByRole("dialog", { name: "Há registros não enviados" });
  await options.getByRole("button", { name: "Sair e manter neste aparelho" }).click();
  const keep = page.getByRole("dialog", { name: "Sair e manter neste aparelho" });
  // Online, a senha é conferida no serviço de autenticação.
  await keep.getByLabel("Sua senha").fill("senha-que-nao-e-a-certa");
  await keep.getByRole("button", { name: "Guardar e sair" }).click();
  await expect(keep).toContainText("Senha incorreta.");
  await keep.getByLabel("Sua senha").fill(owner.senha);
  await keep.getByRole("button", { name: "Guardar e sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.unroute("**/functions/v1/sync");

  try {
    await setUserPassword(creds, account.id, newPassword);
    await signIn(page, owner.email, newPassword);
    await expect(
      page.getByRole("status").filter({ hasText: "Registros guardados de uma saída anterior" }),
    ).toBeVisible();
    expect(await sessionsOf(studentId)).toEqual([]);
    await page.getByRole("button", { name: "Liberar registros" }).click();
    const unlock = page.getByRole("dialog", { name: "Registros guardados de uma saída anterior" });
    await unlock.getByLabel("Senha (atual ou anterior)").fill(newPassword);
    await unlock.getByRole("button", { name: "Liberar registros" }).click();
    await expect(unlock).toContainText("Essa senha não libera os registros.");
    await unlock.getByLabel("Senha (atual ou anterior)").fill(owner.senha);
    await unlock.getByRole("button", { name: "Liberar registros" }).click();
    await expect(page.getByText("Registros liberados; serão enviados.")).toBeVisible();
    await expect
      .poll(() => sessionsOf(studentId), { timeout: 30_000 })
      .toEqual([{ status: "in_progress", sets: 1 }]);
  } finally {
    await setUserPassword(creds, account.id, owner.senha);
  }
});

test("tempo de derivação da chave neste navegador (ADR-070: até ~3 s)", async ({
  page,
  browserName,
}) => {
  await page.goto("/entrar");
  const ms = await page.evaluate(async () => {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("medicao-ficticia"),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const started = performance.now();
    await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: crypto.getRandomValues(new Uint8Array(16)),
        iterations: 600_000,
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );
    return Math.round(performance.now() - started);
  });
  test
    .info()
    .annotations.push({ type: "derivacao-ms", description: `${browserName}: ${String(ms)} ms` });
  console.log(`DERIVACAO ${browserName} ${String(ms)} ms`);
  expect(ms).toBeLessThan(3_000);
});
