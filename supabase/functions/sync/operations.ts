// Tipos de operação da base (DAD-04 §5): API-002, API-003 e API-007. Cada um valida com o
// esquema do domínio, confere a revisão (ADR-053) e grava como sync_writer; restrições,
// gatilhos e políticas do banco seguem como segunda barreira (DAD-03).
import {
  CLIENT_CLOCK_TOLERANCE_MINUTES,
  onboardingPayloadSchema,
  profileUpdatePayloadSchema,
  restUpdatePayloadSchema,
  toLocalDate,
} from "../../../packages/domain/src/index.ts";
import type { z } from "zod";
import type { Tx } from "./db.ts";
import { conflict, rejected } from "./errors.ts";

export interface OperationContext {
  readonly userId: string;
  readonly email: string | null;
  readonly entityId: string;
  readonly baseRevision: number | null;
  readonly payload: unknown;
  readonly now: Date;
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

export const HANDLERS: Readonly<Record<string, OperationHandler>> = {
  "onboarding.complete": onboarding,
  "profile.update": profileUpdate,
  "rest.update": restUpdate,
};
