import { describe, expect, it } from "vitest";
import { initialScripts } from "./check-budget.ts";

describe("orçamento de JS inicial (SEG-04 §2)", () => {
  it("conta o script de entrada e os modulepreload, não estilos nem manifest", () => {
    const html = `<head>
      <script type="module" crossorigin src="/assets/index-a.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/runtime-b.js">
      <link rel="stylesheet" crossorigin href="/assets/index-c.css">
      <link rel="manifest" href="/manifest.webmanifest"></head>`;
    expect(initialScripts(html)).toEqual(["assets/index-a.js", "assets/runtime-b.js"]);
  });
});
