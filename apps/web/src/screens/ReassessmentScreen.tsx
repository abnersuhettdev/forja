import { useState, type ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
import { currentWeight, toLocalDate } from "@forja/domain";
import { assessmentCreatePayloadSchema, profileUpdatePayloadSchema } from "@forja/domain/validacao";
import { useUserContext } from "../account/UserContextProvider.tsx";
import type { StudentProfile } from "../account/profile.ts";
import { Button, IconButton } from "../components/Button.tsx";
import { Banner, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { sendDirect } from "../local/direct.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import { parseNumber } from "../onboarding/draft.ts";
import { formatDaysAgo, formatKg, formatShortDate } from "../training/format.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useStudentProfile, useProfileForm, type SectionKey } from "./ProfileScreen.tsx";
import shared from "./Screens.module.css";
import styles from "./Reassessment.module.css";

const T = TEXTS.reassessment;
const STEPS = 4;
/** Seções do perfil em cada etapa, depois do peso (TELA-050, TRN-05 §3.3). */
const SECTIONS: readonly (readonly SectionKey[])[] = [
  [],
  ["goal"],
  ["availability"],
  ["location", "restrictions"],
];

// TELA-050 — Reavaliação (RF-084, RN-014, RN-025): 4 etapas, cada uma com "Continua igual".
// Ao concluir, o perfil é atualizado (só as etapas alteradas) e a avaliação periódica é
// registrada, o que reinicia o prazo e limpa o adiamento. Exige conexão, como o perfil.
export function ReassessmentScreen() {
  const { state: userState } = useUserContext();
  const studentId = userState.status === "ready" ? (userState.context.student?.id ?? null) : null;
  const { state, reload } = useStudentProfile(studentId);
  if (state.status === "loading") return <Skeleton lines={8} />;
  if (state.status === "unavailable") {
    return (
      <ErrorState
        title={TEXTS.error.title}
        description={TEXTS.error.needsConnection}
        onRetry={reload}
      />
    );
  }
  return <Wizard data={state.data} />;
}

function Wizard({ data }: { data: StudentProfile }) {
  const local = useLocalData();
  const offline = useOfflineData();
  const show = useSnackbar();
  const { payload, fields } = useProfileForm(data);
  const today = toLocalDate(new Date(), data.student.timezone);
  const latest = offline.state.status === "ready" ? currentWeight(offline.state.weights) : null;
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState(latest ? formatKg(latest.weight_kg) : "");
  /** Etapas em que a pessoa mexeu: as demais seguem como estão ("Continua igual"). */
  const [changed, setChanged] = useState<ReadonlySet<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ids] = useState(() => ({ assessment: crypto.randomUUID(), weight: crypto.randomUUID() }));
  const last = data.lastAssessment;

  function profileChanges(marked: ReadonlySet<number>): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const index of marked) {
      for (const section of SECTIONS[index] ?? []) Object.assign(merged, payload(section).profile);
    }
    return merged;
  }

  function advance(keep: boolean) {
    setError(null);
    const marked = new Set(changed);
    if (keep) marked.delete(step);
    else marked.add(step);
    if (step === 0) {
      const value = keep && latest ? latest.weight_kg : parseNumber(weight);
      if (value === null || value < 30 || value > 300) {
        setError(T.invalidWeight);
        return;
      }
      if (keep && latest) setWeight(formatKg(latest.weight_kg));
    } else if (!keep) {
      const changes = profileChanges(new Set([step]));
      if (!profileUpdatePayloadSchema.safeParse({ profile: changes }).success) {
        setError(T.invalid);
        return;
      }
    }
    setChanged(marked);
    if (step < STEPS - 1) setStep(step + 1);
    else void finish(marked);
  }

  async function finish(marked: ReadonlySet<number>) {
    if (local === null) return;
    setSaving(true);
    const changes = profileChanges(marked);
    if (Object.keys(changes).length > 0) {
      const updated = await sendDirect(local, {
        opId: crypto.randomUUID(),
        type: "profile.update",
        entityId: data.student.id,
        baseRevision: data.profile.revision,
        payload: { profile: changes },
      });
      if (!updated.ok) {
        setSaving(false);
        setError(updated.kind === "conflict" ? TEXTS.editor.conflict : updated.message);
        return;
      }
    }
    const assessment = assessmentCreatePayloadSchema.safeParse({
      student_id: data.student.id,
      assessed_on: today,
      weight_kg: parseNumber(weight),
      notes: null,
      weight_entry_id: ids.weight,
    });
    if (!assessment.success) {
      setSaving(false);
      setStep(0);
      setError(T.invalidWeight);
      return;
    }
    const saved = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "assessment.create",
      entityId: ids.assessment,
      baseRevision: null,
      payload: assessment.data,
    });
    setSaving(false);
    if (!saved.ok) {
      setError(saved.message);
      return;
    }
    await offline.refresh();
    show({ text: T.saved });
    navigate("/hoje", { replace: true });
  }

  const content: readonly ReactNode[] = [
    <>
      <div>
        <h1 className={styles.title} tabIndex={-1}>
          {T.weightTitle}
        </h1>
        <p className={styles.lead}>
          {[
            last
              ? T.lastAssessment(formatShortDate(last.assessed_on), formatKg(last.weight_kg))
              : null,
            latest
              ? T.lastWeight(formatKg(latest.weight_kg), formatDaysAgo(latest.measured_on, today))
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
        </p>
      </div>
      <FormField label={T.weight}>
        {(control) => (
          <TextInput
            {...control}
            className={styles.weight}
            inputMode="decimal"
            autoComplete="off"
            value={weight}
            onChange={(event) => {
              setWeight(event.target.value);
            }}
          />
        )}
      </FormField>
      <p className={shared.muted}>{T.measuresLater}</p>
    </>,
    <>
      <h1 className={styles.title} tabIndex={-1}>
        {T.goalTitle}
      </h1>
      {fields.goal}
    </>,
    <>
      <div>
        <h1 className={styles.title} tabIndex={-1}>
          {T.availabilityTitle}
        </h1>
        <p className={styles.lead}>{T.availabilityNote}</p>
      </div>
      {fields.availability}
    </>,
    <>
      <h1 className={styles.title} tabIndex={-1}>
        {T.placeTitle}
      </h1>
      {fields.location}
      {fields.restrictions}
    </>,
  ];

  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <div className={styles.bar}>
          {step === 0 ? (
            <IconButton
              label={T.close}
              icon={<X size={24} />}
              onClick={() => {
                navigate("/hoje");
              }}
            />
          ) : (
            <IconButton
              label={T.back}
              icon={<ChevronLeft size={24} />}
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
            />
          )}
          <span className={styles.barText}>
            <span className={styles.barTitle}>{T.title}</span>
            <span className={shared.muted}>{T.step(step + 1)}</span>
          </span>
        </div>
        <div className={styles.progress} aria-hidden="true">
          {Array.from({ length: STEPS }, (_, index) => (
            <span key={index} className={index <= step ? styles.progressDone : ""} />
          ))}
        </div>
      </header>
      <form
        className={styles.body}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          advance(false);
        }}
      >
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {content[step]}
        <div className={styles.thumb}>
          <Button
            size="lg"
            disabled={saving}
            onClick={() => {
              advance(true);
            }}
          >
            {T.same}
          </Button>
          <Button type="submit" variant="primary" size="lg" loading={saving}>
            {step === STEPS - 1 ? T.finish : T.next}
          </Button>
        </div>
      </form>
    </div>
  );
}
