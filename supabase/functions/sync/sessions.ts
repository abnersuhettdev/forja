// Operações de execução (DAD-04 API-008..014; RF-060..067, RF-069; RN-012, RN-018, RN-027,
// RN-044, RN-045, RN-048). Só o próprio aluno executa; gatilhos do banco garantem revisão
// (TG-03), janela de edição (TG-06) e limpeza na exclusão (TG-07) como segunda barreira.
import {
  emptyPayloadSchema,
  isClockSuspect,
  sessionCompletePayloadSchema,
  sessionDurationMinutes,
  sessionExerciseUpdatePayloadSchema,
  sessionStartPayloadSchema,
  sessionUpdatePayloadSchema,
  setUpsertPayloadSchema,
} from "../../../packages/domain/src/index.ts";
import type { z } from "zod";
import type { Tx } from "./db.ts";
import { conflict, rejected } from "./errors.ts";
import type { OperationContext, OperationHandler } from "./operations.ts";

function parse<T extends z.ZodType>(schema: T, payload: unknown): z.infer<T> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw rejected("VALIDATION_FAILED", { field: result.error.issues[0]?.path.join(".") ?? "" });
  }
  return result.data;
}

function requireBase(ctx: OperationContext): number {
  if (ctx.baseRevision === null) throw rejected("VALIDATION_FAILED", { field: "base_revision" });
  return ctx.baseRevision;
}

interface SessionRow {
  id: string;
  student_id: string;
  status: string;
  started_at: Date;
  ended_at: Date | null;
  revision: number;
  deleted_at: Date | null;
}

const SESSION_COLUMNS = "id, student_id, status, started_at, ended_at, revision, deleted_at";

/** Registro devolvido em conflitos, com horários em ISO (DAD-04 §4.2). */
function record(row: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );
}

/** Sessão para alteração, com conferência de revisão e exclusão (ADR-053). */
async function lockedSession(tx: Tx, ctx: OperationContext): Promise<SessionRow> {
  const base = requireBase(ctx);
  const [session] = await tx<SessionRow[]>`
    select ${tx.unsafe(SESSION_COLUMNS)} from public.sessions
    where id = ${ctx.entityId} for update`;
  if (!session) throw rejected("NOT_FOUND");
  if (session.deleted_at !== null) throw conflict("ENTITY_DELETED", record(session));
  if (session.revision !== base) throw conflict("REVISION_CONFLICT", record(session));
  return session;
}

/** RN-045 — outra sessão do aluno com horário sobreposto (possível duplicidade, não conflito). */
async function overlapping(
  tx: Tx,
  studentId: string,
  sessionId: string,
  start: string,
  end: string,
): Promise<string | null> {
  const [other] = await tx<{ id: string }[]>`
    select id from public.sessions
    where student_id = ${studentId} and id <> ${sessionId} and deleted_at is null
      and started_at <= ${end}
      and coalesce(ended_at, last_activity_at) >= ${start}
    order by started_at
    limit 1`;
  return other?.id ?? null;
}

// ---------- API-008 session.start ----------

export const sessionStart: OperationHandler = async (tx, ctx) => {
  const payload = parse(sessionStartPayloadSchema, ctx.payload);
  if (ctx.baseRevision !== null) throw rejected("VALIDATION_FAILED", { field: "base_revision" });
  const [student] = await tx<{ id: string }[]>`
    select id from public.students where user_id = ${ctx.userId}`;
  if (!student) throw rejected("NOT_FOUND");

  // RN-044: versão publicada (ativa ou arquivada) do próprio aluno, com o treino informado.
  const [version] = await tx<{ id: string }[]>`
    select v.id from public.program_versions v
    join public.workouts w on w.program_version_id = v.id
    where v.id = ${payload.program_version_id} and w.id = ${payload.workout_id}
      and v.student_id = ${student.id} and v.status in ('active', 'archived')`;
  if (!version) throw rejected("VERSION_NOT_AVAILABLE");
  const itemIds = payload.exercises
    .map((e) => e.workout_item_id)
    .filter((itemId): itemId is string => itemId !== null);
  if (itemIds.length > 0) {
    const [{ count } = { count: 0 }] = await tx<{ count: number }[]>`
      select count(*)::int as count from public.workout_items
      where workout_id = ${payload.workout_id} and id = any(${itemIds}::uuid[])`;
    if (count !== new Set(itemIds).size)
      throw rejected("VALIDATION_FAILED", { field: "exercises" });
  }

  const duplicateOf = await overlapping(
    tx,
    student.id,
    ctx.entityId,
    payload.started_at,
    payload.started_at,
  );
  await tx`
    insert into public.sessions
      (id, student_id, program_version_id, workout_id, status, started_at, last_activity_at,
       device_id, possible_duplicate_of, clock_suspect)
    values
      (${ctx.entityId}, ${student.id}, ${payload.program_version_id}, ${payload.workout_id},
       'in_progress', ${payload.started_at}, ${payload.started_at}, ${ctx.deviceId},
       ${duplicateOf}, ${isClockSuspect(new Date(payload.started_at), ctx.now)})`;
  for (const exercise of payload.exercises) {
    await tx`
      insert into public.session_exercises (id, session_id, workout_item_id, exercise_id, position)
      values (${exercise.id}, ${ctx.entityId}, ${exercise.workout_item_id},
              ${exercise.exercise_id}, ${exercise.position})`;
  }
  return { revision: 1 };
};

