// Tema claro/escuro (ADR-024): padrão segue o sistema; a escolha manual é uma preferência do
// aparelho (não é dado pessoal) e fica no armazenamento do navegador.

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

const STORAGE_KEY = "forja.tema";

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEME_PREFERENCES.find((value) => value === stored) ?? "system";
  } catch {
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;
}

export function saveThemePreference(preference: ThemePreference): void {
  applyThemePreference(preference);
  try {
    if (preference === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Sem armazenamento disponível: a escolha vale só nesta abertura.
  }
}
