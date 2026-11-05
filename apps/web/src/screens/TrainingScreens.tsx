import { appModeOf } from "../account/context.ts";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { InstallBanner } from "../components/InstallBanner.tsx";
import { useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Play, SearchX } from "lucide-react";
import {
  currentWeight,
  MUSCLE_GROUP_LABELS,
  toLocalDate,
  type MuscleGroup,
  type WorkoutStatus,
} from "@forja/domain";
import { Button, IconButton } from "../components/Button.tsx";
import { SYNC_PATH } from "../components/SyncIndicator.tsx";
import { WeightPlate } from "../components/WeightPlate.tsx";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { pendingAge } from "../sync/status.ts";
import { ExerciseImage } from "../components/ExerciseImage.tsx";
import { Banner, EmptyState, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { itemSummary } from "../program/summary.ts";
import { formatUpdatedAt } from "../training/format.ts";
import {
  formatAgo,
  formatDay,
  formatDaysAgo,
  formatKg,
  formatRelease,
  formatShortDate,
} from "../training/format.ts";
import { useTraining, type TrainingState } from "../training/useTraining.ts";
import { SESSION_PATH, useStartWorkout } from "../execution/useStartWorkout.tsx";
import { useGoalWeight, useRegisterWeight } from "./EvolutionScreen.tsx";
import type { WeekDay, WorkoutSummary } from "../training/training.ts";
import { Link, navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import shared from "./Screens.module.css";
import styles from "./Training.module.css";

const T = TEXTS.training;
type Ready = Extract<TrainingState, { status: "ready" }>;

const PROGRAM_PATH = "/gestao/programa";

const groupLabel = (group: string) => MUSCLE_GROUP_LABELS[group as MuscleGroup];

function GroupChips({ groups }: { groups: readonly string[] }) {
  if (groups.length === 0) return null;
  return (
    <ul className={styles.chips} aria-label={TEXTS.catalog.primary}>
      {groups.map((g) => (
        <li key={g} className={styles.chip}>
          {groupLabel(g)}
        </li>
      ))}
    </ul>
  );
}

const workoutFacts = (w: WorkoutSummary) =>
  [TEXTS.program.exercisesCount(w.exerciseCount), T.minutes(w.minutes)].join(" · ");

/** Barra com anilhas do estado sem rotina: decorativa, em SVG, como a anilha do login. */
function BarbellArt() {
  const plates = [
    [40, 16, 30, 128],
    [74, 40, 20, 80],
    [226, 40, 20, 80],
    [250, 16, 30, 128],
  ];
  return (
    <svg viewBox="0 0 320 160" aria-hidden="true" className={styles.barbell}>
      <rect className={styles.bar} x="8" y="74" width="304" height="12" rx="6" />
      <rect className={styles.bar} x="98" y="66" width="12" height="28" rx="4" />
      <rect className={styles.bar} x="210" y="66" width="12" height="28" rx="4" />
      {plates.map(([x, y, width, height]) => (
        <rect
          key={x}
          x={x}
          y={y}
          width={width}
          height={height}
          rx="9"
          fill="#1a1f25"
          stroke="#59636e"
          strokeWidth="2"
        />
      ))}
      <rect x="46" y="20" width="4" height="120" rx="2" fill="#a3e635" />
      <rect x="270" y="20" width="4" height="120" rx="2" fill="#a3e635" />
    </svg>
  );
}

/** Cartão principal, sempre grafite, com a anilha cortada no canto (UX-02 §2.3). */
function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className={["graphite", styles.hero].join(" ")} aria-labelledby="hero-title">
      <WeightPlate className={styles.heroPlate} />
      {children}
    </section>
  );
}

/** Estados comuns: carregando, sem programa (ou nunca baixado offline — UX-04 §4.1). */
function useReadyTraining(): { training: Ready } | { fallback: React.JSX.Element } {
  const training = useTraining();
  const online = useOnline();
  const { state: userState } = useUserContext();
  const automatic =
    appModeOf(userState.status === "ready" ? userState.context : null) === "automatic";
  if (training.status === "loading") return { fallback: <Skeleton lines={6} /> };
  if (training.status === "no_program") {
    if (!online && training.updatedAt === undefined)
      return { fallback: <ErrorState title={TEXTS.error.title} description={T.neverDownloaded} /> };
    return {
      fallback: (
        <section className={styles.noRoutine}>
          <BarbellArt />
          <h2 className={styles.noRoutineTitle}>{automatic ? T.noneAutomatic : T.none}</h2>
          <p className={shared.muted}>{automatic ? T.noneAutomaticHint : T.noneHint}</p>
          <Button
            variant="primary"
            size="lg"
            className={styles.heroPrimary}
            onClick={() => {
              navigate(automatic ? "/plano" : PROGRAM_PATH);
            }}
          >
            {automatic ? T.buildAutomatic : T.build}
          </Button>
        </section>
      ),
    };
  }
  return { training };
}

