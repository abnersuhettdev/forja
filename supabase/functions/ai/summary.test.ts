// API-033 contra o Supabase LOCAL, com o papel sync_writer de verdade e IA simulada: nenhuma chamada
// ao provedor (RF-115..117, CA-407). Usuários fictícios criados e removidos aqui.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localStatus } from "../../../scripts/db/local.ts";
import type { GeneratorReport } from "../../../packages/domain/src/motor/index.ts";
import { createSyncDb, type SyncDb } from "../sync/db.ts";
import { generateRoutine } from "./routine.ts";
import { generateSummary, type SummaryBody } from "./summary.ts";
import type { AiProvider } from "./workers-ai.ts";

const status = localStatus();
const admin = postgres(status.DB_URL, { onnotice: () => undefined });
const syncUrl = /^SYNC_DB_URL=(.*)$/m
  .exec(readFileSync(new URL("../.env", import.meta.url), "utf8"))?.[1]
  ?.replace("db.supabase.internal:5432", new URL(status.DB_URL).host);
if (!syncUrl) throw new Error("Rode scripts/db/local-sync-role.ts antes dos testes.");
let db: SyncDb;

/** Segunda, 9/11/2026, 12h em Brasília: o resumo trata de 2 a 8/11. */
const NOW = new Date("2026-11-09T15:00:00Z");
const hash = (text: string) => Promise.resolve(createHash("sha256").update(text).digest("hex"));
const users: string[] = [];

async function person(withRoutine: boolean) {
  const userId = randomUUID();
  const email = `ficticio.${userId.slice(0, 8)}@exemplo.test`;
  await admin`insert into auth.users (id, email) values (${userId}, ${email})`;
  const [manager] = await admin<{ id: string }[]>`
    insert into public.managers (user_id) values (${userId}) returning id`;
  const studentId = randomUUID();
  await admin`
    insert into public.students (id, manager_id, user_id, is_self, full_name, email, birth_date, timezone, status)
    values (${studentId}, ${manager?.id ?? ""}, ${userId}, true, 'Nome Secreto Fictício', ${email},
            '1990-05-10', 'America/Sao_Paulo', 'active')`;
  await admin`
    insert into public.training_profiles
      (student_id, goal, experience_level, days_per_week, minutes_per_session, training_location,
       equipment_codes, restrictions_declared)
    values (${studentId}, 'hypertrophy', 'intermediate', 4, 60, 'full_gym',
       array['barbell','dumbbell','machine','cable','bench','pullup_bar','bodyweight'], 'none')`;
  users.push(userId);
  const ids = { versionId: randomUUID(), workoutId: randomUUID(), itemId: randomUUID() };
  if (withRoutine) {
    const programId = randomUUID();
    const [bench] = await admin<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    await admin`insert into public.programs (id, student_id) values (${programId}, ${studentId})`;
    await admin`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${ids.versionId}, ${programId}, ${studentId}, 'Programa fictício')`;
    await admin`
      insert into public.workouts (id, program_version_id, position, name)
      values (${ids.workoutId}, ${ids.versionId}, 1, 'Treino A')`;
    await admin`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
      values (${ids.itemId}, ${ids.workoutId}, 1, ${bench?.id ?? ""}, 'reps', 3, 8, 12, 60)`;
    await admin`update public.program_versions set status = 'active' where id = ${ids.versionId}`;
    // Rotina em uso desde outubro: as 2 semanas anteriores contam para a proposta. A versão
    // publicada é imutável (RN-004), então só o teste muda a data, com os gatilhos desligados.
    await admin.begin(async (tx) => {
      await tx`set local session_replication_role = replica`;
      await tx`
        update public.program_versions set published_at = '2026-10-01T12:00:00Z'
        where id = ${ids.versionId}`;
    });
  }

  /** Sessão concluída às 10h (Brasília) do dia, com séries na carga indicada. */
  async function trained(day: string, load: number) {
    const sessionId = randomUUID();
    const seId = randomUUID();
    const start = `${day}T13:00:00Z`;
    const end = `${day}T13:50:00Z`;
    const [bench] = await admin<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    await admin`
      insert into public.sessions
        (id, student_id, program_version_id, workout_id, status, started_at, ended_at,
         duration_min, last_activity_at, device_id)
      values (${sessionId}, ${studentId}, ${ids.versionId}, ${ids.workoutId}, 'completed',
              ${start}, ${end}, 50, ${end}, ${randomUUID()})`;
    await admin`
      insert into public.session_exercises (id, session_id, workout_item_id, exercise_id, position, status)
      values (${seId}, ${sessionId}, ${ids.itemId}, ${bench?.id ?? ""}, 1, 'done')`;
    for (const n of [1, 2, 3]) {
      await admin`
        insert into public.set_logs (id, session_exercise_id, set_number, load_kg, reps, completed_at)
        values (${randomUUID()}, ${seId}, ${n}, ${load}, 10, ${end})`;
    }
  }
  return { identity: { userId, email: null }, studentId, trained };
}

