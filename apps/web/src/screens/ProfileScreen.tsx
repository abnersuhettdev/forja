import { useEffect, useState, type ReactNode } from "react";
import { ClipboardPlus, Pencil } from "lucide-react";
import {
  ACTIVITY_LABELS,
  ACTIVITY_LEVELS,
  type MuscleGroup,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  EXPERIENCE_LEVELS,
  formatKg,
  GOAL_LABELS,
  GOALS,
  LOCATION_EQUIPMENT_PRESETS,
  LOCATION_LABELS,
  RESTRICTION_LABELS,
  RESTRICTIONS,
  SEX_LABELS,
  SEXES,
  TRAINING_LOCATIONS,
  type Equipment,
  type Restriction,
} from "@forja/domain";
import { profileUpdatePayloadSchema } from "@forja/domain/validacao";
import { fetchStudentProfile, type StudentProfile } from "../account/profile.ts";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { getSupabase } from "../auth/client.ts";
import { Button } from "../components/Button.tsx";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Banner, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { sendDirect } from "../local/direct.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { parseNumber } from "../onboarding/draft.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import { formatDate } from "./ProgramScreen.tsx";
import styles from "./Screens.module.css";

const T = TEXTS.profile;
const O = TEXTS.onboarding;

type SectionKey =
  | "personal"
  | "goal"
  | "experience"
  | "availability"
  | "location"
  | "restrictions"
  | "preferences"
  | "emphasis";

type State =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly data: StudentProfile };

export function useStudentProfile(studentId: string | null) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const supabase = getSupabase();
    if (studentId === null || supabase === null) return;
    let active = true;
    fetchStudentProfile(supabase, studentId).then(
      (data) => {
        if (active) setState({ status: "ready", data });
      },
      () => {
        if (active) setState({ status: "unavailable" });
      },
    );
    return () => {
      active = false;
    };
  }, [studentId, version]);
  return {
    state,
    reload: () => {
      setVersion((v) => v + 1);
    },
  };
}

const list = (values: readonly string[] | null, labels: Readonly<Record<string, string>>) =>
  values && values.length > 0 ? values.map((v) => labels[v] ?? v).join(", ") : T.notInformed;
const value = (text: string | null | undefined) => text ?? T.notInformed;

