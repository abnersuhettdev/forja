// App instalável (TAR-006): critérios de instalabilidade (CA-219), cabeçalhos de SEG-01 §5
// (CA-216), abertura offline após o primeiro acesso (T-PWA-02), nada pessoal no cache do service
// worker (T-PWA-17), atualização só fora de sessão em andamento (T-PWA-08) e TELA-002.
// Roda no build de produção servido pelo `vite preview` (playwright.pwa.config.ts).
import { readFileSync, writeFileSync } from "node:fs";
import { devices, expect, test, type Page } from "@playwright/test";
import { pwaUser } from "../fixtures.ts";
import { publishProgram } from "../program-fixture.ts";

const SW_FILE = new URL("../../dist-pwa/sw.js", import.meta.url);

async function signIn(page: Page) {
  const user = pwaUser();
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
}

/** Espera o service worker instalado e, após recarregar, controlando a página. */
async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
}

/** Violações da política de conteúdo (CSP) registradas pela página. */
function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });
  return violations;
}

test("instalável: manifest, ícones, service worker e cabeçalhos de segurança (CA-219, CA-216)", async ({
  page,
  request,
}) => {
  // Cabeçalhos (SEG-01 §5) na página, no service worker e no pacote com hash.
  const home = await request.get("/");
  const headers = home.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("script-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toMatch(
    /connect-src 'self' http:\/\/127\.0\.0\.1:\d+/,
  );
  expect(headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  expect(headers["cache-control"]).toBe("no-cache");
  expect((await request.get("/sw.js")).headers()["cache-control"]).toBe("no-cache");
  const html = await home.text();
  const asset = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1] ?? "";
  expect((await request.get(asset)).headers()["cache-control"]).toBe(
    "public, max-age=31536000, immutable",
  );

  // Manifest (UX-08 §3.1) e ícones (§3.2).
  const manifest = (await (await request.get("/manifest.webmanifest")).json()) as {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    id: string;
    display: string;
    lang: string;
    theme_color: string;
    background_color: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest).toMatchObject({
    name: "Forja — Treinos",
    short_name: "Forja",
    start_url: "/hoje?origem=app",
    scope: "/",
    id: "/",
    display: "standalone",
    lang: "pt-BR",
    theme_color: "#0E1114",
    background_color: "#0E1114",
  });
  expect(manifest.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual([
    "192x192 any",
    "512x512 any",
    "512x512 maskable",
  ]);
  for (const src of [
    ...manifest.icons.map((i) => i.src),
    "/icones/apple-touch-icon-180.png",
    "/icones/favicon-32.png",
  ]) {
    const icon = await request.get(src);
    expect([src, icon.status(), icon.headers()["content-type"]]).toEqual([src, 200, "image/png"]);
  }
  expect((await request.get("/icones/favicon.svg")).status()).toBe(200);

  // Service worker controla todo o escopo e o próprio Chromium não aponta impedimentos.
  await page.goto("/entrar");
  await controlled(page);
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistration())?.scope,
  );
  expect(scope).toBe("http://localhost:4173/");
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = (await cdp.send("Page.getInstallabilityErrors")) as {
    installabilityErrors: { errorId: string }[];
  };
  expect(installabilityErrors.map((e) => e.errorId)).toEqual([]);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test("abre offline após o primeiro acesso, sem violar a CSP e sem dados pessoais no cache (T-PWA-02, T-PWA-17)", async ({
  page,
  context,
}) => {
  const user = pwaUser();
  await publishProgram(user.email);
  const violations = watchCsp(page);
  await signIn(page);
  await expect(page.getByText("Treino A").first()).toBeVisible();

  // Telas principais online, sob a CSP do build de produção.
  for (const path of [
    "/treinos",
    "/agenda",
    "/evolucao",
    "/conta",
    "/conta/sincronizacao",
    "/conta/instalar",
    "/gestao/programa",
    "/gestao/catalogo",
    "/gestao/perfil",
    "/hoje",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Algo deu errado nesta tela")).toHaveCount(0);
  }
  await controlled(page);
  expect(violations).toEqual([]);

  // Sem rede, recarregar abre o app pelo pacote em cache, com os dados do aparelho.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Treino A").first()).toBeVisible();
  await page.goto("/gestao/perfil");
  await expect(page.getByText(/A área de gestão precisa de conexão/)).toBeVisible();
  await context.setOffline(false);

  // ADR-028 L4: o cache do service worker só tem o pacote do app (mesma origem, sem API).
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) urls.push(request.url);
    }
    return urls;
  });
  expect(cached.length).toBeGreaterThan(10);
  const foreign = cached.filter(
    (url) =>
      !url.startsWith("http://localhost:4173/") ||
      /\/(rest|auth|functions|storage)\/v1\//.test(url) ||
      url.includes(user.email),
  );
  expect(foreign).toEqual([]);
});

