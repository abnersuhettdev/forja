import { useEffect, useState } from "react";
import { usePathname } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { findActiveSession } from "../execution/session.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { activateUpdate, usePwa } from "../pwa/pwa.ts";
import { Button } from "./Button.tsx";
import { Banner } from "./Feedback.tsx";

const T = TEXTS.pwa;

// UX-08 §9: nova versão baixada em segundo plano; "Atualizar" só aparece sem sessão em
// andamento — com sessão, espera ela ser concluída ou descartada.
export function UpdateBanner() {
  const { updateReady } = usePwa();
  const local = useLocalData();
  const pathname = usePathname();
  const [sessionActive, setSessionActive] = useState(true);

  useEffect(() => {
    if (!updateReady) return;
    let active = true;
    const check = local === null ? Promise.resolve(undefined) : findActiveSession(local.db);
    check
      .then((session) => {
        if (active) setSessionActive(session !== undefined);
      })
      .catch(() => {
        // Banco fechado (saída ou troca de usuário): verifica de novo na próxima tela.
      });
    return () => {
      active = false;
    };
  }, [updateReady, local, pathname]);

  if (!updateReady || sessionActive) return null;
  return (
    <Banner
      tone="info"
      action={
        <Button
          variant="ghost"
          onClick={() => {
            void activateUpdate();
          }}
        >
          {T.update}
        </Button>
      }
    >
      {T.updateReady}
    </Banner>
  );
}
