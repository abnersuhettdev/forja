import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

export { installMode, type InstallMode } from "./install.ts";

// Service worker, atualização (UX-08 §9) e instalação (UX-08 §4, RF-090).

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
  /** Nova versão baixada, aguardando ativação. */
  readonly updateReady: boolean;
  /** Evento de instalação guardado (Chromium/Android). */
  readonly installPrompt: BeforeInstallPromptEvent | null;
  readonly installed: boolean;
}

let state: PwaState = { updateReady: false, installPrompt: null, installed: false };
const listeners = new Set<() => void>();
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;

function set(next: Partial<PwaState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, () => state);
}

/** Já em modo instalado (`display-mode: standalone` ou o equivalente do iPhone). */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** Ativa a versão nova e recarrega (só chamado fora de sessão em andamento — UX-08 §9). */
export async function activateUpdate(): Promise<void> {
  await applyUpdate?.(true);
}

export async function promptInstall(): Promise<boolean> {
  const event = state.installPrompt;
  if (event === null) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  set({ installPrompt: null, installed: outcome === "accepted" });
  return outcome === "accepted";
}

/** Registra o service worker e guarda o evento de instalação. Chamado uma vez em main.tsx. */
export function startPwa(): void {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    set({ installPrompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => {
    set({ installPrompt: null, installed: true });
  });
  if (!("serviceWorker" in navigator)) return;
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh: () => {
      set({ updateReady: true });
    },
  });
}
