import { Component, type ReactNode } from "react";
import { messageFor } from "@forja/domain";
import { TEXTS } from "../app/texts.ts";
import { ErrorState } from "./Feedback.tsx";

// Barreira por área (SEG-05 §4): uma falha inesperada não derruba o app inteiro.
// O relato técnico (API-030) será ligado na TAR-024.
interface Props {
  children: ReactNode;
  /** Muda ao trocar de tela, para limpar o erro. */
  resetKey: string;
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
  }

  override render() {
    const { failedKey } = this.state;
    if (failedKey !== null && (failedKey === "" || failedKey === this.props.resetKey)) {
      return (
        <ErrorState
          title={TEXTS.error.title}
          description={messageFor("UNEXPECTED")}
          onRetry={() => {
            this.setState({ failedKey: null });
          }}
        />
      );
    }
    return this.props.children;
  }
}
