// Estado do SyncIndicator (UX-02 §4.4, UX-06; RF-092, RN-051): linguagem simples, distinguindo
// "aguardando envio" (informativo) de "precisa da sua atenção" (exige ação — CA-092).
import {
  PENDING_DANGER_HOURS,
  PENDING_WARNING_HOURS,
  hoursBetween,
  type OutboxSummary,
} from "@forja/domain";

export type IndicatorKind =
  "attention" | "offline" | "sending" | "awaiting_login" | "retrying" | "waiting" | "synced";

export interface IndicatorState {
  readonly kind: IndicatorKind;
  /** Itens que exigem ação (ponto de destaque e contagem). */
  readonly attention: number;
  /** Itens ainda não confirmados pelo servidor. */
  readonly pending: number;
}

export function indicatorState(summary: OutboxSummary, online: boolean): IndicatorState {
  const base = { attention: summary.attention, pending: summary.total };
  if (summary.attention > 0) return { kind: "attention", ...base };
  if (!online) return { kind: "offline", ...base };
  if (summary.sending > 0) return { kind: "sending", ...base };
  if (summary.awaitingLogin > 0) return { kind: "awaiting_login", ...base };
  if (summary.retrying > 0) return { kind: "retrying", ...base };
  if (summary.total > 0) return { kind: "waiting", ...base };
  return { kind: "synced", ...base };
}

export type PendingAge = "none" | "warning" | "danger";

/** UX-08 §7 — pendência mais antiga há mais de 24 h (aviso) ou 72 h (perigo). */
export function pendingAge(oldestCreatedAt: string | null, now: Date): PendingAge {
  if (oldestCreatedAt === null) return "none";
  const hours = hoursBetween(new Date(oldestCreatedAt), now);
  if (hours > PENDING_DANGER_HOURS) return "danger";
  if (hours > PENDING_WARNING_HOURS) return "warning";
  return "none";
}
