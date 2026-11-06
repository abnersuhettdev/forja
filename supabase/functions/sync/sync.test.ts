// Testes de contrato da função de sincronização contra o Supabase LOCAL (ADR-090), com o
// papel sync_writer de verdade: idempotência, conflito, dono divergente, NOT_FOUND, adiamento
// e as operações API-002, API-003 e API-007. Usuários fictícios criados e removidos aqui.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localStatus } from "../../../scripts/db/local.ts";
import { createUser } from "../../../scripts/ops/managers.ts";
import { createSyncDb, type SyncDb } from "./db.ts";
import { processDiagnostics } from "./diagnostics.ts";
import { HANDLERS } from "./operations.ts";
import { processRequest, type Identity, type OperationResult } from "./process.ts";

const status = localStatus();
const admin = postgres(status.DB_URL, { onnotice: () => undefined });
const syncUrl = /^SYNC_DB_URL=(.*)$/m
  .exec(readFileSync(new URL("../.env", import.meta.url), "utf8"))?.[1]
  ?.replace("db.supabase.internal:5432", new URL(status.DB_URL).host);
if (!syncUrl) throw new Error("Rode scripts/db/local-sync-role.ts antes dos testes.");
let db: SyncDb;

const NOW = new Date("2026-10-27T15:00:00Z");
const hash = (text: string) => Promise.resolve(createHash("sha256").update(text).digest("hex"));
const users: string[] = [];

/** Usuário fictício com papel de gestor (o próprio aluno na modalidade PES). */
async function fictitiousUser(withManager = true): Promise<Identity> {
  const userId = randomUUID();
  const email = `ficticio.${userId.slice(0, 8)}@exemplo.test`;
  await admin`insert into auth.users (id, email) values (${userId}, ${email})`;
  if (withManager) await admin`insert into public.managers (user_id) values (${userId})`;
  users.push(userId);
  return { userId, email };
}

function onboardingPayload(overrides: Record<string, unknown> = {}) {
  return {
    student: {
      full_name: "Pessoa Fictícia",
      birth_date: "1990-05-10",
      sex: "undisclosed",
      height_cm: 175,
      timezone: "America/Sao_Paulo",
    },
    profile: {
      goal: "hypertrophy",
      goal_weight_kg: 78,
      experience_level: "intermediate",
      activity_level: "moderate",
      days_per_week: 4,
      minutes_per_session: 60,
      preferred_weekdays: [1, 3, 5],
      training_location: "full_gym",
      equipment_codes: ["barbell", "dumbbell"],
      restrictions_declared: "none",
      restriction_codes: [],
      restrictions_note: null,
      preferences_note: null,
    },
    assessment_id: randomUUID(),
    weight_entry_id: randomUUID(),
    assessed_on: "2026-10-27",
    weight_kg: 82.5,
    ...overrides,
  };
}

interface Op {
  op_id?: string;
  owner_user_id: string;
  type: string;
  entity_id: string;
  base_revision?: number | null;
  payload: unknown;
}

async function send(identity: Identity, ops: Op[]): Promise<OperationResult[]> {
  const result = await processRequest(
    {
      contract_version: 1,
      device_id: randomUUID(),
      client_time: NOW.toISOString(),
      operations: ops.map((op) => ({
        op_id: op.op_id ?? randomUUID(),
        owner_user_id: op.owner_user_id,
        type: op.type,
        entity_id: op.entity_id,
        base_revision: op.base_revision ?? null,
        created_at: NOW.toISOString(),
        payload: op.payload,
      })),
    },
    identity,
    { db, hash, now: () => NOW },
  );
  if (result.status !== 200) throw new Error(`HTTP ${String(result.status)}`);
  return result.body.results;
}

async function onboard(identity: Identity): Promise<string> {
  const studentId = randomUUID();
  const [result] = await send(identity, [
    {
      owner_user_id: identity.userId,
      type: "onboarding.complete",
      entity_id: studentId,
      payload: onboardingPayload(),
    },
  ]);
  expect(result).toMatchObject({ status: "accepted", revision: 1 });
  return studentId;
}

beforeAll(() => {
  db = createSyncDb(syncUrl);
});

afterAll(async () => {
  await db.close();
  for (const id of users) {
    await admin`delete from public.students where user_id = ${id}`;
    await admin`delete from public.exercises where manager_id in (select id from public.managers where user_id = ${id})`;
    await admin`delete from public.managers where user_id = ${id}`;
    await admin`delete from auth.users where id = ${id}`;
  }
  await admin.end();
});

describe("onboarding.complete (API-002)", () => {
  it("cria aluno próprio, perfil, avaliação inicial, peso e descanso padrão", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const [student] = await admin`
      select s.is_self, s.user_id, s.email, s.onboarding_completed_at is not null as done,
             (select count(*)::int from public.assessments a where a.student_id = s.id and a.kind = 'initial') as assessments,
             (select weight_kg::float8 from public.weight_entries w where w.student_id = s.id) as weight,
             (select default_hours from public.rest_settings r where r.student_id = s.id) as rest
      from public.students s where s.id = ${studentId}`;
    expect(student).toEqual({
      is_self: true,
      user_id: me.userId,
      email: me.email,
      done: true,
      assessments: 1,
      weight: 82.5,
      rest: 48,
    });
  });

  it("recusa idade abaixo de 18 com o código do gatilho (RN-010)", async () => {
    const me = await fictitiousUser();
    const [result] = await send(me, [
      {
        owner_user_id: me.userId,
        type: "onboarding.complete",
        entity_id: randomUUID(),
        payload: onboardingPayload({
          student: { ...onboardingPayload().student, birth_date: "2010-01-01" },
        }),
      },
    ]);
    expect(result).toMatchObject({ status: "rejected", error: { code: "AGE_UNDER_18" } });
  });

  it("recusa avaliação com data futura (RN-048) e conteúdo inválido, apontando o campo", async () => {
    const me = await fictitiousUser();
    const [future, invalid] = await send(me, [
      {
        owner_user_id: me.userId,
        type: "onboarding.complete",
        entity_id: randomUUID(),
        payload: onboardingPayload({ assessed_on: "2026-10-29" }),
      },
      {
        owner_user_id: me.userId,
        type: "onboarding.complete",
        entity_id: randomUUID(),
        payload: onboardingPayload({ weight_kg: 12 }),
      },
    ]);
    expect(future).toMatchObject({
      status: "rejected",
      error: { code: "VALIDATION_FAILED", details: { field: "assessed_on" } },
    });
    expect(invalid).toMatchObject({
      status: "rejected",
      error: { code: "VALIDATION_FAILED", details: { field: "weight_kg" } },
    });
  });

  it("sem papel de gestão é recusado; configuração inicial não se repete", async () => {
    const noManager = await fictitiousUser(false);
    const [forbidden] = await send(noManager, [
      {
        owner_user_id: noManager.userId,
        type: "onboarding.complete",
        entity_id: randomUUID(),
        payload: onboardingPayload(),
      },
    ]);
    expect(forbidden).toMatchObject({ status: "rejected", error: { code: "FORBIDDEN_ROLE" } });

    const me = await fictitiousUser();
    await onboard(me);
    const [again] = await send(me, [
      {
        owner_user_id: me.userId,
        type: "onboarding.complete",
        entity_id: randomUUID(),
        payload: onboardingPayload(),
      },
    ]);
    expect(again).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });
  });
});

