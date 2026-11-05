// Qualidade transversal (TAR-024) nas telas `ESS` com dados reais (não só estados vazios):
// axe sem violações críticas/sérias nos dois temas (CA-203), sem rolagem horizontal em 360,
// 390, 768 e 1280 px (CA-201), tamanhos de texto e de alvos (CA-202) e confirmação de série
// em até 100 ms sem rede (CA-207).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { addDays, toLocalDate } from "../../../packages/domain/src/index.ts";
import { localStatus } from "../../../scripts/db/local.ts";
import { qualityUser } from "./fixtures.ts";

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial", timeout: 240_000 });

const TZ = "America/Sao_Paulo";

async function withDb<T>(run: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    return await run(sql);
  } finally {
    await sql.end();
  }
}

interface Data {
  workoutId: string;
  exerciseId: string;
  sessionId: string;
  sessionDay: string;
}

/** Programa, avaliação inicial, pesos e uma sessão concluída há 3 dias. */
async function setUp(email: string): Promise<Data> {
  return withDb(async (sql) => {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    const id = student.id;
    const today = toLocalDate(new Date(), TZ);
    await sql`delete from public.sessions where student_id = ${id}`;
    await sql`delete from public.programs where student_id = ${id}`;
    await sql`delete from public.weight_entries where student_id = ${id}`;
    await sql`delete from public.assessments where student_id = ${id}`;
    await sql`
      update public.training_profiles
      set goal_weight_kg = 78, days_per_week = 3, preferred_weekdays = '{1,3,5}'
      where student_id = ${id}`;
    const [bench] = await sql<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    const exerciseId = bench?.id ?? "";
    const [programId, versionId, workoutId, itemId] = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ];
    await sql`insert into public.programs (id, student_id) values (${programId}, ${id})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${id}, 'Programa de qualidade fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s,
         suggested_load_kg)
      values (${itemId}, ${workoutId}, 1, ${exerciseId}, 'reps', 3, 8, 12, 60, 40)`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    const assessment = crypto.randomUUID();
    await sql`
      insert into public.assessments (id, student_id, assessed_on, kind, weight_kg, profile_snapshot)
      values (${assessment}, ${id}, ${addDays(today, -60)}, 'initial', 85, '{}'::jsonb)`;
    await sql`
      insert into public.weight_entries (id, student_id, measured_on, weight_kg, source, assessment_id)
      values (${crypto.randomUUID()}, ${id}, ${addDays(today, -60)}, 85, 'assessment', ${assessment})`;
    for (const [days, kg] of [
      [30, 83.8],
      [10, 82.9],
    ] as const) {
      await sql`
        insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
        values (${crypto.randomUUID()}, ${id}, ${addDays(today, -days)}, ${kg}, 'manual')`;
    }
    const sessionId = crypto.randomUUID();
    const seId = crypto.randomUUID();
    // Três dias: com dois, o descanso sugerido de 48 h ainda vale de manhã e esconde "Iniciar treino".
    const start = new Date(Date.now() - 3 * 86_400_000);
    start.setUTCHours(13, 0, 0, 0);
    const end = new Date(start.getTime() + 45 * 60_000);
    await sql`
      insert into public.sessions
        (id, student_id, program_version_id, workout_id, status, started_at, ended_at,
         duration_min, last_activity_at, rpe, notes, device_id)
      values (${sessionId}, ${id}, ${versionId}, ${workoutId}, 'completed', ${start}, ${end}, 45,
              ${end}, 7, 'Sessão fictícia', ${crypto.randomUUID()})`;
    await sql`
      insert into public.session_exercises (id, session_id, workout_item_id, exercise_id, position, status)
      values (${seId}, ${sessionId}, ${itemId}, ${exerciseId}, 1, 'done')`;
    await sql`
      insert into public.set_logs (id, session_exercise_id, set_number, load_kg, reps, completed_at)
      values (${crypto.randomUUID()}, ${seId}, 1, 40, 10, ${end})`;
    return { workoutId, exerciseId, sessionId, sessionDay: toLocalDate(start, TZ) };
  });
}

async function signIn(page: Page, email: string, senha: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page.getByRole("button", { name: "Iniciar treino" })).toBeVisible();
}