// ---------- API-009 set.upsert ----------

export const setUpsert: OperationHandler = async (tx, ctx) => {
  const payload = parse(setUpsertPayloadSchema, ctx.payload);
  const [parent] = await tx<{ session_id: string; deleted_at: Date | null }[]>`
    select s.id as session_id, s.deleted_at from public.session_exercises se
    join public.sessions s on s.id = se.session_id
    where se.id = ${payload.session_exercise_id} and se.deleted_at is null`;
  if (!parent) throw rejected("NOT_FOUND");
  if (parent.deleted_at !== null) throw conflict("ENTITY_DELETED", null);

  const [existing] = await tx<
    { revision: number; deleted_at: Date | null; session_exercise_id: string }[]
  >`
    select revision, deleted_at, session_exercise_id from public.set_logs
    where id = ${ctx.entityId} for update`;
  let revision: number;
  if (!existing) {
    if (ctx.baseRevision !== null) throw conflict("ENTITY_DELETED", null);
    const [inserted] = await tx<{ revision: number }[]>`
      insert into public.set_logs
        (id, session_exercise_id, set_number, load_kg, reps, duration_s, completed_at)
      values
        (${ctx.entityId}, ${payload.session_exercise_id}, ${payload.set_number}, ${payload.load_kg},
         ${payload.reps}, ${payload.duration_s}, ${payload.completed_at})
      returning revision`;
    revision = inserted?.revision ?? 1;
  } else {
    if (existing.deleted_at !== null) throw conflict("ENTITY_DELETED", record(existing));
    if (
      existing.revision !== ctx.baseRevision ||
      existing.session_exercise_id !== payload.session_exercise_id
    )
      throw conflict("REVISION_CONFLICT", record(existing));
    const [updated] = await tx<{ revision: number }[]>`
      update public.set_logs
      set set_number = ${payload.set_number}, load_kg = ${payload.load_kg}, reps = ${payload.reps},
          duration_s = ${payload.duration_s}, completed_at = ${payload.completed_at}
      where id = ${ctx.entityId}
      returning revision`;
    revision = updated?.revision ?? existing.revision;
  }

  // RN-012: atividade da sessão; RN-048: horário futuro sinalizado para revisão.
  await tx`
    update public.sessions
    set last_activity_at = greatest(last_activity_at, ${payload.completed_at}::timestamptz),
        clock_suspect = clock_suspect or ${isClockSuspect(new Date(payload.completed_at), ctx.now)}
    where id = ${parent.session_id}`;
  return { revision };
};

// ---------- API-010 set.delete ----------

