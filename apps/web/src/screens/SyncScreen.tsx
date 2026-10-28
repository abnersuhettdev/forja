import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudCheck, CloudOff, Copy } from "lucide-react";
import { messageFor, toLocalDate } from "@forja/domain";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { Button } from "../components/Button.tsx";
import { ConflictCompare } from "../components/ConflictCompare.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { Banner, EmptyState, Skeleton } from "../components/Feedback.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { formatSet } from "./ExecutionScreen.tsx";
import type { SessionBundle } from "../execution/session.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { releaseRetries, type QueuedOperation } from "../local/outbox.ts";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import { describeGroup as describe, sessionLabel } from "../sync/describe.ts";
import {
  deleteSession,
  discardGroup,
  keepBoth,
  keepLocal,
  keepServer,
  readDuplicates,
  readQueueGroups,
  recreateSession,
  type DuplicatePair,
  type QueueGroup,
} from "../sync/queue.ts";
import { formatClock, formatShortDate } from "../training/format.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import shared from "./Screens.module.css";
import styles from "./Sync.module.css";

const T = TEXTS.sync;
const TIME_ZONE = "America/Sao_Paulo";

/** Conteúdo que será perdido, mostrado na confirmação (RN-051). */
function LostContent({ group }: { group: QueueGroup }) {
  const { title, detail } = describe(group);
  return (
    <div className={shared.stack}>
      <p>{T.discardBody}</p>
      <p className={shared.strong}>{[title, detail].filter(Boolean).join(" · ")}</p>
      {group.session && group.session.sets.length > 0 ? (
        <ul className={styles.lostList}>
          {group.session.sets.map((set) => (
            <li key={set.id} className="tabular">
              {formatSet(set)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// TELA-007 — Sincronização (RF-092, RF-100; RN-045, RN-046, RN-051; ADR-022).
export function SyncScreen() {
  const local = useLocalData();
  const online = useOnline();
  const show = useSnackbar();
  const { state: offline, refresh: refreshOffline } = useOfflineData();
  const { refresh: refreshContext } = useUserContext();
  const [groups, setGroups] = useState<QueueGroup[] | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [storage, setStorage] = useState<{ persisted: boolean | null; usedMb: string | null }>({
    persisted: null,
    usedMb: null,
  });
  const [discarding, setDiscarding] = useState<QueueGroup | null>(null);
  const [comparing, setComparing] = useState<{ group: QueueGroup; op: QueuedOperation } | null>(
    null,
  );
  const [confirmServer, setConfirmServer] = useState<{
    group: QueueGroup;
    op: QueuedOperation;
  } | null>(null);
  const [deleting, setDeleting] = useState<SessionBundle | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const db = local?.db ?? null;
  const outboxTotal = local?.outbox.total ?? 0;
  const outboxAttention = local?.outbox.attention ?? 0;
  const outboxSending = local?.outbox.sending ?? 0;

  const load = useCallback(async () => {
    if (db === null) return;
    const [queue, pairs] = await Promise.all([readQueueGroups(db), readDuplicates(db)]);
    setGroups(queue);
    setDuplicates(pairs);
  }, [db]);

  // Relê a fila a cada mudança no resumo (envio, recusa, conflito, nova ação local).
  useEffect(() => {
    if (db === null) return;
    let active = true;
    Promise.all([readQueueGroups(db), readDuplicates(db)])
      .then(([queue, pairs]) => {
        if (!active) return;
        setGroups(queue);
        setDuplicates(pairs);
      })
      .catch(() => {
        // Banco fechado (saída) durante a leitura.
      });
    return () => {
      active = false;
    };
  }, [db, outboxTotal, outboxAttention, outboxSending, offline]);

  useEffect(() => {
    if (!("storage" in navigator)) return;
    let active = true;
    void Promise.all([navigator.storage.persisted(), navigator.storage.estimate()])
      .then(([persisted, estimate]) => {
        if (!active) return;
        const used = estimate.usage === undefined ? null : (estimate.usage / 1_048_576).toFixed(1);
        setStorage({ persisted, usedMb: used === null ? null : used.replace(".", ",") });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (local === null || groups === null) return <Skeleton lines={6} />;
  const owner = local.userId;
  const attention = groups.filter((g) => g.attention !== null);
  const waiting = groups.filter((g) => g.attention === null);
  const program = offline.status === "ready" ? offline.program : null;
  const updatedAt = offline.status === "ready" ? offline.updatedAt : undefined;

  /** Depois de descartar: a cópia local volta a refletir o servidor. */
  async function afterDecision(message: string) {
    local?.refreshQueue();
    await load();
    show({ text: message });
    if (online) await Promise.all([refreshContext(), refreshOffline()]);
    void local?.engine.syncNow();
  }

  async function refreshNow() {
    setRefreshing(true);
    await Promise.all([refreshContext(), refreshOffline()]);
    setRefreshing(false);
    show({ text: T.refreshed });
  }

  const stateLabel = (op: QueuedOperation) => T.states[op.state];

  return (
    <div className={shared.stack}>
      <p className={styles.connection}>
        {online ? (
          <Cloud size={20} aria-hidden="true" />
        ) : (
          <CloudOff size={20} aria-hidden="true" />
        )}
        {online
          ? T.connected(
              local.lastSentAt ? formatClock(new Date(local.lastSentAt), TIME_ZONE) : null,
            )
          : T.disconnected}
      </p>

      <section className={styles.section} aria-labelledby="sync-offline">
        <h2 id="sync-offline" className={shared.sectionLabel}>
          {T.offlineTitle}
        </h2>
        <p>
          {program
            ? T.offlineProgram(
                program.published_at
                  ? formatShortDate(toLocalDate(new Date(program.published_at), TIME_ZONE))
                  : null,
                updatedAt ? formatClock(new Date(updatedAt), TIME_ZONE) : null,
              )
            : T.noProgram}
        </p>
        <Button loading={refreshing} disabled={!online} onClick={() => void refreshNow()}>
          {T.refresh}
        </Button>
      </section>

      {attention.length > 0 ? (
        <section className={styles.section} aria-labelledby="sync-attention">
          <h2 id="sync-attention" className={shared.sectionLabel}>
            {T.attentionTitle}
          </h2>
          <ul className={shared.list}>
            {attention.map((group) => {
              const op = group.attention;
              if (!op) return null;
              const { title, detail } = describe(group);
              const deletedElsewhere = op.last_error?.code === "ENTITY_DELETED";
              return (
                <li key={group.id} className={styles.item}>
                  <span className={shared.strong}>{title}</span>
                  {detail ? <span className={shared.muted}>{detail}</span> : null}
                  <Banner tone={op.state === "conflict" ? "warning" : "danger"}>
                    {op.state === "conflict"
                      ? deletedElsewhere
                        ? T.deletedElsewhere
                        : T.conflict
                      : T.rejected(messageFor(op.last_error?.code ?? "VALIDATION_FAILED"))}
                  </Banner>
                  <div className={shared.row}>
                    {op.state === "conflict" && !deletedElsewhere ? (
                      <Button
                        variant="primary"
                        onClick={() => {
                          setComparing({ group, op });
                        }}
                      >
                        {T.compare}
                      </Button>
                    ) : null}
                    {deletedElsewhere && group.session ? (
                      <Button
                        variant="primary"
                        onClick={() =>
                          void recreateSession(local.db, owner, group).then(() =>
                            afterDecision(T.recreated),
                          )
                        }
                      >
                        {T.recreate}
                      </Button>
                    ) : null}
                    {op.state === "rejected" && group.kind === "rest" ? (
                      <Button
                        variant="primary"
                        onClick={() => {
                          navigate("/conta/descanso");
                        }}
                      >
                        {T.fix}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDiscarding(group);
                      }}
                    >
                      {T.discard}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {waiting.length > 0 ? (
        <section className={styles.section} aria-labelledby="sync-waiting">
          <h2 id="sync-waiting" className={shared.sectionLabel}>
            {T.waitingTitle} · {T.waitingCount(waiting.length)}
          </h2>
          <ul className={shared.list}>
            {waiting.map((group) => {
              const { title, detail } = describe(group);
              const first = group.ops[0];
              return (
                <li key={group.id} className={styles.item}>
                  <span>{title}</span>
                  <span className={shared.muted}>
                    {[detail, first ? stateLabel(first) : null].filter(Boolean).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={shared.muted}>{T.nothingToDo}</p>
          {online ? null : <p className={shared.muted}>{T.sendNowOffline}</p>}
          <Button
            variant="primary"
            disabled={!online}
            onClick={() => {
              // Pedido explícito: a espera de nova tentativa não vale (UX-08 §6.3).
              void releaseRetries(local.db).then(() => local.engine.syncNow());
            }}
          >
            {T.sendNow}
          </Button>
        </section>
      ) : null}

      {duplicates.length > 0 ? (
        <section className={styles.section} aria-labelledby="sync-review">
          <h2 id="sync-review" className={shared.sectionLabel}>
            {T.reviewTitle}
          </h2>
          <ul className={shared.list}>
            {duplicates.map((pair) => (
              <li key={pair.second.session.id} className={styles.item}>
                <span className={styles.duplicate}>
                  <Copy size={18} aria-hidden="true" />
                  {T.duplicate}
                </span>
                {[pair.first, pair.second].map((bundle) => (
                  <span key={bundle.session.id} className={shared.muted}>
                    {sessionLabel(bundle)} ·{" "}
                    {formatClock(new Date(bundle.session.started_at), TIME_ZONE)}
                    {" · "}
                    {T.sessionDetail(bundle.sets.length)}
                  </span>
                ))}
                <div className={shared.row}>
                  <Button
                    onClick={() =>
                      void keepBoth(local.db, owner, pair).then(() => afterDecision(T.kept))
                    }
                  >
                    {T.keepBoth}
                  </Button>
                  {[pair.first, pair.second].map((bundle) => (
                    <Button
                      key={bundle.session.id}
                      variant="ghost"
                      onClick={() => {
                        setDeleting(bundle);
                      }}
                    >
                      {T.deleteThis(formatClock(new Date(bundle.session.started_at), TIME_ZONE))}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {groups.length === 0 && duplicates.length === 0 ? (
        <EmptyState
          icon={<CloudCheck size={32} />}
          title={T.allSynced}
          description={T.allSyncedHint}
        />
      ) : null}

      <section className={styles.section} aria-labelledby="sync-storage">
        <h2 id="sync-storage" className={shared.sectionLabel}>
          {T.storageTitle}
        </h2>
        <p>{T.protection(storage.persisted)}</p>
        {storage.usedMb === null ? null : <p className={shared.muted}>{T.used(storage.usedMb)}</p>}
      </section>

      <Dialog
        open={discarding !== null}
        title={T.discardTitle}
        confirmLabel={T.discard}
        destructive
        onCancel={() => {
          setDiscarding(null);
        }}
        onConfirm={() => {
          const group = discarding;
          setDiscarding(null);
          if (group) void discardGroup(local.db, group).then(() => afterDecision(T.discarded));
        }}
      >
        {discarding ? <LostContent group={discarding} /> : null}
      </Dialog>

      <Sheet
        open={comparing !== null}
        title={T.compareTitle}
        onClose={() => {
          setComparing(null);
        }}
      >
        {comparing ? (
          <ConflictCompare
            local={comparing.op.payload}
            server={comparing.op.server_record ?? null}
            onKeepLocal={() => {
              const { op } = comparing;
              setComparing(null);
              void keepLocal(local.db, op).then(() => afterDecision(T.keptLocal));
            }}
            onKeepServer={() => {
              setConfirmServer(comparing);
              setComparing(null);
            }}
          />
        ) : null}
      </Sheet>

      <Dialog
        open={confirmServer !== null}
        title={T.keepServerTitle}
        confirmLabel={T.keepThis}
        destructive
        onCancel={() => {
          setConfirmServer(null);
        }}
        onConfirm={() => {
          const decision = confirmServer;
          setConfirmServer(null);
          if (decision)
            void keepServer(local.db, decision.op).then(() => afterDecision(T.keptServer));
        }}
      >
        {confirmServer ? (
          <div className={shared.stack}>
            <p>{T.keepServerBody}</p>
            <p className={shared.strong}>{describe(confirmServer.group).title}</p>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={deleting !== null}
        title={T.deleteTitle}
        confirmLabel={TEXTS.common.delete}
        destructive
        onCancel={() => {
          setDeleting(null);
        }}
        onConfirm={() => {
          const bundle = deleting;
          setDeleting(null);
          if (bundle)
            void deleteSession(local.db, owner, bundle).then(() => afterDecision(T.deleted));
        }}
      >
        {deleting ? (
          <div className={shared.stack}>
            <p>{T.deleteBody}</p>
            <p className={shared.strong}>
              {sessionLabel(deleting)} · {T.sessionDetail(deleting.sets.length)}
            </p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
