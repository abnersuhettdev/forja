// Programa fictício de um treino publicado direto no banco local (RN-037), compartilhado pelas
// verificações offline (TAR-017) e do app instalável (TAR-006).
import postgres from "postgres";
import { localStatus } from "../../../scripts/db/local.ts";

/** Publica, direto no banco local, um programa fictício de um treino para o usuário. */
export async function publishProgram(email: string) {
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    const [student] = await sql<{ id: string }[]>`
      select s.id from public.students s join auth.users u on u.id = s.user_id
      where u.email = ${email}`;
    if (!student) throw new Error("aluno fictício ausente");
    await sql`delete from public.programs where student_id = ${student.id}`;
    await sql`delete from public.weight_entries where student_id = ${student.id}`;
    const programId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const workoutId = crypto.randomUUID();
    await sql`insert into public.programs (id, student_id) values (${programId}, ${student.id})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${student.id}, 'Programa offline fictício')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
      select ${crypto.randomUUID()}, ${workoutId}, 1, id, 'reps', 3, 8, 12, 90
      from public.exercises where source_ref = 'Barbell_Squat'`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    await sql`
      insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
      values (${crypto.randomUUID()}, ${student.id}, current_date - 3, 81.4, 'manual')`;
  } finally {
    await sql.end();
  }
}
