import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ACTIVITY_DESCRIPTIONS,
  ACTIVITY_LABELS,
  ACTIVITY_LEVELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXPERIENCE_DESCRIPTIONS,
  EXPERIENCE_LABELS,
  EXPERIENCE_LEVELS,
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
  GOALS,
  LOCATION_EQUIPMENT_PRESETS,
  LOCATION_LABELS,
  messageFor,
  RESTRICTION_LABELS,
  RESTRICTIONS,
  SEX_LABELS,
  SEXES,
  SYNC_CONTRACT_VERSION,
  toLocalDate,
  TRAINING_LOCATIONS,
  type Equipment,
  type Restriction,
} from "@forja/domain";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { Button } from "../components/Button.tsx";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Banner } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { readMeta, writeMeta } from "../local/db.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import {
  firstInvalidStep,
  newDraft,
  ONBOARDING_STEPS,
  stepErrors,
  toOnboardingPayload,
  type OnboardingDraft,
} from "../onboarding/draft.ts";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import styles from "./Screens.module.css";

const T = TEXTS.onboarding;
const DRAFT_KEY = "configuracao_inicial";
const options = <V extends string>(values: readonly V[], labels: Readonly<Record<V, string>>) =>
  values.map((value) => ({ value, label: labels[value] }));

