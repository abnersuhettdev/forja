// Tipos de operação (DAD-04 §5): API-002..014 e API-020 (personalizado). Cada um valida com o
// esquema do domínio, confere a revisão (ADR-053) e grava como sync_writer; restrições,
// gatilhos e políticas do banco seguem como segunda barreira (DAD-03).
import {
  CLIENT_CLOCK_TOLERANCE_MINUTES,
  assessmentCreatePayloadSchema,
  customExercisePayloadSchema,
  importedCorrectionPayloadSchema,
  onboardingPayloadSchema,
  profileUpdatePayloadSchema,
  emptyPayloadSchema,
  restUpdatePayloadSchema,
  toLocalDate,
  weightCreatePayloadSchema,
} from "../../../packages/domain/src/index.ts";
import type { z } from "zod";
import { asJson, type Tx } from "./db.ts";
import { conflict, rejected } from "./errors.ts";
import { draftCreate, draftDiscard, draftPublish, draftSave } from "./programs.ts";
import {
  sessionComplete,
  sessionDelete,
  sessionExerciseUpdate,
  sessionStart,
  sessionUpdate,
  setDelete,
  setUpsert,
} from "./sessions.ts";

export interface OperationContext {
  readonly userId: string;
  readonly email: string | null;
  readonly entityId: string;
  readonly baseRevision: number | null;
  readonly payload: unknown;
  readonly now: Date;
  /** Identificador aleatório do aparelho que enviou (DAD-02 `device_id`). */
  readonly deviceId: string;
}

export interface OperationOutcome {
  /** Revisão resultante do registro principal, devolvida ao aparelho. */
  readonly revision?: number;
}

export type OperationHandler = (tx: Tx, ctx: OperationContext) => Promise<OperationOutcome>;

function parse<T extends z.ZodType>(schema: T, payload: unknown): z.infer<T> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw rejected("VALIDATION_FAILED", { field: issue?.path.join(".") ?? "" });
  }
  return result.data;
}

function requireBaseRevision(ctx: OperationContext): number {
  if (ctx.baseRevision === null) throw rejected("VALIDATION_FAILED", { field: "base_revision" });
  return ctx.baseRevision;
}

/** Data de calendário não futura no fuso do aluno, com a tolerância de RN-048. */
function assertNotFuture(localDate: string, timeZone: string, now: Date, field: string): void {
  const limit = toLocalDate(
    new Date(now.getTime() + CLIENT_CLOCK_TOLERANCE_MINUTES * 60_000),
    timeZone,
  );
  if (localDate > limit) throw rejected("VALIDATION_FAILED", { field, rule: "RN-048" });
}

const PROFILE_COLUMNS = `student_id, goal, goal_weight_kg::float8 as goal_weight_kg,
  experience_level, activity_level, days_per_week, minutes_per_session, preferred_weekdays,
  training_location, equipment_codes, restrictions_declared, restriction_codes,
  restrictions_note, preferences_note, review_recommended_since, revision`;

// ---------- API-002 onboarding.complete ----------

const onboarding: OperationHandler = async (tx, ctx) => {
  const payload = parse(onboardingPayloadSchema, ctx.payload);
  assertNotFuture(payload.assessed_on, payload.student.timezone, ctx.now, "assessed_on");

  const [manager] = await tx<{ id: string }[]>`
    select id from public.managers where user_id = ${ctx.userId}`;
  if (!manager) throw rejected("FORBIDDEN_ROLE");
  const [existing] = await tx<{ id: string }[]>`
    select id from public.students where user_id = ${ctx.userId}`;
  if (existing) throw rejected("VALIDATION_FAILED", { reason: "onboarding_completed" });

  const { student, profile } = payload;
  await tx`
    insert into public.students
      (id, manager_id, user_id, is_self, full_name, email, birth_date, sex, height_cm,
       timezone, status, onboarding_completed_at)
    values
      (${ctx.entityId}, ${manager.id}, ${ctx.userId}, true, ${student.full_name},
       ${ctx.email}, ${student.birth_date}, ${student.sex}, ${student.height_cm},
       ${student.timezone}, 'active', ${ctx.now})`;
  await tx`insert into public.training_profiles ${tx({ student_id: ctx.entityId, ...profile })}`;
  await tx`
    insert into public.assessments (id, student_id, assessed_on, kind, weight_kg, profile_snapshot)
    values (${payload.assessment_id}, ${ctx.entityId}, ${payload.assessed_on}, 'initial',
            ${payload.weight_kg}, ${tx.json(profile)})`;
  await tx`
    insert into public.weight_entries (id, student_id, measured_on, weight_kg, source, assessment_id)
    values (${payload.weight_entry_id}, ${ctx.entityId}, ${payload.assessed_on},
            ${payload.weight_kg}, 'assessment', ${payload.assessment_id})`;
  await tx`insert into public.rest_settings (student_id) values (${ctx.entityId})`;
  return { revision: 1 };
};

