import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  customExercisePayloadSchema,
  importedCorrectionPayloadSchema,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MEASURE_TYPES,
  messageFor,
  MOVEMENT_PATTERN_LABELS,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  SYNC_CONTRACT_VERSION,
  type CustomExercisePayload,
  type ImportedCorrectionPayload,
  type Difficulty,
  type Equipment,
  type MeasureType,
  type MovementPattern,
  type MuscleGroup,
} from "@forja/domain";
import type { CatalogExercise } from "../catalog/catalog.ts";
import { useCatalog } from "../catalog/useCatalog.ts";
import { Button, IconButton } from "../components/Button.tsx";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Banner, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { FormField, SelectInput, TextInput } from "../components/FormField.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import styles from "./Screens.module.css";

const T = TEXTS.exerciseForm;

interface FormState {
  name: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  measure: MeasureType;
  pattern: MovementPattern | "";
  instructions: string[];
  tips: string[];
}

function fromExercise(exercise: CatalogExercise | undefined): FormState {
  return {
    name: exercise?.name ?? "",
    primary: [...(exercise?.primary ?? [])],
    secondary: [...(exercise?.secondary ?? [])],
    equipment: [...(exercise?.equipment ?? [])],
    difficulty: exercise?.difficulty ?? "beginner",
    measure: exercise?.measure_type ?? "reps",
    pattern: exercise?.movement_pattern ?? "",
    instructions: exercise ? [...exercise.instructions] : [""],
    tips: exercise ? [...exercise.safety_tips] : [],
  };
}

type Errors = Partial<Record<keyof CustomExercisePayload | "form", string>>;

/** Validação no app com o mesmo esquema da função (ADR-034), com mensagens por campo. */
function validate(
  form: FormState,
  imported: boolean,
): { payload: CustomExercisePayload | ImportedCorrectionPayload | null; errors: Errors } {
  const texts = {
    name: form.name,
    instructions: form.instructions.map((s) => s.trim()).filter((s) => s !== ""),
    safety_tips: form.tips.map((s) => s.trim()).filter((s) => s !== ""),
  };
  // Importado: só nome, instruções e dicas (ADR-091).
  const result = imported
    ? importedCorrectionPayloadSchema.safeParse(texts)
    : customExercisePayloadSchema.safeParse({
        ...texts,
        primary_muscles: form.primary,
        secondary_muscles: form.secondary,
        equipment: form.equipment,
        difficulty: form.difficulty,
        measure_type: form.measure,
        movement_pattern: form.pattern === "" ? undefined : form.pattern,
      });
  if (result.success) return { payload: result.data, errors: {} };
  const errors: Errors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "form") as keyof Errors;
    if (errors[field]) continue;
    errors[field] =
      field === "name" || field === "movement_pattern"
        ? T.required
        : field === "primary_muscles" || field === "equipment"
          ? T.pickOne
          : field === "secondary_muscles"
            ? T.overlap
            : field === "instructions" && form.instructions.every((s) => s.trim() === "")
              ? T.required
              : T.stepLength;
  }
  return { payload: null, errors };
}

function StepList({
  legend,
  label,
  addLabel,
  values,
  error,
  onChange,
}: {
  legend: string;
  label: (n: number) => string;
  addLabel: string;
  values: string[];
  error: string | undefined;
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.sectionLabel}>{legend}</legend>
      {values.map((value, index) => (
        <div key={index} className={styles.stepRow}>
          <FormField label={label(index + 1)} error={index === 0 ? error : undefined}>
            {(control) => (
              <textarea
                {...control}
                className={styles.textarea}
                rows={2}
                maxLength={240}
                value={value}
                onChange={(e) => {
                  onChange(values.map((v, i) => (i === index ? e.target.value : v)));
                }}
              />
            )}
          </FormField>
          <IconButton
            label={`${T.remove} ${label(index + 1).toLowerCase()}`}
            icon={<Trash2 size={20} />}
            onClick={() => {
              onChange(values.filter((_, i) => i !== index));
            }}
          />
        </div>
      ))}
      {values.length < 15 ? (
        <Button
          variant="ghost"
          icon={<Plus size={20} />}
          onClick={() => {
            onChange([...values, ""]);
          }}
        >
          {addLabel}
        </Button>
      ) : null}
    </fieldset>
  );
}

// TELA-036 — Criar/editar exercício personalizado (RF-032, RN-036, RN-037). A edição exige
// conexão (RF-093) e envia API-020 direto à função. Em importados, só nome, instruções e
// dicas, com o texto da fonte preservado pelo banco (ADR-091).
export function ExerciseFormScreen({ params }: { params: Readonly<Record<string, string>> }) {
  const editingId = params.id;
  const { state, reload } = useCatalog();
  if (editingId === undefined) return <ExerciseForm exercise={undefined} onSaved={reload} />;
  if (state.status === "loading") return <Skeleton lines={8} />;
  if (state.status === "unavailable") {
    return <ErrorState title={TEXTS.error.title} description={TEXTS.catalog.unavailable} />;
  }
  const exercise = state.exercises.find((e) => e.id === editingId);
  if (!exercise)
    return <ErrorState title={TEXTS.catalog.notFound} description={TEXTS.catalog.notFoundHint} />;
  return <ExerciseForm key={exercise.id} exercise={exercise} onSaved={reload} />;
}