describe("idempotência (RN-042)", () => {
  it("três reenvios do mesmo op_id aplicam uma vez só", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const op: Op = {
      op_id: randomUUID(),
      owner_user_id: me.userId,
      type: "profile.update",
      entity_id: studentId,
      base_revision: 1,
      payload: { profile: { days_per_week: 5 } },
    };
    const first = await send(me, [op]);
    const second = await send(me, [op]);
    const third = await send(me, [op]);
    expect(first[0]).toMatchObject({ status: "accepted", revision: 2 });
    expect(second[0]).toMatchObject({ status: "duplicate", revision: 2 });
    expect(third[0]).toMatchObject({ status: "duplicate", revision: 2 });
    const [row] = await admin`
      select revision, (select count(*)::int from public.sync_operations where op_id = ${op.op_id ?? ""}) as ops
      from public.training_profiles where student_id = ${studentId}`;
    expect(row).toEqual({ revision: 2, ops: 1 });
  });

  it("recusa guardada também é devolvida no reenvio", async () => {
    const me = await fictitiousUser();
    const op: Op = {
      op_id: randomUUID(),
      owner_user_id: me.userId,
      type: "tipo.inexistente",
      entity_id: randomUUID(),
      payload: {},
    };
    const [first] = await send(me, [op]);
    const [again] = await send(me, [op]);
    expect(first).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });
    expect(again).toEqual(first);
  });

  it("op_id já usado por outro usuário é recusado sem revelar o motivo", async () => {
    const a = await fictitiousUser();
    const b = await fictitiousUser();
    const studentA = await onboard(a);
    const studentB = await onboard(b);
    const opId = randomUUID();
    await send(a, [
      {
        op_id: opId,
        owner_user_id: a.userId,
        type: "profile.update",
        entity_id: studentA,
        base_revision: 1,
        payload: { profile: { goal: "strength" } },
      },
    ]);
    const [stolen] = await send(b, [
      {
        op_id: opId,
        owner_user_id: b.userId,
        type: "profile.update",
        entity_id: studentB,
        base_revision: 1,
        payload: { profile: { goal: "strength" } },
      },
    ]);
    expect(stolen).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });
    const [profileB] = await admin`
      select goal, revision from public.training_profiles where student_id = ${studentB}`;
    expect(profileB).toEqual({ goal: "hypertrophy", revision: 1 });
  });
});

describe("isolamento e dono (ADR-028 L4, RN-001)", () => {
  it("dono divergente é recusado e auditado sem dados pessoais (T-PWA-15)", async () => {
    const me = await fictitiousUser();
    const other = await fictitiousUser();
    const before = await admin<{ n: number }[]>`select count(*)::int as n from public.audit_events`;
    const [result] = await send(me, [
      {
        owner_user_id: other.userId,
        type: "profile.update",
        entity_id: randomUUID(),
        payload: {},
      },
    ]);
    expect(result).toMatchObject({ status: "rejected", error: { code: "OWNER_MISMATCH" } });
    const [event] = await admin`
      select event_type, subject_hash, details from public.audit_events
      order by occurred_at desc limit 1`;
    expect(event).toEqual({
      event_type: "sync.owner_mismatch",
      subject_hash: createHash("sha256").update(me.userId).digest("hex"),
      details: { op_type: "profile.update" },
    });
    const after = await admin<{ n: number }[]>`select count(*)::int as n from public.audit_events`;
    expect(after[0]?.n).toBe((before[0]?.n ?? 0) + 1);
  });

  it("registro de outro aluno responde NOT_FOUND, como se não existisse", async () => {
    const a = await fictitiousUser();
    const b = await fictitiousUser();
    const studentB = await onboard(b);
    const results = await send(a, [
      {
        owner_user_id: a.userId,
        type: "profile.update",
        entity_id: studentB,
        base_revision: 1,
        payload: { profile: { goal: "strength" } },
      },
      {
        owner_user_id: a.userId,
        type: "rest.update",
        entity_id: randomUUID(),
        base_revision: 1,
        payload: { default_hours: 24, overrides: [] },
      },
    ]);
    expect(results.map((r) => (r.status === "rejected" ? r.error.code : r.status))).toEqual([
      "NOT_FOUND",
      "NOT_FOUND",
    ]);
    const [profileB] = await admin`
      select goal from public.training_profiles where student_id = ${studentB}`;
    expect(profileB?.goal).toBe("hypertrophy");
  });
});

describe("revisões e conflitos (ADR-053, RN-046)", () => {
  it("profile.update aceita na revisão atual e devolve conflito com o registro do servidor", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const update = (base: number, payload: unknown) =>
      send(me, [
        {
          owner_user_id: me.userId,
          type: "profile.update",
          entity_id: studentId,
          base_revision: base,
          payload,
        },
      ]);
    const [ok] = await update(1, {
      student: { full_name: "Nome Novo" },
      profile: { goal: "strength" },
    });
    expect(ok).toMatchObject({ status: "accepted", revision: 2 });
    const [stale] = await update(1, { profile: { goal: "maintenance" } });
    expect(stale).toMatchObject({
      status: "conflict",
      error: { code: "REVISION_CONFLICT" },
      server_record: { revision: 2, goal: "strength", goal_weight_kg: 78 },
    });
    const [missingBase] = await send(me, [
      {
        owner_user_id: me.userId,
        type: "profile.update",
        entity_id: studentId,
        payload: { profile: {} },
      },
    ]);
    expect(missingBase).toMatchObject({
      status: "rejected",
      error: { details: { field: "base_revision" } },
    });
    const [row] = await admin`
      select s.full_name, p.goal from public.students s
      join public.training_profiles p on p.student_id = s.id where s.id = ${studentId}`;
    expect(row).toEqual({ full_name: "Nome Novo", goal: "strength" });
  });

  it("rest.update substitui os ajustes por grupo e detecta conflito", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const rest = (base: number, payload: unknown) =>
      send(me, [
        {
          owner_user_id: me.userId,
          type: "rest.update",
          entity_id: studentId,
          base_revision: base,
          payload,
        },
      ]);
    const [first] = await rest(1, {
      default_hours: 36,
      overrides: [
        { muscle_group_code: "quadriceps", hours: 72 },
        { muscle_group_code: "chest", hours: 48 },
      ],
    });
    expect(first).toMatchObject({ status: "accepted", revision: 2 });
    const [second] = await rest(2, {
      default_hours: 36,
      overrides: [{ muscle_group_code: "quadriceps", hours: 60 }],
    });
    expect(second).toMatchObject({ status: "accepted", revision: 3 });
    const overrides = await admin`
      select muscle_group_code, hours from public.rest_overrides where student_id = ${studentId}`;
    expect([...overrides]).toEqual([{ muscle_group_code: "quadriceps", hours: 60 }]);
    const [stale] = await rest(2, { default_hours: 12, overrides: [] });
    expect(stale).toMatchObject({
      status: "conflict",
      server_record: {
        default_hours: 36,
        revision: 3,
        overrides: [{ muscle_group_code: "quadriceps", hours: 60 }],
      },
    });
  });
});

describe("ordem e dependências (DAD-04 §4.2)", () => {
  it("operação seguinte do mesmo registro é adiada quando a anterior não foi aceita", async () => {
    const me = await fictitiousUser();
    const studentId = randomUUID();
    const results = await send(me, [
      {
        owner_user_id: me.userId,
        type: "onboarding.complete",
        entity_id: studentId,
        payload: onboardingPayload({ weight_kg: 5 }),
      },
      {
        owner_user_id: me.userId,
        type: "profile.update",
        entity_id: studentId,
        base_revision: 1,
        payload: { profile: { goal: "strength" } },
      },
    ]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "deferred"]);
    expect(results[1]).toMatchObject({ error: { code: "DEPENDENCY_PENDING" } });
  });

  it("requisição fora do contrato recebe 400", async () => {
    const me = await fictitiousUser();
    const result = await processRequest({ contract_version: 99, operations: [] }, me, {
      db,
      hash,
    });
    expect(result.status).toBe(400);
  });
});

