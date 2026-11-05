import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Dumbbell, MoreVertical, Plus, Trash2 } from "lucide-react";
import { isAbandoned, RANGES, restRemainingSeconds, type SetValues } from "@forja/domain";
import { Button, IconButton } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { ExerciseImage } from "../components/ExerciseImage.tsx";
import { Banner, EmptyState, Skeleton } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { Stepper } from "../components/Stepper.tsx";
import { SyncIndicator } from "../components/SyncIndicator.tsx";
import { restFinishedAlert, useNow, useWakeLock } from "../execution/device.ts";
import { completeSession, type LocalSet } from "../execution/session.ts";
import {
  executionActions as actions,
  initialValues,
  setsOf,
  useExecution,
  type ExecutionState,
  type ExerciseView,
} from "../execution/useExecution.ts";
import { itemSummary } from "../program/summary.ts";
import { formatKg, toLocalInput } from "../training/format.ts";
import { writeMeta } from "../local/db.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import shared from "./Screens.module.css";
import styles from "./Execution.module.css";

const T = TEXTS.execution;
export const SUMMARY_KEY = "execucao.resumo";
const COMPLETE_PATH = "/sessao/concluir";
const REST_STEP_MS = 15_000;
type Ready = Extract<ExecutionState, { status: "ready" }>;

/** "40 kg × 10" ou "0 kg × 30 s". */
export function formatSet(values: Pick<SetValues, "load_kg" | "reps" | "duration_s">): string {
  const load = values.load_kg === null ? "—" : `${formatKg(values.load_kg)} kg`;
  const volume =
    values.duration_s === null ? String(values.reps ?? 0) : `${String(values.duration_s)} s`;
  return `${load} × ${volume}`;
}