// TELA-037 — Perfil de treinamento (RF-012, RN-018, RN-025): seções com edição em folha,
// enviadas como profile.update (API-003) com a revisão atual. Gestão exige conexão.
export function ProfileScreen() {
  const { state: userState } = useUserContext();
  const studentId = userState.status === "ready" ? (userState.context.student?.id ?? null) : null;
  const { state, reload } = useStudentProfile(studentId);
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const online = useOnline();

  if (state.status === "loading") return <Skeleton lines={8} />;
  if (state.status === "unavailable") {
    return (
      <ErrorState
        title={TEXTS.error.title}
        description={TEXTS.program.managementOffline}
        onRetry={reload}
      />
    );
  }
  const { student, profile, lastAssessment } = state.data;

  const section = (key: SectionKey, title: string, content: ReactNode) => (
    <section className={styles.details} aria-labelledby={`perfil-${key}`}>
      <div className={styles.rowBetween}>
        <h2 id={`perfil-${key}`} className={styles.sectionLabel}>
          {title}
        </h2>
        <Button
          size="sm"
          icon={<Pencil size={16} />}
          aria-label={`${T.edit} ${title.toLowerCase()}`}
          disabled={!online}
          onClick={() => {
            setEditing(key);
          }}
        >
          {T.edit}
        </Button>
      </div>
      {content}
    </section>
  );

  return (
    <div className={styles.stack}>
      {!online ? <Banner tone="info">{TEXTS.program.offline}</Banner> : null}
      <p className={styles.muted}>{T.reviewNote}</p>
      {section(
        "personal",
        T.personal,
        <p>
          {student.full_name} · {formatDate(`${student.birth_date}T12:00:00Z`)} ·{" "}
          {student.sex ? SEX_LABELS[student.sex] : T.notInformed} ·{" "}
          {student.height_cm ? `${String(student.height_cm).replace(".", ",")} cm` : T.notInformed}
        </p>,
      )}
      {section(
        "goal",
        T.goal,
        <p>
          {profile.goal ? GOAL_LABELS[profile.goal] : T.notInformed}
          {profile.goal_weight_kg ? ` · meta ${formatKg(profile.goal_weight_kg)}` : ""}
        </p>,
      )}
      {section(
        "experience",
        T.experience,
        <p>
          {profile.experience_level ? EXPERIENCE_LABELS[profile.experience_level] : T.notInformed} ·{" "}
          {profile.activity_level ? ACTIVITY_LABELS[profile.activity_level] : T.notInformed}
        </p>,
      )}
      {section(
        "availability",
        T.availability,
        <p>
          {profile.days_per_week ? `${String(profile.days_per_week)} dias/semana` : T.notInformed} ·{" "}
          {profile.minutes_per_session
            ? `${String(profile.minutes_per_session)} min`
            : T.notInformed}{" "}
          ·{" "}
          {profile.preferred_weekdays?.length
            ? profile.preferred_weekdays.map((d) => O.weekdayNames[d - 1]).join(", ")
            : T.notInformed}
        </p>,
      )}
      {section(
        "location",
        T.location,
        <p>
          {profile.training_location ? LOCATION_LABELS[profile.training_location] : T.notInformed} ·{" "}
          {list(profile.equipment_codes, EQUIPMENT_LABELS)}
        </p>,
      )}
      {section(
        "restrictions",
        T.restrictions,
        <p>
          {profile.restrictions_declared === "none"
            ? O.restrictionsNone
            : list(profile.restriction_codes, RESTRICTION_LABELS)}
          {profile.restrictions_note ? ` · ${profile.restrictions_note}` : ""}
        </p>,
      )}
      {section("preferences", T.preferences, <p>{value(profile.preferences_note)}</p>)}
      {section("emphasis", T.emphasis, <p>{list(profile.emphasis_groups, MUSCLE_GROUP_LABELS)}</p>)}

      <section className={styles.details} aria-labelledby="perfil-avaliacoes">
        <h2 id="perfil-avaliacoes" className={styles.sectionLabel}>
          {T.assessments}
        </h2>
        <p>
          {lastAssessment
            ? T.lastAssessment(
                formatDate(`${lastAssessment.assessed_on}T12:00:00Z`),
                formatKg(lastAssessment.weight_kg),
              )
            : T.noAssessment}
        </p>
        <Button
          icon={<ClipboardPlus size={20} />}
          disabled={!online}
          onClick={() => {
            navigate("/gestao/perfil/avaliacao");
          }}
        >
          {T.newAssessment}
        </Button>
      </section>

      <Sheet
        open={editing !== null}
        title={editing ? sectionTitle(editing) : ""}
        onClose={() => {
          setEditing(null);
        }}
      >
        {editing ? (
          <SectionForm
            key={editing}
            section={editing}
            data={state.data}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function sectionTitle(key: SectionKey): string {
  return {
    personal: T.personal,
    goal: T.goal,
    experience: T.experience,
    availability: T.availability,
    location: T.location,
    restrictions: T.restrictions,
    preferences: T.preferences,
    emphasis: T.emphasis,
  }[key];
}

function SectionForm({
  section,
  data,
  onSaved,
}: {
  section: SectionKey;
  data: StudentProfile;
  onSaved: () => void;
}) {
  const local = useLocalData();
  const show = useSnackbar();
  const { student, profile } = data;
  const [form, setForm] = useState({
    full_name: student.full_name,
    sex: student.sex,
    height: student.height_cm === null ? "" : String(student.height_cm).replace(".", ","),
    goal: profile.goal,
    goalWeight:
      profile.goal_weight_kg === null ? "" : String(profile.goal_weight_kg).replace(".", ","),
    experience: profile.experience_level,
    activity: profile.activity_level,
    days: profile.days_per_week === null ? "" : String(profile.days_per_week),
    minutes: profile.minutes_per_session === null ? "" : String(profile.minutes_per_session),
    weekdays: profile.preferred_weekdays ?? [],
    location: profile.training_location,
    equipment: profile.equipment_codes ?? [],
    declared: profile.restrictions_declared,
    restrictions: profile.restriction_codes ?? [],
    restrictionsNote: profile.restrictions_note ?? "",
    preferences: profile.preferences_note ?? "",
    emphasis: profile.emphasis_groups ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (changes: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...changes }));
  };
  const emptyToNull = (text: string) => (text.trim() === "" ? null : text.trim());

  function payload(): unknown {
    switch (section) {
      case "personal":
        return {
          student: {
            full_name: form.full_name.trim(),
            sex: form.sex,
            height_cm: parseNumber(form.height),
          },
        };
      case "goal":
        return { profile: { goal: form.goal, goal_weight_kg: parseNumber(form.goalWeight) } };
      case "experience":
        return { profile: { experience_level: form.experience, activity_level: form.activity } };
      case "availability":
        return {
          profile: {
            days_per_week: parseNumber(form.days),
            minutes_per_session: parseNumber(form.minutes),
            preferred_weekdays:
              form.weekdays.length > 0 ? [...form.weekdays].sort((a, b) => a - b) : null,
          },
        };
      case "location":
        return {
          profile: {
            training_location: form.location,
            equipment_codes: form.equipment.length > 0 ? form.equipment : null,
          },
        };
      case "restrictions": {
        const listed = form.declared === "listed" && form.restrictions.length > 0;
        return {
          profile: {
            restrictions_declared: form.declared === "none" ? "none" : listed ? "listed" : null,
            restriction_codes: listed ? form.restrictions : null,
            restrictions_note: emptyToNull(form.restrictionsNote),
          },
        };
      }
      case "preferences":
        return { profile: { preferences_note: emptyToNull(form.preferences) } };
      case "emphasis":
        return { profile: { emphasis_groups: form.emphasis.length > 0 ? form.emphasis : null } };
    }
  }

  async function save() {
    const body = payload();
    if (!profileUpdatePayloadSchema.safeParse(body).success) {
      setError(T.invalid);
      return;
    }
    if (local === null) return;
    setSaving(true);
    const result = await sendDirect(local, {
      opId: crypto.randomUUID(),
      type: "profile.update",
      entityId: student.id,
      baseRevision: profile.revision,
      payload: body,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.kind === "conflict" ? TEXTS.editor.conflict : result.message);
      return;
    }
    show({ text: T.saved });
    onSaved();
  }

  const numberField = (
    label: string,
    key: "height" | "goalWeight" | "days" | "minutes",
    decimal = false,
  ) => (
    <FormField label={label}>
      {(control) => (
        <TextInput
          {...control}
          inputMode={decimal ? "decimal" : "numeric"}
          value={form[key]}
          onChange={(e) => {
            set({ [key]: e.target.value });
          }}
        />
      )}
    </FormField>
  );

  const fields: Record<SectionKey, ReactNode> = {
    personal: (
      <>
        <FormField label={O.fullName}>
          {(control) => (
            <TextInput
              {...control}
              value={form.full_name}
              onChange={(e) => {
                set({ full_name: e.target.value });
              }}
            />
          )}
        </FormField>
        <p className={styles.muted}>{T.birthDateLocked}</p>
        <ChoiceGroup
          legend={O.sex}
          options={SEXES.map((v) => ({ value: v, label: SEX_LABELS[v] }))}
          value={form.sex}
          onChange={(sex) => {
            set({ sex });
          }}
        />
        {numberField(O.height, "height", true)}
      </>
    ),
    goal: (
      <>
        <ChoiceGroup
          legend={O.goal}
          options={GOALS.map((v) => ({ value: v, label: GOAL_LABELS[v] }))}
          value={form.goal}
          onChange={(goal) => {
            set({ goal });
          }}
        />
        {numberField(O.goalWeight, "goalWeight", true)}
      </>
    ),
    experience: (
      <>
        <ChoiceGroup
          legend={O.experience}
          options={EXPERIENCE_LEVELS.map((v) => ({ value: v, label: EXPERIENCE_LABELS[v] }))}
          value={form.experience}
          onChange={(experience) => {
            set({ experience });
          }}
        />
        <ChoiceGroup
          legend={O.activity}
          options={ACTIVITY_LEVELS.map((v) => ({ value: v, label: ACTIVITY_LABELS[v] }))}
          value={form.activity}
          onChange={(activity) => {
            set({ activity });
          }}
        />
      </>
    ),
    availability: (
      <>
        {numberField(O.daysPerWeek, "days")}
        {numberField(O.minutesPerSession, "minutes")}
        <ChoiceGroup<number>
          legend={O.weekdays}
          multiple
          layout="row"
          options={O.weekdayNames.map((label, index) => ({ value: index + 1, label }))}
          value={form.weekdays}
          onChange={(weekdays) => {
            set({ weekdays });
          }}
        />
      </>
    ),
    location: (
      <>
        <ChoiceGroup
          legend={O.location}
          options={TRAINING_LOCATIONS.map((v) => ({ value: v, label: LOCATION_LABELS[v] }))}
          value={form.location}
          onChange={(location) => {
            set({ location, equipment: [...LOCATION_EQUIPMENT_PRESETS[location]] });
          }}
        />
        <ChoiceGroup<Equipment>
          legend={O.equipment}
          multiple
          layout="row"
          options={EQUIPMENT.map((v) => ({ value: v, label: EQUIPMENT_LABELS[v] }))}
          value={form.equipment}
          onChange={(equipment) => {
            set({ equipment });
          }}
        />
      </>
    ),
    restrictions: (
      <>
        <p className={styles.muted}>{O.restrictionsInfo}</p>
        <ChoiceGroup
          legend={O.restrictionsChoice}
          layout="row"
          options={[
            { value: "none" as const, label: O.restrictionsNone },
            { value: "listed" as const, label: O.restrictionsListed },
          ]}
          value={form.declared}
          onChange={(declared) => {
            set({ declared, ...(declared === "none" ? { restrictions: [] } : {}) });
          }}
        />
        {form.declared === "listed" ? (
          <ChoiceGroup<Restriction>
            legend={O.restrictions}
            multiple
            options={RESTRICTIONS.map((v) => ({ value: v, label: RESTRICTION_LABELS[v] }))}
            value={form.restrictions}
            onChange={(restrictions) => {
              set({ restrictions });
            }}
          />
        ) : null}
        <FormField label={O.restrictionsNote}>
          {(control) => (
            <textarea
              {...control}
              className={styles.textarea}
              rows={2}
              maxLength={500}
              value={form.restrictionsNote}
              onChange={(e) => {
                set({ restrictionsNote: e.target.value });
              }}
            />
          )}
        </FormField>
      </>
    ),
    emphasis: (
      <>
        <ChoiceGroup<MuscleGroup>
          legend={T.emphasisLegend}
          multiple
          layout="row"
          options={MUSCLE_GROUPS.map((v) => ({ value: v, label: MUSCLE_GROUP_LABELS[v] }))}
          value={form.emphasis}
          onChange={(emphasis) => {
            set({ emphasis });
          }}
        />
        <p className={styles.muted}>{T.emphasisHelp}</p>
      </>
    ),
    preferences: (
      <FormField label={T.preferencesNote}>
        {(control) => (
          <textarea
            {...control}
            className={styles.textarea}
            rows={3}
            maxLength={500}
            value={form.preferences}
            onChange={(e) => {
              set({ preferences: e.target.value });
            }}
          />
        )}
      </FormField>
    ),
  };

  return (
    <form
      className={styles.stack}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      {error !== null ? <Banner tone="danger">{error}</Banner> : null}
      {fields[section]}
      <Button type="submit" variant="primary" loading={saving}>
        {T.save}
      </Button>
    </form>
  );
}