/** UX-08 §7 — pendências com mais de 24 h (aviso) ou 72 h (perigo); toque abre a Sincronização. */
function OldPendingBanner({ now, timeZone }: { now: Date; timeZone: string }) {
  const local = useLocalData();
  const oldest = local?.outbox.oldestCreatedAt ?? null;
  const age = pendingAge(oldest, now);
  if (age === "none" || oldest === null) return null;
  return (
    <Banner
      tone={age === "danger" ? "danger" : "warning"}
      action={
        <Button
          variant="ghost"
          onClick={() => {
            navigate(SYNC_PATH);
          }}
        >
          {TEXTS.account.sync}
        </Button>
      }
    >
      {TEXTS.sync.oldPending(formatShortDate(toLocalDate(new Date(oldest), timeZone)))}
    </Banner>
  );
}

function OfflineStamp({ updatedAt }: { updatedAt: string | undefined }) {
  const stamp = formatUpdatedAt(updatedAt);
  return stamp ? <p className={shared.muted}>{stamp}</p> : null;
}

// ---------- TELA-010 Hoje ----------

export function TodayScreen() {
  const result = useReadyTraining();
  const [choosing, setChoosing] = useState(false);
  const { start, dialog } = useStartWorkout();
  const register = useRegisterWeight();
  const goal = useGoalWeight();
  if ("fallback" in result) return result.fallback;
  const { training } = result;
  const today = toLocalDate(training.now, training.timeZone);

  return (
    <div className={styles.todayScreen}>
      <p className={styles.date}>{formatDay(today)}</p>
      <OldPendingBanner now={training.now} timeZone={training.timeZone} />
      <InstallBanner />
      <HeroCard
        training={training}
        onStart={(workoutId) => void start(workoutId)}
        onChoose={() => {
          setChoosing(true);
        }}
      />
      <WeekRow training={training} />
      <WeightRow training={training} today={today} goal={goal} onRegister={register.open} />
      <OfflineStamp updatedAt={training.updatedAt} />
      <ChooseWorkoutSheet
        open={choosing}
        training={training}
        onStart={(workoutId) => void start(workoutId)}
        onClose={() => {
          setChoosing(false);
        }}
      />
      {dialog}
      {register.sheet}
    </div>
  );
}

function HeroCard({
  training,
  onStart,
  onChoose,
}: {
  training: Ready;
  onStart: (workoutId: string) => void;
  onChoose: () => void;
}) {
  const { recommendation: rec, workouts } = training;
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const next = rec.next ? byId.get(rec.next.workoutId) : undefined;
  const state = rec.state;
  /** Nome do treino da sessão: do programa atual ou o guardado na própria sessão. */
  const sessionName = (s: { workoutId: string; sessionId: string }) =>
    byId.get(s.workoutId)?.name ?? training.sessionNames.get(s.sessionId) ?? "";

  if (state.kind === "continue") {
    return (
      <Hero>
        <h2 id="hero-title" className={styles.heroTitle}>
          {T.inProgressTitle(sessionName(state))}
        </h2>
        {training.active ? (
          <p className={styles.heroText}>
            {T.inProgressFacts(
              Math.max(
                0,
                Math.floor(
                  (training.now.getTime() - new Date(training.active.startedAt).getTime()) / 60_000,
                ),
              ),
              training.active.sets,
              training.active.planned,
            )}
          </p>
        ) : null}
        <Button
          variant="primary"
          size="lg"
          className={styles.heroPrimary}
          onClick={() => {
            navigate(SESSION_PATH);
          }}
        >
          {T.continue}
        </Button>
      </Hero>
    );
  }

  if (state.kind === "completed_today") {
    return (
      <Hero>
        <h2 id="hero-title" className={styles.heroTitle}>
          {T.completedToday(sessionName(state))}
        </h2>
        {next ? <p className={styles.heroText}>{T.nextUp(next.name)}</p> : null}
        <div className={styles.heroActions}>
          <Button
            variant="primary"
            onClick={() => {
              navigate(`/agenda/${toLocalDate(training.now, training.timeZone)}`);
            }}
          >
            {T.viewSummary}
          </Button>
          <Button variant="ghost" onClick={onChoose}>
            {T.chooseOther}
          </Button>
        </div>
      </Hero>
    );
  }

  if (state.kind === "rest_goal" || state.kind === "rest_recovery") {
    const reason =
      state.kind === "rest_goal"
        ? T.goalReached(rec.week.count, rec.week.goal ?? rec.week.count)
        : state.availableAt === null
          ? T.noRelease
          : T.availableAt(
              formatRelease(new Date(state.availableAt), training.now, training.timeZone),
            );
    return (
      <Hero>
        <p className={styles.eyebrow}>{T.restSuggested}</p>
        <h2 id="hero-title" className={styles.heroText}>
          {reason}
        </h2>
        <div className={styles.heroActions}>
          <Button onClick={onChoose}>{T.trainAnyway}</Button>
        </div>
      </Hero>
    );
  }

  if (!next) return null;
  const reason = [
    T.reasonSequence,
    rec.next?.lastTrained
      ? T.reasonRested(
          groupLabel(rec.next.lastTrained.group),
          formatAgo(rec.next.lastTrained.hoursSince),
        ).toLowerCase()
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Hero>
      <p className={styles.eyebrow}>{T.recommended}</p>
      <h2 id="hero-title" className={styles.heroTitle}>
        {next.name}
      </h2>
      <p className={styles.heroText}>{reason}</p>
      <p className={styles.heroText}>{workoutFacts(next)}</p>
      <GroupChips groups={next.groups} />
      {rec.notPlannedToday ? <p className={styles.heroText}>{T.notPlanned}</p> : null}
      <Button
        variant="primary"
        size="lg"
        icon={<Play size={20} />}
        className={styles.heroPrimary}
        onClick={() => {
          onStart(next.id);
        }}
      >
        {T.start}
      </Button>
      <div className={[styles.heroActions, styles.heroLinks].join(" ")}>
        <Button variant="ghost" size="sm" onClick={onChoose}>
          {T.chooseOther}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigate(`/treinos/${next.id}`);
          }}
        >
          {T.viewWorkout}
        </Button>
      </div>
    </Hero>
  );
}

