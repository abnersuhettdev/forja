import { useEffect, useState } from "react";
import { CheckCircle2, Dumbbell } from "lucide-react";
import { sessionVolumeKg } from "@forja/domain";
import { Button } from "../components/Button.tsx";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Banner, EmptyState, Skeleton } from "../components/Feedback.tsx";
import { FormField } from "../components/FormField.tsx";
import {
  completeSession,
  findActiveSession,
  hasPendingOps,
  readSession,
  type SessionBundle,
} from "../execution/session.ts";
import { readMeta, writeMeta } from "../local/db.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { requestPersistentStorage } from "../local/persistent-storage.ts";
import { formatKg } from "../training/format.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { SUMMARY_KEY } from "./ExecutionScreen.tsx";
import shared from "./Screens.module.css";
import styles from "./Execution.module.css";

const T = TEXTS.complete;
const RPE_VALUES = Array.from({ length: 11 }, (_, i) => i);

type View =
  | { readonly kind: "loading" }
  | { readonly kind: "none" }
  | { readonly kind: "form"; readonly bundle: SessionBundle }
  | { readonly kind: "summary"; readonly bundle: SessionBundle; readonly pending: boolean };

// TELA-017 — Concluir e resumo (RF-065; RN-011, RN-049).
export function CompleteScreen() {
  const local = useLocalData();
  const db = local?.db ?? null;
  const [view, setView] = useState<View>({ kind: "loading" });
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (db === null) return;
    // Objeto mutável: a limpeza do efeito pode ocorrer durante a leitura assíncrona.
    const run = { active: true };
    void (async () => {
      const current = await findActiveSession(db);
      const id = current?.id ?? (await readMeta<string>(db, SUMMARY_KEY));
      const bundle = id ? await readSession(db, id) : undefined;
      if (!run.active) return;
      if (!bundle) setView({ kind: "none" });
      else if (bundle.session.status === "in_progress") setView({ kind: "form", bundle });
      else setView({ kind: "summary", bundle, pending: await hasPendingOps(db, bundle) });
    })().catch(() => {
      // Banco fechado (saída) durante a leitura.
    });
    return () => {
      run.active = false;
    };
  }, [db]);

  if (view.kind === "loading") return <Skeleton lines={6} />;
  if (view.kind === "none") {
    return (
      <>
        <h1 className={shared.screenTitle} tabIndex={-1}>
          {TEXTS.execution.finishWorkout}
        </h1>
        <EmptyState
          icon={<Dumbbell size={32} />}
          title={TEXTS.execution.none}
          description={TEXTS.execution.noneHint}
          action={
            <Button
              variant="primary"
              onClick={() => {
                navigate("/hoje");
              }}
            >
              {TEXTS.execution.goToday}
            </Button>
          }
        />
      </>
    );
  }

  const { bundle } = view;
  const name = bundle.session.workout_name ?? "";

  if (view.kind === "summary") {
    const done = bundle.exercises.filter((e) =>
      bundle.sets.some((s) => s.session_exercise_id === e.id),
    ).length;
    const skipped = bundle.exercises.filter((e) => e.status === "skipped").length;
    return (
      <div className={shared.stack}>
        <h1 className={shared.screenTitle} tabIndex={-1}>
          <CheckCircle2 size={28} aria-hidden="true" /> {T.summaryTitle(name)}
        </h1>
        <dl className={styles.summary}>
          <dt>{T.duration}</dt>
          <dd>{`${String(bundle.session.duration_min ?? 0)} min`}</dd>
          <dt>{T.exercises}</dt>
          <dd>{T.exercisesValue(done, skipped)}</dd>
          <dt>{T.sets}</dt>
          <dd>{bundle.sets.length}</dd>
          <dt>{T.volume}</dt>
          <dd>{`${formatKg(sessionVolumeKg(bundle.sets))} kg`}</dd>
        </dl>
        <p className={shared.muted}>{view.pending ? T.syncPending : T.synced}</p>
        <Button
          variant="primary"
          onClick={() => {
            if (db) void writeMeta(db, SUMMARY_KEY, null);
            navigate("/hoje", { replace: true });
          }}
        >
          {T.backToday}
        </Button>
      </div>
    );
  }

  const unregistered = bundle.exercises
    .filter((e) => e.status !== "skipped")
    .reduce(
      (total, e) =>
        total +
        Math.max(
          e.planned_sets - bundle.sets.filter((s) => s.session_exercise_id === e.id).length,
          0,
        ),
      0,
    );

  async function confirm() {
    if (db === null || local === null) return;
    try {
      const done = await completeSession(db, local.userId, bundle.session.id, {
        rpe,
        notes: notes.trim() === "" ? null : notes.trim(),
      });
      await writeMeta(db, SUMMARY_KEY, done.id);
      void local.engine.syncNow();
      // UX-08 §7: proteção contra limpeza automática após a sessão concluída (onde houver).
      void requestPersistentStorage(db).catch(() => undefined);
      const updated = await readSession(db, done.id);
      if (updated)
        setView({ kind: "summary", bundle: updated, pending: await hasPendingOps(db, updated) });
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className={shared.stack}>
      <h1 className={shared.screenTitle} tabIndex={-1}>
        {TEXTS.execution.finishWorkout} · {name}
      </h1>
      {failed ? <Banner tone="danger">{TEXTS.execution.saveFailed}</Banner> : null}
      {unregistered > 0 ? <Banner tone="warning">{T.unregistered(unregistered)}</Banner> : null}
      <ChoiceGroup<number>
        legend={T.rpe}
        layout="row"
        options={RPE_VALUES.map((value) => ({ value, label: String(value) }))}
        value={rpe}
        onChange={setRpe}
      />
      {rpe === null ? null : (
        <p className={shared.muted}>
          {`${String(rpe)} · ${T.rpeBands(rpe)} · `}
          <button
            type="button"
            className={shared.linkButton}
            onClick={() => {
              setRpe(null);
            }}
          >
            {T.clearRpe}
          </button>
        </p>
      )}
      <FormField label={T.notes} help={T.notesHint}>
        {(control) => (
          <textarea
            {...control}
            className={shared.textarea}
            maxLength={500}
            rows={3}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
          />
        )}
      </FormField>
      <Button variant="primary" size="lg" onClick={() => void confirm()}>
        {T.confirm}
      </Button>
    </div>
  );
}
