// Ícones do app (UX-08 §3.2; UX-02 §2.3): "F" grafite sobre lima, desenhado em SVG e
// rasterizado pelo Chromium do Playwright (sem dependência nova). Rodar após mudar a arte:
//   node apps/web/scripts/icons.ts
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const LIME = "#A3E635";
const GRAPHITE = "#0E1114";
const OUT = new URL("../public/icones/", import.meta.url);

/**
 * "F" geométrico num quadro de 100 × 100. `scale` reduz a letra em torno do centro: o ícone
 * maskable usa a letra menor para caber na área segura central (UX-08 §3.2).
 */
function svg(scale: number, rounded: boolean): string {
  const glyph = "M30 18 H74 V32 H46 V44 H68 V58 H46 V82 H30 Z"; // haste, barra superior e barra do meio
  const radius = rounded ? 22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${String(radius)}" fill="${LIME}"/>
  <g transform="translate(50 50) scale(${String(scale)}) translate(-52 -50)">
    <path d="${glyph}" fill="${GRAPHITE}"/>
  </g>
</svg>
`;
}

const icons: { file: string; size: number; scale: number; rounded: boolean }[] = [
  { file: "icone-192.png", size: 192, scale: 1, rounded: false },
  { file: "icone-512.png", size: 512, scale: 1, rounded: false },
  { file: "icone-maskable-512.png", size: 512, scale: 0.72, rounded: false },
  { file: "apple-touch-icon-180.png", size: 180, scale: 1, rounded: false },
  { file: "favicon-32.png", size: 32, scale: 1, rounded: true },
];

writeFileSync(new URL("favicon.svg", OUT), svg(1, true));

const browser = await chromium.launch();
try {
  for (const icon of icons) {
    const page = await browser.newPage({
      viewport: { width: icon.size, height: icon.size },
      deviceScaleFactor: 1,
    });
    const markup = svg(icon.scale, icon.rounded).replace(
      "<svg ",
      `<svg width="${String(icon.size)}" height="${String(icon.size)}" `,
    );
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${markup}</body></html>`,
    );
    // Sem transparência só onde é exigido (apple-touch-icon); o fundo lima já é opaco.
    writeFileSync(
      new URL(icon.file, OUT),
      await page.screenshot({ omitBackground: icon.rounded, type: "png" }),
    );
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`Ícones gerados: ${String(icons.length + 1)}`);
