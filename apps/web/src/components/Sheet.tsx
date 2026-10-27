import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { TEXTS } from "../app/texts.ts";
import { IconButton } from "./Button.tsx";
import styles from "./Sheet.module.css";

// Folha (UX-06 §7): painel modal com título, botão fechar e conteúdo livre. <dialog> nativo:
// foco preso, Esc fecha, fundo inerte. Em tela larga vira um painel central.
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <IconButton label={TEXTS.common.close} icon={<X size={20} />} onClick={onClose} />
      </header>
      <div className={styles.body}>{open ? children : null}</div>
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </dialog>
  );
}
