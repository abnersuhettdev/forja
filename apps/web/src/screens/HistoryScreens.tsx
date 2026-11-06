import { useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CloudUpload,
  Pencil,
  Play,
  Plus,
  SearchX,
  Trash2,
} from "lucide-react";
import {
  countWorkouts,
  dayStatus,
  isAbandoned,
  isWithinEditWindow,
  monthGrid,
  RANGES,
  isWithinRange,
  sessionTimesIssue,
  shiftMonth,
  toLocalDate,
  type CalendarSession,
  type DayMark,
} from "@forja/domain";
import { Button, IconButton } from "../components/Button.tsx";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { Banner, EmptyState, Skeleton } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { discardSession, type SessionBundle } from "../execution/session.ts";
import { saveSessionEdit, type EditedSet } from "../history/history.ts";
import { useHistory, type HistoryState } from "../history/useHistory.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import { deleteSession } from "../sync/queue.ts";
import {
  formatClock,
  formatDay,
  formatKg,
  formatShortDate,
  fromLocalInput,
  toLocalInput,
} from "../training/format.ts";
import { formatSet } from "./ExecutionScreen.tsx";
import { Link, navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { HISTORY_TEXTS } from "./history-texts.ts";
import shared from "./Screens.module.css";
import styles from "./History.module.css";

const T = HISTORY_TEXTS;
const MONTH_KEY = "forja.u.agenda.mes";
const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MARK_ICONS: Record<Exclude<DayMark, "none">, ReactNode> = {
  completed: <Check size={16} />,
  manual: <Pencil size={14} />,
  in_progress: <Play size={14} />,
  abandoned: <CircleAlert size={16} />,
  planned: <Calendar size={14} />,
};

function toCalendar(bundle: SessionBundle, pending: ReadonlySet<string>): CalendarSession {
  return {
    status: bundle.session.status,
    startedAt: bundle.session.started_at,
    lastActivityAt: bundle.session.last_activity_at,
    pending: pending.has(bundle.session.id),
  };
}

/** Mês aberto na Agenda, lembrado durante a sessão do usuário (removido ao sair). */
function readMonth(today: string): { year: number; month: number } {
  try {
    const stored = sessionStorage.getItem(MONTH_KEY);
    const match = stored ? /^(\d{4})-(\d{2})$/.exec(stored) : null;
    if (match) return { year: Number(match[1]), month: Number(match[2]) };
  } catch {
    // Armazenamento indisponível: começa no mês atual.
  }
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

function saveMonth(value: { year: number; month: number }): void {
  try {
    sessionStorage.setItem(
      MONTH_KEY,
      `${String(value.year)}-${String(value.month).padStart(2, "0")}`,
    );
  } catch {
    // Sem armazenamento: o mês vale só nesta tela.
  }
}

/** Período do mês em instantes, com folga de um dia para o fuso do aluno. */
function monthRange(year: number, month: number) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1) - 86_400_000),
    to: new Date(Date.UTC(year, month, 1) + 86_400_000),
  };
}

function RemoteNotice({ state }: { state: HistoryState }) {
  if (state.remote === "offline") return <Banner tone="info">{T.olderOffline}</Banner>;
  if (state.remote === "failed") return <Banner tone="warning">{T.olderFailed}</Banner>;
  return null;
}

// ---------- TELA-018 Agenda ----------

