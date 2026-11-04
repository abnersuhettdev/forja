// API-032 contra o Supabase LOCAL, com o papel sync_writer de verdade e IA simulada: nenhuma chamada
// ao provedor (RN-060..063, CA-401..404). Usuários fictícios criados e removidos aqui.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localStatus } from "../../../scripts/db/local.ts";
import type {
  GeneratorReport,
  GeneratedWorkout,
} from "../../../packages/domain/src/motor/index.ts";
import { createSyncDb, type SyncDb } from "../sync/db.ts";
import { DAILY_NEURON_LIMIT, generateRoutine, USER_DAILY_LIMIT } from "./routine.ts";
import { createWorkersAi, type AiProvider } from "./workers-ai.ts";

const status = localStatus();
const admin = postgres(status.DB_URL, { onnotice: () => undefined });
const syncUrl = /^SYNC_DB_URL=(.*)$/m
  .exec(readFileSync(new URL("../.env", import.meta.url), "utf8"))?.[1]
  ?.replace("db.supabase.internal:5432", new URL(status.DB_URL).host);
if (!syncUrl) throw new Error("Rode scripts/db/local-sync-role.ts antes dos testes.");
let db: SyncDb;

const hash = (text: string) => Promise.resolve(createHash("sha256").update(text).digest("hex"));
const users: string[] = [];

interface Generated {
  status: string;
  pending?: string[];
  program: { workouts: GeneratedWorkout[] };
  report: GeneratorReport;
}

async function person(overrides: { days?: number | null; restriction?: string } = {}) {
  const userId = randomUUID();
  await admin`insert into auth.users (id, email) values (${userId}, ${`ficticio.${userId.slice(0, 8)}@exemplo.test`})`;
  const [manager] = await admin<{ id: string }[]>`
    insert into public.managers (user_id) values (${userId}) returning id`;
  const studentId = randomUUID();
  await admin`
    insert into public.students (id, manager_id, user_id, is_self, full_name, email, birth_date, timezone, status)
    values (${studentId}, ${manager?.id ?? ""}, ${userId}, true, 'Nome Secreto Fictício',
            ${`ficticio.${userId.slice(0, 8)}@exemplo.test`}, '1990-05-10', 'America/Sao_Paulo', 'active')`;
  await admin`
    insert into public.training_profiles
      (student_id, goal, experience_level, days_per_week, minutes_per_session, training_location,
       equipment_codes, restrictions_declared, restriction_codes)
    values (${studentId}, 'hypertrophy', 'intermediate', ${overrides.days === undefined ? 4 : overrides.days},
       60, 'full_gym', array['barbell','dumbbell','machine','cable','bench','pullup_bar','bodyweight'],
       ${overrides.restriction ? "listed" : "none"},
       ${overrides.restriction ? [overrides.restriction] : null})`;
  users.push(userId);
  return { userId, email: null };
}

function fakeProvider(
  reply: (user: string) => unknown,
  neurons = 22,
): AiProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    model: "modelo-ficticio",
    calls,
    complete(_system, user) {
      calls.push(user);
      return Promise.resolve({ content: reply(user), neurons });
    },
  };
}

const firstSwap = (user: string) => {
  const request = JSON.parse(user) as {
    treinos: { exercicios: { vaga: string; opcoes: { codigo: string }[] }[] }[];
  };
  const slot = request.treinos.flatMap((t) => t.exercicios).find((e) => e.opcoes.length > 0);
  return { vaga: slot?.vaga, para: slot?.opcoes[0]?.codigo };
};
const goodReply = (user: string) =>
  JSON.stringify({
    trocas: [{ ...firstSwap(user), motivo: "Com 4 dias por semana, varia o treino." }],
    motivos: ["Com 4 dias por semana, a rotina divide superior e inferior."],
    resumo: "A rotina combina com o objetivo de hipertrofia.",
  });