describe("pela função HTTP (VH-12: conexão com o papel próprio)", () => {
  it("token válido grava pela função; sem token, 401", async () => {
    const env = Object.fromEntries(
      readFileSync(new URL("../../../apps/web/.env.development.local", import.meta.url), "utf8")
        .split("\n")
        .filter((line) => line.includes("=") && !line.startsWith("#"))
        .map((line) => line.split(/=(.*)/s).slice(0, 2)),
    ) as Record<string, string>;
    const url = env.VITE_SUPABASE_URL ?? "";
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
    const password = "Ficticia-http-forja-01";
    const email = `ficticio.http.${randomUUID().slice(0, 8)}@exemplo.test`;
    const created = await createUser({ url, serviceKey: status.SERVICE_ROLE_KEY }, email, password);
    users.push(created.id);
    await admin`insert into public.managers (user_id) values (${created.id})`;
    const me: Identity = { userId: created.id, email };
    const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: me.email, password }),
    });
    const { access_token: token } = (await login.json()) as { access_token: string };
    const studentId = randomUUID();
    const response = await fetch(`${url}/functions/v1/sync`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contract_version: 1,
        device_id: randomUUID(),
        client_time: new Date().toISOString(),
        operations: [
          {
            op_id: randomUUID(),
            owner_user_id: me.userId,
            type: "onboarding.complete",
            entity_id: studentId,
            base_revision: null,
            created_at: new Date().toISOString(),
            payload: onboardingPayload({ assessed_on: "2026-10-01" }),
          },
        ],
      }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as { results: OperationResult[] };
    expect(body.results[0]).toMatchObject({ status: "accepted", entity_id: studentId });
    // API-030 pela mesma função.
    const diagnostics = await fetch(`${url}/functions/v1/sync/diagnostics`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_version: "0.1.0",
        error_code: "UNEXPECTED",
        context: "/hoje",
        platform: "desktop",
      }),
    });
    expect(diagnostics.status).toBe(202);
    const unauthorized = await fetch(`${url}/functions/v1/sync`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(unauthorized.status).toBe(401);
  });
});

describe("exercício personalizado (API-020, RF-032)", () => {
  const exercisePayload = (overrides: Record<string, unknown> = {}) => ({
    name: `Exercício fictício ${randomUUID().slice(0, 6)}`,
    primary_muscles: ["quadriceps"],
    secondary_muscles: ["glutes"],
    equipment: ["dumbbell", "bench"],
    difficulty: "beginner",
    measure_type: "reps",
    movement_pattern: "lunge",
    instructions: ["Primeiro passo do exercício.", "Segundo passo do exercício."],
    safety_tips: ["Uma dica de segurança."],
    ...overrides,
  });

  it("cria personalizado do gestor com classificação, e edita substituindo tudo", async () => {
    const me = await fictitiousUser();
    const id = randomUUID();
    const payload = exercisePayload();
    const [created] = await send(me, [
      { owner_user_id: me.userId, type: "exercise.create", entity_id: id, payload },
    ]);
    expect(created).toMatchObject({ status: "accepted", entity_id: id });
    const [updated] = await send(me, [
      {
        owner_user_id: me.userId,
        type: "exercise.update",
        entity_id: id,
        payload: exercisePayload({
          name: payload.name,
          primary_muscles: ["glutes"],
          secondary_muscles: [],
          equipment: ["bodyweight"],
          instructions: ["Passo único revisado."],
        }),
      },
    ]);
    expect(updated).toMatchObject({ status: "accepted" });
    const [row] = await admin`
      select e.origin, e.is_bodyweight, e.instructions, m.user_id = ${me.userId} as mine,
             (select array_agg(muscle_group_code || ':' || role order by muscle_group_code)
                from public.exercise_muscles where exercise_id = e.id) as muscles,
             (select array_agg(equipment_code) from public.exercise_equipment where exercise_id = e.id) as equipment
      from public.exercises e join public.managers m on m.id = e.manager_id
      where e.id = ${id}`;
    expect(row).toEqual({
      origin: "custom",
      is_bodyweight: true,
      instructions: ["Passo único revisado."],
      mine: true,
      muscles: ["glutes:primary"],
      equipment: ["bodyweight"],
    });
  });

  it("nome já usado por exercício visível (inclusive importado) é recusado com NAME_TAKEN", async () => {
    const me = await fictitiousUser();
    const results = await send(me, [
      {
        owner_user_id: me.userId,
        type: "exercise.create",
        entity_id: randomUUID(),
        payload: exercisePayload({ name: "supino RETO com barra" }),
      },
    ]);
    expect(results[0]).toMatchObject({ status: "rejected", error: { code: "NAME_TAKEN" } });
  });

  it("outro gestor não edita nem vê; importado não aceita campos de personalizado", async () => {
    const owner = await fictitiousUser();
    const intruder = await fictitiousUser();
    const id = randomUUID();
    await send(owner, [
      {
        owner_user_id: owner.userId,
        type: "exercise.create",
        entity_id: id,
        payload: exercisePayload(),
      },
    ]);
    const [foreign] = await send(intruder, [
      {
        owner_user_id: intruder.userId,
        type: "exercise.update",
        entity_id: id,
        payload: exercisePayload({ name: "Tomado" }),
      },
    ]);
    expect(foreign).toMatchObject({ status: "rejected", error: { code: "NOT_FOUND" } });
    const [imported] = await admin<{ id: string }[]>`
      select id from public.exercises where origin = 'imported' limit 1`;
    const [onImported] = await send(owner, [
      {
        owner_user_id: owner.userId,
        type: "exercise.update",
        entity_id: imported?.id ?? "",
        payload: exercisePayload(),
      },
    ]);
    // Em importado só nome, instruções e dicas (ADR-091): o restante é recusado na validação.
    expect(onImported).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });
  });

  it("conteúdo inválido aponta o campo; sem papel de gestão é recusado", async () => {
    const me = await fictitiousUser();
    const [invalid] = await send(me, [
      {
        owner_user_id: me.userId,
        type: "exercise.create",
        entity_id: randomUUID(),
        payload: exercisePayload({ primary_muscles: [] }),
      },
    ]);
    expect(invalid).toMatchObject({
      status: "rejected",
      error: { code: "VALIDATION_FAILED", details: { field: "primary_muscles" } },
    });
    const noManager = await fictitiousUser(false);
    const [forbidden] = await send(noManager, [
      {
        owner_user_id: noManager.userId,
        type: "exercise.create",
        entity_id: randomUUID(),
        payload: exercisePayload(),
      },
    ]);
    expect(forbidden).toMatchObject({ status: "rejected", error: { code: "FORBIDDEN_ROLE" } });
  });
});

describe("correção de importado (API-020, ADR-091)", () => {
  /** Exercício importado usado só por este bloco; restaurado ao fim. */
  async function pickImported(): Promise<{ id: string; name: string; instructions: string[] }> {
    const [row] = await admin<{ id: string; name: string; instructions: string[] }[]>`
      select id, name, instructions from public.exercises
      where origin = 'imported' and source_ref = 'Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench'
      limit 1`;
    if (!row) throw new Error("exercício importado de teste ausente");
    return row;
  }

  async function restore(id: string) {
    await admin`
      update public.exercises set
        name = coalesce(original_text ->> 'name', name),
        instructions = coalesce(original_text -> 'instructions', instructions),
        safety_tips = coalesce(original_text -> 'safety_tips', safety_tips),
        original_text = null, edited_by_manager_at = null
      where id = ${id}`;
  }

  const correction = (name: string) => ({
    name,
    instructions: ["Passo corrigido pelo gestor."],
    safety_tips: ["Dica corrigida."],
  });

  it("corrige nome, instruções e dicas e preserva o texto original da fonte", async () => {
    const me = await fictitiousUser();
    const target = await pickImported();
    try {
      const fix = (name: string) =>
        send(me, [
          {
            owner_user_id: me.userId,
            type: "exercise.update",
            entity_id: target.id,
            payload: correction(name),
          },
        ]);
      expect((await fix("Rosca de punho inversa (corrigida)"))[0]).toMatchObject({
        status: "accepted",
      });
      expect((await fix("Rosca de punho inversa (2ª correção)"))[0]).toMatchObject({
        status: "accepted",
      });
      const [row] = await admin`
        select name, instructions, original_text, edited_by_manager_at is not null as edited,
               difficulty, origin
        from public.exercises where id = ${target.id}`;
      expect(row).toMatchObject({
        name: "Rosca de punho inversa (2ª correção)",
        instructions: ["Passo corrigido pelo gestor."],
        edited: true,
        origin: "imported",
        // O original é o da fonte, não o da primeira correção.
        original_text: { name: target.name, instructions: target.instructions },
      });
    } finally {
      await restore(target.id);
    }
  });

  it("com GATE-TER aberto, ou sem papel de gestão, a correção é recusada", async () => {
    const target = await pickImported();
    const manager = await fictitiousUser();
    const noManager = await fictitiousUser(false);
    const op = (who: Identity) => ({
      owner_user_id: who.userId,
      type: "exercise.update",
      entity_id: target.id,
      payload: correction("Não deveria mudar"),
    });
    try {
      expect((await send(noManager, [op(noManager)]))[0]).toMatchObject({
        status: "rejected",
        error: { code: "FORBIDDEN_ROLE" },
      });
      await admin`update public.system_settings set value = 'true'::jsonb where key = 'ter_enabled'`;
      expect((await send(manager, [op(manager)]))[0]).toMatchObject({
        status: "rejected",
        error: { code: "FORBIDDEN_ROLE" },
      });
    } finally {
      await admin`update public.system_settings set value = 'false'::jsonb where key = 'ter_enabled'`;
      await restore(target.id);
    }
    const [row] = await admin`select name from public.exercises where id = ${target.id}`;
    expect(row?.name).toBe(target.name);
  });
});

