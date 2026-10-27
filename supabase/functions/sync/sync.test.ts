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
    const key = env.VITE_SUPABASE_ANON_KEY ?? "";
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