// ---------- API-003 profile.update ----------

const profileUpdate: OperationHandler = async (tx, ctx) => {
  const payload = parse(profileUpdatePayloadSchema, ctx.payload);
  const base = requireBaseRevision(ctx);
  const [current] = await tx<Record<string, unknown>[]>`
    select ${tx.unsafe(PROFILE_COLUMNS)} from public.training_profiles
    where student_id = ${ctx.entityId} for update`;
  if (!current) throw rejected("NOT_FOUND");
  if (current.revision !== base) throw conflict("REVISION_CONFLICT", current);

  if (payload.student && Object.keys(payload.student).length > 0) {
    await tx`update public.students set ${tx(payload.student)} where id = ${ctx.entityId}`;
  }
  // Sempre atualiza o perfil: a revisão cobre a alteração inteira (ADR-053).
  const [updated] = await tx<{ revision: number }[]>`
    update public.training_profiles
    set ${tx({ ...payload.profile, updated_at: ctx.now })}
    where student_id = ${ctx.entityId}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};

// ---------- API-007 rest.update ----------

const restUpdate: OperationHandler = async (tx, ctx) => {
  const payload = parse(restUpdatePayloadSchema, ctx.payload);
  const base = requireBaseRevision(ctx);
  const [current] = await tx<{ student_id: string; default_hours: number; revision: number }[]>`
    select student_id, default_hours, revision from public.rest_settings
    where student_id = ${ctx.entityId} for update`;
  if (!current) throw rejected("NOT_FOUND");
  if (current.revision !== base) {
    const overrides = await tx`
      select muscle_group_code, hours from public.rest_overrides
      where student_id = ${ctx.entityId} order by muscle_group_code`;
    throw conflict("REVISION_CONFLICT", { ...current, overrides: [...overrides] });
  }

  const codes = payload.overrides.map((o) => o.muscle_group_code);
  await tx`
    delete from public.rest_overrides
    where student_id = ${ctx.entityId} and not (muscle_group_code = any(${codes}::text[]))`;
  for (const override of payload.overrides) {
    await tx`
      insert into public.rest_overrides (student_id, muscle_group_code, hours)
      values (${ctx.entityId}, ${override.muscle_group_code}, ${override.hours})
      on conflict (student_id, muscle_group_code) do update set hours = excluded.hours`;
  }
  const [updated] = await tx<{ revision: number }[]>`
    update public.rest_settings set default_hours = ${payload.default_hours}
    where student_id = ${ctx.entityId}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};

// ---------- API-020 exercício personalizado (RF-032, RN-037) ----------

type CustomExercise = z.infer<typeof customExercisePayloadSchema>;

/** Nome único entre os exercícios ativos visíveis ao gestor (DAD-02 §4, `NAME_TAKEN`). */
async function assertNameFree(tx: Tx, name: string, exerciseId: string): Promise<void> {
  const [taken] = await tx<{ id: string }[]>`
    select id from public.exercises
    where active and lower(name) = lower(${name}) and id <> ${exerciseId}
    limit 1`;
  if (taken) throw rejected("NAME_TAKEN", { field: "name" });
}