describe("programas (API-016..019; CA-020, CA-025, CA-027, CA-028)", () => {
  async function exerciseId(sourceRef: string): Promise<string> {
    const [row] = await admin<{ id: string }[]>`
      select id from public.exercises where source_ref = ${sourceRef}`;
    if (!row) throw new Error(`exercício ${sourceRef} ausente`);
    return row.id;
  }

  function documentWith(exercise: string, workoutNames: string[]) {
    return {
      name: "Programa fictício",
      split_type: "ab",
      workouts: workoutNames.map((name, index) => ({
        id: randomUUID(),
        position: index + 1,
        name,
        items:
          name === "Vazio"
            ? []
            : [
                {
                  id: randomUUID(),
                  position: 1,
                  exercise_id: exercise,
                  measure_type: "reps",
                  sets: 3,
                  reps_min: 8,
                  reps_max: 12,
                  duration_s: null,
                  rest_s: 90,
                  suggested_load_kg: 40,
                  notes: null,
                },
              ],
      })),
    };
  }

  const op = (who: Identity, type: string, entity: string, base: number | null, payload: unknown) =>
    send(who, [
      { owner_user_id: who.userId, type, entity_id: entity, base_revision: base, payload },
    ]);

  it("cria, salva, recusa publicação com pendências, publica, copia e descarta", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const squat = await exerciseId("Barbell_Squat");
    const v1 = randomUUID();

    // API-016: rascunho vazio; um segundo rascunho é recusado (RN-003).
    expect(
      (await op(me, "draft.create", v1, null, { student_id: studentId, source: "empty" }))[0],
    ).toMatchObject({ status: "accepted", revision: 1 });
    expect(
      (
        await op(me, "draft.create", randomUUID(), null, { student_id: studentId, source: "empty" })
      )[0],
    ).toMatchObject({ status: "rejected", error: { code: "DRAFT_ALREADY_EXISTS" } });

    // API-017: documento com um treino vazio; revisão desatualizada gera conflito.
    const withEmpty = documentWith(squat, ["Treino A", "Vazio"]);
    expect((await op(me, "draft.save", v1, 1, withEmpty))[0]).toMatchObject({
      status: "accepted",
      revision: 2,
    });
    expect((await op(me, "draft.save", v1, 1, withEmpty))[0]).toMatchObject({
      status: "conflict",
      error: { code: "REVISION_CONFLICT" },
    });

    // API-018: pendências listadas (RN-035).
    const [invalid] = await op(me, "draft.publish", v1, 2, {});
    expect(invalid).toMatchObject({
      status: "rejected",
      error: {
        code: "DRAFT_INVALID",
        details: { issues: [{ code: "empty_workout", workout_name: "Vazio" }] },
      },
    });

    const valid = documentWith(squat, ["Treino A", "Treino B"]);
    expect((await op(me, "draft.save", v1, 2, valid))[0]).toMatchObject({ revision: 3 });
    expect((await op(me, "draft.publish", v1, 3, {}))[0]).toMatchObject({ status: "accepted" });

    // RF-027: rascunho idêntico a partir da versão ativa, sem alterá-la.
    const v2 = randomUUID();
    expect(
      (
        await op(me, "draft.create", v2, null, {
          student_id: studentId,
          source: "from_version",
          from_version_id: v1,
        })
      )[0],
    ).toMatchObject({ status: "accepted" });
    const copies = await admin<
      {
        id: string;
        status: string;
        created_from_version_id: string | null;
        workouts: number;
        items: number;
      }[]
    >`
      select v.id, v.status, v.created_from_version_id,
             (select count(*)::int from public.workouts w where w.program_version_id = v.id) as workouts,
             (select count(*)::int from public.workout_items i
                join public.workouts w on w.id = i.workout_id where w.program_version_id = v.id) as items
      from public.program_versions v where v.student_id = ${studentId} order by v.created_at`;
    expect(copies.map((r) => [r.status, r.workouts, r.items])).toEqual([
      ["active", 2, 2],
      ["draft", 2, 2],
    ]);
    expect(copies[1]?.created_from_version_id).toBe(v1);

    // RF-028: descartar remove o rascunho e mantém a ativa.
    expect((await op(me, "draft.discard", v2, 1, {}))[0]).toMatchObject({ status: "accepted" });
    const remaining = await admin<{ status: string }[]>`
      select status from public.program_versions where student_id = ${studentId}`;
    expect(remaining.map((r) => r.status)).toEqual(["active"]);
  });

  it("publicar de novo arquiva a anterior; versão publicada não aceita edição (RN-004)", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const squat = await exerciseId("Barbell_Squat");
    const doc = documentWith(squat, ["Treino A"]);
    const v1 = randomUUID();
    await op(me, "draft.create", v1, null, { student_id: studentId, source: "empty" });
    await op(me, "draft.save", v1, 1, doc);
    await op(me, "draft.publish", v1, 2, {});
    const [onPublished] = await op(me, "draft.save", v1, 3, doc);
    expect(onPublished).toMatchObject({ status: "conflict", error: { code: "ENTITY_DELETED" } });

    const v2 = randomUUID();
    await op(me, "draft.create", v2, null, { student_id: studentId, source: "empty" });
    await op(me, "draft.save", v2, 1, documentWith(squat, ["Novo A"]));
    await op(me, "draft.publish", v2, 2, {});
    const versions = await admin<{ status: string; version_number: number }[]>`
      select status, version_number from public.program_versions
      where student_id = ${studentId} order by version_number`;
    expect(versions.map((r) => [r.status, r.version_number])).toEqual([
      ["archived", 1],
      ["active", 2],
    ]);
  });

  it("exercício desativado, aluno de outro gestor e conteúdo inválido são recusados", async () => {
    const me = await fictitiousUser();
    const other = await fictitiousUser();
    const studentId = await onboard(me);
    const otherStudent = await onboard(other);
    const squat = await exerciseId("Barbell_Squat");
    const v1 = randomUUID();
    await op(me, "draft.create", v1, null, { student_id: studentId, source: "empty" });

    await admin`update public.exercises set active = false where source_ref = 'Plank'`;
    try {
      const plank = await exerciseId("Plank");
      const [inactive] = await op(me, "draft.save", v1, 1, documentWith(plank, ["A"]));
      expect(inactive).toMatchObject({ status: "rejected", error: { code: "EXERCISE_INACTIVE" } });
    } finally {
      await admin`update public.exercises set active = true where source_ref = 'Plank'`;
    }

    const [foreign] = await op(me, "draft.create", randomUUID(), null, {
      student_id: otherStudent,
      source: "empty",
    });
    expect(foreign).toMatchObject({ status: "rejected", error: { code: "FORBIDDEN_ROLE" } });

    const bad = documentWith(squat, ["A"]);
    const [invalid] = await op(me, "draft.save", v1, 1, {
      ...bad,
      workouts: [{ ...bad.workouts[0], items: [{ ...bad.workouts[0]?.items[0], reps_min: 15 }] }],
    });
    expect(invalid).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });
  });
});

