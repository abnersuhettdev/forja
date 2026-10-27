import { useEffect, useState } from "react";
import { Hourglass, RotateCcw } from "lucide-react";
import {
  DEFAULT_REST_HOURS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  RANGES,
  restHoursFor,
  type MuscleGroup,
  type RestConfig,
} from "@forja/domain";
import { Button } from "../components/Button.tsx";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Banner, EmptyState, Skeleton } from "../components/Feedback.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { Stepper } from "../components/Stepper.tsx";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { readStoredRest, saveRest, toRestConfig } from "../training/rest.ts";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import shared from "./Screens.module.css";
import styles from "./Training.module.css";

const T = TEXTS.rest;
/** TELA-006: passo de 6 h no Stepper; toque no valor permite digitar qualquer hora inteira. */
const STEP_HOURS = 6;

// TELA-006 — Descanso entre treinos (RF-055, RN-050, API-007). Configuração do próprio aluno:
// salva no aparelho a cada alteração e entra na fila, inclusive offline; vale na hora para a
// recomendação.
export function RestScreen() {
  const local = useLocalData();
  const online = useOnline();
  const show = useSnackbar();
  const [config, setConfig] = useState<RestConfig | null | "missing">(null);
  const [editing, setEditing] = useState<MuscleGroup | null>(null);
  const db = local?.db ?? null;

  useEffect(() => {
    if (db === null) return;
    let active = true;
    readStoredRest(db)
      .then((stored) => {
        if (active) setConfig(stored ? toRestConfig(stored) : "missing");
      })
      .catch(() => {
        // Banco fechado (saída ou troca de usuário) durante a leitura.
      });
    return () => {
      active = false;
    };
  }, [db]);

  if (config === null) return <Skeleton lines={6} />;
  if (config === "missing")
    return <EmptyState icon={<Hourglass size={32} />} title={T.unavailable} description="" />;

  async function persist(next: RestConfig, message?: string) {
    if (local === null) return;
    setConfig(next);
    await saveRest(local.db, local.userId, next);
    void local.engine.syncNow();
    if (message) show({ text: message });
  }

  const current = config;
  return (
    <div className={shared.stack}>
      <Banner tone="info">{T.notice}</Banner>
      <div>
        <Stepper
          label={T.defaultLabel}
          value={current.defaultHours}
          step={STEP_HOURS}
          range={RANGES.restHours}
          unit="h"
          onChange={(hours) => void persist({ ...current, defaultHours: hours })}
        />
        <p className={shared.muted}>{T.startingPoint}</p>
      </div>

      <section className={shared.stack} aria-labelledby="rest-groups">
        <div>
          <h2 id="rest-groups" className={shared.sectionLabel}>
            {T.groups}
          </h2>
          <p className={shared.muted}>{T.groupsHint}</p>
        </div>
        <ul className={shared.list}>
          {MUSCLE_GROUPS.map((group) => {
            const own = current.overrides[group];
            return (
              <li key={group}>
                <button
                  type="button"
                  className={styles.groupRow}
                  onClick={() => {
                    setEditing(group);
                  }}
                >
                  <span>{MUSCLE_GROUP_LABELS[group]}</span>
                  <span className={shared.muted}>
                    {own === undefined ? T.usesDefault(current.defaultHours) : T.own(own)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Button
        icon={<RotateCcw size={20} />}
        onClick={() =>
          void persist({ defaultHours: DEFAULT_REST_HOURS, overrides: {} }, T.restored)
        }
      >
        {T.restore}
      </Button>
      {!online ? <p className={shared.muted}>{T.savedOffline}</p> : null}

      {editing ? (
        <GroupSheet
          group={editing}
          config={current}
          onClose={() => {
            setEditing(null);
          }}
          onApply={(hours) => {
            const overrides = Object.fromEntries(
              Object.entries(current.overrides).filter(([group]) => group !== editing),
            );
            if (hours !== null) overrides[editing] = hours;
            setEditing(null);
            void persist({ ...current, overrides }, online ? T.saved : T.savedOffline);
          }}
        />
      ) : null}
    </div>
  );
}

function GroupSheet({
  group,
  config,
  onClose,
  onApply,
}: {
  group: MuscleGroup;
  config: RestConfig;
  onClose: () => void;
  onApply: (hours: number | null) => void;
}) {
  const initialOwn = config.overrides[group];
  const [mode, setMode] = useState<"default" | "own">(initialOwn === undefined ? "default" : "own");
  const [hours, setHours] = useState(restHoursFor(config, group));
  return (
    <Sheet
      open
      title={MUSCLE_GROUP_LABELS[group]}
      onClose={onClose}
      footer={
        <Button
          variant="primary"
          onClick={() => {
            onApply(mode === "default" ? null : hours);
          }}
        >
          {T.apply}
        </Button>
      }
    >
      <div className={shared.stack}>
        <ChoiceGroup<"default" | "own">
          legend={MUSCLE_GROUP_LABELS[group]}
          hideLegend
          options={[
            {
              value: "default",
              label: T.sheetUseDefault,
              description: T.usesDefault(config.defaultHours),
            },
            { value: "own", label: T.sheetOwn },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === "own" ? (
          <Stepper
            label={T.hours}
            value={hours}
            step={STEP_HOURS}
            range={RANGES.restHours}
            unit="h"
            onChange={setHours}
          />
        ) : null}
      </div>
    </Sheet>
  );
}