async function writeClassification(tx: Tx, exerciseId: string, payload: CustomExercise) {
  await tx`delete from public.exercise_muscles where exercise_id = ${exerciseId}`;
  await tx`delete from public.exercise_equipment where exercise_id = ${exerciseId}`;
  const muscles = [
    ...payload.primary_muscles.map((code) => ({ code, role: "primary" })),
    ...payload.secondary_muscles.map((code) => ({ code, role: "secondary" })),
  ];
  for (const { code, role } of muscles) {
    await tx`
      insert into public.exercise_muscles (exercise_id, muscle_group_code, role)
      values (${exerciseId}, ${code}, ${role})`;
  }
  for (const code of payload.equipment) {
    await tx`
      insert into public.exercise_equipment (exercise_id, equipment_code)
      values (${exerciseId}, ${code})`;
  }
}

function exerciseFields(payload: CustomExercise) {
  return {
    name: payload.name,
    instructions: payload.instructions,
    safety_tips: payload.safety_tips,
    difficulty: payload.difficulty,
    measure_type: payload.measure_type,
    movement_pattern: payload.movement_pattern,
    is_bodyweight: payload.equipment.includes("bodyweight"),
  };
}

const exerciseCreate: OperationHandler = async (tx, ctx) => {
  const payload = parse(customExercisePayloadSchema, ctx.payload);
  const [manager] = await tx<{ id: string }[]>`
    select id from public.managers where user_id = ${ctx.userId}`;
  if (!manager) throw rejected("FORBIDDEN_ROLE");
  await assertNameFree(tx, payload.name, ctx.entityId);
  const fields = exerciseFields(payload);
  await tx`
    insert into public.exercises
      (id, origin, manager_id, name, instructions, safety_tips, difficulty, measure_type,
       movement_pattern, is_bodyweight)
    values
      (${ctx.entityId}, 'custom', ${manager.id}, ${fields.name}, ${tx.json(fields.instructions)},
       ${tx.json(fields.safety_tips)}, ${fields.difficulty}, ${fields.measure_type},
       ${fields.movement_pattern}, ${fields.is_bodyweight})`;
  await writeClassification(tx, ctx.entityId, payload);
  return {};
};

/** Correção de importado (ADR-091): nome, instruções e dicas; o banco guarda o original. */
async function correctImported(tx: Tx, ctx: OperationContext): Promise<OperationOutcome> {
  const payload = parse(importedCorrectionPayloadSchema, ctx.payload);
  await assertNameFree(tx, payload.name, ctx.entityId);
  const [updated] = await tx<{ id: string }[]>`
    update public.exercises set
      name = ${payload.name}, instructions = ${tx.json(payload.instructions)},
      safety_tips = ${tx.json(payload.safety_tips)}
    where id = ${ctx.entityId} and origin = 'imported'
    returning id`;
  // Sem linha: o ator não é gestor ou o GATE-TER está aberto (política por linha).
  if (!updated) throw rejected("FORBIDDEN_ROLE");
  return {};
}

/** Edição: personalizado por substituição integral (editor é online — DAD-04 §5). */
const exerciseUpdate: OperationHandler = async (tx, ctx) => {
  const [current] = await tx<{ origin: string }[]>`
    select origin from public.exercises where id = ${ctx.entityId}`;
  if (!current) throw rejected("NOT_FOUND");
  if (current.origin === "imported") return correctImported(tx, ctx);
  const payload = parse(customExercisePayloadSchema, ctx.payload);
  await assertNameFree(tx, payload.name, ctx.entityId);
  const fields = exerciseFields(payload);
  const [updated] = await tx<{ id: string }[]>`
    update public.exercises set
      name = ${fields.name}, instructions = ${tx.json(fields.instructions)},
      safety_tips = ${tx.json(fields.safety_tips)}, difficulty = ${fields.difficulty},
      measure_type = ${fields.measure_type}, movement_pattern = ${fields.movement_pattern},
      is_bodyweight = ${fields.is_bodyweight}
    where id = ${ctx.entityId}
    returning id`;
  // Sem linha atualizada: a política por linha não reconhece o ator como dono.
  if (!updated) throw rejected("NOT_FOUND");
  await writeClassification(tx, ctx.entityId, payload);
  return {};
};

// ---------- API-004 assessment.create (RF-016, RN-014) ----------