test("versão nova só é oferecida sem sessão em andamento (T-PWA-08, UX-08 §9)", async ({
  page,
}) => {
  const user = pwaUser();
  await publishProgram(user.email);
  await signIn(page);
  await controlled(page);

  // Sessão em andamento.
  await page.getByRole("button", { name: "Iniciar treino" }).click();
  await expect(page).toHaveURL(/\/sessao$/);
  await page.getByRole("button", { name: "Minimizar" }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  // Publica uma "versão nova" do service worker e pede a verificação.
  const original = readFileSync(SW_FILE, "utf8");
  try {
    writeFileSync(SW_FILE, `${original}\n// versão de teste ${String(Date.now())}\n`);
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    await expect
      .poll(() =>
        page.evaluate(
          async () => (await navigator.serviceWorker.getRegistration())?.waiting != null,
        ),
      )
      .toBe(true);

    // Com a sessão em andamento, nenhuma oferta de atualização.
    const banner = page.getByText("Nova versão disponível.");
    await page.getByRole("link", { name: "Treinos" }).first().click();
    await page.getByRole("link", { name: "Hoje" }).first().click();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
    await expect(banner).toHaveCount(0);

    // Descartada a sessão, a oferta aparece e "Atualizar" ativa a versão nova.
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Mais opções" }).click();
    await page.getByRole("button", { name: "Descartar sessão" }).click();
    await page
      .getByRole("dialog", { name: "Descartar a sessão?" })
      .getByRole("button", { name: "Descartar sessão" })
      .click();
    await expect(page).toHaveURL(/\/hoje$/);
    await expect(banner).toBeVisible();
    await page.getByRole("button", { name: "Atualizar" }).click();
    await expect
      .poll(() =>
        page
          .evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting == null)
          // "Atualizar" recarrega a página: durante a recarga, a consulta falha e é repetida.
          .catch(() => false),
      )
      .toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(banner).toHaveCount(0);
  } finally {
    writeFileSync(SW_FILE, original);
  }
});

test.describe("celular Android sem o evento de instalação", () => {
  test.use({ userAgent: devices["Pixel 7"].userAgent });

  test("Hoje sugere instalar uma vez; TELA-002 mostra os passos (RF-090, UX-08 §4)", async ({
    page,
  }) => {
    const user = pwaUser();
    await publishProgram(user.email);
    await signIn(page);
    const banner = page.getByText(/Instale o Forja na tela inicial/);
    await expect(banner).toBeVisible();
    await page.getByRole("button", { name: "Como instalar" }).click();
    await expect(page).toHaveURL(/\/conta\/instalar$/);
    await expect(page.getByRole("main").getByRole("list")).toContainText(
      "Adicionar à tela inicial",
    );

    // A sugestão aparece no máximo uma vez.
    await page.goto("/hoje");
    await expect(page.getByText("Treino A").first()).toBeVisible();
    await expect(banner).toHaveCount(0);
  });
});