const usage = (subject: string) =>
  admin<{ outcome: string; neurons: number; model: string | null }[]>`
    select outcome, neurons::float8 as neurons, model from public.ai_usage where subject_hash = ${subject}`;

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

describe("POST /ai/routine (API-032)", () => {
  it("aplica a troca válida, explica e registra o uso sem conteúdo (CA-401)", async () => {
    const identity = await person();
    const provider = fakeProvider(goodReply);
    const result = await generateRoutine(identity, { db, provider, hash });
    const body = result.body as Generated;
    expect(result.status).toBe(200);
    expect(body.report.ai).toMatchObject({
      source: "motor+ia",
      model: "modelo-ficticio",
      summary: "A rotina combina com o objetivo de hipertrofia.",
    });
    expect(body.report.ai?.swaps).toHaveLength(1);
    expect(await usage(await hash(identity.userId))).toEqual([
      { outcome: "ok", neurons: 22, model: "modelo-ficticio" },
    ]);
    const columns = await admin<{ column_name: string }[]>`
      select column_name from information_schema.columns where table_name = 'ai_usage'`;
    expect(columns.map((c) => c.column_name).sort()).toEqual(
      ["id", "kind", "model", "neurons", "occurred_at", "outcome", "subject_hash"].sort(),
    );
  });

  it("não envia nome, e-mail nem identificadores à IA (CA-404)", async () => {
    const identity = await person();
    const provider = fakeProvider(goodReply);
    await generateRoutine(identity, { db, provider, hash });
    const sent = provider.calls[0] ?? "";
    expect(sent.length).toBeGreaterThan(100);
    expect(sent).not.toContain("Nome Secreto");
    expect(sent).not.toContain("@exemplo.test");
    expect(sent).not.toContain(identity.userId);
    expect(sent).not.toContain("1990-05-10");
    expect(sent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/u);
  });

  it("resposta inválida vale o motor, avisando (CA-402, RN-062)", async () => {
    const identity = await person();
    const motorOnly = (await generateRoutine(identity, { db, provider: null, hash }))
      .body as Generated;
    for (const reply of [
      "texto solto",
      JSON.stringify({
        trocas: [{ vaga: "Z9", para: "e1", motivo: "x" }],
        motivos: [],
        resumo: "x",
      }),
      JSON.stringify({ trocas: [], motivos: [], resumo: "Use 100 kg no agachamento." }),
    ]) {
      const result = await generateRoutine(identity, {
        db,
        provider: fakeProvider(() => reply),
        hash,
      });
      const body = result.body as Generated;
      expect(body.report.ai).toMatchObject({ source: "motor", fallback: "invalid", summary: null });
      expect(body.program).toEqual(motorOnly.program);
    }
  });

  it("IA indisponível ou com erro vale o motor (CA-403)", async () => {
    const identity = await person();
    const none = (await generateRoutine(identity, { db, provider: null, hash })).body as Generated;
    expect(none.report.ai).toMatchObject({ source: "motor", fallback: "unavailable" });
    const failing: AiProvider = {
      model: "x",
      complete: () => Promise.reject(new Error("fora do ar")),
    };
    const down = (await generateRoutine(identity, { db, provider: failing, hash }))
      .body as Generated;
    expect(down.report.ai).toMatchObject({ source: "motor", fallback: "unavailable" });
    expect(down.program).toEqual(none.program);
  });

  it("nunca entrega exercício restrito, com ou sem IA (RN-008)", async () => {
    const identity = await person({ restriction: "knee" });
    const body = (await generateRoutine(identity, { db, provider: fakeProvider(goodReply), hash }))
      .body as Generated;
    const ids = body.program.workouts.flatMap((w) => w.items.map((i) => i.exercise_id));
    const blocked = await admin<{ id: string }[]>`
      select e.id from public.exercises e
      where e.id = any(${ids}::uuid[]) and (
        'deep_knee_flexion_loaded' = any(e.load_markers) or 'knee_impact' = any(e.load_markers)
        or exists (select 1 from public.exercise_contraindications c
                   where c.exercise_id = e.id and c.restriction_code = 'knee'))`;
    expect(blocked).toEqual([]);
    expect(body.report.excluded.some((e) => e.reason.kind === "restriction")).toBe(true);
  });

  it("limite por pessoa e cota do dia levam ao motor, sem chamar a IA (RN-063)", async () => {
    const identity = await person();
    const subject = await hash(identity.userId);
    for (let i = 0; i < USER_DAILY_LIMIT; i += 1) {
      await admin`insert into public.ai_usage (subject_hash, kind, model, outcome, neurons)
                  values (${subject}, 'routine', 'x', 'ok', 0)`;
    }
    const provider = fakeProvider(goodReply);
    const body = (await generateRoutine(identity, { db, provider, hash })).body as Generated;
    expect(provider.calls).toEqual([]);
    expect(body.report.ai).toMatchObject({ source: "motor", fallback: "quota" });

    const other = await person();
    const [row] = await admin<{ id: string }[]>`
      insert into public.ai_usage (subject_hash, kind, model, outcome, neurons)
      values (${await hash(other.userId)}, 'routine', 'x', 'ok', ${DAILY_NEURON_LIMIT}) returning id`;
    const second = fakeProvider(goodReply);
    const quota = (await generateRoutine(other, { db, provider: second, hash })).body as Generated;
    expect(second.calls).toEqual([]);
    expect(quota.report.ai).toMatchObject({ fallback: "quota" });
    await admin`delete from public.ai_usage where id = ${row?.id ?? ""}`;
  });

  it("perfil incompleto não chama a IA e lista as pendências (CA-022)", async () => {
    const identity = await person({ days: null });
    const provider = fakeProvider(goodReply);
    const result = await generateRoutine(identity, { db, provider, hash });
    expect(result).toEqual({
      status: 200,
      body: { status: "blocked", pending: ["days_per_week"] },
    });
    expect(provider.calls).toEqual([]);
  });

  it("sem aluno próprio, responde NOT_FOUND", async () => {
    const userId = randomUUID();
    await admin`insert into auth.users (id, email) values (${userId}, ${`ficticio.${userId.slice(0, 8)}@exemplo.test`})`;
    users.push(userId);
    expect(await generateRoutine({ userId, email: null }, { db, provider: null, hash })).toEqual({
      status: 404,
      body: { code: "NOT_FOUND" },
    });
  });

  it("o usuário só usa o papel sync_writer: não lê o uso de ninguém pelo app", async () => {
    const [denied] = await admin<{ allowed: boolean }[]>`
      select has_table_privilege('authenticated', 'public.ai_usage', 'select') as allowed`;
    expect(denied?.allowed).toBe(false);
  });
});

describe("provedor Workers AI, sem rede", () => {
  it("sem credenciais não há provedor", () => {
    expect(createWorkersAi(undefined, "t")).toBeNull();
    expect(createWorkersAi("c", undefined)).toBeNull();
  });

  it("usa o token só no cabeçalho, calcula neurônios e falha em erro HTTP", async () => {
    let url = "";
    let init: RequestInit | undefined;
    const provider = createWorkersAi("conta", "token-ficticio", (u, i) => {
      url = typeof u === "string" ? u : "";
      init = i;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            result: {
              choices: [{ message: { content: "{}" } }],
              usage: { prompt_tokens: 1_000_000, completion_tokens: 0 },
            },
          }),
        ),
      );
    });
    const answer = await provider?.complete("s", "u");
    expect(answer).toEqual({ content: "{}", neurons: 9_091 });
    expect(url).not.toContain("token-ficticio");
    expect(typeof init?.body === "string" ? init.body : "").not.toContain("token-ficticio");

    const failing = createWorkersAi("c", "t", () =>
      Promise.resolve(new Response("{}", { status: 500 })),
    );
    await expect(failing?.complete("s", "u")).rejects.toThrow("HTTP 500");
  });
});
