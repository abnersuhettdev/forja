import { useState } from "react";
import { assessmentCreatePayloadSchema, toLocalDate } from "@forja/domain";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { Button } from "../components/Button.tsx";
import { Banner } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { sendDirect } from "../local/direct.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { parseNumber } from "../onboarding/draft.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import styles from "./Screens.module.css";

const T = TEXTS.assessment;

// TELA-038 — Registrar avaliação (RF-016, RN-014, RN-018): data (hoje por padrão, não futura),
// peso e observações; cria a avaliação e o peso de origem "avaliação" (API-004).
export function AssessmentScreen() {
  const { state } = useUserContext();
  const student = state.status === "ready" ? state.context.student : null;
  const local = useLocalData();
  const online = useOnline();
  const show = useSnackbar();
  const today = toLocalDate(new Date(), student?.timezone);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ date?: string; weight?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);
  // Identificadores estáveis até uma recusa: reenviar não duplica (RN-042).
  const [ids, setIds] = useState(() => ({
    op: crypto.randomUUID(),
    assessment: crypto.randomUUID(),
    weight: crypto.randomUUID(),
  }));

  async function submit() {
    if (student === null || local === null) return;
    const found: typeof errors = {};
    if (date === "" || date > today) found.date = T.futureDate;
    const payload = {
      student_id: student.id,
      assessed_on: date,
      weight_kg: parseNumber(weight),
      notes: notes.trim() === "" ? null : notes.trim(),
      weight_entry_id: ids.weight,
    };
    const parsed = assessmentCreatePayloadSchema.safeParse(payload);
    if (!parsed.success && parsed.error.issues.some((i) => i.path[0] === "weight_kg")) {
      found.weight =
        weight.trim() === "" ? TEXTS.exerciseForm.required : "Informe um valor entre 30 e 300 kg.";
    }
    setErrors(found);
    if (Object.keys(found).length > 0 || !parsed.success) return;
    setSaving(true);
    const result = await sendDirect(local, {
      opId: ids.op,
      type: "assessment.create",
      entityId: ids.assessment,
      baseRevision: null,
      payload: parsed.data,
    });
    setSaving(false);
    if (!result.ok) {
      if (result.kind === "rejected") {
        setIds({
          op: crypto.randomUUID(),
          assessment: crypto.randomUUID(),
          weight: crypto.randomUUID(),
        });
      }
      setErrors({ form: result.message });
      return;
    }
    show({ text: T.saved });
    navigate("/gestao/perfil");
  }

  return (
    <form
      className={styles.stack}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {!online ? <Banner tone="info">{TEXTS.program.offline}</Banner> : null}
      {errors.form ? <Banner tone="danger">{errors.form}</Banner> : null}
      <FormField label={T.date} error={errors.date}>
        {(control) => (
          <TextInput
            {...control}
            type="date"
            max={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
            }}
          />
        )}
      </FormField>
      <FormField label={T.weight} error={errors.weight}>
        {(control) => (
          <TextInput
            {...control}
            inputMode="decimal"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value);
            }}
          />
        )}
      </FormField>
      <FormField label={T.notes}>
        {(control) => (
          <textarea
            {...control}
            className={styles.textarea}
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
          />
        )}
      </FormField>
      <div className={styles.row}>
        <Button
          onClick={() => {
            navigate("/gestao/perfil");
          }}
        >
          {T.reviewProfile}
        </Button>
        <Button type="submit" variant="primary" loading={saving} disabled={!online}>
          {T.save}
        </Button>
      </div>
    </form>
  );
}
