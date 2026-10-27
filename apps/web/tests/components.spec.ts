// Componentes base de UX-06 na vitrine de desenvolvimento.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/_componentes");
});

for (const scheme of ["light", "dark"] as const) {
  test(`vitrine acessível no tema ${scheme} (CA-203)`, async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "axe roda no Chromium");
    await page.emulateMedia({ colorScheme: scheme });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}

test("Stepper soma passos de 2,5 kg, aceita teclado e recusa valor fora do incremento", async ({
  page,
}) => {
  const load = page.getByRole("group", { name: "Carga" });
  const input = load.getByRole("textbox");
  await expect(input).toHaveValue("60");
  await load.getByRole("button", { name: "Aumentar carga" }).click();
  await expect(input).toHaveValue("62,5");
  await input.focus();
  await page.keyboard.press("ArrowDown");
  await expect(input).toHaveValue("60");
  await input.fill("62,3");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("60");
  await input.fill("82,5");
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("82,5");
});

test("diálogo destrutivo foca em Cancelar e fecha com Esc (UX-06 §7)", async ({ page }) => {
  await page.getByRole("button", { name: "Descartar sessão" }).click();
  const dialog = page.getByRole("dialog", { name: "Descartar sessão?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("confirmação breve aparece em região viva com Desfazer", async ({ page }) => {
  await page.getByRole("button", { name: "Mostrar confirmação" }).click();
  const status = page.getByRole("status").filter({ hasText: "Série registrada." });
  await expect(status).toBeVisible();
  await status.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Série registrada.")).toBeHidden();
});

test("campo com erro é associado ao controle (UX-06 §4)", async ({ page }) => {
  const field = page.getByLabel("Nome");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await field.fill("Pessoa Fictícia");
  await expect(field).not.toHaveAttribute("aria-invalid");
});

test("tema escolhido manualmente é aplicado e lembrado (ADR-024)", async ({ page }) => {
  await page.getByRole("button", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Sistema" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
});
