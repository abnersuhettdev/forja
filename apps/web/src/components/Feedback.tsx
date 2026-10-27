import type { ReactNode } from "react";
import { CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { TEXTS } from "../app/texts.ts";
import { Button, IconButton } from "./Button.tsx";
import styles from "./Feedback.module.css";

// Componentes de retorno (UX-06 §6, UX-01 §4).

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden="true">
        {icon}
      </div>
      <h2>{title}</h2>
      <p className={styles.muted}>{description}</p>
      {action}
    </section>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <section className={styles.empty} role="alert">
      <div className={styles.emptyIcon} aria-hidden="true">
        <CircleAlert size={32} />
      </div>
      <h2>{title}</h2>
      <p className={styles.muted}>{description}</p>
      {onRetry ? <Button onClick={onRetry}>{TEXTS.error.retry}</Button> : null}
    </section>
  );
}

type BannerTone = "info" | "warning" | "danger";
const BANNER_ICONS: Record<BannerTone, ReactNode> = {
  info: <Info size={20} />,
  warning: <TriangleAlert size={20} />,
  danger: <CircleAlert size={20} />,
};

export function Banner({
  tone,
  children,
  action,
  onDismiss,
}: {
  tone: BannerTone;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={[styles.banner, styles[tone]].join(" ")}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className={styles.bannerIcon} aria-hidden="true">
        {BANNER_ICONS[tone]}
      </span>
      <div className={styles.bannerText}>{children}</div>
      {action}
      {onDismiss ? (
        <IconButton label={TEXTS.common.close} icon={<X size={20} />} onClick={onDismiss} />
      ) : null}
    </div>
  );
}

/** Esqueleto de carregamento (> 300 ms — UX-01 §4). */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className={styles.skeleton}
      aria-busy="true"
      aria-label={TEXTS.common.loading}
      role="status"
    >
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className={styles.skeletonLine} />
      ))}
    </div>
  );
}