/** Navegação dentro do app (mantém a sessão e os dados do aparelho). */
async function open(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState(null, "", to);
    window.dispatchEvent(new Event("forja:navigate"));
  }, path);
  await expect(page.locator("main")).not.toContainText("Carregando", { timeout: 15_000 });
  await expect(page.locator("main [aria-busy='true'], main [class*='skeleton']")).toHaveCount(0, {
    timeout: 15_000,
  });
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/**
 * Alvos menores que o mínimo (UX-07): ≥ 44 px no app e ≥ 48 px na execução. Links dentro de
 * frases são exceção do WCAG (alvo em linha de texto).
 */
const smallTargets = (page: Page, minimum: number) =>
  page.evaluate((min) => {
    const nodes = document.querySelectorAll<HTMLElement>(
      "button, a[href], input:not([type=hidden]), select, textarea, [role=radio], [role=checkbox]",
    );
    const small: string[] = [];
    for (const node of nodes) {
      if (node.closest("p, [data-inline-link], dialog:not([open])")) continue;
      const box = node.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      // Rádio/caixa nativos valem pelo rótulo inteiro.
      const target =
        (node instanceof HTMLInputElement && (node.type === "radio" || node.type === "checkbox")
          ? node.closest("label")?.getBoundingClientRect()
          : null) ?? box;
      if (target.height < min - 0.5 || target.width < min - 0.5) {
        const label = (node.getAttribute("aria-label") ?? node.textContent).trim();
        small.push(
          `${label.slice(0, 30)} ${String(Math.round(target.width))}×${String(Math.round(target.height))}`,
        );
      }
    }
    return small;
  }, minimum);

/** Texto de corpo ≥ 16 px; nada abaixo de 14 px (legendas — UX-02). */
const smallText = (page: Page) =>
  page.evaluate(() => {
    const issues: string[] = [];
    const walker = document.createTreeWalker(
      document.querySelector("main") ?? document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      const text = walker.currentNode.textContent?.trim() ?? "";
      if (!parent || text === "" || parent.closest("svg")) continue;
      const style = getComputedStyle(parent);
      if (style.visibility === "hidden" || parent.getBoundingClientRect().height === 0) continue;
      if (parseFloat(style.fontSize) < 14) issues.push(`${text.slice(0, 25)} ${style.fontSize}`);
    }
    return issues;
  });

