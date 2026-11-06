import { useEffect, useState } from "react";
import { CircleCheck, CircleAlert, Sparkles } from "lucide-react";
import { MUSCLE_GROUP_LABELS, toLocalDate } from "@forja/domain";
import { motorPending, type MotorPendingCode } from "@forja/domain/motor";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { fetchStudentProfile, type StudentProfile } from "../account/profile.ts";
import { getSupabase } from "../auth/client.ts";
import { useCatalog } from "../catalog/useCatalog.ts";
import { Button } from "../components/Button.tsx";
import { Banner, EmptyState, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { createProposal } from "../program/generator.ts";
import { useProgram } from "../program/useProgram.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { GENERATE_TEXTS } from "../program/generate-texts.ts";
import { useOnline } from "../app/useOnline.ts";
import { DRAFT_PATH } from "./ProgramScreen.tsx";
import styles from "./Screens.module.css";

const T = GENERATE_TEXTS;
const PROFILE_PATH = "/gestao/perfil";
const CHECKS: readonly MotorPendingCode[] = [
  "birth_date",
  "goal",
  "experience_level",
  "days_per_week",
  "minutes_per_session",
  "equipment",
  "restrictions",
];

// TELA-051 — Gerar treino (RF-021..023, RF-112; RN-006..009, RN-030). O motor roda no aparelho e
// o resultado é só um rascunho: nada aparece em Meu treino sem publicar. Gestão exige conexão.
export function GenerateScreen() {
  const { state: userState } = useUserContext();
  const studentId = userState.status === "ready" ? (userState.context.student?.id ?? null) : null;
  const { state: programState } = useProgram(studentId);
  const { state: catalogState } = useCatalog();
  const local = useLocalData();
  const online = useOnline();
  const [data, setData] = useState<StudentProfile | "failed" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (supabase === null || studentId === null) return;
    let active = true;
    fetchStudentProfile(supabase, studentId).then(
      (profile) => {
        if (active) setData(profile);
      },
      () => {
        if (active) setData("failed");
      },
    );
    return () => {
      active = false;
    };
  }, [studentId]);

  if (studentId === null) {
    return (
      <EmptyState icon={<Sparkles size={32} />} title={TEXTS.program.noStudent} description="" />
    );
  }
  if (
    data === "failed" ||
    programState.status === "unavailable" ||
    catalogState.status === "unavailable"
  ) {
    return <ErrorState title={TEXTS.error.title} description={TEXTS.program.offline} />;
  }
  if (data === null || programState.status === "loading" || catalogState.status === "loading") {
    return <Skeleton lines={8} />;
  }

  const { active, draft } = programState.program;
  const { student, profile } = data;
  const motorProfile = { ...student, ...profile };
  const today = toLocalDate(new Date(), student.timezone);
  const pending = motorPending(motorProfile, today);

  async function generate() {
    if (local === null || studentId === null || data === null || data === "failed") return;
    if (catalogState.status !== "ready") return;
    setBusy(true);
    setError(null);
    const outcome = await createProposal({
      local,
      studentId,
      profile: data,
      catalog: catalogState.exercises,
      previousExerciseIds:
        active?.document.workouts.flatMap((w) => w.items.map((i) => i.exercise_id)) ?? [],
    });
    setBusy(false);
    if (outcome.ok) {
      navigate(DRAFT_PATH);
      return;
    }
    setError(outcome.pending ? T.failed : outcome.message);
  }

  return (
    <div className={styles.stack}>
      {!online ? <Banner tone="info">{TEXTS.program.offline}</Banner> : null}
      {error !== null ? <Banner tone="danger">{error}</Banner> : null}
      <p>{T.intro}</p>
      <section aria-labelledby="gerar-dados">
        <h2 id="gerar-dados" className={styles.sectionLabel}>
          {T.checklist}
        </h2>
        <ul className={styles.list}>
          {CHECKS.map((code) => {
            const missing =
              pending.includes(code) || (code === "birth_date" && pending.includes("under_age"));
            return (
              <li key={code} className={styles.listLink}>
                {missing ? (
                  <CircleAlert size={20} aria-hidden="true" />
                ) : (
                  <CircleCheck size={20} aria-hidden="true" />
                )}
                <span className={styles.listText}>
                  <span>{missing ? T.pending[code] : T.done[code]}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      {pending.includes("under_age") ? <Banner tone="warning">{T.pending.under_age}</Banner> : null}
      {pending.length > 0 ? (
        <Button
          onClick={() => {
            navigate(PROFILE_PATH);
          }}
        >
          {T.completeProfile}
        </Button>
      ) : null}
      {(profile.emphasis_groups ?? []).length > 0 ? (
        <p>{T.emphasis((profile.emphasis_groups ?? []).map((g) => MUSCLE_GROUP_LABELS[g]))}</p>
      ) : null}
      <Banner tone="info">{T.notice}</Banner>
      {draft ? (
        <>
          <Banner tone="warning">{T.draftExists}</Banner>
          <Button
            onClick={() => {
              navigate(DRAFT_PATH);
            }}
          >
            {TEXTS.program.continue}
          </Button>
        </>
      ) : (
        <Button
          variant="primary"
          size="lg"
          icon={<Sparkles size={20} />}
          loading={busy}
          disabled={!online || pending.length > 0}
          onClick={() => void generate()}
        >
          {T.submit}
        </Button>
      )}
    </div>
  );
}
