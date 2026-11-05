import { useEffect, useMemo, useState } from "react";
import { CloudUpload, Plus, Scale, Trash2 } from "lucide-react";
import {
  currentWeight,
  periodStart,
  RANGES,
  isWithinRange,
  toLocalDate,
  weightSeries,
  weightVariation,
  type WeightPeriod,
} from "@forja/domain";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { getSupabase } from "../auth/client.ts";
import { Button, IconButton } from "../components/Button.tsx";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { Banner, EmptyState, Skeleton } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { LineChart } from "../components/LineChart.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { WeightPlate } from "../components/WeightPlate.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { deleteWeight, saveWeight } from "../evolution/weights.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import type { WeightRecord } from "../offline/offline.ts";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import { formatKg, formatShortDate } from "../training/format.ts";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import shared from "./Screens.module.css";
import styles from "./Evolution.module.css";

const T = TEXTS.evolution;
const PERIODS: readonly WeightPeriod[] = ["30d", "90d", "1y", "all"];

function useTimeZone(): string {
  const { state } = useUserContext();
  return state.status === "ready"
    ? (state.context.student?.timezone ?? "America/Sao_Paulo")
    : "America/Sao_Paulo";
}

/** Peso-meta do perfil guardado no aparelho (RN-017). */
export function useGoalWeight(): number | null {
  const local = useLocalData();
  const db = local?.db ?? null;
  const [goal, setGoal] = useState<number | null>(null);
  useEffect(() => {
    if (db === null) return;
    let active = true;
    db.table("profile")
      .get("current")
      .then((profile: { goal_weight_kg?: number | null } | undefined) => {
        if (active) setGoal(profile?.goal_weight_kg ?? null);
      })
      .catch(() => {
        // Banco fechado (saída) durante a leitura.
      });
    return () => {
      active = false;
    };
  }, [db]);
  return goal;
}

// ---------- TELA-022 Registrar peso ----------

export function useRegisterWeight() {
  const local = useLocalData();
  const online = useOnline();
  const { reloadLocal } = useOfflineData();
  const timeZone = useTimeZone();
  const show = useSnackbar();
  const [open, setOpen] = useState(false);
  const today = toLocalDate(new Date(), timeZone);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (local === null) return;
    const normalized = weight.trim().replace(",", ".");
    const value = /^\d+(\.\d)?$/.test(normalized) ? Number(normalized) : Number.NaN;
    if (!isWithinRange(value, RANGES.weightKg)) {
      setError(T.invalidWeight);
      return;
    }
    if (date === "" || date > today) {
      setError(T.futureDate);
      return;
    }
    setBusy(true);
    await saveWeight(local.db, local.userId, { measured_on: date, weight_kg: value });
    setBusy(false);
    setOpen(false);
    await reloadLocal();
    void local.engine.syncNow();
    show({ text: online ? T.saved : T.savedOffline });
  }

  const sheet = (
    <Sheet
      open={open}
      title={T.sheetTitle}
      onClose={() => {
        setOpen(false);
      }}
    >
      <form
        className={shared.stack}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <FormField label={T.date}>
          {(control) => (
            <TextInput
              {...control}
              type="date"
              max={today}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
              }}
            />
          )}
        </FormField>
        <FormField label={T.weight} help={T.weightHint}>
          {(control) => (
            <TextInput
              {...control}
              inputMode="decimal"
              autoComplete="off"
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value);
              }}
            />
          )}
        </FormField>
        <Button type="submit" variant="primary" loading={busy}>
          {T.save}
        </Button>
      </form>
    </Sheet>
  );

  return {
    open: () => {
      setDate(today);
      setWeight("");
      setError(null);
      setOpen(true);
    },
    sheet,
  };
}

// ---------- TELA-021 Evolução ----------