export function AgendaScreen() {
  const now = useMemo(() => new Date(), []);
  const { state: offline } = useOfflineData();
  const [current, setCurrent] = useState(() => readMonth(toLocalDate(now)));
  const range = useMemo(() => monthRange(current.year, current.month), [current]);
  const { state } = useHistory(range);
  const today = toLocalDate(now, state.timeZone);

  function go(delta: number) {
    const next =
      delta === 0
        ? { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }
        : shiftMonth(current.year, current.month, delta);
    saveMonth(next);
    setCurrent(next);
  }

  const sessions = state.bundles.map((b) => toCalendar(b, state.pending));
  const monthName = MONTH_NAMES[current.month - 1] ?? "";
  const updatedAt = offline.status === "ready" ? offline.updatedAt : undefined;

  return (
    <div className={shared.stack}>
      <div className={styles.monthBar}>
        <IconButton
          label={T.previous}
          icon={<ChevronLeft size={24} />}
          onClick={() => {
            go(-1);
          }}
        />
        <h2 className={styles.monthTitle} aria-live="polite">
          {T.monthTitle(monthName.charAt(0).toUpperCase() + monthName.slice(1), current.year)}
        </h2>
        <IconButton
          label={T.next}
          icon={<ChevronRight size={24} />}
          onClick={() => {
            go(1);
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            go(0);
          }}
        >
          {T.today}
        </Button>
      </div>
      <RemoteNotice state={state} />
      {state.status === "loading" ? (
        <Skeleton lines={6} />
      ) : (
        <table className={styles.calendar}>
          <thead>
            <tr>
              {T.weekdays.map((day) => (
                <th key={day} scope="col">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGrid(current.year, current.month).map((week, index) => (
              <tr key={week.find(Boolean) ?? index}>
                {week.map((date, column) => {
                  if (date === null) return <td key={`vazio-${String(column)}`} />;
                  const status = dayStatus(
                    date,
                    sessions,
                    today,
                    state.preferredWeekdays,
                    now,
                    state.timeZone,
                  );
                  const labels = [
                    T.marks[status.mark],
                    status.pending ? T.marks.pending : null,
                  ].filter(Boolean);
                  return (
                    <td key={date}>
                      <Link
                        to={`/agenda/${date}`}
                        className={[
                          styles.day,
                          styles[status.mark],
                          date === today ? styles.today : "",
                        ].join(" ")}
                        aria-label={`${formatDay(date)}: ${labels.join(", ")}`}
                      >
                        <span aria-hidden="true">{Number(date.slice(8))}</span>
                        <span className={styles.icons} aria-hidden="true">
                          {status.mark === "none" ? null : MARK_ICONS[status.mark]}
                          {status.pending ? (
                            <CloudUpload size={12} className={styles.pending} />
                          ) : null}
                        </span>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className={shared.muted}>
        {T.monthCount(
          countWorkouts(sessions, current.year, current.month, state.timeZone),
          monthName,
        )}
      </p>
      <details className={shared.details}>
        <summary>{T.legend}</summary>
        <ul className={styles.legend}>
          {(["completed", "manual", "in_progress", "abandoned", "planned"] as const).map((mark) => (
            <li key={mark}>
              <span className={[styles.legendIcon, styles[mark]].join(" ")} aria-hidden="true">
                {MARK_ICONS[mark]}
              </span>
              {T.marks[mark]}
            </li>
          ))}
          <li>
            <span className={styles.legendIcon} aria-hidden="true">
              <CloudUpload size={12} className={styles.pending} />
            </span>
            {T.marks.pending}
          </li>
        </ul>
      </details>
      <p className={shared.muted}>
        {T.deviceData(updatedAt ? formatClock(new Date(updatedAt), state.timeZone) : null)}
      </p>
    </div>
  );
}

// ---------- TELA-019 Dia e sessões ----------

export function DayScreen({ params }: { params: Readonly<Record<string, string>> }) {
  const date = params.data ?? "";
  const now = useMemo(() => new Date(), []);
  const range = useMemo(
    () => ({
      from: new Date(`${date}T00:00:00Z`).getTime() - 86_400_000,
      to: new Date(`${date}T00:00:00Z`).getTime() + 2 * 86_400_000,
    }),
    [date],
  );
  const { state, reload } = useHistory(
    useMemo(() => ({ from: new Date(range.from), to: new Date(range.to) }), [range]),
  );
  const local = useLocalData();
  const show = useSnackbar();
  const [deleting, setDeleting] = useState<SessionBundle | null>(null);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return <EmptyState icon={<SearchX size={32} />} title={TEXTS.notFound.title} description="" />;
  if (state.status === "loading") return <Skeleton lines={6} />;

  const today = toLocalDate(now, state.timeZone);
  const ofDay = state.bundles.filter(
    (b) => toLocalDate(new Date(b.session.started_at), state.timeZone) === date,
  );
  const status = dayStatus(
    date,
    ofDay.map((b) => toCalendar(b, state.pending)),
    today,
    state.preferredWeekdays,
    now,
    state.timeZone,
  );
  const editable = isWithinEditWindow(date, today);

  async function remove(bundle: SessionBundle) {
    if (local === null) return;
    if (bundle.session.status === "in_progress")
      await discardSession(local.db, local.userId, bundle.session.id);
    else await deleteSession(local.db, local.userId, bundle);
    void local.engine.syncNow();
    show({ text: T.deleted });
    await reload();
  }

  return (
    <div className={shared.stack}>
      <h2 className={shared.exerciseName}>{formatDay(date)}</h2>
      <RemoteNotice state={state} />
      {ofDay.length === 0 ? <p>{status.mark === "planned" ? T.plannedDay : T.emptyDay}</p> : null}
      {!editable && ofDay.length > 0 ? <p className={shared.muted}>{T.readOnly}</p> : null}
      {ofDay.map((bundle) => {
        const { session } = bundle;
        const abandoned =
          session.status === "in_progress" && isAbandoned(session.last_activity_at, now);
        const mark: Exclude<DayMark, "none" | "planned"> =
          session.status === "in_progress"
            ? abandoned
              ? "abandoned"
              : "in_progress"
            : session.status;
        const version = T.version(session.version_number ?? null);
        return (
          <article
            key={session.id}
            className={styles.session}
            aria-label={session.workout_name ?? ""}
          >
            <header className={styles.sessionHeader}>
              <h3 className={shared.strong}>
                {[session.workout_name, version].filter(Boolean).join(" · ")}
              </h3>
              <span className={[styles.stateBadge, styles[mark]].join(" ")}>
                {MARK_ICONS[mark]} {T.marks[mark]}
              </span>
              {state.pending.has(session.id) ? (
                <span className={styles.stateBadge}>
                  <CloudUpload size={14} aria-hidden="true" /> {T.pendingBadge}
                </span>
              ) : null}
            </header>
            <p className={shared.muted}>
              {[
                T.times(
                  formatClock(new Date(session.started_at), state.timeZone),
                  session.ended_at ? formatClock(new Date(session.ended_at), state.timeZone) : null,
                ),
                session.duration_min === null ? null : T.duration(session.duration_min),
                session.rpe === null ? null : T.rpe(session.rpe),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {session.notes ? <p>{session.notes}</p> : null}
            <ul className={styles.exerciseList}>
              {bundle.exercises.map((exercise) => {
                const sets = bundle.sets.filter((s) => s.session_exercise_id === exercise.id);
                const name = state.exercises.get(exercise.exercise_id)?.name ?? "—";
                return (
                  <li key={exercise.id}>
                    <span className={shared.strong}>{name}</span>
                    {exercise.status === "skipped" ? (
                      <span className={shared.muted}> · {T.skipped}</span>
                    ) : null}
                    <p className={["tabular", shared.muted].join(" ")}>
                      {sets.length === 0 ? T.noSets : sets.map(formatSet).join(", ")}
                    </p>
                  </li>
                );
              })}
            </ul>
            {editable ? (
              <div className={shared.row}>
                {session.status === "in_progress" ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      navigate("/sessao");
                    }}
                  >
                    {abandoned ? T.conclude : T.continueSession}
                  </Button>
                ) : (
                  <Button
                    icon={<Pencil size={18} />}
                    onClick={() => {
                      navigate(`/sessoes/${session.id}/editar`);
                    }}
                  >
                    {T.edit}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  icon={<Trash2 size={18} />}
                  onClick={() => {
                    setDeleting(bundle);
                  }}
                >
                  {T.delete}
                </Button>
              </div>
            ) : null}
          </article>
        );
      })}
      <Dialog
        open={deleting !== null}
        title={T.deleteTitle}
        confirmLabel={T.delete}
        destructive
        onCancel={() => {
          setDeleting(null);
        }}
        onConfirm={() => {
          const bundle = deleting;
          setDeleting(null);
          if (bundle) void remove(bundle);
        }}
      >
        <p>
          {deleting
            ? T.deleteBody(
                formatShortDate(toLocalDate(new Date(deleting.session.started_at), state.timeZone)),
                deleting.session.workout_name ?? "",
              )
            : ""}
        </p>
      </Dialog>
    </div>
  );
}

// ---------- TELA-020 Editar sessão ----------

interface DraftSet {
  readonly key: string;
  readonly id?: string;
  readonly session_exercise_id: string;
  readonly load: string;
  readonly value: string;
}

const parseNumber = (text: string): number | null => {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "" || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
};

export function EditSessionScreen({ params }: { params: Readonly<Record<string, string>> }) {
  const id = params.id ?? "";
  const now = useMemo(() => new Date(), []);
  const range = useMemo(
    () => ({ from: new Date(now.getTime() - 61 * 86_400_000), to: now }),
    [now],
  );
  const { state } = useHistory(range);
  const bundle = state.bundles.find((b) => b.session.id === id);
  if (state.status === "loading") return <Skeleton lines={6} />;
  if (!bundle) return <EmptyState icon={<SearchX size={32} />} title={T.notFound} description="" />;
  const date = toLocalDate(new Date(bundle.session.started_at), state.timeZone);
  const today = toLocalDate(now, state.timeZone);
  const editable =
    (bundle.session.status === "completed" || bundle.session.status === "manual") &&
    isWithinEditWindow(date, today);
  if (!editable)
    return (
      <EmptyState
        icon={<CircleAlert size={32} />}
        title={T.notEditable}
        description={isWithinEditWindow(date, today) ? "" : T.readOnly}
      />
    );
  return <EditForm key={bundle.session.id} bundle={bundle} state={state} date={date} />;
}

function EditForm({
  bundle,
  state,
  date,
}: {
  bundle: SessionBundle;
  state: HistoryState;
  date: string;
}) {
  const local = useLocalData();
  const show = useSnackbar();
  const [start, setStart] = useState(() => toLocalInput(bundle.session.started_at));
  const [end, setEnd] = useState(() =>
    toLocalInput(bundle.session.ended_at ?? bundle.session.started_at),
  );
  const [rpe, setRpe] = useState<number | null>(bundle.session.rpe);
  const [notes, setNotes] = useState(bundle.session.notes ?? "");
  const [sets, setSets] = useState<DraftSet[]>(() =>
    bundle.sets.map((s) => ({
      key: s.id,
      id: s.id,
      session_exercise_id: s.session_exercise_id,
      load: formatKg(s.load_kg),
      value: String(s.duration_s ?? s.reps ?? ""),
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byDuration = (exerciseId: string) => {
    const entry = bundle.exercises.find((e) => e.id === exerciseId);
    const catalog = entry ? state.exercises.get(entry.exercise_id) : undefined;
    return (
      (entry?.prescription?.measure_type ?? catalog?.measure_type) === "duration" ||
      bundle.sets.some((s) => s.session_exercise_id === exerciseId && s.duration_s !== null)
    );
  };

  function update(key: string, change: Partial<DraftSet>) {
    setSets((list) => list.map((s) => (s.key === key ? { ...s, ...change } : s)));
  }

  async function save() {
    if (local === null) return;
    const startedAt = fromLocalInput(start);
    const endedAt = fromLocalInput(end);
    if (startedAt === null || endedAt === null) {
      setError(T.issues.end_before_start);
      return;
    }
    const issue = sessionTimesIssue(startedAt, endedAt, new Date());
    if (issue) {
      setError(T.issues[issue]);
      return;
    }
    const edited: EditedSet[] = [];
    for (const set of sets) {
      const load = parseNumber(set.load);
      const value = parseNumber(set.value);
      const duration = byDuration(set.session_exercise_id);
      const valueOk =
        value !== null &&
        isWithinRange(value, duration ? RANGES.durationSecondsLogged : RANGES.reps);
      if (load === null || !isWithinRange(load, RANGES.loadKg) || !valueOk) {
        setError(T.issues.set);
        return;
      }
      edited.push({
        ...(set.id ? { id: set.id } : {}),
        session_exercise_id: set.session_exercise_id,
        load_kg: load,
        reps: duration ? null : value,
        duration_s: duration ? value : null,
      });
    }
    setBusy(true);
    setError(null);
    await saveSessionEdit(local.db, local.userId, bundle, {
      startedAt,
      endedAt,
      rpe,
      notes: notes.trim() === "" ? null : notes.trim(),
      sets: edited,
    });
    setBusy(false);
    void local.engine.syncNow();
    show({ text: T.saved });
    navigate(`/agenda/${date}`, { replace: true });
  }

  return (
    <form
      className={shared.stack}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h2 className={shared.exerciseName}>
        {bundle.session.workout_name} · {formatDay(date)}
      </h2>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <div className={shared.row}>
        <FormField label={T.start}>
          {(control) => (
            <TextInput
              {...control}
              type="datetime-local"
              value={start}
              onChange={(event) => {
                setStart(event.target.value);
              }}
            />
          )}
        </FormField>
        <FormField label={T.end}>
          {(control) => (
            <TextInput
              {...control}
              type="datetime-local"
              value={end}
              onChange={(event) => {
                setEnd(event.target.value);
              }}
            />
          )}
        </FormField>
      </div>
      {bundle.exercises.map((exercise) => {
        const name = state.exercises.get(exercise.exercise_id)?.name ?? "—";
        const duration = byDuration(exercise.id);
        const rows = sets.filter((s) => s.session_exercise_id === exercise.id);
        return (
          <fieldset key={exercise.id} className={shared.fieldset}>
            <legend className={shared.strong}>{name}</legend>
            {rows.map((set, index) => (
              <div key={set.key} className={styles.setRow}>
                <FormField label={T.load(index + 1)}>
                  {(control) => (
                    <TextInput
                      {...control}
                      inputMode="decimal"
                      value={set.load}
                      onChange={(event) => {
                        update(set.key, { load: event.target.value });
                      }}
                    />
                  )}
                </FormField>
                <FormField label={duration ? T.seconds(index + 1) : T.reps(index + 1)}>
                  {(control) => (
                    <TextInput
                      {...control}
                      inputMode="numeric"
                      value={set.value}
                      onChange={(event) => {
                        update(set.key, { value: event.target.value });
                      }}
                    />
                  )}
                </FormField>
                <IconButton
                  label={T.removeSet(index + 1)}
                  icon={<Trash2 size={20} />}
                  onClick={() => {
                    setSets((list) => list.filter((s) => s.key !== set.key));
                  }}
                />
              </div>
            ))}
            <Button
              variant="ghost"
              icon={<Plus size={18} />}
              onClick={() => {
                const last = rows.at(-1);
                setSets((list) => [
                  ...list,
                  {
                    key: crypto.randomUUID(),
                    session_exercise_id: exercise.id,
                    load: last?.load ?? "",
                    value: last?.value ?? "",
                  },
                ]);
              }}
            >
              {T.addSet}
            </Button>
          </fieldset>
        );
      })}
      <ChoiceGroup<number>
        legend={T.rpeLabel}
        layout="row"
        options={Array.from({ length: 11 }, (_, value) => ({ value, label: String(value) }))}
        value={rpe}
        onChange={setRpe}
      />
      {rpe === null ? null : (
        <button
          type="button"
          className={shared.linkButton}
          onClick={() => {
            setRpe(null);
          }}
        >
          {T.clearRpe}
        </button>
      )}
      <FormField label={T.notes}>
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
      <Button type="submit" variant="primary" loading={busy}>
        {T.save}
      </Button>
    </form>
  );
}
