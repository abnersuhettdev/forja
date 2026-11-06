import { EQUIPMENT_LABELS, RESTRICTION_LABELS } from "@forja/domain";
import type { RegenerationReason } from "@forja/domain/motor";
import type { RegenerationSummary } from "../program/generator.ts";
import { EDITOR_TEXTS } from "../program/editor-texts.ts";
import { GENERATE_TEXTS } from "../program/generate-texts.ts";
import styles from "../screens/Screens.module.css";

const T = EDITOR_TEXTS;

function reasonText(reason: RegenerationReason): string {
  switch (reason.kind) {
    case "restriction":
      return GENERATE_TEXTS.report.byRestriction(RESTRICTION_LABELS[reason.restriction]);
    case "equipment":
      return GENERATE_TEXTS.report.byEquipment(EQUIPMENT_LABELS[reason.equipment]);
    case "age":
      return GENERATE_TEXTS.report.byAge;
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