test("telas com dados: axe nos dois temas, larguras e tamanhos (CA-201, CA-202, CA-203)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "axe e medições de layout rodam no Chromium");
  const user = qualityUser(browserName);
  const data = await setUp(user.email);
  // CA-217: nenhum dado pessoal em endereços de requisição (e-mail ou nome do usuário).
  const urls: string[] = [];
  page.on("request", (request) => {
    urls.push(decodeURIComponent(request.url()));
  });
  await page.setViewportSize({ width: 360, height: 740 });
  await signIn(page, user.email, user.senha);

  const routes = [
    "/hoje",
    "/treinos",
    `/treinos/${data.workoutId}`,
    `/exercicios/${data.exerciseId}`,
    "/agenda",
    `/agenda/${data.sessionDay}`,
    `/sessoes/${data.sessionId}/editar`,
    "/evolucao",
    "/conta",
    "/conta/senha",
    "/conta/descanso",
    "/conta/sincronizacao",
    "/gestao/programa",
    "/gestao/catalogo",
    "/gestao/catalogo/novo",
    "/gestao/perfil",
    "/gestao/perfil/avaliacao",
  ];
  const report: Record<string, string[]> = {};
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const route of routes) {
      await open(page, route);
      const problems = [
        ...(await axe(page)).map((v) => `axe ${v}`),
        ...(scheme === "light" ? (await smallTargets(page, 44)).map((t) => `alvo ${t}`) : []),
        ...(scheme === "light" ? (await smallText(page)).map((t) => `texto ${t}`) : []),
      ];
      if (problems.length > 0) report[`${scheme} ${route}`] = problems;
    }
  }

  // Folhas e diálogos principais: escolher treino, registrar peso, opções de saída.
  await page.emulateMedia({ colorScheme: "light" });
  await open(page, "/hoje");
  await page.getByRole("button", { name: "Escolher outro treino" }).click();
  report["folha escolher treino"] = await axe(page);
  await page.keyboard.press("Escape");
  await open(page, "/evolucao");
  await page.getByRole("button", { name: "Registrar peso" }).first().click();
  report["folha registrar peso"] = await axe(page);
  await page.keyboard.press("Escape");

  // Larguras: sem rolagem horizontal (CA-201).
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await open(page, route);
      const overflow = await horizontalOverflow(page);
      if (overflow > 0)
        report[`largura ${String(width)} ${route}`] = [`excede ${String(overflow)} px`];
    }
  }

  // Execução: alvos ≥ 48 px e números ≥ 32 px (CA-202).
  await page.setViewportSize({ width: 360, height: 740 });
  await open(page, "/hoje");
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page).toHaveURL(/\/sessao$/);
  report["execução axe"] = await axe(page);
  const execTargets = (await smallTargets(page, 48)).filter((t) => !t.startsWith("Orientações"));
  if (execTargets.length > 0) report["execução alvos"] = execTargets;
  const metric = await page
    .getByRole("textbox", { name: "Carga", exact: true })
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(metric).toBeGreaterThanOrEqual(32);
  await page.getByRole("button", { name: "Mais opções" }).click();
  await page.getByRole("button", { name: "Descartar sessão" }).click();
  await page
    .getByRole("dialog", { name: "Descartar a sessão?" })
    .getByRole("button", { name: "Descartar sessão" })
    .click();

  const personal = urls.filter(
    (url) =>
      url.includes(user.email) ||
      url.includes(user.email.split("@")[0] ?? "") ||
      url.includes("Pessoa Fictícia"),
  );
  if (personal.length > 0) report["dados pessoais em URL"] = personal;
  expect(urls.length).toBeGreaterThan(20);

  const failures = Object.entries(report).filter(([, problems]) => problems.length > 0);
  expect(Object.fromEntries(failures)).toEqual({});
});

test("confirmação da série em até 100 ms, sem rede (CA-207, RNF-007)", async ({
  page,
  context,
  browserName,
}) => {
  const user = qualityUser(browserName);
  await setUp(user.email);
  await page.setViewportSize({ width: 360, height: 740 });
  await signIn(page, user.email, user.senha);
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page.getByRole("button", { name: "Concluir série 1" })).toBeVisible();
  await context.setOffline(true);

  const samples: number[] = [];
  for (const n of [1, 2, 3]) {
    if (n > 1) await page.getByRole("button", { name: "Pular" }).click();
    const button = page.getByRole("button", { name: `Concluir série ${String(n)}` });
    await expect(button).toBeVisible();
    // Do toque até o texto de confirmação aparecer na tela, medido no próprio navegador.
    const elapsed = await button.evaluate(
      (el) =>
        new Promise<number>((resolve) => {
          const region: Element =
            document.querySelector("[role=status][aria-live]") ?? document.body;
          let started = 0;
          const observer = new MutationObserver(() => {
            if (started > 0 && region.textContent.includes("Série registrada.")) {
              observer.disconnect();
              requestAnimationFrame(() => {
                resolve(performance.now() - started);
              });
            }
          });
          observer.observe(region, { childList: true, subtree: true, characterData: true });
          started = performance.now();
          (el as HTMLButtonElement).click();
        }),
    );
    samples.push(Math.round(elapsed));
    await expect(page.getByText("Série registrada.")).toBeVisible();
  }
  test.info().annotations.push({
    type: "confirmacao-ms",
    description: `${browserName}: ${samples.join(", ")}`,
  });
  console.log(`CONFIRMACAO ${browserName} ${samples.join(", ")} ms`);
  // Mediana das três: a primeira inclui o aquecimento do banco local. O WebKit do Playwright no
  // Windows tem banco local bem mais lento que o Safari do iPhone: lá o número só é registrado,
  // e a meta é verificada no aparelho real (TAR-025).
  const median = [...samples].sort((a, b) => a - b)[1] ?? 0;
  if (browserName === "chromium") expect(median).toBeLessThanOrEqual(100);
});
