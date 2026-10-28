import { Component, type ReactNode } from "react";
import { messageFor } from "@forja/domain";
import { TEXTS } from "../app/texts.ts";
import { reportDiagnostic } from "../local/diagnostics.ts";
import { ErrorState } from "./Feedback.tsx";

// Barreira por área (SEG-05 §4): uma falha inesperada não derruba o app inteiro e gera relato
// técnico (API-030) só com o código e a rota lógica.
interface Props {
  children: ReactNode;
  /** Muda ao trocar de tela, para limpar o erro. */
  resetKey: string;
  /** Rota lógica (padrão, sem identificadores) para o relato. */
  context: string;
  /**
   * Execução (SEG-05 §4): a sessão já está salva; "Recarregar a tela" retoma no mesmo ponto
   * (RF-066) em vez de só tentar desenhar de novo.
   */
  reloadPage?: boolean;
}

interface State {
  failedKey: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failedKey: null };

  static getDerivedStateFromError(): Partial<State> {
    return { failedKey: "" };
  }

  override componentDidCatch(): void {
    this.setState({ failedKey: this.props.resetKey });
    void reportDiagnostic("UNEXPECTED", this.props.context);
  }

  override render() {
    const { failedKey } = this.state;
    if (failedKey !== null && (failedKey === "" || failedKey === this.props.resetKey)) {
      return (
        <ErrorState
          title={TEXTS.error.title}
          description={messageFor("UNEXPECTED")}
          {...(this.props.reloadPage ? { retryLabel: TEXTS.error.reload } : {})}
          onRetry={() => {
            if (this.props.reloadPage) window.location.reload();
            else this.setState({ failedKey: null });
          }}
        />
      );
    }
    return this.props.children;
  }
}