function fakeProvider(text: string): AiProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    model: "modelo-ficticio",
    calls,
    complete(_system, user) {
      calls.push(user);
      return Promise.resolve({ content: text, neurons: 12 });
    },
  };
}

const outcomes = (userId: string) =>
  admin<{ kind: string; outcome: string }[]>`
    select kind, outcome from public.ai_usage
    where subject_hash = ${createHash("sha256").update(userId).digest("hex")} order by occurred_at`;

beforeAll(() => {
  db = createSyncDb(syncUrl);
});

afterAll(async () => {
  for (const user of users) {
    await admin`delete from public.ai_usage where subject_hash = ${createHash("sha256").update(user).digest("hex")}`;
    await admin`delete from public.students where user_id = ${user}`;
    await admin`delete from public.managers where user_id = ${user}`;
    await admin`delete from auth.users where id = ${user}`;
  }
  await db.close();
  await admin.end();
});

describe("POST /ai/summary (API-033)", () => {
  it("fatos pelas regras, texto conferido e gravado uma vez por semana (CA-407)", async () => {
    const me = await person(true);
    await me.trained("2026-10-27", 40);
    await me.trained("2026-11-03", 42.5);
    await me.trained("2026-11-05", 42.5);
    const text =
      "Foram 2 de 4 treinos, e o supino reto com barra subiu de 40 para 42,5. Há uma proposta logo abaixo.";
    const provider = fakeProvider(text);
    const first = await generateSummary(me.identity, { db, provider, hash, now: NOW });
    const body = first.body as Extract<SummaryBody, { status: "ready" }>;
    expect(body).toMatchObject({
      status: "ready",
      text,
      model: "modelo-ficticio",
      facts: {
        week_start: "2026-11-02",
        done: 2,
        goal: 4,
        previous_done: 1,
        sets: 6,
        adjustment: { days: 2 },
        load_up: [{ from: 40, to: 42.5 }],
      },
    });
    // RN-061: ao provedor vão só os fatos, sem nome, e-mail nem identificador.
    expect(provider.calls[0]).not.toMatch(/Nome Secreto|exemplo\.test|[0-9a-f]{8}-[0-9a-f]{4}/u);

    const again = await generateSummary(me.identity, { db, provider, hash, now: NOW });
    expect(again.body).toEqual(body);
    expect(provider.calls).toHaveLength(1);
    expect(await outcomes(me.identity.userId)).toEqual([{ kind: "summary", outcome: "ok" }]);
  });

  it("texto com número inventado é descartado e nada é gravado (RN-062)", async () => {
    const me = await person(true);
    await me.trained("2026-11-03", 40);
    const provider = fakeProvider(
      "Você fez 7 treinos e queimou muitas calorias nesta semana, parabéns.",
    );
    const result = await generateSummary(me.identity, { db, provider, hash, now: NOW });
    expect(result.body).toMatchObject({ status: "ready", text: null, facts: { done: 1 } });
    const [stored] = await admin<{ count: number }[]>`
      select count(*)::int as count from public.weekly_summaries where student_id = ${me.studentId}`;
    expect(stored?.count).toBe(0);
    expect(await outcomes(me.identity.userId)).toEqual([{ kind: "summary", outcome: "invalid" }]);
  });

  it("sem IA, só os fatos; sem rotina nem treino, não há resumo", async () => {
    const withRoutine = await person(true);
    const facts = await generateSummary(withRoutine.identity, {
      db,
      provider: null,
      hash,
      now: NOW,
    });
    expect(facts.body).toMatchObject({ status: "ready", text: null, facts: { done: 0 } });
    const without = await person(false);
    const none = await generateSummary(without.identity, { db, provider: null, hash, now: NOW });
    expect(none.body).toEqual({ status: "none" });
  });
});

describe("POST /ai/routine com dias da proposta (RF-116)", () => {
  it("gera com os dias pedidos, sem mudar o perfil", async () => {
    const me = await person(true);
    const result = await generateRoutine(
      me.identity,
      { db, provider: null, hash },
      { daysPerWeek: 2 },
    );
    const body = result.body as { status: string; report: GeneratorReport };
    expect(body.status).toBe("generated");
    expect(body.report.inputs.days_per_week).toBe(2);
    const [profile] = await admin<{ days: number }[]>`
      select days_per_week as days from public.training_profiles where student_id = ${me.studentId}`;
    expect(profile?.days).toBe(4);
  });
});