const assessmentCreate: OperationHandler = async (tx, ctx) => {
  const payload = parse(assessmentCreatePayloadSchema, ctx.payload);
  const [student] = await tx<{ timezone: string }[]>`
    select timezone from public.students where id = ${payload.student_id}`;
  if (!student) throw rejected("NOT_FOUND");
  assertNotFuture(payload.assessed_on, student.timezone, ctx.now, "assessed_on");
  // Fotografia do perfil na data (DAD-02 ENT-004), tirada do estado atual no servidor.
  const [snapshot] = await tx<{ profile: Record<string, unknown> }[]>`
    select to_jsonb(p) - 'student_id' - 'revision' - 'created_at' - 'updated_at' as profile
    from public.training_profiles p where p.student_id = ${payload.student_id}`;
  await tx`
    insert into public.assessments (id, student_id, assessed_on, kind, weight_kg, profile_snapshot, notes)
    values (${ctx.entityId}, ${payload.student_id}, ${payload.assessed_on}, 'periodic',
            ${payload.weight_kg}, ${tx.json(asJson(snapshot?.profile ?? {}))}, ${payload.notes})`;
  await tx`
    insert into public.weight_entries (id, student_id, measured_on, weight_kg, source, assessment_id)
    values (${payload.weight_entry_id}, ${payload.student_id}, ${payload.assessed_on},
            ${payload.weight_kg}, 'assessment', ${ctx.entityId})`;
  return {};
};

// ---------- API-005 weight.create e API-006 weight.delete (RF-080, UXP-01) ----------

const weightCreate: OperationHandler = async (tx, ctx) => {
  const payload = parse(weightCreatePayloadSchema, ctx.payload);
  if (ctx.baseRevision !== null) throw rejected("VALIDATION_FAILED", { field: "base_revision" });
  const [student] = await tx<{ id: string; timezone: string }[]>`
    select id, timezone from public.students where user_id = ${ctx.userId}`;
  if (!student) throw rejected("NOT_FOUND");
  assertNotFuture(payload.measured_on, student.timezone, ctx.now, "measured_on");
  const [inserted] = await tx<{ revision: number }[]>`
    insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
    values (${ctx.entityId}, ${student.id}, ${payload.measured_on}, ${payload.weight_kg}, 'manual')
    returning revision`;
  return inserted ? { revision: inserted.revision } : {};
};

const weightDelete: OperationHandler = async (tx, ctx) => {
  parse(emptyPayloadSchema, ctx.payload);
  const base = requireBaseRevision(ctx);
  const [entry] = await tx<
    {
      measured_on: string;
      weight_kg: number | null;
      source: string;
      revision: number;
      deleted_at: Date | null;
    }[]
  >`
    select measured_on::text, weight_kg::float8 as weight_kg, source, revision, deleted_at
    from public.weight_entries where id = ${ctx.entityId} for update`;
  if (!entry) throw rejected("NOT_FOUND");
  if (entry.deleted_at !== null) throw conflict("ENTITY_DELETED", null);
  if (entry.source !== "manual") throw rejected("NOT_DELETABLE");
  if (entry.revision !== base) throw conflict("REVISION_CONFLICT", { ...entry });
  const [updated] = await tx<{ revision: number }[]>`
    update public.weight_entries set deleted_at = ${ctx.now} where id = ${ctx.entityId}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};

export const HANDLERS: Readonly<Record<string, OperationHandler>> = {
  "onboarding.complete": onboarding,
  "profile.update": profileUpdate,
  "rest.update": restUpdate,
  "assessment.create": assessmentCreate,
  "weight.create": weightCreate,
  "weight.delete": weightDelete,
  "exercise.create": exerciseCreate,
  "exercise.update": exerciseUpdate,
  "draft.create": draftCreate,
  "draft.save": draftSave,
  "draft.publish": draftPublish,
  "draft.discard": draftDiscard,
  "session.start": sessionStart,
  "set.upsert": setUpsert,
  "set.delete": setDelete,
  "session_exercise.update": sessionExerciseUpdate,
  "session.complete": sessionComplete,
  "session.update": sessionUpdate,
  "session.delete": sessionDelete,
};
