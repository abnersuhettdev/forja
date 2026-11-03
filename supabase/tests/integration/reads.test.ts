// Leituras comuns com 2 anos de dados sintéticos (TAR-024; CA-208, RNF-008; SEG-04 §1): p95 ≤
// 500 ms, medido com as mesmas consultas do app, como o próprio usuário (políticas por linha).
// Indicativo no Supabase local (ADR-090); repetir no projeto real (TAR-003).
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { fetchCatalog } from "../../../apps/web/src/catalog/catalog.ts";
import {
  fetchSessionData,
  fetchSessionsInRange,
} from "../../../apps/web/src/execution/download.ts";
import { VERSION_SELECT } from "../../../apps/web/src/program/program.ts";
import { localStatus } from "../../../scripts/db/local.ts";
import { createUser } from "../../../scripts/ops/managers.ts";

const status = localStatus();
const admin = postgres(status.DB_URL, { onnotice: () => undefined });
const env = Object.fromEntries(
  readFileSync(new URL("../../../apps/web/.env.development.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
) as Record<string, string>;
let userId = "";

afterAll(async () => {
  if (userId !== "") {
    await admin.begin(async (sql) => {
      // Sessões antigas ficam fora da janela de edição: limpeza só no banco de teste.
      await sql`set local session_replication_role = replica`;
      await sql`delete from public.set_logs where session_exercise_id in (
        select se.id from public.session_exercises se join public.sessions s on s.id = se.session_id
        join public.students st on st.id = s.student_id where st.user_id = ${userId})`;
      await sql`delete from public.session_exercises where session_id in (
        select s.id from public.sessions s join public.students st on st.id = s.student_id
        where st.user_id = ${userId})`;
      await sql`delete from public.sessions where student_id in (
        select id from public.students where user_id = ${userId})`;
    });
    await admin`delete from public.students where user_id = ${userId}`;
    await admin`delete from public.managers where user_id = ${userId}`;
    await admin`delete from auth.users where id = ${userId}`;
  }
  await admin.end();
});

/** Percentil 95 (método do posto mais próximo). */
function p95(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? Number.NaN;
}

async function timed(run: () => Promise<unknown>, times = 20): Promise<number> {
  await run(); // aquecimento (conexão e planos de consulta)
  const samples: number[] = [];
  for (let i = 0; i < times; i++) {
    const started = performance.now();
    await run();
    samples.push(performance.now() - started);
  }
  return Math.round(p95(samples));
}

/** Aluno com programa de 4 treinos × 5 exercícios, 312 sessões em 2 anos e pesos. */
async function syntheticStudent(user: string): Promise<string> {
  return admin.begin(async (sql) => {
    const [manager] = await sql<{ id: string }[]>`
      insert into public.managers (user_id) values (${user}) returning id`;
    const [student] = await sql<{ id: string }[]>`
      insert into public.students
        (id, manager_id, user_id, is_self, full_name, birth_date, onboarding_completed_at)
      values (gen_random_uuid(), ${manager?.id ?? ""}, ${user}, true, 'Pessoa Fictícia',
              '1990-01-01', now())
      returning id`;
    const id = student?.id ?? "";
    await sql`insert into public.training_profiles (student_id, goal) values (${id}, 'hypertrophy')`;
    await sql`insert into public.rest_settings (student_id) values (${id})`;
    const programId = randomUUID();
    const versionId = randomUUID();
    await sql`insert into public.programs (id, student_id) values (${programId}, ${id})`;
    await sql`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${id}, 'Programa sintético')`;
    await sql`
      insert into public.workouts (id, program_version_id, position, name)
      select gen_random_uuid(), ${versionId}, w, 'Treino ' || chr(64 + w)
      from generate_series(1, 4) w`;
    await sql`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
      select gen_random_uuid(), w.id, e.n, e.id, 'reps', 3, 8, 12, 90
      from public.workouts w
      cross join lateral (
        select x.id, row_number() over (order by x.name) as n from public.exercises x
        where x.origin = 'imported' and x.measure_type = 'reps' order by x.name limit 5
      ) e
      where w.program_version_id = ${versionId}`;
    await sql`update public.program_versions set status = 'active' where id = ${versionId}`;
    await sql`
      insert into public.sessions
        (id, student_id, program_version_id, workout_id, status, started_at, ended_at,
         duration_min, last_activity_at, device_id)
      select gen_random_uuid(), ${id}, ${versionId},
             (select w.id from public.workouts w where w.program_version_id = ${versionId}
              order by w.position offset (d % 4) limit 1),
             'completed', now() - d * interval '56 hours',
             now() - d * interval '56 hours' + interval '1 hour', 60,
             now() - d * interval '56 hours' + interval '1 hour', gen_random_uuid()
      from generate_series(1, 312) d`;
    await sql`
      insert into public.session_exercises
        (id, session_id, workout_item_id, exercise_id, position, status)
      select gen_random_uuid(), s.id, i.id, i.exercise_id, i.position, 'done'
      from public.sessions s join public.workout_items i on i.workout_id = s.workout_id
      where s.student_id = ${id}`;
    await sql`
      insert into public.set_logs (id, session_exercise_id, set_number, load_kg, reps, completed_at)
      select gen_random_uuid(), se.id, n, 20 + n * 2.5, 10, s.ended_at
      from public.session_exercises se join public.sessions s on s.id = se.session_id
      cross join generate_series(1, 3) n
      where s.student_id = ${id}`;
    await sql`
      insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
      select gen_random_uuid(), ${id}, current_date - d * 3, 80 + (d % 7) * 0.1, 'manual'
      from generate_series(0, 240) d`;
    return id;
  });
}

describe("leituras com 2 anos de dados (CA-208)", () => {
  it("programa, sessões, mês antigo, pesos e catálogo com p95 ≤ 500 ms", async () => {
    const url = env.VITE_SUPABASE_URL ?? "";
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
    const email = `ficticio.leituras.${randomUUID().slice(0, 8)}@exemplo.test`;
    const password = "Ficticia-leituras-forja-01";
    const created = await createUser({ url, serviceKey: status.SERVICE_ROLE_KEY }, email, password);
    userId = created.id;
    const studentId = await syntheticStudent(userId);
    const [{ count } = { count: 0 }] = await admin<{ count: number }[]>`
      select count(*)::int as count from public.set_logs l
      join public.session_exercises se on se.id = l.session_exercise_id
      join public.sessions s on s.id = se.session_id where s.student_id = ${studentId}`;
    expect(count).toBe(312 * 5 * 3);

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    expect(error).toBeNull();
    const now = new Date();
    const yearAgo = new Date(now.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
    const results = {
      programa: await timed(async () => {
        const r = await supabase
          .from("program_versions")
          .select(VERSION_SELECT)
          .eq("student_id", studentId)
          .eq("status", "active")
          .maybeSingle();
        if (r.error) throw new Error(r.error.message);
      }),
      sessoes90dias: await timed(() => fetchSessionData(supabase, studentId, now)),
      mesAntigo: await timed(() =>
        fetchSessionsInRange(
          supabase,
          studentId,
          new Date(now.getTime() - 400 * 86_400_000).toISOString(),
          new Date(now.getTime() - 370 * 86_400_000).toISOString(),
        ),
      ),
      pesos12meses: await timed(async () => {
        const r = await supabase
          .from("weight_entries")
          .select("id, measured_on, weight_kg, source, revision, created_at")
          .eq("student_id", studentId)
          .is("deleted_at", null)
          .gte("measured_on", yearAgo);
        if (r.error) throw new Error(r.error.message);
      }),
      catalogo: await timed(() => fetchCatalog(supabase)),
    };
    console.log("LEITURAS p95 (ms)", JSON.stringify(results));
    for (const [name, ms] of Object.entries(results)) {
      expect([name, ms <= 500]).toEqual([name, true]);
    }
  }, 180_000);
});