describe("avaliação (API-004, CA-016)", () => {
  it("registra avaliação, peso de origem avaliação e fotografia do perfil", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const assessmentId = randomUUID();
    const weightId = randomUUID();
    const [result] = await send(me, [
      {
        owner_user_id: me.userId,
        type: "assessment.create",
        entity_id: assessmentId,
        payload: {
          student_id: studentId,
          assessed_on: "2026-10-26",
          weight_kg: 80.2,
          notes: "Avaliação fictícia.",
          weight_entry_id: weightId,
        },
      },
    ]);
    expect(result).toMatchObject({ status: "accepted" });
    const [row] = await admin`
      select a.kind, a.weight_kg::float8 as weight, a.profile_snapshot ->> 'goal' as goal,
             w.source, w.assessment_id = a.id as linked
      from public.assessments a join public.weight_entries w on w.id = ${weightId}
      where a.id = ${assessmentId}`;
    expect(row).toEqual({
      kind: "periodic",
      weight: 80.2,
      goal: "hypertrophy",
      source: "assessment",
      linked: true,
    });
  });

  it("data futura e aluno de outro usuário são recusados", async () => {
    const me = await fictitiousUser();
    const other = await fictitiousUser();
    const studentId = await onboard(me);
    const otherStudent = await onboard(other);
    const payload = (student: string, date: string) => ({
      student_id: student,
      assessed_on: date,
      weight_kg: 80,
      notes: null,
      weight_entry_id: randomUUID(),
    });
    const results = await send(me, [
      {
        owner_user_id: me.userId,
        type: "assessment.create",
        entity_id: randomUUID(),
        payload: payload(studentId, "2026-10-30"),
      },
      {
        owner_user_id: me.userId,
        type: "assessment.create",
        entity_id: randomUUID(),
        payload: payload(otherStudent, "2026-10-26"),
      },
    ]);
    expect(results.map((r) => (r.status === "rejected" ? r.error.code : r.status))).toEqual([
      "VALIDATION_FAILED",
      "NOT_FOUND",
    ]);
  });
});

describe("reavaliação (API-022, CA-084, CA-085)", () => {
  it("adiar registra o adiamento e a data; a avaliação seguinte limpa a data", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const postponeId = randomUUID();
    const postpone = (id: string, date: string) => ({
      owner_user_id: me.userId,
      type: "reassessment.postpone",
      entity_id: id,
      payload: { postpone_to: date },
    });
    const results = await send(me, [
      postpone(postponeId, "2026-11-03"),
      postpone(randomUUID(), "2026-11-10"),
      postpone(randomUUID(), "2026-10-27"),
    ]);
    expect(results.map((r) => (r.status === "rejected" ? r.error.code : r.status))).toEqual([
      "accepted",
      "accepted",
      "VALIDATION_FAILED",
    ]);
    const rows = await admin<{ postponed_from: string; postponed_to: string }[]>`
      select postponed_from::text, postponed_to::text from public.reassessment_postponements
      where student_id = ${studentId} order by postponed_to`;
    expect(rows).toEqual([
      { postponed_from: "2026-10-27", postponed_to: "2026-11-03" },
      { postponed_from: "2026-10-27", postponed_to: "2026-11-10" },
    ]);
    const snooze = () => admin<{ snooze: string | null }[]>`
      select reassessment_snooze_until::text as snooze from public.training_profiles
      where student_id = ${studentId}`;
    expect(await snooze()).toEqual([{ snooze: "2026-11-10" }]);

    await send(me, [
      {
        owner_user_id: me.userId,
        type: "assessment.create",
        entity_id: randomUUID(),
        payload: {
          student_id: studentId,
          assessed_on: "2026-10-27",
          weight_kg: 80,
          notes: null,
          weight_entry_id: randomUUID(),
        },
      },
    ]);
    expect(await snooze()).toEqual([{ snooze: null }]);
  });
});