function ExerciseForm({
  exercise,
  onSaved,
}: {
  exercise: CatalogExercise | undefined;
  onSaved: () => Promise<void>;
}) {
  const local = useLocalData();
  const online = useOnline();
  const show = useSnackbar();
  const imported = exercise?.origin === "imported";
  const [form, setForm] = useState<FormState>(() => fromExercise(exercise));
  const [entityId] = useState(() => exercise?.id ?? crypto.randomUUID());
  // Mesmo op_id até uma recusa: reenviar depois de uma resposta perdida não duplica.
  const [opId, setOpId] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const set = (changes: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...changes }));
  };

  async function submit() {
    const { payload, errors: found } = validate(form, imported);
    setErrors(found);
    if (payload === null || local === null) return;
    if (!online) {
      setErrors({ form: T.offline });
      return;
    }
    setSubmitting(true);
    const outcome = await local.transport({
      contract_version: SYNC_CONTRACT_VERSION,
      device_id: local.deviceId,
      client_time: new Date().toISOString(),
      operations: [
        {
          op_id: opId,
          owner_user_id: local.userId,
          type: exercise ? "exercise.update" : "exercise.create",
          entity_id: entityId,
          base_revision: null,
          created_at: new Date().toISOString(),
          payload,
        },
      ],
    });
    setSubmitting(false);
    if (outcome.kind === "unauthorized") {
      setErrors({ form: messageFor("AUTH_REQUIRED") });
      return;
    }
    if (outcome.kind !== "response") {
      setErrors({ form: T.failed });
      return;
    }
    const result = outcome.response.results[0];
    if (result?.status === "accepted" || result?.status === "duplicate") {
      await onSaved();
      show({ text: T.saved });
      navigate(`/exercicios/${entityId}`);
      return;
    }
    setOpId(crypto.randomUUID());
    if (result?.status === "rejected" && result.error.code === "NAME_TAKEN") {
      setErrors({ name: messageFor("NAME_TAKEN") });
      return;
    }
    setErrors({
      form:
        result?.status === "rejected"
          ? (result.error.message ?? messageFor(result.error.code))
          : T.failed,
    });
  }

  const muscleOptions = MUSCLE_GROUPS.map((value) => ({
    value,
    label: MUSCLE_GROUP_LABELS[value],
  }));
  return (
    <form
      className={styles.stack}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {!online ? <Banner tone="info">{T.offline}</Banner> : null}
      {errors.form ? <Banner tone="danger">{errors.form}</Banner> : null}
      <FormField label={T.name} error={errors.name}>
        {(control) => (
          <TextInput
            {...control}
            maxLength={120}
            value={form.name}
            onChange={(e) => {
              set({ name: e.target.value });
            }}
          />
        )}
      </FormField>
      {imported ? (
        <Banner tone="info">{T.importedNotice(exercise.source?.name ?? "")}</Banner>
      ) : (
        <>
          <ChoiceGroup<MuscleGroup>
            legend={T.primary}
            multiple
            layout="row"
            options={muscleOptions}
            value={form.primary}
            onChange={(primary) => {
              set({ primary });
            }}
          />
          {errors.primary_muscles ? (
            <p className={styles.fieldError}>{errors.primary_muscles}</p>
          ) : null}
          <ChoiceGroup<MuscleGroup>
            legend={T.secondary}
            multiple
            layout="row"
            options={muscleOptions}
            value={form.secondary}
            onChange={(secondary) => {
              set({ secondary });
            }}
          />
          {errors.secondary_muscles ? (
            <p className={styles.fieldError}>{errors.secondary_muscles}</p>
          ) : null}
          <ChoiceGroup<Equipment>
            legend={T.equipment}
            multiple
            layout="row"
            options={EQUIPMENT.map((value) => ({ value, label: EQUIPMENT_LABELS[value] }))}
            value={form.equipment}
            onChange={(equipment) => {
              set({ equipment });
            }}
          />
          {errors.equipment ? <p className={styles.fieldError}>{errors.equipment}</p> : null}
          <ChoiceGroup<Difficulty>
            legend={T.difficulty}
            layout="row"
            options={DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] }))}
            value={form.difficulty}
            onChange={(difficulty) => {
              set({ difficulty });
            }}
          />
          <ChoiceGroup<MeasureType>
            legend={T.measure}
            layout="row"
            options={MEASURE_TYPES.map((value) => ({ value, label: T.measures[value] }))}
            value={form.measure}
            onChange={(measure) => {
              set({ measure });
            }}
          />
          <FormField label={T.pattern} help={T.patternHelp} error={errors.movement_pattern}>
            {(control) => (
              <SelectInput
                {...control}
                value={form.pattern}
                onChange={(e) => {
                  set({ pattern: e.target.value as MovementPattern | "" });
                }}
              >
                <option value="">{T.choose}</option>
                {MOVEMENT_PATTERNS.map((value) => (
                  <option key={value} value={value}>
                    {MOVEMENT_PATTERN_LABELS[value]}
                  </option>
                ))}
              </SelectInput>
            )}
          </FormField>
        </>
      )}
      <StepList
        legend={T.instructions}
        label={T.step}
        addLabel={T.addStep}
        values={form.instructions}
        error={errors.instructions}
        onChange={(instructions) => {
          set({ instructions });
        }}
      />
      <StepList
        legend={T.tips}
        label={T.tip}
        addLabel={T.addTip}
        values={form.tips}
        error={errors.safety_tips}
        onChange={(tips) => {
          set({ tips });
        }}
      />
      <Button type="submit" variant="primary" size="lg" loading={submitting} disabled={!online}>
        {T.save}
      </Button>
    </form>
  );
}
