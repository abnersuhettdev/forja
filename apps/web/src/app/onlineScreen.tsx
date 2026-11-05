import { useEffect, useState, type ComponentType } from "react";
import { ErrorState, Skeleton } from "../components/Feedback.tsx";
import type { NavArea } from "./navigation.ts";
import { TEXTS } from "./texts.ts";
import { useOnline } from "./useOnline.ts";

export interface ScreenProps {
  readonly area: NavArea;
  readonly params: Readonly<Record<string, string>>;
}

/**
 * Tela que só funciona online (RF-093), fora do pacote inicial (SEG-04 §2: JavaScript inicial
 * ≤ 200 KB). Sem conexão e ainda não carregada, mostra o aviso da área — não a tela de erro — e
 * carrega sozinha quando a conexão volta.
 */
export function onlineScreen<K extends string>(
  load: () => Promise<Record<K, ComponentType<ScreenProps>>>,
  key: K,
  /** Fora do pacote inicial, mas guardada pelo service worker: abre também sem conexão. */
  alsoOffline = false,
): ComponentType<ScreenProps> {
  let loaded: ComponentType<ScreenProps> | null = null;

  return function OnlineScreen(props: ScreenProps) {
    const online = useOnline();
    const [Screen, setScreen] = useState(() => loaded);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
      if (Screen !== null || (!online && !alsoOffline)) return;
      let active = true;
      setFailed(false);
      load().then(
        (module) => {
          loaded = module[key];
          if (active) setScreen(() => loaded);
        },
        () => {
          if (active) setFailed(true);
        },
      );
      return () => {
        active = false;
      };
    }, [Screen, online, attempt]);

    if (Screen !== null) return <Screen {...props} />;
    if ((!online && !alsoOffline) || failed) {
      return (
        <ErrorState
          title={TEXTS.error.title}
          description={
            props.area === "gestao" ? TEXTS.program.managementOffline : TEXTS.error.needsConnection
          }
          onRetry={() => {
            setAttempt((n) => n + 1);
          }}
        />
      );
    }
    return <Skeleton lines={6} />;
  };
}
