// Perfil completo do aluno para a Gestão (TELA-037, TELA-038): aluno, perfil de treinamento e
// última avaliação, lidos pela API de dados.
import type { DataClient } from "../auth/data-client.ts";
import type {
  ActivityLevel,
  Equipment,
  ExperienceLevel,
  Goal,
  MuscleGroup,
  Restriction,
  Sex,
  TrainingLocation,
} from "@forja/domain";

export interface StudentProfile {
  readonly student: {
    readonly id: string;
    readonly full_name: string;
    readonly birth_date: string;
    readonly sex: Sex | null;
    readonly height_cm: number | null;
    readonly timezone: string;
  };
  readonly profile: {
    readonly goal: Goal | null;
    readonly goal_weight_kg: number | null;
    readonly experience_level: ExperienceLevel | null;
    readonly activity_level: ActivityLevel | null;
    readonly days_per_week: number | null;
    readonly minutes_per_session: number | null;
    readonly preferred_weekdays: number[] | null;
    readonly training_location: TrainingLocation | null;
    readonly equipment_codes: Equipment[] | null;
    readonly restrictions_declared: "none" | "listed" | null;
    readonly restriction_codes: Restriction[] | null;
    readonly restrictions_note: string | null;
    readonly preferences_note: string | null;
    readonly emphasis_groups: MuscleGroup[] | null;
    readonly review_recommended_since: string | null;
    readonly revision: number;
  };
  readonly lastAssessment: { readonly assessed_on: string; readonly weight_kg: number } | null;
}

export async function fetchStudentProfile(
  supabase: DataClient,
  studentId: string,
): Promise<StudentProfile> {
  const [student, profile, assessment] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, birth_date, sex, height_cm, timezone")
      .eq("id", studentId)
      .single<StudentProfile["student"]>(),
    supabase
      .from("training_profiles")
      .select(
        "goal, goal_weight_kg, experience_level, activity_level, days_per_week, minutes_per_session, preferred_weekdays, training_location, equipment_codes, restrictions_declared, restriction_codes, restrictions_note, preferences_note, emphasis_groups, review_recommended_since, revision",
      )
      .eq("student_id", studentId)
      .single<StudentProfile["profile"]>(),
    supabase
      .from("assessments")
      .select("assessed_on, weight_kg")
      .eq("student_id", studentId)
      .order("assessed_on", { ascending: false })
      .limit(1)
      .maybeSingle<NonNullable<StudentProfile["lastAssessment"]>>(),
  ]);
  if (student.error) throw student.error;
  if (profile.error) throw profile.error;
  if (assessment.error) throw assessment.error;
  return { student: student.data, profile: profile.data, lastAssessment: assessment.data };
}