// TELA-003 — Configuração inicial (RF-009, RN-010, RN-018, RN-030): 7 etapas, progresso salvo
// no banco local do usuário a cada etapa; a conclusão exige conexão e envia API-002.
export function OnboardingScreen() {
  const local = useLocalData();
  const { refresh } = useUserContext();
  const online = useOnline();
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const today = toLocalDate(new Date());
  const db = local?.db ?? null;

  useEffect(() => {
    if (db === null) return;
    let active = true;
    void readMeta<OnboardingDraft>(db, DRAFT_KEY).then(async (saved) => {
      const initial =
        saved ??
        newDraft({
          opId: crypto.randomUUID(),
          studentId: crypto.randomUUID(),
          assessmentId: crypto.randomUUID(),
          weightEntryId: crypto.randomUUID(),
        });
      if (!saved) await writeMeta(db, DRAFT_KEY, initial);
      if (active) setDraft(initial);
    });
    return () => {
      active = false;
    };
  }, [db]);

  useEffect(() => {
    title.current?.focus();
  }, [draft?.step]);

  if (draft === null || local === null) return null;
  const localDb = local.db;
  const step = draft.step;
  const errors = showErrors ? stepErrors(draft, step, today) : {};

  /** Atualiza o rascunho e grava no aparelho (sobrevive a fechar o app — CA-009). */
  function update(changes: Partial<OnboardingDraft>) {
    setDraft((current) => {
      if (current === null) return current;
      const next = { ...current, ...changes };
      void writeMeta(localDb, DRAFT_KEY, next);
      return next;
    });
  }

  function go(nextStep: number) {
    setShowErrors(false);
    setError(null);
    update({ step: nextStep });
  }

  function continueStep() {
    if (draft === null) return;
    if (Object.keys(stepErrors(draft, step, today)).length > 0) {
      setShowErrors(true);
      return;
    }
    go(step + 1);
  }

  async function finish() {
    if (draft === null || local === null) return;
    setError(null);
    if (!online) {
      setError(T.offline);
      return;
    }
    const invalid = firstInvalidStep(draft, today);
    if (invalid !== null) {
      go(invalid);
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    const outcome = await local.transport({
      contract_version: SYNC_CONTRACT_VERSION,
      device_id: local.deviceId,
      client_time: new Date().toISOString(),
      operations: [
        {
          op_id: draft.opId,
          owner_user_id: local.userId,
          type: "onboarding.complete",
          entity_id: draft.studentId,
          base_revision: null,
          created_at: new Date().toISOString(),
          payload: toOnboardingPayload(draft, today),
        },
      ],
    });
    setSubmitting(false);
    if (outcome.kind === "unauthorized") {
      setError(messageFor("AUTH_REQUIRED"));
      return;
    }
    if (outcome.kind !== "response") {
      setError(T.failed);
      return;
    }
    const result = outcome.response.results[0];
    if (result?.status === "accepted" || result?.status === "duplicate") {
      await local.db.sync_meta.delete(DRAFT_KEY);
      await refresh(); // com o aluno criado, o app segue para Hoje
      return;
    }
    if (result?.status === "rejected") {
      // A recusa fica guardada para esse op_id: o próximo envio usa outro.
      update({ opId: crypto.randomUUID() });
      if (result.error.code === "AGE_UNDER_18") go(1);
      await refresh();
      setError(result.error.message ?? messageFor(result.error.code));
      return;
    }
    setError(T.failed);
  }

  const field = (
    name: keyof OnboardingDraft,
    label: string,
    input: (control: Record<string, unknown>) => ReactNode,
    help?: string,
  ) => (
    <FormField label={label} error={errors[name]} {...(help ? { help } : {})}>
      {(control) => input(control as unknown as Record<string, unknown>)}
    </FormField>
  );

  const numberInput =
    (
      name: "daysPerWeek" | "minutesPerSession" | "heightCm" | "weightKg" | "goalWeightKg",
      decimal: boolean,
    ) =>
    (control: Record<string, unknown>) => (
      <TextInput
        {...control}
        inputMode={decimal ? "decimal" : "numeric"}
        value={draft[name]}
        onChange={(e) => {
          update({ [name]: e.target.value });
        }}
      />
    );

  const steps: Record<number, ReactNode> = {
    1: (
      <>
        {field("fullName", T.fullName, (control) => (
          <TextInput
            {...control}
            autoComplete="name"
            value={draft.fullName}
            onChange={(e) => {
              update({ fullName: e.target.value });
            }}
          />
        ))}
        {field("birthDate", T.birthDate, (control) => (
          <TextInput
            {...control}
            type="date"
            max={today}
            value={draft.birthDate}
            onChange={(e) => {
              update({ birthDate: e.target.value });
            }}
          />
        ))}
        <ChoiceGroup
          legend={T.sex}
          layout="list"
          options={options(SEXES, SEX_LABELS)}
          value={draft.sex}
          onChange={(sex) => {
            update({ sex });
          }}
        />
      </>
    ),
    2: (
      <>
        <ChoiceGroup
          legend={T.goal}
          options={GOALS.map((value) => ({
            value,
            label: GOAL_LABELS[value],
            description: GOAL_DESCRIPTIONS[value],
          }))}
          value={draft.goal}
          onChange={(goal) => {
            update({ goal });
          }}
        />
        <ChoiceGroup
          legend={T.experience}
          options={EXPERIENCE_LEVELS.map((value) => ({
            value,
            label: EXPERIENCE_LABELS[value],
            description: EXPERIENCE_DESCRIPTIONS[value],
          }))}
          value={draft.experienceLevel}
          onChange={(experienceLevel) => {
            update({ experienceLevel });
          }}
        />
        <ChoiceGroup
          legend={T.activity}
          options={ACTIVITY_LEVELS.map((value) => ({
            value,
            label: ACTIVITY_LABELS[value],
            description: ACTIVITY_DESCRIPTIONS[value],
          }))}
          value={draft.activityLevel}
          onChange={(activityLevel) => {
            update({ activityLevel });
          }}
        />
      </>
    ),
    3: (
      <>
        {field("daysPerWeek", T.daysPerWeek, numberInput("daysPerWeek", false))}
        {field(
          "minutesPerSession",
          T.minutesPerSession,
          numberInput("minutesPerSession", false),
          T.minutesHelp,
        )}
        <ChoiceGroup<number>
          legend={T.weekdays}
          multiple
          layout="row"
          options={T.weekdayNames.map((label, index) => ({ value: index + 1, label }))}
          value={draft.preferredWeekdays}
          onChange={(preferredWeekdays) => {
            update({ preferredWeekdays: [...preferredWeekdays].sort((a, b) => a - b) });
          }}
        />
      </>
    ),
    4: (
      <>
        <ChoiceGroup
          legend={T.location}
          options={options(TRAINING_LOCATIONS, LOCATION_LABELS)}
          value={draft.trainingLocation}
          onChange={(trainingLocation) => {
            // TRN-01 §3.4: o local pré-seleciona os equipamentos; o usuário pode ajustar.
            update({
              trainingLocation,
              equipment: [...LOCATION_EQUIPMENT_PRESETS[trainingLocation]],
            });
          }}
        />
        <p className={styles.muted}>{T.equipmentHelp}</p>
        <ChoiceGroup<Equipment>
          legend={T.equipment}
          multiple
          layout="row"
          options={options(EQUIPMENT, EQUIPMENT_LABELS)}
          value={draft.equipment}
          onChange={(equipment) => {
            update({ equipment });
          }}
        />
      </>
    ),
    5: (
      <>
        <p className={styles.muted}>{T.restrictionsInfo}</p>
        <ChoiceGroup
          legend={T.restrictionsChoice}
          layout="row"
          options={[
            { value: "none" as const, label: T.restrictionsNone },
            { value: "listed" as const, label: T.restrictionsListed },
          ]}
          value={draft.restrictionsDeclared}
          onChange={(restrictionsDeclared) => {
            update({
              restrictionsDeclared,
              ...(restrictionsDeclared === "none" ? { restrictions: [] } : {}),
            });
          }}
        />
        {draft.restrictionsDeclared === "listed" ? (
          <ChoiceGroup<Restriction>
            legend={T.restrictions}
            multiple
            options={options(RESTRICTIONS, RESTRICTION_LABELS)}
            value={draft.restrictions}
            onChange={(restrictions) => {
              update({ restrictions });
            }}
          />
        ) : null}
        {field("restrictionsNote", T.restrictionsNote, (control) => (
          <textarea
            {...control}
            className={styles.textarea}
            maxLength={500}
            rows={3}
            value={draft.restrictionsNote}
            onChange={(e) => {
              update({ restrictionsNote: e.target.value });
            }}
          />
        ))}
      </>
    ),
    6: (
      <>
        {field("heightCm", T.height, numberInput("heightCm", true))}
        {field("weightKg", T.weight, numberInput("weightKg", true))}
        {field("goalWeightKg", T.goalWeight, numberInput("goalWeightKg", true))}
      </>
    ),
    7: <p>{T.healthNotice}</p>,
  };

  const optional = step >= 2 && step <= 5;
  return (
    <div className={styles.authPage}>
      <div className={styles.stack}>
        <label className={styles.progressLabel}>
          {T.progress(step, ONBOARDING_STEPS)}
          <progress max={ONBOARDING_STEPS} value={step} className={styles.progress} />
        </label>
        <h1 ref={title} tabIndex={-1} className={styles.screenTitle}>
          {T.steps[step - 1]}
        </h1>
        {error !== null ? <Banner tone="danger">{error}</Banner> : null}
        {step === ONBOARDING_STEPS && !online ? <Banner tone="info">{T.offline}</Banner> : null}
        <form
          className={styles.stack}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === ONBOARDING_STEPS) void finish();
            else continueStep();
          }}
        >
          {steps[step]}
          <div className={styles.row}>
            {step > 1 ? (
              <Button
                onClick={() => {
                  go(step - 1);
                }}
              >
                {T.back}
              </Button>
            ) : null}
            {optional ? (
              <Button
                variant="ghost"
                onClick={() => {
                  go(step + 1);
                }}
              >
                {T.skip}
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={step === ONBOARDING_STEPS && !online}
            >
              {step === ONBOARDING_STEPS ? T.finish : T.continue}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
