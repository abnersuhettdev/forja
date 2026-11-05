import { useEffect, useRef, useState } from "react";
import { Check, ClipboardList, IdCard, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { fetchStudentProfile, type StudentProfile } from "../account/profile.ts";
import { getSupabase } from "../auth/client.ts";
import { useCatalog } from "../catalog/useCatalog.ts";
import { Button } from "../components/Button.tsx";
import { Banner, EmptyState, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { GeneratorReportPanel } from "../components/GeneratorReportPanel.tsx";
import { RegenerationNote } from "../components/RegenerationNote.tsx";
import { sendDirect } from "../local/direct.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import { itemSummary, toSavePayload, type EditorDocument } from "../program/editor.ts";
import {
  createProposal,
  regenerateInDocument,
  type RegenerationSummary,
} from "../program/generator.ts";
import { useProgram } from "../program/useProgram.ts";
import { Link, navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import styles from "./Screens.module.css";

const T = TEXTS.plan;
const PROFILE_PATH = "/gestao/perfil";

function PlanWorkouts({
  doc,
  nameOf,
  proposal,
}: {
  doc: EditorDocument;
  nameOf: (id: string) => string;
  proposal?: {
    online: boolean;
    busy: string | null;
    summaries: Readonly<Record<string, RegenerationSummary>>;
    onRegenerate: (workoutId: string) => void;
  };
}) {
  return (
    <ul className={styles.list}>
      {doc.workouts.map((workout) => (
        <li key={workout.id} className={styles.workoutCard}>
          <h3 className={styles.sectionLabel}>{workout.name}</h3>
          <ol className={styles.steps} aria-label={workout.name}>
            {workout.items.map((item) => (
              <li key={item.id}>
                {nameOf(item.exercise_id)} <span className={styles.muted}>{itemSummary(item)}</span>
              </li>
            ))}
          </ol>
          {proposal === undefined ? (
            <Link to={`/treinos/${workout.id}`} className={styles.linkButton}>
              {T.openWorkout}
            </Link>
          ) : (
            <>
              <Button
                variant="ghost"
                icon={<Sparkles size={20} />}
                disabled={!proposal.online || proposal.busy !== null}
                loading={proposal.busy === workout.id}
                onClick={() => {
                  proposal.onRegenerate(workout.id);
                }}
              >
                {TEXTS.editor.regenerate(workout.name)}
              </Button>
              <RegenerationNote summary={proposal.summaries[workout.id]} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

// TELA-060 — Meu plano (RF-113, RF-114; RN-009; ADR-095): a rotina atual e a proposta, usada com um
// toque. Sem conexão, mostra a rotina guardada no aparelho; gerar e usar exigem conexão.
export function PlanScreen() {
  const { state: userState } = useUserContext();
  const studentId = userState.status === "ready" ? (userState.context.student?.id ?? null) : null;
  const online = useOnline();
  const local = useLocalData();
  const { state: programState, reload } = useProgram(online ? studentId : null);
  const { state: catalogState } = useCatalog();
  const { state: offline } = useOfflineData();
  const [data, setData] = useState<StudentProfile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Readonly<Record<string, RegenerationSummary>>>({});
  const shown = useRef(new Map<string, Set<string>>());

  useEffect(() => {
    const supabase = getSupabase();
    if (supabase === null || studentId === null || !online) return;
    let active = true;
    fetchStudentProfile(supabase, studentId).then(
      (profile) => {
        if (active) setData(profile);
      },
      () => {
        if (active) setData(null);
      },
    );
    return () => {
      active = false;
    };
  }, [studentId, online]);

  if (studentId === null) {
    return <EmptyState icon={<ClipboardList size={32} />} title={T.none} description="" />;
  }
  const exercises = catalogState.status === "ready" ? catalogState.exercises : [];
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const nameOf = (id: string) => byId.get(id)?.name ?? TEXTS.catalog.notFound;

  /** Sem conexão: só a rotina guardada no aparelho (UX-08 §6.2). */
  if (!online) {
    const stored = offline.status === "ready" ? offline.program : null;
    return (
      <div className={styles.stack}>
        <Banner tone="info">{T.offline}</Banner>
        {stored ? (
          <PlanWorkouts doc={stored.document} nameOf={nameOf} />
        ) : (
          <EmptyState icon={<ClipboardList size={32} />} title={T.none} description={T.offline} />
        )}
      </div>
    );
  }
  if (programState.status === "unavailable" || catalogState.status === "unavailable") {
    return (
      <ErrorState
        title={TEXTS.error.title}
        description={T.unavailable}
        onRetry={() => {
          void reload();
        }}
      />
    );
  }
  if (programState.status === "loading" || catalogState.status === "loading" || data === null) {
    return <Skeleton lines={8} />;
  }

  const { active, draft } = programState.program;
  const profile = data;

  async function generate() {
    if (local === null || studentId === null) return;
    setBusy("generate");
    setError(null);
    if (draft !== null) {
      const discarded = await sendDirect(local, {
        opId: crypto.randomUUID(),
        type: "draft.discard",
        entityId: draft.id,
        baseRevision: draft.revision,
        payload: {},
      });
      if (!discarded.ok) {
        setBusy(null);
        setError(discarded.message);
        return;
      }
    }
    const outcome = await createProposal({
      local,
      studentId,
      profile,
      catalog: exercises,
      previousExerciseIds:
        active?.document.workouts.flatMap((w) => w.items.map((i) => i.exercise_id)) ?? [],
    });
    setSummaries({});
    shown.current.clear();
    await reload();
    setBusy(null);
    if (!outcome.ok) setError(outcome.pending ? T.completeProfile : outcome.message);
  }

  async function regenerate(workoutId: string) {
    if (local === null || draft === null) return;
    setBusy(workoutId);
    setError(null);
    const seen = shown.current.get(workoutId) ?? new Set<string>();
    const result = regenerateInDocument({
      doc: draft.document,
      workoutId,
      profile,
      catalog: exercises,
      seen,
      nameOf,
    });
    if (result === null) {
      setBusy(null);
      setError(T.completeProfile);
      return;
    }
    shown.current.set(workoutId, seen);
    const saved = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "draft.save",
      entityId: draft.id,
      baseRevision: draft.revision,
      payload: toSavePayload(result.doc),
    });
    if (saved.ok) setSummaries((all) => ({ ...all, [workoutId]: result.summary }));
    else setError(saved.message);
    await reload();
    setBusy(null);
  }

  /** O toque da própria pessoa: é a única forma de a rotina entrar em uso (RN-009). */
  async function use() {
    if (local === null || draft === null) return;
    setBusy("use");
    setError(null);
    const result = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "draft.publish",
      entityId: draft.id,
      baseRevision: draft.revision,
      payload: {},
    });
    if (!result.ok) {
      setBusy(null);
      setError(result.message);
      return;
    }
    navigate("/hoje");
  }

  async function discard() {
    if (local === null || draft === null) return;
    setBusy("discard");
    setError(null);
    const result = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "draft.discard",
      entityId: draft.id,
      baseRevision: draft.revision,
      payload: {},
    });
    if (!result.ok) setError(result.message);
    setSummaries({});
    await reload();
    setBusy(null);
  }

  const dataLink = (
    <Link to={PROFILE_PATH} className={styles.linkButton}>
      <IdCard size={20} aria-hidden="true" /> {T.myData}
    </Link>
  );
  const anotherButton = (label: string, primary: boolean) => (
    <Button
      variant={primary ? "primary" : "secondary"}
      icon={primary ? <Sparkles size={20} /> : <RefreshCw size={20} />}
      disabled={busy !== null}
      loading={busy === "generate"}
      onClick={() => void generate()}
    >
      {label}
    </Button>
  );

  return (
    <div className={styles.stack}>
      {error !== null ? <Banner tone="danger">{error}</Banner> : null}
      {busy === "generate" ? <p role="status">{T.generating}</p> : null}

      {draft ? (
        <section className={styles.stack} aria-labelledby="plano-proposta">
          <h2 id="plano-proposta" className={styles.exerciseName}>
            {T.proposal}
          </h2>
          {active ? <p className={styles.muted}>{T.currentKept}</p> : null}
          {draft.generator_report ? <GeneratorReportPanel report={draft.generator_report} /> : null}
          <PlanWorkouts
            doc={draft.document}
            nameOf={nameOf}
            proposal={{
              online,
              busy,
              summaries,
              onRegenerate: (workoutId) => void regenerate(workoutId),
            }}
          />
          <Button
            variant="primary"
            size="lg"
            icon={<Check size={20} />}
            disabled={busy !== null}
            loading={busy === "use"}
            onClick={() => void use()}
          >
            {T.use}
          </Button>
          {anotherButton(T.another, false)}
          <Button
            variant="ghost"
            icon={<Trash2 size={20} />}
            disabled={busy !== null}
            loading={busy === "discard"}
            onClick={() => void discard()}
          >
            {T.discard}
          </Button>
        </section>
      ) : null}

      {active ? (
        <section className={styles.stack} aria-labelledby="plano-atual">
          <h2 id="plano-atual" className={styles.exerciseName}>
            {T.current}
          </h2>
          {draft === null && active.generator_report ? (
            <GeneratorReportPanel report={active.generator_report} />
          ) : null}
          <PlanWorkouts doc={active.document} nameOf={nameOf} />
          {draft === null ? anotherButton(T.another, false) : null}
        </section>
      ) : null}

      {!active && !draft ? (
        <EmptyState
          icon={<ClipboardList size={32} />}
          title={T.none}
          description={T.noneHint}
          action={anotherButton(T.generate, true)}
        />
      ) : null}
      {dataLink}
    </div>
  );
}
