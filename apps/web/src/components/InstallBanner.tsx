import { useState } from "react";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { installMode, isStandalone, usePwa } from "../pwa/pwa.ts";
import { Button } from "./Button.tsx";
import { Banner } from "./Feedback.tsx";

const T = TEXTS.pwa;
// Preferência do aparelho (não é dado do usuário): permanece após a saída da conta.
const SHOWN_KEY = "forja.instalacao.sugerida";

function alreadyShown(): boolean {
  try {
    return localStorage.getItem(SHOWN_KEY) !== null;
  } catch {
    return true;
  }
}

function markShown(): void {
  try {
    localStorage.setItem(SHOWN_KEY, "1");
  } catch {
    // Armazenamento indisponível: a sugestão pode reaparecer, sem prejuízo.
  }
}

// UX-08 §4 e UX-04: sugestão de instalação em Hoje, no máximo uma vez, dispensável; nunca no
// computador nem no app já instalado (o item em Conta continua disponível).
export function InstallBanner() {
  const { installPrompt, installed } = usePwa();
  const mode = installMode(navigator.userAgent, isStandalone(), installPrompt !== null, installed);
  const [visible, setVisible] = useState(() => {
    if (mode === "installed" || mode === "desktop" || alreadyShown()) return false;
    markShown();
    return true;
  });
  if (!visible || mode === "installed") return null;
  return (
    <Banner
      tone="info"
      action={
        <Button
          variant="ghost"
          onClick={() => {
            navigate("/conta/instalar");
          }}
        >
          {mode === "prompt" ? T.installAction : T.howTo}
        </Button>
      }
      onDismiss={() => {
        setVisible(false);
      }}
    >
      {T.installBanner}
    </Banner>
  );
}
