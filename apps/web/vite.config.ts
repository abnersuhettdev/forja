import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Versão do app (package.json), nos relatos técnicos (API-030).
const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

/** Cache das imagens de exercícios (UX-08 §6.1); o mesmo nome é usado em offline.ts. */
const IMAGE_CACHE = "forja-imagens-v1";

/**
 * Cabeçalhos de SEG-01 §5 (ADR-071), no formato `_headers` da hospedagem (Cloudflare Pages).
 * `connect-src` recebe o endereço do backend configurado no build.
 */
function headerRules(backendUrl: string): Record<string, Record<string, string>> {
  const backend = backendUrl === "" ? "" : ` ${new URL(backendUrl).origin}`;
  return {
    "/*": {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        `connect-src 'self'${backend}`,
        "worker-src 'self'",
        "manifest-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    },
    // Pacote com hash no nome: longo e imutável; página e service worker sem cache longo.
    "/assets/*": { "Cache-Control": "public, max-age=31536000, immutable" },
    "/": { "Cache-Control": "no-cache" },
    "/index.html": { "Cache-Control": "no-cache" },
    "/sw.js": { "Cache-Control": "no-cache" },
    "/manifest.webmanifest": { "Cache-Control": "no-cache" },
  };
}

function headersFile(rules: Record<string, Record<string, string>>): string {
  return Object.entries(rules)
    .map(
      ([path, headers]) =>
        `${path}\n${Object.entries(headers)
          .map(([name, value]) => `  ${name}: ${value}`)
          .join("\n")}`,
    )
    .join("\n\n")
    .concat("\n");
}

function matches(pattern: string, path: string): boolean {
  return pattern.endsWith("*") ? path.startsWith(pattern.slice(0, -1)) : path === pattern;
}

/** Gera `dist/_headers` e aplica as mesmas regras no `vite preview` (verificação local). */
function securityHeaders(backendUrl: string): Plugin {
  const rules = headerRules(backendUrl);
  return {
    name: "forja-security-headers",
    writeBundle(options) {
      writeFileSync(`${options.dir ?? "dist"}/_headers`, headersFile(rules));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "/").split("?")[0] ?? "/";
        for (const [pattern, headers] of Object.entries(rules)) {
          if (!matches(pattern, path)) continue;
          for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [
      react(),
      VitePWA({
        // O app registra e decide quando ativar a nova versão (UX-08 §9).
        injectRegister: false,
        registerType: "prompt",
        includeAssets: ["icones/favicon.svg", "icones/apple-touch-icon-180.png"],
        manifest: {
          id: "/",
          name: "Forja — Treinos",
          short_name: "Forja",
          description: "Planeje, execute e registre seus treinos.",
          lang: "pt-BR",
          dir: "ltr",
          start_url: "/hoje?origem=app",
          scope: "/",
          display: "standalone",
          orientation: "any",
          theme_color: "#0E1114",
          background_color: "#0E1114",
          categories: ["health", "fitness", "sports"],
          icons: [
            { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            {
              src: "/icones/icone-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // Pacote do app (UX-08 §6.1): HTML, JS, CSS, fontes e ícones; nunca respostas da API
          // nem dados pessoais (ADR-028 L4, T-PWA-17).
          globPatterns: ["**/*.{html,js,css,woff2,svg,png,webmanifest}"],
          // Subconjunto vietnamita das fontes: nunca usado por textos em pt-BR (unicode-range).
          globIgnores: ["**/*-vietnamese-*.woff2"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/licencas\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Imagens de exercícios do próprio app (não pessoais), pré-baixadas por offline.ts.
              urlPattern: ({ sameOrigin, request }) =>
                sameOrigin && request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: IMAGE_CACHE,
                expiration: { maxEntries: 400 },
              },
            },
          ],
        },
      }),
      securityHeaders(env.VITE_SUPABASE_URL ?? ""),
    ],
    define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(version) },
    build: {
      target: "es2022",
      sourcemap: true,
    },
  };
});