export function EvolutionScreen() {
  const local = useLocalData();
  const online = useOnline();
  const { state: offline, reloadLocal } = useOfflineData();
  const { state: user } = useUserContext();
  const timeZone = useTimeZone();
  const goal = useGoalWeight();
  const register = useRegisterWeight();
  const show = useSnackbar();
  const [period, setPeriod] = useState<WeightPeriod>("90d");
  const [asList, setAsList] = useState(false);
  const [deleting, setDeleting] = useState<WeightRecord | null>(null);
  const [remote, setRemote] = useState<readonly WeightRecord[] | null>(null);
  const studentId = user.status === "ready" ? (user.context.student?.id ?? null) : null;
  const unsent = local?.unsent ?? 0;

  // "Tudo": com conexão, inclui registros anteriores aos 12 meses guardados no aparelho.
  useEffect(() => {
    const supabase = getSupabase();
    if (period !== "all" || !online || supabase === null || studentId === null) return;
    let active = true;
    void supabase
      .from("weight_entries")
      .select("id, measured_on, weight_kg, source, revision, created_at")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .overrideTypes<WeightRecord[], { merge: false }>()
      .then(({ data }) => {
        if (active && data) setRemote(data);
      });
    return () => {
      active = false;
    };
  }, [period, online, studentId, unsent]);

  const pendingIds = useQueuedIds(unsent);

  const weights = useMemo(() => {
    if (offline.status !== "ready") return [];
    const local = offline.weights;
    if (period !== "all" || remote === null) return local;
    const known = new Set(local.map((w) => w.id));
    return [...local, ...remote.filter((w) => !known.has(w.id) && !pendingIds.has(w.id))];
  }, [offline, period, remote, pendingIds]);

  if (offline.status !== "ready") return <Skeleton lines={6} />;

  const today = toLocalDate(new Date(), timeZone);
  const current = currentWeight(weights);
  const initial = offline.initialWeight;
  const series = weightSeries(weights, periodStart(period, today));
  const references = [
    ...(initial
      ? [{ value: initial.weight_kg, label: T.initial(formatKg(initial.weight_kg)), dashed: true }]
      : []),
    ...(goal === null ? [] : [{ value: goal, label: T.goal(formatKg(goal)), dashed: false }]),
  ];
  const records = [...weights].sort(
    (a, b) =>
      b.measured_on.localeCompare(a.measured_on) ||
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );

  async function remove(entry: WeightRecord) {
    if (local === null) return;
    await deleteWeight(local.db, local.userId, entry);
    await reloadLocal();
    void local.engine.syncNow();
    show({ text: T.deleted });
  }

  return (
    <div className={styles.screen}>
      <section className={["graphite", styles.summary].join(" ")} aria-label={T.current}>
        <WeightPlate className={styles.plate} />
        <span className={styles.summaryLabel}>{T.current}</span>
        <span className={styles.current}>
          {current ? `${formatKg(current.weight_kg)} kg` : T.none}
        </span>
        {current && initial ? (
          <span className={styles.summaryText}>
            {[
              T.variation(
                `${weightVariation(initial.weight_kg, current.weight_kg) > 0 ? "+" : ""}${formatKg(
                  weightVariation(initial.weight_kg, current.weight_kg),
                ).replace("-", "−")}`,
                formatShortDate(initial.measured_on),
              ),
              goalLine(initial.weight_kg, current.weight_kg, goal),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        ) : null}
        <Button variant="primary" icon={<Plus size={20} />} onClick={register.open}>
          {T.register}
        </Button>
      </section>

      <section aria-label={T.chartTitle} className={styles.card}>
        <ChoiceGroup<WeightPeriod>
          legend={T.period}
          hideLegend
          layout="segmented"
          options={PERIODS.map((value) => ({ value, label: T.periods[value] }))}
          value={period}
          onChange={(next) => {
            setPeriod(next);
            setRemote(null);
          }}
        />
        {period === "all" && !online ? <Banner tone="info">{T.allOffline}</Banner> : null}
        {series.length < 2 ? (
          <EmptyState icon={<Scale size={32} />} title={T.fewPoints} description="" />
        ) : asList ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{T.tableDate}</th>
                <th scope="col">{T.tableWeight}</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.measured_on}>
                  <td>{formatShortDate(point.measured_on)}</td>
                  <td className="tabular">{formatKg(point.weight_kg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <LineChart
            points={series.map((p) => ({ date: p.measured_on, value: p.weight_kg }))}
            references={references}
            unit="kg"
            label={T.chartSummary(
              series.length,
              formatShortDate(series[0]?.measured_on ?? ""),
              formatShortDate(series.at(-1)?.measured_on ?? ""),
            )}
            formatValue={formatKg}
            formatDate={formatShortDate}
          />
        )}
        {series.length < 2 ? null : (
          <Button
            variant="ghost"
            onClick={() => {
              setAsList((v) => !v);
            }}
          >
            {asList ? T.showChart : T.showList}
          </Button>
        )}
      </section>

      <section aria-labelledby="pesos">
        <h2 id="pesos" className={shared.sectionLabel}>
          {T.records}
        </h2>
        <ul className={styles.records}>
          {records.map((entry) => (
            <li key={entry.id} className={styles.record}>
              <span className={styles.recordText}>
                <span className={styles.recordLine}>
                  <span className={shared.muted}>{formatShortDate(entry.measured_on)}</span>
                  <span className="visually-hidden"> · </span>
                  <span className={styles.recordValue}>{formatKg(entry.weight_kg)} kg</span>
                </span>
                <span className={shared.muted}>
                  {[
                    entry.source === "assessment" ? T.fromAssessment : null,
                    pendingIds.has(entry.id) ? T.pending : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {pendingIds.has(entry.id) ? <CloudUpload size={14} aria-hidden="true" /> : null}
                </span>
              </span>
              {entry.source === "manual" ? (
                <IconButton
                  label={T.deleteLabel(
                    formatShortDate(entry.measured_on),
                    formatKg(entry.weight_kg),
                  )}
                  icon={<Trash2 size={20} />}
                  onClick={() => {
                    setDeleting(entry);
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {register.sheet}
      <Dialog
        open={deleting !== null}
        title={T.deleteTitle}
        confirmLabel={T.delete}
        destructive
        onCancel={() => {
          setDeleting(null);
        }}
        onConfirm={() => {
          const entry = deleting;
          setDeleting(null);
          if (entry) void remove(entry);
        }}
      >
        <p>
          {deleting
            ? T.deleteBody(formatShortDate(deleting.measured_on), formatKg(deleting.weight_kg))
            : ""}
        </p>
      </Dialog>
    </div>
  );
}

/** "faltam 4,4 kg para a meta", no sentido que vai do peso inicial à meta. */
function goalLine(initial: number, current: number, goal: number | null): string | null {
  if (goal === null) return null;
  const left = initial < goal ? goal - current : current - goal;
  return left > 0 ? T.toGoal(formatKg(left)) : T.goalReached;
}

/** Registros com algo ainda na fila de saída (RN-049). */
function useQueuedIds(unsent: number): ReadonlySet<string> {
  const local = useLocalData();
  const db = local?.db ?? null;
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (db === null) return;
    let active = true;
    db.outbox
      .toArray()
      .then((ops) => {
        if (active) setIds(new Set(ops.map((op) => op.entity_id)));
      })
      .catch(() => {
        // Banco fechado (saída) durante a leitura.
      });
    return () => {
      active = false;
    };
  }, [db, unsent]);
  return ids;
}
