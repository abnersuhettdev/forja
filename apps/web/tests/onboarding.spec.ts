// Configuração inicial e Conta (TAR-011): JOR-08 / CA-301, CA-009, CA-005 e TELA-004.
// Usuários fictícios (RN-037); o de primeiro acesso é reiniciado antes do teste.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";
import { firstAccessUser, MAIN_USER } from "./fixtures.ts";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("primeiro acesso", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("assistente de 7 etapas até Hoje, com progresso salvo no aparelho (JOR-08, CA-009, CA-301)", async ({
    page,
    context,
    browserName,
  }) => {
    test.setTimeout(90_000); // jornada completa com várias telas
    const user = firstAccessUser(browserName);
    execFileSync(process.execPath, ["scripts/db/seed-fixtures.ts", "--reset", user.email], {
      cwd: ROOT,
    });
    await login(page, user.email, user.senha);
    await expect(page).toHaveURL(/\/configuracao-inicial$/, { timeout: 15_000 });
    await expect(page.getByText("Etapa 1 de 7")).toBeVisible();
    if (browserName === "chromium") await expectAccessible(page);

    // Etapa 1: obrigatórios e idade mínima (RN-010).
    const next = page.getByRole("button", { name: "Continuar" });
    await next.click();
    await expect(page.getByText("Preencha este campo.")).toHaveCount(2);
    await page.getByLabel("Nome").fill("Pessoa Fictícia Nova");
    await page.getByLabel("Data de nascimento").fill("2010-01-01");
    await next.click();
    await expect(page.getByText("O app é destinado a maiores de 18 anos.")).toBeVisible();
    await page.getByLabel("Data de nascimento").fill("1992-03-15");
    await page.getByLabel("Prefiro não informar").check();
    await next.click();

    // Etapa 2 é opcional: pular.
    await expect(page.getByRole("heading", { name: "Objetivo" })).toBeVisible();
    await page.getByLabel(/^Hipertrofia/).check();
    await page.getByRole("button", { name: "Pular" }).click();

    // Etapa 3, e o progresso sobrevive a fechar e reabrir o app.
    await expect(page.getByText("Etapa 3 de 7")).toBeVisible();
    await page.getByLabel("Dias de treino por semana").fill("4");
    await page.getByLabel("Seg").check();
    await page.reload();
    await expect(page.getByText("Etapa 3 de 7")).toBeVisible();
    await expect(page.getByLabel("Dias de treino por semana")).toHaveValue("4");
    await expect(page.getByLabel("Seg")).toBeChecked();
    await page.getByLabel("Tempo por sessão (min)").fill("10");
    await next.click();
    await expect(page.getByText("Informe um valor entre 15 e 180 min.")).toBeVisible();
    await page.getByLabel("Tempo por sessão (min)").fill("60");
    await next.click();

    // Etapa 4: o local pré-seleciona equipamentos (TRN-01 §3.4).
    await page.getByLabel("Em casa").check();
    await expect(page.getByLabel("Halteres")).toBeChecked();
    await expect(page.getByLabel("Barra fixa")).not.toBeChecked();
    await next.click();

    // Etapa 5.
    await page.getByLabel("Nenhuma restrição").check();
    await next.click();

    // Etapa 6: peso atual obrigatório, com faixa (RN-018).
    await next.click();
    await expect(page.getByText("Preencha este campo.")).toBeVisible();
    await page.getByLabel("Altura (cm)").fill("172");
    await page.getByLabel("Peso atual (kg)").fill("81,7");
    await next.click();

    // Etapa 7: aviso de saúde; concluir exige conexão.
    await expect(page.getByText(/não substitui a orientação de um profissional/)).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByRole("button", { name: "Entendi, concluir" })).toBeDisabled();
    await expect(page.getByText(/Conecte-se para concluir/).first()).toBeVisible();
    await context.setOffline(false);
    await page.getByRole("button", { name: "Entendi, concluir" }).click();
    // ADR-095: no modo Automático, a configuração inicial termina em Meu plano.
    await expect(page).toHaveURL(/\/plano$/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Gerar minha rotina" })).toBeVisible();

    // No servidor: aluno próprio, perfil, avaliação inicial, peso inicial e descanso de 48 h.
    const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
    try {
      const [row] = await sql`
        select s.full_name, s.is_self, p.goal, p.days_per_week, p.preferred_weekdays,
               p.training_location, p.restrictions_declared,
               (select count(*)::int from public.assessments a where a.student_id = s.id and a.kind = 'initial') as assessments,
               (select weight_kg::float8 from public.weight_entries w where w.student_id = s.id) as weight,
               (select default_hours from public.rest_settings r where r.student_id = s.id) as rest
        from public.students s
        join public.training_profiles p on p.student_id = s.id
        where s.user_id = (select id from auth.users where email = ${user.email})`;
      expect(row).toEqual({
        full_name: "Pessoa Fictícia Nova",
        is_self: true,
        goal: "hypertrophy",
        days_per_week: 4,
        preferred_weekdays: [1],
        training_location: "home",
        restrictions_declared: "none",
        assessments: 1,
        weight: 81.7,
        rest: 48,
      });
    } finally {
      await sql.end();
    }

    // Já configurado: a rota da configuração inicial leva a Meu plano (ADR-095).
    await page.goto("/configuracao-inicial");
    await expect(page).toHaveURL(/\/plano$/);
  });
});

test.describe("Conta", () => {
  test("chave de área alterna entre Meu treino e Gestão sem novo login (CA-005)", async ({
    page,
  }) => {
    // Pela chave do cabeçalho…
    await page.goto("/hoje");
    const header = page.getByRole("navigation", { name: "Área" });
    await header.getByRole("link", { name: "Gestão" }).click();
    await expect(page).toHaveURL(/\/gestao\/programa$/);
    await header.getByRole("link", { name: "Meu treino" }).click();
    await expect(page).toHaveURL(/\/hoje$/);
    // …e pela escolha de área na Conta.
    await page.goto("/conta");
    // A escolha navega para a área: clicar (e não "check", que esperaria o controle continuar marcado).
    await page.getByRole("group", { name: "Área" }).getByLabel("Gestão").click();
    await expect(page).toHaveURL(/\/gestao\/programa$/);
  });

  test("aparência, Sobre e privacidade e estado da sincronização (TELA-004)", async ({
    page,
    browserName,
  }) => {
    await page.goto("/conta");
    await expect(page.getByText(MAIN_USER.email)).toBeVisible();
    await expect(page.getByRole("link", { name: /Sincronização/ })).toContainText("Tudo enviado");
    await page.getByRole("group", { name: "Aparência" }).getByLabel("Escuro").check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("group", { name: "Aparência" }).getByLabel("Sistema").check();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await page.getByText("Sobre e privacidade").click();
    await expect(page.getByText(/Mantenha o bloqueio de tela/)).toBeVisible();
    if (browserName === "chromium") await expectAccessible(page);
  });
});
