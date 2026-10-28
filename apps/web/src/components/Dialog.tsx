import { useEffect, useId, useRef, type ReactNode } from "react";
import { TEXTS } from "../app/texts.ts";
import { Button } from "./Button.tsx";
import styles from "./Feedback.module.css";

// UX-06 §3 e §7: confirmação que nomeia o que será afetado; ação destrutiva em cor de perigo
// e foco inicial em Cancelar. Usa <dialog> nativo (foco preso e Esc para fechar).
interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** Rótulo do botão secundário (padrão "Cancelar"). */
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Dialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = TEXTS.common.cancel,
  destructive = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      if (destructive) cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, destructive]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <div className={styles.dialogBody}>{children}</div>
      <div className={styles.dialogActions}>
        <Button ref={cancelRef} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