describe("execução (API-008..014; CA-060, CA-063, CA-065, CA-067)", () => {
  /** Programa publicado direto no banco: treino com supino e agachamento. */
  async function publishedWorkout(studentId: string) {
    const [bench] = await admin<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Bench_Press_-_Medium_Grip'`;
    const [squat] = await admin<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Squat'`;
    if (!bench || !squat) throw new Error("exercícios ausentes");
    const programId = randomUUID();
    const versionId = randomUUID();
    const workoutId = randomUUID();
    const items = [randomUUID(), randomUUID()];
    await admin`insert into public.programs (id, student_id) values (${programId}, ${studentId})`;
    await admin`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${studentId}, 'Programa fictício')`;
    await admin`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await admin`
      insert into public.workout_items
        (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
      values (${items[0] ?? ""}, ${workoutId}, 1, ${bench.id}, 'reps', 3, 8, 12, 90),
             (${items[1] ?? ""}, ${workoutId}, 2, ${squat.id}, 'reps', 3, 8, 12, 90)`;
    await admin`update public.program_versions set status = 'active' where id = ${versionId}`;
    return { versionId, workoutId, items, exercises: [bench.id, squat.id] };
  }

  type Workout = Awaited<ReturnType<typeof publishedWorkout>>;

  function startOp(who: Identity, sessionId: string, w: Workout, startedAt: string) {
    const exercises = w.items.map((item, index) => ({
      id: randomUUID(),
      workout_item_id: item,
      exercise_id: w.exercises[index] ?? "",
      position: index + 1,
    }));
    const op: Op = {
      owner_user_id: who.userId,
      type: "session.start",
      entity_id: sessionId,
      payload: {
        program_version_id: w.versionId,
        workout_id: w.workoutId,
        started_at: startedAt,
        exercises,
      },
    };
    return { exercises, op };
  }

  function setOp(
    who: Identity,
    setId: string,
    seId: string,
    n: number,
    load: number,
    base: number | null = null,
  ): Op {
    return {
      owner_user_id: who.userId,
      type: "set.upsert",
      entity_id: setId,
      base_revision: base,
      payload: {
        session_exercise_id: seId,
        set_number: n,
        load_kg: load,
        reps: 10,
        duration_s: null,
        completed_at: new Date(NOW.getTime() - (10 - n) * 60_000).toISOString(),
      },
    };
  }

  function plain(
    who: Identity,
    type: string,
    entity: string,
    base: number | null,
    payload: unknown = {},
  ): Op {
    return { owner_user_id: who.userId, type, entity_id: entity, base_revision: base, payload };
  }

  const completion = (endedAt: string, minutes: number, rpe: number | null = null) => ({
    ended_at: endedAt,
    duration_min: minutes,
    rpe,
    notes: null,
  });

  it("inicia, registra, corrige, pula, conclui; última execução e exclusão com limpeza", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const w = await publishedWorkout(studentId);
    const sessionId = randomUUID();
    const started = new Date(NOW.getTime() - 60 * 60_000).toISOString();
    const { op, exercises } = startOp(me, sessionId, w, started);
    const benchSe = exercises[0]?.id ?? "";
    const squatSe = exercises[1]?.id ?? "";
    const set1 = randomUUID();
    const set2 = randomUUID();

    const results = await send(me, [
      op,
      setOp(me, set1, benchSe, 1, 40),
      setOp(me, set2, benchSe, 2, 42.5),
      setOp(me, set2, benchSe, 2, 45, 1),
      plain(me, "session_exercise.update", squatSe, 1, { status: "skipped" }),
      plain(me, "session.complete", sessionId, 1, {
        ...completion(NOW.toISOString(), 60, 7),
        notes: "Treino fictício",
      }),
    ]);
    expect(results.map((r) => r.status)).toEqual(Array(6).fill("accepted"));
    // Séries não mudam a revisão da sessão: a conclusão usa a base 1.
    expect(results[3]).toMatchObject({ revision: 2 });
    expect(results[5]).toMatchObject({ revision: 2 });

    const [session] = await admin`
      select status, rpe, duration_min, clock_suspect, possible_duplicate_of
      from public.sessions where id = ${sessionId}`;
    expect(session).toMatchObject({
      status: "completed",
      rpe: 7,
      duration_min: 60,
      clock_suspect: false,
      possible_duplicate_of: null,
    });
    const [skipped] =
      await admin`select status from public.session_exercises where id = ${squatSe}`;
    expect(skipped?.status).toBe("skipped");

    // API-R07 pela visão, com as políticas do próprio aluno.
    const last = await admin.begin(async (tx) => {
      await tx`set local role authenticated`;
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: me.userId })}, true)`;
      return tx`select exercise_id, sets from public.last_executions where student_id = ${studentId}`;
    });
    expect(last).toHaveLength(1);
    expect(last[0]?.sets).toEqual([
      { set_number: 1, load_kg: 40, reps: 10, duration_s: null },
      { set_number: 2, load_kg: 45, reps: 10, duration_s: null },
    ]);

    // Depois de concluída: série vira marca de exclusão sem valores (TG-07); PSE editável.
    const after = await send(me, [
      plain(me, "set.delete", set1, 1),
      plain(me, "session.update", sessionId, 2, { rpe: 8 }),
    ]);
    expect(after.map((r) => r.status)).toEqual(["accepted", "accepted"]);
    const [deletedSet] = await admin`
      select deleted_at, load_kg, reps from public.set_logs where id = ${set1}`;
    expect(deletedSet?.deleted_at).not.toBeNull();
    expect(deletedSet).toMatchObject({ load_kg: null, reps: null });

    // Revisão desatualizada → conflito com o registro do servidor.
    const [stale] = await send(me, [plain(me, "session.update", sessionId, 2, { rpe: 5 })]);
    expect(stale).toMatchObject({ status: "conflict", error: { code: "REVISION_CONFLICT" } });

    const [removed] = await send(me, [plain(me, "session.delete", sessionId, 3)]);
    expect(removed).toMatchObject({ status: "accepted", revision: 4 });
    const [gone] = await admin`select notes, rpe from public.sessions where id = ${sessionId}`;
    expect(gone).toMatchObject({ notes: null, rpe: null });
    const [{ count } = { count: -1 }] = await admin<{ count: number }[]>`
      select count(*)::int as count from public.set_logs l
      join public.session_exercises se on se.id = l.session_exercise_id
      where se.session_id = ${sessionId} and l.deleted_at is null`;
    expect(count).toBe(0);
  });

  it("descartar em andamento remove sessão e séries; desfazer série remove de fato", async () => {
    const me = await fictitiousUser();
    const w = await publishedWorkout(await onboard(me));
    const sessionId = randomUUID();
    const started = new Date(NOW.getTime() - 600_000).toISOString();
    const { op, exercises } = startOp(me, sessionId, w, started);
    const setId = randomUUID();
    const seId = exercises[0]?.id ?? "";
    const results = await send(me, [
      op,
      setOp(me, setId, seId, 1, 40),
      plain(me, "set.delete", setId, 1),
      setOp(me, randomUUID(), seId, 1, 42.5),
      plain(me, "session.delete", sessionId, 1),
    ]);
    expect(results.map((r) => r.status)).toEqual(Array(5).fill("accepted"));
    expect(await admin`select id from public.sessions where id = ${sessionId}`).toHaveLength(0);
    expect(await admin`select id from public.set_logs where id = ${setId}`).toHaveLength(0);
  });

  it("versão de outro aluno é recusada e as séries seguintes aguardam", async () => {
    const me = await fictitiousUser();
    await onboard(me);
    const other = await fictitiousUser();
    const w = await publishedWorkout(await onboard(other));
    const { op, exercises } = startOp(me, randomUUID(), w, NOW.toISOString());
    const [start, set] = await send(me, [
      op,
      setOp(me, randomUUID(), exercises[0]?.id ?? "", 1, 40),
    ]);
    expect(start).toMatchObject({ status: "rejected", error: { code: "VERSION_NOT_AVAILABLE" } });
    expect(set).toMatchObject({ status: "deferred", error: { code: "DEPENDENCY_PENDING" } });
  });

  it("sobreposição marca possível duplicidade; horário futuro marca suspeita (RN-045, RN-048)", async () => {
    const me = await fictitiousUser();
    const w = await publishedWorkout(await onboard(me));
    const first = randomUUID();
    const second = randomUUID();
    const future = randomUUID();
    const a = startOp(me, first, w, new Date(NOW.getTime() - 30 * 60_000).toISOString());
    const b = startOp(me, second, w, new Date(NOW.getTime() - 20 * 60_000).toISOString());
    const c = startOp(me, future, w, new Date(NOW.getTime() + 3_600_000).toISOString());
    const results = await send(me, [
      a.op,
      plain(me, "session.complete", first, 1, completion(NOW.toISOString(), 30)),
      b.op,
      c.op,
    ]);
    expect(results.map((r) => r.status)).toEqual(Array(4).fill("accepted"));
    const [dup] =
      await admin`select possible_duplicate_of from public.sessions where id = ${second}`;
    expect(dup?.possible_duplicate_of).toBe(first);
    const [suspect] = await admin`select clock_suspect from public.sessions where id = ${future}`;
    expect(suspect?.clock_suspect).toBe(true);
  });

  it("janela de 60 dias: sessão antiga criada offline é aceita; editar depois é recusado", async () => {
    const me = await fictitiousUser();
    const w = await publishedWorkout(await onboard(me));
    const sessionId = randomUUID();
    const old = new Date(Date.now() - 70 * 86_400_000);
    const { op, exercises } = startOp(me, sessionId, w, old.toISOString());
    const results = await send(me, [
      op,
      setOp(me, randomUUID(), exercises[0]?.id ?? "", 1, 40),
      plain(
        me,
        "session.complete",
        sessionId,
        1,
        completion(new Date(old.getTime() + 3_600_000).toISOString(), 60),
      ),
    ]);
    expect(results.map((r) => r.status)).toEqual(Array(3).fill("accepted"));
    const [edit] = await send(me, [plain(me, "session.update", sessionId, 2, { rpe: 6 })]);
    expect(edit).toMatchObject({ status: "rejected", error: { code: "EDIT_WINDOW_EXPIRED" } });
  });

  it("conteúdo inválido, base ausente, término antes do início e registro inexistente", async () => {
    const me = await fictitiousUser();
    const w = await publishedWorkout(await onboard(me));
    const sessionId = randomUUID();
    const { op, exercises } = startOp(me, sessionId, w, NOW.toISOString());
    const seId = exercises[0]?.id ?? "";
    const before = new Date(NOW.getTime() - 3_600_000).toISOString();
    const [, bad, noBase] = await send(me, [
      op,
      setOp(me, randomUUID(), seId, 1, 40.3),
      plain(me, "session.complete", sessionId, null, completion(NOW.toISOString(), 1)),
    ]);
    expect(bad).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });
    expect(noBase).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });
    const [early] = await send(me, [
      plain(me, "session.complete", sessionId, 1, completion(before, 1)),
    ]);
    expect(early).toMatchObject({
      status: "rejected",
      error: { code: "VALIDATION_FAILED", details: { field: "ended_at" } },
    });
    const [missing] = await send(me, [
      plain(me, "session_exercise.update", randomUUID(), 1, { status: "done" }),
    ]);
    expect(missing).toMatchObject({ status: "rejected", error: { code: "NOT_FOUND" } });
    const [missingSet] = await send(me, [setOp(me, randomUUID(), randomUUID(), 1, 40)]);
    expect(missingSet).toMatchObject({ status: "rejected", error: { code: "NOT_FOUND" } });
  });

  it("conflitos e estados inválidos de sessão, exercício e série", async () => {
    const me = await fictitiousUser();
    const w = await publishedWorkout(await onboard(me));
    const sessionId = randomUUID();
    const { op, exercises } = startOp(me, sessionId, w, NOW.toISOString());
    const seId = exercises[0]?.id ?? "";
    const setId = randomUUID();

    // Item que não pertence ao treino.
    const foreign = startOp(me, randomUUID(), w, NOW.toISOString());
    const [badItem] = await send(me, [
      {
        ...foreign.op,
        payload: {
          ...(foreign.op.payload as Record<string, unknown>),
          exercises: [{ ...foreign.exercises[0], workout_item_id: randomUUID() }],
        },
      },
    ]);
    expect(badItem).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });

    expect((await send(me, [op, setOp(me, setId, seId, 1, 40)])).map((r) => r.status)).toEqual([
      "accepted",
      "accepted",
    ]);
    // Cada uma em sua requisição: uma falha adia as seguintes que tocam o mesmo registro.
    const outcomes = [];
    for (const failing of [
      setOp(me, setId, seId, 1, 45, 7),
      setOp(me, randomUUID(), seId, 2, 45, 3),
      plain(me, "session_exercise.update", seId, 9, { position: 2 }),
      plain(me, "session.update", sessionId, 1, { rpe: 5 }),
      plain(me, "set.delete", setId, 4),
    ]) {
      const [result] = await send(me, [failing]);
      outcomes.push([result?.status, result && "error" in result ? result.error.code : null]);
    }
    expect(outcomes).toEqual([
      ["conflict", "REVISION_CONFLICT"],
      ["conflict", "ENTITY_DELETED"],
      ["conflict", "REVISION_CONFLICT"],
      ["rejected", "VALIDATION_FAILED"],
      ["conflict", "REVISION_CONFLICT"],
    ]);

    const done = await send(me, [
      plain(me, "session_exercise.update", seId, 1, { position: 2, status: "done" }),
      plain(me, "session.complete", sessionId, 1, completion(NOW.toISOString(), 5)),
    ]);
    expect(done.map((r) => r.status)).toEqual(["accepted", "accepted"]);
    const later = [];
    for (const next of [
      plain(me, "session.complete", sessionId, 2, completion(NOW.toISOString(), 5)),
      plain(me, "session.update", sessionId, 2, {
        started_at: NOW.toISOString(),
        ended_at: new Date(NOW.getTime() - 60_000).toISOString(),
      }),
      plain(me, "session.update", sessionId, 2, {
        ended_at: new Date(NOW.getTime() + 1_800_000).toISOString(),
        notes: "Ajuste fictício",
      }),
    ]) {
      const [result] = await send(me, [next]);
      if (result) later.push(result);
    }
    expect(later.map((r) => [r.status, "error" in r ? r.error.code : null])).toEqual([
      ["rejected", "VALIDATION_FAILED"],
      ["rejected", "VALIDATION_FAILED"],
      ["accepted", null],
    ]);
    const [edited] =
      await admin`select duration_min, notes from public.sessions where id = ${sessionId}`;
    expect(edited).toMatchObject({ duration_min: 30, notes: "Ajuste fictício" });

    // Sessão excluída: série e exclusão de série viram conflito de registro excluído.
    expect((await send(me, [plain(me, "session.delete", sessionId, 3)]))[0]?.status).toBe(
      "accepted",
    );
    const [onDeleted, deleteAgain, setDeleted] = await send(me, [
      setOp(me, randomUUID(), seId, 3, 40),
      plain(me, "session.delete", sessionId, 4),
      plain(me, "set.delete", setId, 2),
    ]);
    expect(onDeleted).toMatchObject({ status: "conflict", error: { code: "ENTITY_DELETED" } });
    expect(deleteAgain).toMatchObject({ status: "conflict", error: { code: "ENTITY_DELETED" } });
    expect(setDeleted).toMatchObject({ status: "conflict", error: { code: "ENTITY_DELETED" } });
  });

  it("manter ambas limpa a marca de duplicidade; conflito de série traz os valores do servidor", async () => {
    const me = await fictitiousUser();
    const w = await publishedWorkout(await onboard(me));
    const first = randomUUID();
    const second = randomUUID();
    const a = startOp(me, first, w, new Date(NOW.getTime() - 30 * 60_000).toISOString());
    const b = startOp(me, second, w, new Date(NOW.getTime() - 20 * 60_000).toISOString());
    const setId = randomUUID();
    const results = await send(me, [
      a.op,
      plain(me, "session.complete", first, 1, completion(NOW.toISOString(), 30)),
      b.op,
      setOp(me, setId, b.exercises[0]?.id ?? "", 1, 42.5),
      plain(me, "session.complete", second, 1, completion(NOW.toISOString(), 20)),
    ]);
    expect(results.map((r) => r.status)).toEqual(Array(5).fill("accepted"));

    const [keep] = await send(me, [
      plain(me, "session.update", second, 2, { possible_duplicate_of: null }),
    ]);
    // Atividade técnica: a revisão não muda (confirmado na TAR-019).
    expect(keep).toMatchObject({ status: "accepted", revision: 2 });
    const [row] = await admin`
      select possible_duplicate_of, duration_min from public.sessions where id = ${second}`;
    expect(row).toMatchObject({ possible_duplicate_of: null, duration_min: 20 });

    const [stale] = await send(me, [setOp(me, setId, b.exercises[0]?.id ?? "", 1, 50, 7)]);
    expect(stale).toMatchObject({
      status: "conflict",
      server_record: { load_kg: 42.5, reps: 10, set_number: 1, revision: 1 },
    });
    const [sessionConflict] = await send(me, [plain(me, "session.update", second, 1, { rpe: 3 })]);
    expect(sessionConflict).toMatchObject({
      status: "conflict",
      server_record: { id: second, status: "completed", duration_min: 20, revision: 2 },
    });
  });
});