function WeekRow({ training }: { training: Ready }) {
  const { week, recommendation } = training;
  return (
    <section className={styles.panel} aria-label={T.week}>
      <div className={styles.weekHead}>
        <span className={styles.summaryLabel}>{T.week}</span>
        <span className={shared.muted}>
          {T.weekCount(recommendation.week.count, recommendation.week.goal)}
        </span>
      </div>
      <ol className={styles.week}>
        {week.map((day: WeekDay) => (
          <li
            key={day.date}
            className={[styles.day, day.isToday ? styles.today : ""].join(" ")}
            aria-label={`${formatDay(day.date)}: ${T.marks[day.mark]}`}
          >
            <span className={styles.dayLetter} aria-hidden="true">
              {T.weekdays[day.weekday - 1]?.charAt(0).toUpperCase()}
            </span>
            <span
              className={[styles.dot, day.mark === "none" ? "" : styles[day.mark]].join(" ")}
              aria-hidden="true"
            >
              {day.mark === "presence" || day.mark === "pending" ? (
                <Check size={18} strokeWidth={3} />
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WeightRow({
  training,
  today,
  goal,
  onRegister,
}: {
  training: Ready;
  today: string;
  goal: number | null;
  onRegister: () => void;
}) {
  const latest = currentWeight(training.weights);
  return (
    <div className={[styles.panel, styles.weightPanel].join(" ")}>
      <span className={styles.itemText}>
        <span className={styles.summaryLabel}>{T.weight}</span>
        {latest ? (
          <span>
            <span className={styles.weightValue}>{formatKg(latest.weight_kg)} kg</span>
            <span className="visually-hidden"> · </span>
            <span className={styles.weightMeta}>
              {[
                formatDaysAgo(latest.measured_on, today),
                goal === null ? null : TEXTS.evolution.goal(formatKg(goal)).toLowerCase(),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        ) : (
          <span className={shared.muted}>{T.noWeight}</span>
        )}
      </span>
      <Button size="sm" onClick={onRegister}>
        {TEXTS.evolution.register}
      </Button>
    </div>
  );
}

// ---------- TELA-011 Escolher treino ----------

function restLine(status: WorkoutStatus): string | null {
  const block = status.block;
  if (!block) return null;
  return T.restWarning(groupLabel(block.group), Math.floor(block.hoursSince), block.restHours);
}

export function ChooseWorkoutSheet({
  open,
  training,
  onStart,
  onClose,
}: {
  open: boolean;
  training: Ready;
  onStart: (workoutId: string) => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const statuses = new Map(training.recommendation.workouts.map((s) => [s.workoutId, s]));
  const close = () => {
    setConfirming(null);
    onClose();
  };

  return (
    <Sheet open={open} title={T.chooseTitle} onClose={close}>
      <ul className={shared.list}>
        {training.workouts.map((workout) => {
          const status = statuses.get(workout.id);
          const warning = status ? restLine(status) : null;
          return (
            <li key={workout.id} className={shared.stack}>
              <button
                type="button"
                className={styles.card}
                aria-describedby={warning ? `aviso-${workout.id}` : undefined}
                onClick={() => {
                  if (status?.block) {
                    setConfirming(workout.id);
                    return;
                  }
                  close();
                  onStart(workout.id);
                }}
              >
                <span className={styles.cardTitle}>{workout.name}</span>
                {status?.recommended ? <span className={styles.badge}>{T.recommended}</span> : null}
                {status?.doneInCycleOn ? (
                  <span className={shared.muted}>
                    {T.doneInCycle(formatShortDate(status.doneInCycleOn))}
                  </span>
                ) : null}
                {warning ? (
                  <span id={`aviso-${workout.id}`} className={styles.warning}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    {warning}
                  </span>
                ) : null}
              </button>
              {confirming === workout.id && status?.block ? (
                <div className={shared.stack} role="group" aria-label={T.startAnyway}>
                  <p>
                    {T.restWarningLong(
                      workout.name,
                      groupLabel(status.block.group),
                      Math.floor(status.block.hoursSince),
                      status.block.restHours,
                    )}
                  </p>
                  <p className={shared.strong}>{T.startAnyway}</p>
                  <div className={shared.row}>
                    <Button
                      variant="primary"
                      onClick={() => {
                        close();
                        onStart(workout.id);
                      }}
                    >
                      {T.confirmStart}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setConfirming(null);
                      }}
                    >
                      {TEXTS.common.cancel}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

// ---------- TELA-012 Treinos ----------

export function WorkoutsScreen() {
  const result = useReadyTraining();
  if ("fallback" in result) return result.fallback;
  const { program, workouts, updatedAt } = result.training;
  const published = program.published_at
    ? toLocalDate(new Date(program.published_at), result.training.timeZone)
    : null;

  return (
    <div className={shared.stack}>
      <div>
        <h2 className={shared.exerciseName}>{program.document.name}</h2>
        {published ? <p className={shared.muted}>{T.version(formatShortDate(published))}</p> : null}
      </div>
      <ul className={shared.list}>
        {workouts.map((workout) => (
          <li key={workout.id}>
            <Link to={`/treinos/${workout.id}`} className={styles.card}>
              <span className={styles.cardTitle}>{workout.name}</span>
              <span className={shared.muted}>{workoutFacts(workout)}</span>
              <GroupChips groups={workout.groups} />
            </Link>
          </li>
        ))}
      </ul>
      {updatedAt ? <span className={styles.badge}>{T.offlineBadge}</span> : null}
    </div>
  );
}

// ---------- TELA-013 Detalhe do treino ----------

export function WorkoutScreen({ params }: { params: Readonly<Record<string, string>> }) {
  const result = useReadyTraining();
  const { start, dialog } = useStartWorkout();
  if ("fallback" in result) return result.fallback;
  const { training } = result;
  const workout = training.program.document.workouts.find((w) => w.id === params.id);
  const summary = training.workouts.find((w) => w.id === params.id);
  if (!workout || !summary) {
    return (
      <EmptyState
        icon={<SearchX size={32} />}
        title={T.notFound}
        description=""
        action={
          <Button
            onClick={() => {
              navigate("/treinos");
            }}
          >
            {T.backToWorkouts}
          </Button>
        }
      />
    );
  }
  return (
    <div className={styles.workoutScreen}>
      <div className={["graphite", styles.workoutHero].join(" ")}>
        <WeightPlate className={styles.workoutPlate} />
        <IconButton
          label={T.back}
          icon={<ChevronLeft size={24} />}
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else navigate("/treinos");
          }}
        />
        <h2 className={styles.heroTitle}>{workout.name}</h2>
        <p className={styles.heroText}>
          {[workoutFacts(summary), training.updatedAt ? T.offlineBadge.toLowerCase() : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <GroupChips groups={summary.groups} />
      </div>
      <ol className={styles.itemList} aria-label={T.exercises}>
        {workout.items.map((item) => {
          const exercise = training.exercises.get(item.exercise_id);
          return (
            <li key={item.id}>
              <Link to={`/exercicios/${item.exercise_id}`} className={styles.itemRow}>
                <ExerciseImage images={exercise?.images ?? []} size="thumb" />
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{exercise?.name ?? "—"}</span>
                  <span className={shared.muted}>
                    {[
                      itemSummary(item),
                      item.suggested_load_kg === null
                        ? null
                        : T.suggestedLoad(formatKg(item.suggested_load_kg)),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
      <div className={styles.stickyAction}>
        <Button
          variant="primary"
          size="lg"
          icon={<Play size={20} />}
          className={styles.heroPrimary}
          onClick={() => void start(workout.id)}
        >
          {T.start}
        </Button>
      </div>
      {dialog}
    </div>
  );
}
