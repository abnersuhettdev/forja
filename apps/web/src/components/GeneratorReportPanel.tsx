import {
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  MOVEMENT_PATTERN_LABELS,
  MUSCLE_GROUP_LABELS,
  RESTRICTION_LABELS,
} from "@forja/domain";
import type { ExclusionReason, GeneratorReport } from "@forja/domain/motor";
import { TEXTS } from "../app/texts.ts";
import { Banner } from "./Feedback.tsx";
import styles from "../screens/Screens.module.css";

const T = TEXTS.generate.report;

function reasonText(reason: ExclusionReason): string {
  switch (reason.kind) {
    case "restriction":
      return T.byRestriction(RESTRICTION_LABELS[reason.restriction]);
    case "equipment":
      return T.byEquipment(EQUIPMENT_LABELS[reason.equipment]);
    case "age":
      return T.byAge;
    case "difficulty":
      return "";
  }
}

// TELA-051 (RF-023, CA-023): premissas, exclusões com motivo e vagas não preenchidas do rascunho
// gerado, em linguagem simples, com o aviso de RN-030.
export function GeneratorReportPanel({ report }: { report: GeneratorReport }) {
  const { inputs, ai } = report;
  const health = report.excluded.filter((e) => e.reason.kind !== "equipment");
  const equipment = report.excluded.filter((e) => e.reason.kind === "equipment");
  const unfilled = report.unfilled_slots.filter((s) => !s.optional);
  const low = report.weekly_volume.filter((v) => v.status !== "ok");
  const considered = [
    GOAL_LABELS[inputs.goal],
    EXPERIENCE_LABELS[inputs.experience],
    T.days(inputs.days_per_week),
    T.minutes(inputs.minutes_per_session),
    inputs.restrictions.length > 0
      ? inputs.restrictions.map((r) => RESTRICTION_LABELS[r]).join(", ")
      : T.noRestrictions,
    ...(inputs.emphasis.length > 0
      ? [T.emphasis(inputs.emphasis.map((g) => MUSCLE_GROUP_LABELS[g]).join(", "))]
      : []),
  ].join(" · ");

  return (
    <section className={styles.stack} aria-label={T.title}>
      <Banner tone="info">{TEXTS.generate.notice}</Banner>
      {ai?.source === "motor" ? (
        <p className={styles.muted}>{T.aiFallback[ai.fallback ?? "unavailable"]}</p>
      ) : null}
      {ai?.source === "motor+ia" && ai.summary !== null ? (
        <div className={styles.stack}>
          <p>{ai.summary}</p>
          {ai.reasons.length > 0 ? (
            <ul className={styles.steps}>
              {ai.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {ai.swaps.length > 0 ? (
            <>
              <h3 className={styles.sectionLabel}>{T.aiSwaps}</h3>
              <ul className={styles.steps}>
                {ai.swaps.map((swap, index) => (
                  <li key={index}>
                    {swap.workout}: {swap.from} → {swap.to}. {swap.reason}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className={styles.muted}>{T.aiNotice}</p>
        </div>
      ) : null}
      {report.warnings.map((warning) => (
        <Banner key={warning} tone="warning">
          {warning}
        </Banner>
      ))}
      <details className={styles.details}>
        <summary>{T.title}</summary>
        <h3>{T.considered}</h3>
        <p>{considered}</p>
        {health.length > 0 ? (
          <>
            <h3>{T.excluded}</h3>
            <ul className={styles.steps}>
              {health.map((entry) => (
                <li key={entry.exercise_id}>
                  {entry.exercise}: {reasonText(entry.reason)}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {equipment.length > 0 ? <p>{T.excludedEquipment(equipment.length)}</p> : null}
        {unfilled.length > 0 ? (
          <>
            <h3>{T.unfilled}</h3>
            <ul className={styles.steps}>
              {unfilled.map((slot, index) => (
                <li key={index}>
                  {slot.workout}: {MOVEMENT_PATTERN_LABELS[slot.slot]} (
                  {T.unfilledReason[slot.reason]})
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {low.length > 0 ? (
          <>
            <h3>{T.volume}</h3>
            <ul className={styles.steps}>
              {low.map((v) => (
                <li key={v.group}>
                  {MUSCLE_GROUP_LABELS[v.group]}: {T.volumeLine(v.sets, v.min, v.max)}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </details>
    </section>
  );
}
