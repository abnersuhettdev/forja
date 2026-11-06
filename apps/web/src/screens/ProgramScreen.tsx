import { useState } from "react";
import { ClipboardList, Pencil, Plus, Sparkles } from "lucide-react";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { Banner, EmptyState, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { sendDirect } from "../local/direct.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { useProgram } from "../program/useProgram.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { EDITOR_TEXTS } from "../program/editor-texts.ts";
import { useOnline } from "../app/useOnline.ts";
import styles from "./Screens.module.css";

const T = TEXTS.program;
export const DRAFT_PATH = "/gestao/programa/rascunho";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

// TELA-030 — Programa (RF-025, RF-027, RF-028; RN-003..005). Gestão exige conexão (RF-093).
export function ProgramScreen() {
  const { state: userState } = useUserContext();
  const studentId = userState.status === "ready" ? (userState.context.student?.id ?? null) : null;
  const { state, reload } = useProgram(studentId);
  const local = useLocalData();
  const online = useOnline();
  const show = useSnackbar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (studentId === null)
    return <EmptyState icon={<ClipboardList size={32} />} title={T.noStudent} description="" />;
  if (state.status === "loading") return <Skeleton lines={5} />;
  if (state.status === "unavailable") {
    return (
      <ErrorState
        title={TEXTS.error.title}
        description={online ? EDITOR_TEXTS.saveFailed : T.offline}
        onRetry={() => {
          void reload();
        }}
      />
    );
  }
  const { active, draft } = state.program;

  /** Cria o rascunho (vazio ou cópia da versão ativa — RF-027) e abre o editor. */
  async function startDraft() {
    if (local === null || studentId === null) return;
    setBusy(true);
    setError(null);
    const result = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "draft.create",
      entityId: crypto.randomUUID(),
      baseRevision: null,
      payload: active
        ? { student_id: studentId, source: "from_version", from_version_id: active.id }
        : { student_id: studentId, source: "empty" },
    });
    setBusy(false);
    if (result.ok || result.error.code === "DRAFT_ALREADY_EXISTS") {
      navigate(DRAFT_PATH);
      return;
    }
    setError(result.message);
  }

  async function discard() {
    if (local === null || draft === null) return;
    setConfirmDiscard(false);
    const result = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "draft.discard",
      entityId: draft.id,
      baseRevision: draft.revision,
      payload: {},
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    show({ text: T.discarded });
    await reload();
  }

  // RF-021: gerar é a alternativa a montar à mão; o resultado é só um rascunho (RN-009).
  const generateButton = (
    <Button
      icon={<Sparkles size={20} />}
      disabled={!online}
      onClick={() => {
        navigate("/gestao/programa/gerar");
      }}
    >
      {T.generate}
    </Button>
  );

  return (
    <div className={styles.stack}>
      {!online ? <Banner tone="info">{T.offline}</Banner> : null}
      {error !== null ? <Banner tone="danger">{error}</Banner> : null}
      {draft ? (
        <Banner
          tone="info"
          action={
            <div className={styles.row}>
              <Button
                onClick={() => {
                  navigate(DRAFT_PATH);
                }}
                disabled={!online}
              >
                {T.continue}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmDiscard(true);
                }}
                disabled={!online}
              >
                {T.discard}
              </Button>
            </div>
          }
        >
          {T.draftBanner(formatTime(draft.updated_at))}
        </Banner>
      ) : null}

      {active ? (
        <section className={styles.stack} aria-label={active.document.name}>
          <h2 className={styles.exerciseName}>{active.document.name}</h2>
          <p className={styles.muted}>
            {[
              active.document.split_type ? EDITOR_TEXTS.splits[active.document.split_type] : null,
              active.published_at && active.version_number
                ? T.published(formatDate(active.published_at), active.version_number)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <ul className={styles.list}>
            {active.document.workouts.map((workout) => (
              <li key={workout.id} className={styles.listLink}>
                <span className={styles.listText}>
                  <span>{workout.name}</span>
                  <span className={styles.muted}>{T.exercisesCount(workout.items.length)}</span>
                </span>
              </li>
            ))}
          </ul>
          {draft ? null : (
            <Button
              variant="primary"
              icon={<Pencil size={20} />}
              loading={busy}
              disabled={!online}
              onClick={() => void startDraft()}
            >
              {T.edit}
            </Button>
          )}
          {draft ? null : generateButton}
        </section>
      ) : draft ? null : (
        <EmptyState
          icon={<ClipboardList size={32} />}
          title={T.none}
          description={T.noneHint}
          action={
            <div className={styles.stack}>
              <Button
                variant="primary"
                icon={<Plus size={20} />}
                loading={busy}
                disabled={!online}
                onClick={() => void startDraft()}
              >
                {T.create}
              </Button>
              {generateButton}
            </div>
          }
        />
      )}

      <Dialog
        open={confirmDiscard}
        title={T.discardTitle}
        confirmLabel={T.discard}
        destructive
        onCancel={() => {
          setConfirmDiscard(false);
        }}
        onConfirm={() => void discard()}
      >
        <p>{T.discardBody(draft?.document.name ?? "")}</p>
      </Dialog>
    </div>
  );
}
