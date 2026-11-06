import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { appModeOf } from "../account/context.ts";
import { fetchStudentProfile } from "../account/profile.ts";
import { useUserContext } from "../account/UserContextProvider.tsx";
import type { WeeklyFacts } from "@forja/domain/resumo";
import { getSupabase } from "../auth/client.ts";
import { readCachedCatalog } from "../catalog/catalog.ts";
import { Button } from "../components/Button.tsx";
import { Banner, EmptyState, Skeleton } from "../components/Feedback.tsx";
import { WeightPlate } from "../components/WeightPlate.tsx";
import { readMeta, writeMeta } from "../local/db.ts";
import { sendDirect } from "../local/direct.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import { createProposal } from "../program/generator.ts";
import { localWeeklyFacts } from "../summary/local.ts";
import { requestSummary } from "../summary/summary-client.ts";
import { SUMMARY_SEEN_KEY } from "../summary/useWeeklyFacts.ts";
import { formatKg, formatShortDate } from "../training/format.ts";
import { useTraining } from "../training/useTraining.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { SUMMARY_SCREEN_TEXTS } from "../summary/summary-texts.ts";
import { useOnline } from "../app/useOnline.ts";
import shared from "./Screens.module.css";
import styles from "./Summary.module.css";

const T = { ...TEXTS.summary, ...SUMMARY_SCREEN_TEXTS };
const DISMISSED_KEY = "resumo.ajuste.dispensado";