describe("peso (API-005, API-006; CA-080, UXP-01)", () => {
  const op = (who: Identity, type: string, entity: string, base: number | null, payload: unknown) =>
    send(who, [
      { owner_user_id: who.userId, type, entity_id: entity, base_revision: base, payload },
    ]);

  it("registra, recusa data futura e exclui o manual com a marca que apaga o valor", async () => {
    const me = await fictitiousUser();
    const studentId = await onboard(me);
    const weight = randomUUID();
    expect(
      (
        await op(me, "weight.create", weight, null, { measured_on: "2026-10-26", weight_kg: 81.4 })
      )[0],
    ).toMatchObject({ status: "accepted", revision: 1 });
    expect(
      (
        await op(me, "weight.create", randomUUID(), null, {
          measured_on: "2026-11-30",
          weight_kg: 80,
        })
      )[0],
    ).toMatchObject({ status: "rejected", error: { details: { field: "measured_on" } } });
    expect(
      (
        await op(me, "weight.create", randomUUID(), 1, { measured_on: "2026-10-26", weight_kg: 80 })
      )[0],
    ).toMatchObject({ status: "rejected", error: { code: "VALIDATION_FAILED" } });

    // Revisão desatualizada → conflito; na revisão atual → marca de exclusão sem o valor.
    expect((await op(me, "weight.delete", weight, 7, {}))[0]).toMatchObject({
      status: "conflict",
      error: { code: "REVISION_CONFLICT" },
    });
    expect((await op(me, "weight.delete", weight, 1, {}))[0]).toMatchObject({
      status: "accepted",
      revision: 2,
    });
    const [row] = await admin`
      select weight_kg, deleted_at from public.weight_entries where id = ${weight}`;
    expect(row?.weight_kg).toBeNull();
    expect(row?.deleted_at).not.toBeNull();
    expect((await op(me, "weight.delete", weight, 2, {}))[0]).toMatchObject({
      status: "conflict",
      error: { code: "ENTITY_DELETED" },
    });

    // Peso de avaliação não é excluído; registro inexistente responde NOT_FOUND.
    const [assessment] = await admin<{ id: string; revision: number }[]>`
      select id, revision from public.weight_entries
      where student_id = ${studentId} and source = 'assessment'`;
    expect(
      (await op(me, "weight.delete", assessment?.id ?? "", assessment?.revision ?? 1, {}))[0],
    ).toMatchObject({ status: "rejected", error: { code: "NOT_DELETABLE" } });
    await expect(
      admin`update public.weight_entries set deleted_at = now() where id = ${assessment?.id ?? ""}`,
    ).rejects.toThrow("NOT_DELETABLE");
    expect((await op(me, "weight.delete", randomUUID(), 1, {}))[0]).toMatchObject({
      status: "rejected",
      error: { code: "NOT_FOUND" },
    });
  });

  it("sem aluno próprio o registro é recusado", async () => {
    const me = await fictitiousUser();
    expect(
      (
        await op(me, "weight.create", randomUUID(), null, {
          measured_on: "2026-10-26",
          weight_kg: 80,
        })
      )[0],
    ).toMatchObject({ status: "rejected", error: { code: "NOT_FOUND" } });
  });
});

