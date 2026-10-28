import { CircleCheck, EllipsisVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import type { ReactNode } from "react";
import { TEXTS } from "../app/texts.ts";
import { Button } from "../components/Button.tsx";
import { Banner } from "../components/Feedback.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { installMode, isStandalone, promptInstall, usePwa } from "../pwa/pwa.ts";
import styles from "./Screens.module.css";

const T = TEXTS.pwa;

function Steps({ steps, icons }: { steps: readonly string[]; icons: readonly ReactNode[] }) {
  return (
    <ol className={styles.installSteps}>
      {steps.map((step, index) => (
        <li key={step}>
          <span className={styles.installIcon} aria-hidden="true">
            {icons[index]}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

// TELA-002 — Instalar o app (RF-090; UX-08 §4): conteúdo conforme o navegador.
export function InstallScreen() {
  const { installPrompt, installed } = usePwa();
  const show = useSnackbar();
  const mode = installMode(navigator.userAgent, isStandalone(), installPrompt !== null, installed);

  if (mode === "installed") {
    return (
      <div className={styles.stack}>
        <p className={styles.installDone}>
          <CircleCheck size={24} aria-hidden="true" />
          {T.installed}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <p>{T.intro}</p>
      {mode === "prompt" ? (
        <Button
          onClick={() => {
            void promptInstall().then((accepted) => {
              if (accepted) show({ text: T.accepted });
            });
          }}
        >
          {T.install}
        </Button>
      ) : null}
      {mode === "in-app" ? <Banner tone="info">{T.inApp}</Banner> : null}
      {mode === "ios" ? (
        <>
          <Steps
            steps={T.iosSteps}
            icons={[<Share size={20} />, <SquarePlus size={20} />, <Smartphone size={20} />]}
          />
          <p className={styles.muted}>{T.iosNote}</p>
        </>
      ) : null}
      {mode === "manual" ? (
        <Steps
          steps={T.manualSteps}
          icons={[
            <EllipsisVertical size={20} />,
            <SquarePlus size={20} />,
            <Smartphone size={20} />,
          ]}
        />
      ) : null}
      {mode === "desktop" ? <p className={styles.muted}>{T.desktop}</p> : null}
    </div>
  );
}
