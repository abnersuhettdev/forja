import {
  CircleX,
  CloudCheck,
  CloudOff,
  CloudUpload,
  KeyRound,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { indicatorState, type IndicatorKind, type IndicatorState } from "../sync/status.ts";
import { Link } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import styles from "./SyncIndicator.module.css";

const T = TEXTS.sync.indicator;
export const SYNC_PATH = "/conta/sincronizacao";

const ICONS: Record<IndicatorKind, ReactNode> = {
  attention: <CircleX size={20} />,
  offline: <CloudOff size={20} />,
  sending: <LoaderCircle size={20} className={styles.spin} />,
  awaiting_login: <KeyRound size={20} />,
  retrying: <RefreshCw size={20} />,
  waiting: <CloudUpload size={20} />,
  synced: <CloudCheck size={20} />,
};

function label(state: IndicatorState): string {
  switch (state.kind) {
    case "attention":
      return T.attention(state.attention);
    case "offline":
      return state.pending > 0 ? T.offlinePending(state.pending) : T.offline;
    case "sending":
      return T.sending;
    case "awaiting_login":
      return T.awaitingLogin;
    case "retrying":
      return T.retrying;
    case "waiting":
      return T.waiting(state.pending);
    case "synced":
      return T.synced;
  }
}

// SyncIndicator (UX-06, UX-02 §4.4; RF-092, CA-092): ícone + texto curto; com itens que exigem
// ação, destaque e contagem; toque abre a Sincronização; mudanças anunciadas com polidez.
export function SyncIndicator({ compact = false }: { compact?: boolean }) {
  const local = useLocalData();
  const online = useOnline();
  if (local === null) return null;
  const state = indicatorState(local.outbox, online);
  const text = label(state);
  // Contagem visível mesmo sem o texto (telas estreitas e modo foco).
  const count = state.kind === "attention" ? state.attention : state.pending;
  return (
    <Link
      to={SYNC_PATH}
      className={[styles.indicator, styles[state.kind], compact ? styles.compact : ""].join(" ")}
      aria-label={`${text}. ${T.open}`}
    >
      <span aria-hidden="true" className={styles.icon}>
        {ICONS[state.kind]}
      </span>
      {count > 0 ? (
        <span aria-hidden="true" className={styles.count}>
          {count}
        </span>
      ) : null}
      <span className={compact ? styles.hiddenText : styles.text} aria-live="polite">
        {text}
      </span>
    </Link>
  );
}
