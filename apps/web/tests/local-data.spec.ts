// Dados locais por usuário e fila de saída (TAR-009): T-PWA-09, T-PWA-15 (parte do aparelho),
// CA-102 (parte sem pendências mantidas — TAR-021) e CP-02 da ADR-027. A função de
// sincronização (TAR-010) é simulada por interceptação; usuários fictícios (RN-037).
import { expect, test, type Page, type Route } from "@playwright/test";
import { MAIN_USER, SECOND_USER } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });

interface SentOperation {
  op_id: string;
  owner_user_id: string;
  entity_id: string;
}

interface OutboxRow {
  owner_user_id: string;
  entity_id: string;
  state: string;
}

type HookWindow = Window & {
  __forjaLocal?: {
    userId: string;
    dbName: string;
    enqueue: (op: { ownerUserId?: string; type: string; entityId: string }) => Promise<string>;
    outbox: () => Promise<OutboxRow[]>;
    syncNow: () => Promise<void>;
  };
};

/** Simula a função de sincronização e registra tudo o que o aparelho enviou. */
async function mockSync(page: Page, mode: { fail: boolean }) {
  const sent: SentOperation[] = [];
  await page.route("**/functions/v1/sync", async (route: Route) => {
    const body = route.request().postDataJSON() as { operations: SentOperation[] };
    sent.push(...body.operations);
    if (mode.fail) {
      await route.fulfill({ status: 503, body: "" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        server_time: new Date().toISOString(),
        results: body.operations.map((op) => ({
          op_id: op.op_id,
          status: "accepted",
          revision: 1,
        })),
      }),
    });
  });
  return sent;
}

async function login(page: Page, email: string, password: string) {
  // Após uma saída o app já está no login; navegar de novo pode interromper a navegação dele.
  if (!page.url().endsWith("/entrar")) await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await page.waitForFunction(() => (window as HookWindow).__forjaLocal !== undefined);
}

const local = (page: Page) =>
  page.evaluate(() => {
    const hooks = (window as HookWindow).__forjaLocal;
    if (!hooks) throw new Error("banco local não aberto");
    return { userId: hooks.userId, dbName: hooks.dbName };
  });

const outbox = (page: Page) =>
  page.evaluate(() => (window as HookWindow).__forjaLocal?.outbox() ?? []);

const databases = (page: Page) =>
  page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ""));

test("operação de outro dono nunca sai do aparelho (T-PWA-15, ADR-028 L3)", async ({ page }) => {
  const sent = await mockSync(page, { fail: false });
  await login(page, MAIN_USER.email, MAIN_USER.senha);
  const { userId } = await local(page);
  await page.evaluate(async () => {
    const hooks = (window as HookWindow).__forjaLocal;
    await hooks?.enqueue({
      ownerUserId: "00000000-0000-4000-8000-0000000000ff",
      type: "weight.create",
      entityId: "alheia",
    });
    await hooks?.enqueue({ type: "weight.create", entityId: "propria" });
    await hooks?.syncNow();
  });
  await expect.poll(() => sent.length).toBe(1);
  expect(sent.map((op) => op.owner_user_id)).toEqual([userId]);
  // A operação alheia continua guardada — nada é descartado sem decisão (RN-051).
  expect((await outbox(page)).map((op) => op.entity_id)).toEqual(["alheia"]);
});

test("troca de usuário: o novo não vê nem envia nada do anterior; o dono envia ao voltar (T-PWA-09, CA-102)", async ({
  page,
}) => {
  const mode = { fail: true };
  const sent = await mockSync(page, mode);

  // A registra algo que não consegue enviar (servidor indisponível).
  await login(page, MAIN_USER.email, MAIN_USER.senha);
  const a = await local(page);
  await page.evaluate(() =>
    (window as HookWindow).__forjaLocal?.enqueue({ type: "weight.create", entityId: "peso-a" }),
  );
  await page.evaluate(() => (window as HookWindow).__forjaLocal?.syncNow());
  await expect.poll(async () => (await outbox(page))[0]?.state).toBe("retry");

  // Com pendências, Sair mostra as opções (UX-04 §6.1); Cancelar não remove nada.
  await page.goto("/conta");
  await page.getByRole("button", { name: "Sair" }).click();
  const warning = page.getByRole("dialog", { name: "Há registros não enviados" });
  await expect(warning).toContainText("1 registro ainda não foi enviado");
  await warning.getByRole("button", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  expect(await outbox(page)).toHaveLength(1);

  // A sessão de A termina sem saída explícita (expiração/revogação — RN-052 d) e B entra.
  await page.evaluate(() => {
    localStorage.removeItem("forja.sessao");
  });
  await page.reload();
  await expect(page).toHaveURL(/\/entrar$/);
  sent.length = 0;
  await login(page, SECOND_USER.email, SECOND_USER.senha);
  const b = await local(page);
  expect(b.dbName).not.toBe(a.dbName);
  expect(await outbox(page)).toEqual([]); // B não vê a fila de A
  await page.evaluate(() => (window as HookWindow).__forjaLocal?.syncNow());
  expect(sent).toEqual([]); // nem a envia
  expect(await databases(page)).toContain(a.dbName); // e os dados de A seguem guardados

  // B sai sem pendências: só o banco de B é removido.
  await page.goto("/conta");
  await page.getByRole("button", { name: "Sair" }).click();
  await page
    .getByRole("dialog", { name: "Sair da conta?" })
    .getByRole("button", { name: "Sair" })
    .click();
  await expect(page).toHaveURL(/\/entrar$/);
  const remaining = await databases(page);
  expect(remaining).not.toContain(b.dbName);
  expect(remaining).toContain(a.dbName);

  // A volta, o servidor responde e a pendência de A é enviada e confirmada.
  mode.fail = false;
  await login(page, MAIN_USER.email, MAIN_USER.senha);
  expect((await local(page)).dbName).toBe(a.dbName);
  await page.evaluate(() => (window as HookWindow).__forjaLocal?.syncNow());
  await expect.poll(() => outbox(page)).toEqual([]);
  expect(sent.map((op) => op.entity_id)).toContain("peso-a");
  expect(new Set(sent.map((op) => op.owner_user_id))).toEqual(new Set([a.userId]));
});
