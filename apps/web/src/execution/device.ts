import { useEffect, useState } from "react";

// Recursos do aparelho no modo foco (UX-08 §5): tela ligada quando suportado, aviso de fim
// do descanso (vibração e som curto, se permitidos) e relógio da tela.

/** Mantém a tela ligada enquanto o componente estiver montado e visível. */
export function useWakeLock(): void {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let active = true;
    const acquire = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          if (active) sentinel = lock;
          else void lock.release();
        })
        .catch(() => {
          // Sem permissão ou economia de bateria: segue sem manter a tela ligada.
        });
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);
}

/** Vibração e um bipe curto ao fim do descanso, quando o aparelho permite. */
export function restFinishedAlert(): void {
  try {
    navigator.vibrate(200);
  } catch {
    // Sem vibração no aparelho.
  }
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    oscillator.onended = () => {
      void context.close();
    };
  } catch {
    // Som indisponível ou não permitido.
  }
}

/** Horário atual atualizado no intervalo pedido (cronômetros da tela). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