describe("relatos técnicos (API-030; ADR-038, SEG-04 §3)", () => {
  it("grava só campos técnicos com o resumo do autor e limita a 20 por hora", async () => {
    const me = await fictitiousUser();
    const report = {
      app_version: "0.1.0",
      error_code: "UNEXPECTED",
      context: "/agenda/:data",
      platform: "desktop",
    };
    const deps = { db, hash, now: () => NOW };
    expect(await processDiagnostics({ ...report, context: "Pessoa Fictícia" }, me, deps)).toEqual({
      status: 400,
      body: { code: "VALIDATION_FAILED" },
    });
    for (let i = 0; i < 20; i++) {
      expect((await processDiagnostics(report, me, deps)).status).toBe(202);
    }
    expect(await processDiagnostics(report, me, deps)).toEqual({
      status: 429,
      body: { code: "RATE_LIMITED" },
    });
    const rows = await admin`
      select * from public.client_error_reports where subject_hash = ${await hash(me.userId)}`;
    expect(rows).toHaveLength(20);
    // Nenhuma coluna com e-mail ou identificador do usuário.
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
      "app_version",
      "context",
      "error_code",
      "id",
      "occurred_at",
      "platform",
      "subject_hash",
    ]);
    expect(JSON.stringify(rows)).not.toContain(me.userId);
    expect(JSON.stringify(rows)).not.toContain(me.email ?? "@");
    await admin`delete from public.client_error_reports where subject_hash = ${await hash(me.userId)}`;
  });
});

describe("acesso cruzado em 100% das operações (CA-214, RNF-014; RN-001)", () => {
  it("nenhuma operação de outro usuário sobre registros alheios é aceita", async () => {
    const owner = await fictitiousUser();
    const studentId = await onboard(owner);
    const as = (
      who: Identity,
      type: string,
      entity: string,
      base: number | null,
      payload: unknown,
    ) =>
      send(who, [
        { owner_user_id: who.userId, type, entity_id: entity, base_revision: base, payload },
      ]);

    // Registros do dono: exercício personalizado, rascunho, programa publicado, sessão e peso.
    const exerciseId = randomUUID();
    await as(owner, "exercise.create", exerciseId, null, {
      name: `Exercício cruzado ${randomUUID().slice(0, 6)}`,
      primary_muscles: ["quadriceps"],
      secondary_muscles: [],
      equipment: ["dumbbell"],
      difficulty: "beginner",
      measure_type: "reps",
      movement_pattern: "lunge",
      instructions: ["Primeiro passo do exercício.", "Segundo passo do exercício."],
      safety_tips: [],
    });
    const draftId = randomUUID();
    await as(owner, "draft.create", draftId, null, { student_id: studentId, source: "empty" });
    const [bench] = await admin<{ id: string }[]>`
      select id from public.exercises where source_ref = 'Barbell_Squat'`;
    const [programId, versionId, workoutId, itemId] = [
      randomUUID(),
      randomUUID(),
      randomUUID(),
      randomUUID(),
    ];
    await admin`delete from public.program_versions where id = ${draftId}`;
    await admin`delete from public.programs where student_id = ${studentId}`;
    await admin`insert into public.programs (id, student_id) values (${programId}, ${studentId})`;
    await admin`
      insert into public.program_versions (id, program_id, student_id, name)
      values (${versionId}, ${programId}, ${studentId}, 'Programa do dono')`;
    await admin`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workoutId}, ${versionId}, 1, 'Treino A')`;
    await admin`
      insert into public.workout_items (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
      values (${itemId}, ${workoutId}, 1, ${bench?.id ?? ""}, 'reps', 3, 8, 12, 90)`;
    await admin`update public.program_versions set status = 'active' where id = ${versionId}`;
    const draftOfOwner = randomUUID();
    await as(owner, "draft.create", draftOfOwner, null, {
      student_id: studentId,
      source: "from_version",
      from_version_id: versionId,
    });
    const sessionId = randomUUID();
    const seId = randomUUID();
    const setId = randomUUID();
    const weightId = randomUUID();
    const prepared = await send(owner, [
      {
        owner_user_id: owner.userId,
        type: "session.start",
        entity_id: sessionId,
        payload: {
          program_version_id: versionId,
          workout_id: workoutId,
          started_at: NOW.toISOString(),
          exercises: [
            { id: seId, workout_item_id: itemId, exercise_id: bench?.id ?? "", position: 1 },
          ],
        },
      },
      {
        owner_user_id: owner.userId,
        type: "set.upsert",
        entity_id: setId,
        payload: {
          session_exercise_id: seId,
          set_number: 1,
          load_kg: 40,
          reps: 10,
          duration_s: null,
          completed_at: NOW.toISOString(),
        },
      },
      {
        owner_user_id: owner.userId,
        type: "weight.create",
        entity_id: weightId,
        payload: { measured_on: "2026-10-26", weight_kg: 80 },
      },
    ]);
    expect(prepared.map((r) => r.status)).toEqual(["accepted", "accepted", "accepted"]);

    // Outro usuário (com o próprio aluno) tenta cada operação sobre os registros do dono.
    const intruder = await fictitiousUser();
    await onboard(intruder);
    const attempts: [string, string, number | null, unknown][] = [
      ["profile.update", studentId, 1, { profile: { days_per_week: 2 } }],
      ["rest.update", studentId, 1, { default_hours: 24, overrides: [] }],
      [
        "assessment.create",
        randomUUID(),
        null,
        {
          student_id: studentId,
          assessed_on: "2026-10-26",
          weight_kg: 70,
          notes: null,
          weight_entry_id: randomUUID(),
        },
      ],
      ["weight.delete", weightId, 1, {}],
      [
        "exercise.update",
        exerciseId,
        1,
        {
          name: "Tentativa alheia",
          primary_muscles: ["quadriceps"],
          secondary_muscles: [],
          equipment: ["dumbbell"],
          difficulty: "beginner",
          measure_type: "reps",
          movement_pattern: "lunge",
          instructions: ["Primeiro passo do exercício.", "Segundo passo do exercício."],
          safety_tips: [],
        },
      ],
      ["draft.create", randomUUID(), null, { student_id: studentId, source: "empty" }],
      ["draft.save", draftOfOwner, 1, { name: "Alheio", split_type: null, workouts: [] }],
      ["draft.publish", draftOfOwner, 1, {}],
      ["draft.discard", draftOfOwner, 1, {}],
      [
        "session.start",
        randomUUID(),
        null,
        {
          program_version_id: versionId,
          workout_id: workoutId,
          started_at: NOW.toISOString(),
          exercises: [
            {
              id: randomUUID(),
              workout_item_id: itemId,
              exercise_id: bench?.id ?? "",
              position: 1,
            },
          ],
        },
      ],
      [
        "set.upsert",
        randomUUID(),
        null,
        {
          session_exercise_id: seId,
          set_number: 2,
          load_kg: 40,
          reps: 10,
          duration_s: null,
          completed_at: NOW.toISOString(),
        },
      ],
      ["set.delete", setId, 1, {}],
      ["session_exercise.update", seId, 1, { status: "skipped" }],
      [
        "session.complete",
        sessionId,
        1,
        { ended_at: NOW.toISOString(), duration_min: 1, rpe: null, notes: null },
      ],
      ["session.update", sessionId, 1, { rpe: 5 }],
      ["session.delete", sessionId, 1, {}],
    ];
    // Operações que só criam o próprio registro (sem alvo alheio) ficam fora da lista.
    const creationOnly = [
      "onboarding.complete",
      "exercise.create",
      "weight.create",
      "reassessment.postpone",
    ];
    expect(new Set([...attempts.map((a) => a[0]), ...creationOnly])).toEqual(
      new Set(Object.keys(HANDLERS)),
    );

    for (const [type, entity, base, payload] of attempts) {
      const [result] = await as(intruder, type, entity, base, payload);
      expect([type, result?.status]).not.toEqual([type, "accepted"]);
    }

    // Nada do dono mudou.
    const [session] =
      await admin`select status, deleted_at from public.sessions where id = ${sessionId}`;
    expect(session).toMatchObject({ status: "in_progress", deleted_at: null });
    const [weight] =
      await admin`select deleted_at from public.weight_entries where id = ${weightId}`;
    expect(weight?.deleted_at).toBeNull();
    const [exercise] = await admin`select name from public.exercises where id = ${exerciseId}`;
    expect(exercise?.name).not.toBe("Tentativa alheia");
    const [draft] =
      await admin`select status from public.program_versions where id = ${draftOfOwner}`;
    expect(draft?.status).toBe("draft");
    await admin`delete from public.exercises where id = ${exerciseId}`;
  });
});
