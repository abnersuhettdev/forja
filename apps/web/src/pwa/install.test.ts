import { describe, expect, it } from "vitest";
import { installMode } from "./install.ts";

const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const INSTAGRAM = `${IPHONE} Instagram 350.0`;
const ANDROID_WEBVIEW =
  "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("installMode (UX-08 §4)", () => {
  it("já instalado vence qualquer outra situação", () => {
    expect(installMode(ANDROID, true, true)).toBe("installed");
    expect(installMode(IPHONE, false, false, true)).toBe("installed");
  });

  it("navegador interno de outro aplicativo pede para abrir no Safari ou no Chrome", () => {
    expect(installMode(INSTAGRAM, false, false)).toBe("in-app");
    expect(installMode(ANDROID_WEBVIEW, false, false)).toBe("in-app");
  });

  it("com evento de instalação, botão Instalar; sem ele, instruções por plataforma", () => {
    expect(installMode(ANDROID, false, true)).toBe("prompt");
    expect(installMode(ANDROID, false, false)).toBe("manual");
    expect(installMode(IPHONE, false, false)).toBe("ios");
    expect(installMode(DESKTOP, false, false)).toBe("desktop");
    expect(installMode(DESKTOP, false, true)).toBe("prompt");
  });
});
