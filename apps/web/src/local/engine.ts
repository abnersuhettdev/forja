// Motor de envio da fila (UX-08 §6.3, ADR-027, ADR-028 L3). Um envio por vez; gatilhos:
// abertura, retorno ao primeiro plano, retomada da conexão, a cada 60 s com pendências,
// "Enviar agora" e novas operações. Só a confirmação do servidor remove operações da fila.
import {
  buildSyncRequest,
  classifyOutcome,
  nextRetryAt,
  selectBatch,
  SYNC_INTERVAL_SECONDS,
} from "@forja/domain";
import { writeMeta, type LocalDatabase } from "./db.ts";
import { reportDiagnostic } from "./diagnostics.ts";
import { applyChanges, listOutbox, markState, releaseRetries } from "./outbox.ts";
import type { SyncTransport } from "./transport.ts";

export interface SyncEngineOptions {
  readonly db: LocalDatabase;
  readonly sessionUserId: string;
  readonly deviceId: string;
  readonly transport: SyncTransport;
  readonly now?: () => number;
  /** Avisado a cada mudança na fila (para contadores e indicadores). */
  readonly onChange?: () => void;
}

/** Meta do último envio confirmado pelo servidor. */
export const LAST_SENT_KEY = "ultimo_envio";

/** Limite de lotes por rodada, para não prender o aparelho em filas muito grandes. */
const MAX_BATCHES_PER_RUN = 20;

export class SyncEngine {
  private readonly options: SyncEngineOptions;
  private running: Promise<void> | null = null;
  private rerun = false;
  private started = false;
  /** Parado de vez (troca de usuário ou saída): nada mais é enviado. */
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly detach: (() => void)[] = [];

  constructor(options: SyncEngineOptions) {
    this.options = options;
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  /** Liga os gatilhos e faz o primeiro envio (abertura do app). */
  start(): void {
    if (this.started || this.stopped) return;
    this.started = true;
    const trigger = () => {
      void this.syncNow();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") trigger();
    };
    // Conexão de volta: a espera acumulada sem rede não vale mais; tenta tudo já.
    const onOnline = () => {
      void releaseRetries(this.options.db).then(trigger);
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    this.detach.push(
      () => {
        window.removeEventListener("online", onOnline);
      },
      () => {
        document.removeEventListener("visibilitychange", onVisible);
      },
    );
    trigger();
  }

  /** Desliga gatilhos e temporizadores (troca de usuário ou saída). */
  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    for (const off of this.detach.splice(0)) off();
  }

  /** Envia o que estiver pronto. Chamadas durante um envio geram uma nova rodada ao fim. */
  syncNow(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.rerun && !this.stopped) {
        this.rerun = false;
        void this.syncNow();
      }
    });
    return this.running;
  }

  private async run(): Promise<void> {
    const { db, sessionUserId, deviceId, transport } = this.options;
    for (let round = 0; round < MAX_BATCHES_PER_RUN && !this.stopped; round++) {
      const operations = await listOutbox(db);
      const { batch, ownerMismatch } = selectBatch(operations, sessionUserId, this.now());
      if (ownerMismatch.length > 0) await this.recordOwnerMismatch(ownerMismatch.length);
      if (batch.length === 0) break;

      const ids = batch.map((op) => op.op_id);
      await markState(db, ids, "sending");
      this.options.onChange?.();
      const outcome = await transport(buildSyncRequest(batch, deviceId, this.now()));
      await applyChanges(db, classifyOutcome(batch, outcome, this.now()));
      // "Último envio às" (TELA-007): resposta com ao menos uma operação confirmada.
      if (
        outcome.kind === "response" &&
        outcome.response.results.some((r) => r.status === "accepted" || r.status === "duplicate")
      )
        await writeMeta(db, LAST_SENT_KEY, new Date(this.now()).toISOString());
      this.options.onChange?.();
      if (outcome.kind !== "response") break;
    }
    await this.schedule();
    // Também quando nada pôde ser enviado: a fila pode ter mudado por ação local.
    this.options.onChange?.();
  }

  /** ADR-028 L3: nada é enviado; registra erro técnico sem dados pessoais. */
  private async recordOwnerMismatch(count: number): Promise<void> {
    void reportDiagnostic("OWNER_MISMATCH", "fila");
    await writeMeta(this.options.db, "diagnostico.dono_divergente", {
      code: "OWNER_MISMATCH",
      count,
      at: new Date(this.now()).toISOString(),
    });
  }

  /** Próxima rodada: na próxima tentativa agendada ou, com pendências, em 60 s. */
  private async schedule(): Promise<void> {
    clearTimeout(this.timer);
    if (this.stopped) return;
    const operations = await listOutbox(this.options.db);
    const sendable = operations.some(
      (op) =>
        op.owner_user_id === this.options.sessionUserId &&
        op.state !== "rejected" &&
        op.state !== "conflict",
    );
    if (!sendable) return;
    const interval = SYNC_INTERVAL_SECONDS * 1000;
    const retryAt = nextRetryAt(operations);
    const delay =
      retryAt === null ? interval : Math.min(Math.max(retryAt - this.now(), 0), interval);
    this.timer = setTimeout(() => {
      void this.syncNow();
    }, delay);
  }
}
