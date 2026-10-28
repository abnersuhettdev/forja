// Situação de instalação por navegador (UX-08 §4; TELA-002).

export type InstallMode = "installed" | "prompt" | "ios" | "in-app" | "manual" | "desktop";

/** Situação de instalação deste navegador (UX-08 §4). */
export function installMode(
  userAgent: string,
  standalone: boolean,
  hasPrompt: boolean,
  installed = false,
): InstallMode {
  if (standalone || installed) return "installed";
  // Navegadores internos de outros aplicativos (redes sociais, mensageiros).
  if (/FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|TikTok|; wv\)/i.test(userAgent)) return "in-app";
  if (hasPrompt) return "prompt";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "manual";
  return "desktop";
}