/** "40 kg × 10, 10, 9" quando a carga é a mesma; senão cada série com sua carga. */
function formatLast(sets: readonly Pick<SetValues, "load_kg" | "reps" | "duration_s">[]): string {
  const loads = new Set(sets.map((s) => s.load_kg));
  if (loads.size === 1 && sets[0]) {
    const volumes = sets.map((s) =>
      s.duration_s === null ? String(s.reps ?? 0) : `${String(s.duration_s)} s`,
    );
    return `${formatKg(sets[0].load_kg ?? 0)} kg × ${volumes.join(", ")}`;
  }
  return sets.map(formatSet).join(", ");
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${String(h)}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatCountdown(seconds: number): string {
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}

// TELA-015 — Execução em modo foco (RF-060..063, RF-066, RF-067; ADR-026).
export function ExecutionScreen() {
  const execution = useExecution();
  useWakeLock();
  const { state } = execution;
  if (state.status === "loading") return <Skeleton lines={8} />;
  if (state.status === "none") {
    return (
      <>
        <h1 className={shared.screenTitle} tabIndex={-1}>
          {T.screenTitle}
        </h1>
        <EmptyState
          icon={<Dumbbell size={32} />}
          title={T.none}
          description={T.noneHint}
          action={
            <Button
              variant="primary"
              onClick={() => {
                navigate("/hoje");
              }}
            >
              {T.goToday}
            </Button>
          }
        />
      </>
    );
  }
  return <Focus key={state.bundle.session.id} state={state} execution={execution} />;
}

type Execution = ReturnType<typeof useExecution>;

function Focus({ state, execution }: { state: Ready; execution: Execution }) {
  const { bundle, exercises, current, currentIndex, rest } = state;
  const { run, saveUi, reload, local, failed } = execution;
  const show = useSnackbar();
  const now = useNow(1000);
  const [menu, setMenu] = useState(false);
  const [overview, setOverview] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [draft, setDraft] = useState<{ key: string; values: SetValues } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const owner = local?.userId ?? "";
  const db = local?.db;
  const thumbZone = useRef<HTMLDivElement>(null);

  // A confirmação (Snackbar) fica acima da zona do polegar, sem cobrir o cronômetro.
  useEffect(() => {
    const zone = thumbZone.current;
    if (!zone) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--snackbar-bottom", `${String(zone.offsetHeight + 8)}px`);
    });
    observer.observe(zone);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--snackbar-bottom");
    };
  }, []);

  if (isAbandoned(bundle.session.last_activity_at, new Date(now))) {
    return <AbandonedPanel state={state} execution={execution} />;
  }

  const sets = setsOf(bundle, current.entry.id);
  const planned = Math.max(current.entry.planned_sets, sets.length);
  const nextNumber = sets.length + 1;
  // Pulado conta como encerrado: a zona do polegar passa ao próximo exercício (RF-063).
  const complete = sets.length >= planned || current.entry.status === "skipped";
  const key = `${current.entry.id}:${String(nextNumber)}`;
  const values = draft?.key === key ? draft.values : initialValues(current, bundle, nextNumber);
  const byDuration =
    (current.entry.prescription?.measure_type ?? current.exercise?.measure_type) === "duration";
  const nextOpen =
    exercises.find(
      (v, index) =>
        index > currentIndex && v.entry.status === "pending" && v.entry.id !== current.entry.id,
    ) ?? exercises.find((v) => v.entry.status === "pending" && v.entry.id !== current.entry.id);
  const name = current.exercise?.name ?? "—";

  const setValue = (change: Partial<SetValues>) => {
    setLoadError(false);
    setDraft({ key, values: { ...values, ...change } });
  };

  async function goTo(view: ExerciseView | undefined) {
    if (!view) return;
    await saveUi({ currentExerciseId: view.entry.id, rest: null });
    await reload();
  }

  /** Texto "A seguir" do descanso: próxima série deste exercício ou o próximo exercício. */
  function nextLabel(afterCount: number): string | null {
    if (afterCount < planned) {
      return T.nextSet(afterCount + 1, formatSet(initialValues(current, bundle, afterCount + 1)));
    }
    return nextOpen ? T.nextExerciseLabel(nextOpen.exercise?.name ?? "—") : null;
  }

  async function confirm() {
    if (!db || values.load_kg === null) {
      setLoadError(true);
      return;
    }
    const loadKg = values.load_kg;
    const restSeconds = current.entry.prescription?.rest_s ?? 0;
    const label = nextLabel(nextNumber);
    // RN-043: a confirmação aparece logo após a série gravada no aparelho; estado do exercício
    // e descanso vêm em seguida (CA-207, ≤ 100 ms).
    await run(
      () =>
        actions.saveSet(db, owner, bundle.session.id, {
          session_exercise_id: current.entry.id,
          set_number: nextNumber,
          load_kg: loadKg,
          reps: byDuration ? null : values.reps,
          duration_s: byDuration ? values.duration_s : null,
        }),
      (set) => {
        setDraft(null);
        show({
          text: T.setSaved,
          action: { label: TEXTS.common.undo, onAction: () => void undo(set) },
        });
      },
      async () => {
        if (nextNumber >= planned)
          await actions.updateSessionExercise(db, owner, current.entry.id, { status: "done" });
        const restState =
          restSeconds > 0 && label !== null
            ? { endsAt: Date.now() + restSeconds * 1000, next: label }
            : null;
        await saveUi({ rest: restState });
      },
    );
  }

  async function undo(set: LocalSet) {
    if (!db) return;
    await run(async () => {
      await actions.deleteSet(db, owner, set.id);
      if (current.entry.status === "done")
        await actions.updateSessionExercise(db, owner, current.entry.id, { status: "pending" });
      await saveUi({ rest: null, currentExerciseId: current.entry.id });
    });
  }

  async function skip() {
    if (!db) return;
    setMenu(false);
    await run(async () => {
      await actions.updateSessionExercise(db, owner, current.entry.id, { status: "skipped" });
      await saveUi({ currentExerciseId: nextOpen?.entry.id ?? current.entry.id, rest: null });
    });
    show({ text: T.skipped });
  }

  async function discard() {
    if (!db) return;
    setConfirmDiscard(false);
    await run(() => actions.discardSession(db, owner, bundle.session.id));
    show({ text: T.discarded });
    navigate("/hoje", { replace: true });
  }

  async function finishRest() {
    await saveUi({ rest: null });
    await reload();
  }

  return (
    <div className={styles.focus}>
      <header className={styles.topBar}>
        <IconButton
          label={T.minimize}
          icon={<ChevronDown size={24} />}
          onClick={() => {
            navigate("/hoje");
          }}
        />
        <div className={styles.topText}>
          <h1 className={styles.workoutName} tabIndex={-1}>
            {bundle.session.workout_name ?? ""}
          </h1>
          <span className={styles.topMeta}>
            <span aria-label={T.elapsed} className="tabular">
              {formatElapsed(now - new Date(bundle.session.started_at).getTime())}
            </span>
            {" · "}
            {T.progress(currentIndex + 1, exercises.length)}
          </span>
        </div>
        <SyncIndicator compact />
        <IconButton
          label={T.menu}
          icon={<MoreVertical size={24} />}
          onClick={() => {
            setMenu(true);
          }}
        />
      </header>

      <div className={styles.progress} aria-hidden="true">
        {exercises.map((view, index) => (
          <span
            key={view.entry.id}
            className={
              index === currentIndex || view.entry.status !== "pending" ? styles.progressDone : ""
            }
          />
        ))}
      </div>

      {failed ? <Banner tone="danger">{T.saveFailed}</Banner> : null}

      <section className={styles.exercise} aria-labelledby="exercicio-atual">
        <div className={styles.exerciseHead}>
          {rest ? null : <ExerciseImage images={current.exercise?.images ?? []} size="thumb" />}
          <div>
            <h2 id="exercicio-atual" className={styles.exerciseName}>
              {name}
            </h2>
            {current.entry.prescription && !rest ? (
              <p className={shared.muted}>{itemSummary(current.entry.prescription)}</p>
            ) : null}
          </div>
        </div>
        {current.last && !rest ? (
          <p className={shared.muted}>{T.lastTime(formatLast(current.last.sets))}</p>
        ) : null}
        {current.exercise && !rest ? (
          <details className={shared.details}>
            <summary>{T.guidance}</summary>
            <h3>{T.instructions}</h3>
            <ol className={shared.steps}>
              {current.exercise.instructions.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {current.exercise.safety_tips.length > 0 ? (
              <>
                <h3>{T.safety}</h3>
                <ul className={shared.steps}>
                  {current.exercise.safety_tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {current.entry.prescription?.notes ? <p>{current.entry.prescription.notes}</p> : null}
          </details>
        ) : null}
      </section>

      <ol className={[styles.sets, rest ? styles.setsResting : ""].join(" ")} aria-label={T.sets}>
        {sets.map((set) => (
          <li key={set.id} className={styles.doneRow}>
            <span className={styles.setNumber}>{set.set_number}</span>
            <span className="tabular">{formatSet(set)}</span>
            <Check size={20} aria-label={T.registered} className={styles.check} />
          </li>
        ))}
        {complete || rest ? null : (
          <li className={styles.currentRow} aria-label={T.set(nextNumber)}>
            <span className={styles.currentTitle}>{T.set(nextNumber)}</span>
            <div className={styles.steppers}>
              <Stepper
                label={current.exercise?.is_bodyweight ? T.bodyweightLoad : T.load}
                value={values.load_kg}
                step={2.5}
                range={RANGES.loadKg}
                unit="kg"
                size="metric"
                error={loadError ? T.loadRequired : undefined}
                onChange={(load) => {
                  setValue({ load_kg: load });
                }}
              />
              {byDuration ? (
                <Stepper
                  label={T.seconds}
                  value={values.duration_s}
                  step={5}
                  range={RANGES.durationSecondsLogged}
                  unit="s"
                  size="metric"
                  onChange={(seconds) => {
                    setValue({ duration_s: seconds });
                  }}
                />
              ) : (
                <Stepper
                  label={T.reps}
                  value={values.reps}
                  step={1}
                  range={RANGES.reps}
                  size="metric"
                  onChange={(reps) => {
                    setValue({ reps });
                  }}
                />
              )}
            </div>
          </li>
        )}
        {Array.from(
          { length: rest ? 0 : Math.max(planned - nextNumber, 0) },
          (_, i) => nextNumber + 1 + i,
        ).map((n) => (
          <li key={n} className={styles.futureRow}>
            <span className={styles.setNumber}>{n}</span>
            <span className="tabular">{formatSet(initialValues(current, bundle, n))}</span>
            <span className={styles.plannedTag}>{T.planned}</span>
          </li>
        ))}
      </ol>
      {rest ? (
        <RestPlate
          rest={rest}
          total={current.entry.prescription?.rest_s ?? 0}
          onDone={() => {
            restFinishedAlert();
            show({ text: T.restDone });
            void finishRest();
          }}
        />
      ) : null}
      <div className={rest ? styles.hidden : shared.row}>
        <Button
          variant="ghost"
          icon={<Plus size={20} />}
          onClick={() =>
            void run(async () => {
              if (db) await actions.setPlannedSets(db, current.entry.id, planned + 1);
              if (db && current.entry.status === "done")
                await actions.updateSessionExercise(db, owner, current.entry.id, {
                  status: "pending",
                });
            })
          }
        >
          {T.addSet}
        </Button>
        {planned > sets.length && planned > 1 ? (
          <Button
            variant="ghost"
            icon={<Trash2 size={20} />}
            onClick={() =>
              void run(async () => {
                if (db) await actions.setPlannedSets(db, current.entry.id, planned - 1);
              })
            }
          >
            {T.removeSet}
          </Button>
        ) : null}
      </div>

      <div ref={thumbZone} className={styles.thumbZone}>
        {rest ? (
          <div className={styles.restActions}>
            <Button
              size="lg"
              aria-label={T.restMinus}
              onClick={() => {
                void saveUi({ rest: { ...rest, endsAt: rest.endsAt - REST_STEP_MS } }).then(reload);
              }}
            >
              −15 s
            </Button>
            <Button size="lg" variant="primary" onClick={() => void finishRest()}>
              {T.restSkip}
            </Button>
            <Button
              size="lg"
              aria-label={T.restPlus}
              onClick={() => {
                void saveUi({ rest: { ...rest, endsAt: rest.endsAt + REST_STEP_MS } }).then(reload);
              }}
            >
              +15 s
            </Button>
          </div>
        ) : complete ? (
          nextOpen ? (
            <Button
              variant="primary"
              size="lg"
              className={styles.wide}
              onClick={() => void goTo(nextOpen)}
            >
              {T.nextExercise}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className={styles.wide}
              onClick={() => {
                navigate(COMPLETE_PATH);
              }}
            >
              {T.finishWorkout}
            </Button>
          )
        ) : (
          <Button
            variant="primary"
            size="lg"
            icon={<Check size={20} />}
            className={styles.wide}
            onClick={() => void confirm()}
          >
            {T.confirmSet(nextNumber)}
          </Button>
        )}
      </div>

      <Sheet
        open={menu}
        title={T.menu}
        onClose={() => {
          setMenu(false);
        }}
      >
        <div className={shared.stack}>
          <Button
            onClick={() => {
              setMenu(false);
              setOverview(true);
            }}
          >
            {T.overview}
          </Button>
          <Button onClick={() => void skip()}>{T.skipExercise}</Button>
          <Button
            variant="danger"
            onClick={() => {
              setMenu(false);
              setConfirmDiscard(true);
            }}
          >
            {T.discard}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={overview}
        title={T.overview}
        onClose={() => {
          setOverview(false);
        }}
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setOverview(false);
              navigate(COMPLETE_PATH);
            }}
          >
            {T.finishWorkout}
          </Button>
        }
      >
        <ul className={shared.list}>
          {exercises.map((view) => {
            const done = setsOf(bundle, view.entry.id).length;
            const total = Math.max(view.entry.planned_sets, done);
            const status = view.entry.id === current.entry.id ? "current" : view.entry.status;
            return (
              <li key={view.entry.id}>
                <button
                  type="button"
                  className={shared.listLink}
                  onClick={() => {
                    setOverview(false);
                    void goTo(view);
                  }}
                >
                  <span className={shared.listText}>
                    <span>{view.exercise?.name ?? "—"}</span>
                    <span className={shared.muted}>
                      {T.setsCount(done, total)} · {T.statuses[status]}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>

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
        <p>{T.discardBody}</p>
      </Dialog>
    </div>
  );
}

// RestTimer (UX-06): anilha com a contagem pelo horário de término e o anel do tempo que falta;
// −15 s, +15 s e Pular ficam na zona do polegar (RF-062).
function RestPlate({
  rest,
  total,
  onDone,
}: {
  rest: { endsAt: number; next: string | null };
  /** Descanso prescrito, em segundos; o anel fica cheio se o ajuste passar disso. */
  total: number;
  onDone: () => void;
}) {
  const now = useNow(250);
  const remaining = restRemainingSeconds(rest.endsAt, now);
  const finished = useRef<number | null>(null);

  useEffect(() => {
    if (remaining > 0 || finished.current === rest.endsAt) return;
    finished.current = rest.endsAt;
    onDone();
  }, [remaining, rest.endsAt, onDone]);

  const left = total > 0 ? Math.min(remaining / total, 1) * 100 : 100;
  return (
    <div className={styles.rest}>
      <div className={styles.plate} role="timer" aria-label={T.restLabel}>
        <svg viewBox="0 0 400 400" aria-hidden="true">
          <circle cx="200" cy="200" r="196" fill="#2a3038" />
          <circle cx="200" cy="200" r="178" fill="#1a1f25" />
          <circle cx="200" cy="200" r="168" fill="none" stroke="#2e3640" strokeWidth="12" />
          <circle
            cx="200"
            cy="200"
            r="168"
            fill="none"
            stroke="#a3e635"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${String(left)} 100`}
            transform="rotate(-90 200 200)"
          />
          <circle cx="200" cy="200" r="150" fill="#14181d" />
        </svg>
        <span className={styles.plateText}>
          <span className={styles.plateLabel}>{T.restLabel}</span>
          <span className={styles.countdown}>{formatCountdown(remaining)}</span>
        </span>
      </div>
      {rest.next ? <p className={styles.upNext}>{T.upNext(rest.next)}</p> : null}
    </div>
  );
}

// RN-012 — sessão abandonada: concluir informando o término, ou descartar.
function AbandonedPanel({ state, execution }: { state: Ready; execution: Execution }) {
  const { bundle } = state;
  const { run, local } = execution;
  const [endedAt, setEndedAt] = useState(() => toLocalInput(bundle.session.last_activity_at));
  const [invalid, setInvalid] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const show = useSnackbar();
  const db = local?.db;

  async function conclude() {
    const end = new Date(endedAt);
    const lastActivity = new Date(bundle.session.last_activity_at);
    lastActivity.setSeconds(0, 0);
    if (!db || Number.isNaN(end.getTime()) || end < lastActivity || end > new Date()) {
      setInvalid(true);
      return;
    }
    const done = await run(() =>
      completeSession(db, local.userId, bundle.session.id, {
        rpe: null,
        notes: null,
        endedAt: end,
      }),
    );
    if (!done) return;
    await writeMeta(db, SUMMARY_KEY, done.id);
    navigate(COMPLETE_PATH, { replace: true });
  }

  return (
    <div className={shared.stack}>
      <h1 className={shared.screenTitle} tabIndex={-1}>
        {T.abandonedTitle}
      </h1>
      <p>{T.abandonedBody}</p>
      <FormField label={T.endedAt} error={invalid ? T.endedAtInvalid : undefined}>
        {(control) => (
          <TextInput
            {...control}
            type="datetime-local"
            value={endedAt}
            onChange={(event) => {
              setInvalid(false);
              setEndedAt(event.target.value);
            }}
          />
        )}
      </FormField>
      <Button variant="primary" onClick={() => void conclude()}>
        {T.concludeAbandoned}
      </Button>
      <Button
        variant="danger"
        onClick={() => {
          setConfirmDiscard(true);
        }}
      >
        {T.discard}
      </Button>
      <Dialog
        open={confirmDiscard}
        title={T.discardTitle}
        confirmLabel={T.discard}
        destructive
        onCancel={() => {
          setConfirmDiscard(false);
        }}
        onConfirm={() => {
          setConfirmDiscard(false);
          if (!db) return;
          void run(() => actions.discardSession(db, local.userId, bundle.session.id)).then(() => {
            show({ text: T.discarded });
            navigate("/hoje", { replace: true });
          });
        }}
      >
        <p>{T.discardBody}</p>
      </Dialog>
    </div>
  );
}