export const setDelete: OperationHandler = async (tx, ctx) => {
  parse(emptyPayloadSchema, ctx.payload);
  const base = requireBase(ctx);
  const [set] = await tx<{ revision: number; deleted_at: Date | null; session_status: string }[]>`
    select l.revision, l.deleted_at, s.status as session_status
    from public.set_logs l
    join public.session_exercises se on se.id = l.session_exercise_id
    join public.sessions s on s.id = se.session_id
    where l.id = ${ctx.entityId}
    for update of l`;
  if (!set) throw conflict("ENTITY_DELETED", null);
  if (set.deleted_at !== null) throw conflict("ENTITY_DELETED", record(set));
  if (set.revision !== base) throw conflict("REVISION_CONFLICT", record(set));
  // Em andamento: desfazer remove de fato; depois, marca de exclusão (ADR-053, TG-07).
  if (set.session_status === "in_progress") {
    await tx`delete from public.set_logs where id = ${ctx.entityId}`;
    return {};
  }
  const [updated] = await tx<{ revision: number }[]>`
    update public.set_logs set deleted_at = ${ctx.now} where id = ${ctx.entityId}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};

// ---------- API-011 session_exercise.update ----------

export const sessionExerciseUpdate: OperationHandler = async (tx, ctx) => {
  const payload = parse(sessionExerciseUpdatePayloadSchema, ctx.payload);
  const base = requireBase(ctx);
  const [current] = await tx<
    { revision: number; deleted_at: Date | null; status: string; position: number }[]
  >`
    select revision, deleted_at, status, position from public.session_exercises
    where id = ${ctx.entityId} for update`;
  if (!current) throw rejected("NOT_FOUND");
  if (current.deleted_at !== null) throw conflict("ENTITY_DELETED", record(current));
  if (current.revision !== base) throw conflict("REVISION_CONFLICT", record(current));
  const [updated] = await tx<{ revision: number }[]>`
    update public.session_exercises
    set status = ${payload.status ?? current.status},
        position = ${payload.position ?? current.position}
    where id = ${ctx.entityId}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};

// ---------- API-012 session.complete ----------

export const sessionComplete: OperationHandler = async (tx, ctx) => {
  const payload = parse(sessionCompletePayloadSchema, ctx.payload);
  const session = await lockedSession(tx, ctx);
  if (session.status !== "in_progress" && session.status !== "abandoned")
    throw rejected("VALIDATION_FAILED", { field: "status" });
  if (new Date(payload.ended_at) < session.started_at)
    throw rejected("VALIDATION_FAILED", { field: "ended_at" });
  const duplicateOf = await overlapping(
    tx,
    session.student_id,
    session.id,
    session.started_at.toISOString(),
    payload.ended_at,
  );
  const [updated] = await tx<{ revision: number }[]>`
    update public.sessions
    set status = 'completed', ended_at = ${payload.ended_at}, duration_min = ${payload.duration_min},
        rpe = ${payload.rpe}, notes = ${payload.notes},
        possible_duplicate_of = coalesce(possible_duplicate_of, ${duplicateOf}),
        clock_suspect = clock_suspect or ${isClockSuspect(new Date(payload.ended_at), ctx.now)}
    where id = ${session.id}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};

// ---------- API-013 session.update ----------

export const sessionUpdate: OperationHandler = async (tx, ctx) => {
  const payload = parse(sessionUpdatePayloadSchema, ctx.payload);
  const session = await lockedSession(tx, ctx);
  if (session.status !== "completed" && session.status !== "manual")
    throw rejected("VALIDATION_FAILED", { field: "status" });
  const startedAt = payload.started_at ?? session.started_at.toISOString();
  const endedAt = payload.ended_at ?? session.ended_at?.toISOString() ?? startedAt;
  if (new Date(endedAt) < new Date(startedAt))
    throw rejected("VALIDATION_FAILED", { field: "ended_at" });
  const [updated] = await tx<{ revision: number }[]>`
    update public.sessions
    set started_at = ${startedAt}, ended_at = ${endedAt},
        duration_min = ${sessionDurationMinutes(startedAt, endedAt)},
        rpe = ${payload.rpe === undefined ? tx`rpe` : payload.rpe},
        notes = ${payload.notes === undefined ? tx`notes` : payload.notes}
    where id = ${session.id}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};

// ---------- API-014 session.delete ----------

export const sessionDelete: OperationHandler = async (tx, ctx) => {
  parse(emptyPayloadSchema, ctx.payload);
  const session = await lockedSession(tx, ctx);
  // Em andamento: descarte físico com séries (RF-067); concluída: marca de exclusão (TG-07).
  if (session.status === "in_progress" || session.status === "abandoned") {
    await tx`delete from public.sessions where id = ${session.id}`;
    return {};
  }
  await tx`
    update public.set_logs set deleted_at = ${ctx.now}
    where deleted_at is null and session_exercise_id in (
      select id from public.session_exercises where session_id = ${session.id})`;
  const [updated] = await tx<{ revision: number }[]>`
    update public.sessions set deleted_at = ${ctx.now} where id = ${session.id}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};