type View =
  | { readonly status: "loading" }
  | { readonly status: "none" }
  | {
      readonly status: "ready";
      readonly facts: WeeklyFacts;
      readonly text: string | null;
      /** Por que não há texto: sem conexão ou a IA não entregou agora. */
      readonly note: "offline" | "no_text" | null;
    };

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${String(minutes)} min`;
  return `${String(Math.floor(minutes / 60))} h ${String(minutes % 60).padStart(2, "0")} min`;
}

// TELA-061 — Resumo da semana (RF-115..117; RN-009, RN-060..062): fatos pelas regras, texto da IA
// conferido pela função e, depois de 2 semanas abaixo da meta, a proposta de uma rotina com menos
// dias, que só vale com o toque da pessoa. Sem conexão, só os fatos do aparelho.
export function SummaryScreen() {
  const online = useOnline();
  const local = useLocalData();
  const { state: offline } = useOfflineData();
  const { state: user } = useUserContext();
  const training = useTraining();
  const context = user.status === "ready" ? user.context : null;
  const studentId = context?.student?.id ?? null;
  const timeZone = context?.student?.timezone ?? "America/Sao_Paulo";
  const automatic = appModeOf(context) === "automatic";
  const goal = training.status === "ready" ? training.recommendation.week.goal : null;
  const [view, setView] = useState<View>({ status: "loading" });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (local === null || offline.status !== "ready" || training.status === "loading") return;
    let active = true;
    const load = async () => {
      const own = await localWeeklyFacts({ db: local.db, snapshot: offline, goal, timeZone });
      const remote = online ? await requestSummary() : null;
      const next: View =
        remote?.status === "ready"
          ? {
              status: "ready",
              facts: remote.facts,
              text: remote.text,
              note: remote.text ? null : "no_text",
            }
          : remote?.status === "none" || own === null
            ? { status: "none" }
            : { status: "ready", facts: own, text: null, note: online ? "no_text" : "offline" };
      setDismissed((await readMeta<string>(local.db, DISMISSED_KEY)) ?? null);
      if (next.status === "ready")
        await writeMeta(local.db, SUMMARY_SEEN_KEY, next.facts.week_start);
      if (active) setView(next);
    };
    load().catch(() => {
      if (active) setView({ status: "none" });
    });
    return () => {
      active = false;
    };
    // Recalcula ao trocar a conexão; os dados do aparelho entram pelo estado offline.
  }, [local, offline, online, goal, timeZone, training.status]);

  if (view.status === "loading") return <Skeleton lines={8} />;
  if (view.status === "none") {
    return <EmptyState icon={<BarChart3 size={32} />} title={T.none} description="" />;
  }
  const { facts, text, note } = view;
  const proposal =
    facts.adjustment !== null && facts.goal !== null && dismissed !== facts.week_start
      ? { days: facts.adjustment.days, goal: facts.goal }
      : null;
  const met = facts.goal !== null && facts.done >= facts.goal;

  async function propose(days: number) {
    const supabase = getSupabase();
    if (local === null || studentId === null || supabase === null) return;
    setBusy(true);
    setError(null);
    try {
      const [profile, catalog, draft] = await Promise.all([
        fetchStudentProfile(supabase, studentId),
        readCachedCatalog(local.db),
        supabase
          .from("program_versions")
          .select("id, revision")
          .eq("student_id", studentId)
          .eq("status", "draft")
          .maybeSingle<{ id: string; revision: number }>(),
      ]);
      // Uma proposta por vez: o rascunho anterior sai, a rotina em uso fica (RN-009).
      if (draft.data) {
        const discarded = await sendDirect(local, {
          opId: crypto.randomUUID(),
          type: "draft.discard",
          entityId: draft.data.id,
          baseRevision: draft.data.revision,
          payload: {},
        });
        if (!discarded.ok) throw new Error(discarded.message);
      }
      const stored = offline.status === "ready" ? offline.program : null;
      const outcome = await createProposal({
        local,
        studentId,
        profile,
        catalog: catalog.exercises,
        previousExerciseIds:
          stored?.document.workouts.flatMap((w) => w.items.map((i) => i.exercise_id)) ?? [],
        daysPerWeek: days,
      });
      if (!outcome.ok)
        throw new Error(outcome.pending ? TEXTS.plan.completeProfile : outcome.message);
      navigate(automatic ? "/plano" : "/gestao/programa");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : TEXTS.error.title);
      setBusy(false);
    }
  }

  async function keep() {
    if (local === null) return;
    await writeMeta(local.db, DISMISSED_KEY, facts.week_start);
    setDismissed(facts.week_start);
  }

  const rows: [string, string][] = [
    [T.labels.workouts, T.cardFacts(facts.done, facts.goal).replace(/ treinos$/u, "")],
    ...(proposal
      ? ([
          [
            T.labels.previous,
            T.cardFacts(facts.previous_done, facts.goal).replace(/ treinos$/u, ""),
          ],
        ] as [string, string][])
      : []),
    [T.labels.sets, String(facts.sets)],
    [T.labels.time, formatDuration(facts.minutes)],
    ...facts.load_up.map(
      (l) =>
        [T.labels.loadUp, T.loadValue(l.exercise, formatKg(l.from), formatKg(l.to))] as [
          string,
          string,
        ],
    ),
    ...facts.skipped.map(
      (s) => [T.labels.skipped, T.skippedValue(s.exercise, s.times)] as [string, string],
    ),
    ...(facts.weight
      ? ([
          [T.labels.weight, T.weightValue(formatKg(facts.weight.from), formatKg(facts.weight.to))],
        ] as [string, string][])
      : []),
    [T.labels.streak, facts.streak > 0 ? T.weeks(facts.streak) : T.streakNone],
  ];

  return (
    <div className={styles.screen}>
      <p className={shared.muted}>
        {T.range(formatShortDate(facts.week_start), formatShortDate(facts.week_end))}
      </p>
      {note === "offline" ? <Banner tone="info">{T.offline}</Banner> : null}
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {proposal ? (
        <section className={["graphite", styles.hero].join(" ")} aria-labelledby="resumo-destaque">
          <WeightPlate className={styles.plate} />
          <p className={styles.eyebrow}>{T.proposal.label}</p>
          <h2 id="resumo-destaque" className={styles.heroTitle}>
            {T.proposal.title(proposal.days)}
          </h2>
          <p className={styles.heroText}>
            {T.proposal.body(facts.previous_done, facts.done, proposal.goal, proposal.days)}
          </p>
          {online ? null : <p className={styles.heroText}>{T.proposal.needsConnection}</p>}
          <Button
            variant="primary"
            size="lg"
            loading={busy}
            disabled={!online}
            onClick={() => void propose(proposal.days)}
          >
            {T.proposal.see}
          </Button>
          <Button variant="ghost" className={styles.keep} onClick={() => void keep()}>
            {T.proposal.keep(proposal.goal)}
          </Button>
        </section>
      ) : (
        <section className={["graphite", styles.hero].join(" ")} aria-labelledby="resumo-destaque">
          <WeightPlate className={styles.plate} />
          <p className={styles.eyebrow}>{met ? T.metGoal : T.week}</p>
          <h2 id="resumo-destaque" className={styles.big}>
            {T.cardFacts(facts.done, facts.goal).replace(/ treinos$/u, "")}
          </h2>
          <p className={styles.heroText}>
            {[T.doneLine, facts.streak > 0 ? T.weeks(facts.streak) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </section>
      )}

      {note === "offline" ? null : (
        <section className={styles.card} aria-labelledby="resumo-texto">
          <h2 id="resumo-texto" className={styles.cardTitle}>
            {T.howItWent}
          </h2>
          {text === null ? (
            <p className={shared.muted}>{T.noText}</p>
          ) : (
            <>
              <p className={styles.text}>{text}</p>
              <p className={shared.muted}>{T.aiNote}</p>
            </>
          )}
        </section>
      )}

      <section className={styles.card} aria-labelledby="resumo-numeros">
        <h2 id="resumo-numeros" className={styles.cardTitle}>
          {T.numbers}
        </h2>
        <dl className={styles.facts}>
          {rows.map(([label, value], index) => (
            <div key={`${label}-${String(index)}`} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
