import { EQUIPMENT_LABELS, RESTRICTION_LABELS } from "@forja/domain";
import type { RegenerationReason } from "@forja/domain/motor";
import type { RegenerationSummary } from "../program/generator.ts";
import { TEXTS } from "../app/texts.ts";
import styles from "../screens/Screens.module.css";

const T = TEXTS.editor;

function reasonText(reason: RegenerationReason): string {
  switch (reason.kind) {
    case "restriction":
      return TEXTS.generate.report.byRestriction(RESTRICTION_LABELS[reason.restriction]);
    case "equipment":
      return TEXTS.generate.report.byEquipment(EQUIPMENT_LABELS[reason.equipment]);
    case "age":
      return TEXTS.generate.report.byAge;
    case "difficulty":
      return T.regenerateByDifficulty;
    case "not_available":
      return T.regenerateUnavailable;
  }
}

/** O fundamento da troca (RF-119): o que mudou, o que ficou e por quê. */
export function RegenerationNote({ summary }: { summary: RegenerationSummary | undefined }) {
  if (summary === undefined) return null;
  return (
    <div className={styles.stack}>
      <p className={styles.muted} role="status">
        {summary.changed.length > 0 ? T.regenerateWhy : T.regenerateNothing}
      </p>
      {summary.changed.length > 0 ? (
        <ul className={styles.steps}>
          {summary.changed.map((c) => (
            <li key={c.to}>{T.regenerateChange(c.from, c.to)}</li>
          ))}
        </ul>
      ) : null}
      {summary.kept.length > 0 ? (
        <p className={styles.muted}>{T.regenerateKept(summary.kept.join(", "))}</p>
      ) : null}
      {summary.removed.length > 0 ? (
        <ul className={styles.steps}>
          {summary.removed.map((r) => (
            <li key={r.name}>{T.regenerateRemoved(r.name, reasonText(r.reason))}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
