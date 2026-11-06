// Operações de programa (DAD-04 API-016..019; RF-020, RF-025, RF-027, RF-028; RN-003..005,
// RN-021, RN-035). Só o gestor do aluno; gatilhos do banco garantem imutabilidade (TG-01) e
// publicação atômica (TG-02) como segunda barreira.
import { type DraftForIssues } from "../../../packages/domain/src/index.ts";
import {
  draftCreatePayloadSchema,
  draftIssues,
  draftSavePayloadSchema,
  emptyPayloadSchema,
} from "../../../packages/domain/src/validacao/index.ts";
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

interface VersionRow {
  id: string;
  student_id: string;
  status: "draft" | "active" | "archived";
  revision: number;
  name: string;
  split_type: string | null;
  version_number: number | null;
}

/** Rascunho do registro com conferência de revisão (ADR-053); só o gestor o enxerga. */
async function lockedDraft(tx: Tx, ctx: OperationContext): Promise<VersionRow> {
  if (ctx.baseRevision === null) throw rejected("VALIDATION_FAILED", { field: "base_revision" });
  const [version] = await tx<VersionRow[]>`
    select id, student_id, status, revision, name, split_type, version_number
    from public.program_versions where id = ${ctx.entityId} for update`;
  if (!version) throw conflict("ENTITY_DELETED", null);
  if (version.status !== "draft") throw conflict("ENTITY_DELETED", { ...version });
  if (version.revision !== ctx.baseRevision) throw conflict("REVISION_CONFLICT", { ...version });
  return version;
}

async function insertDocument(tx: Tx, versionId: string, workouts: DraftForIssues["workouts"]) {
  for (const [index, workout] of workouts.entries()) {
    await tx`
      insert into public.workouts (id, program_version_id, position, name)
      values (${workout.id}, ${versionId}, ${index + 1}, ${workout.name})`;
    for (const [itemIndex, item] of workout.items.entries()) {
      await tx`
        insert into public.workout_items
          (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max,
           duration_s, rest_s, suggested_load_kg, notes)
        values
          (${item.id}, ${workout.id}, ${itemIndex + 1}, ${item.exercise_id}, ${item.measure_type},
           ${item.sets}, ${item.reps_min}, ${item.reps_max}, ${item.duration_s}, ${item.rest_s},
           ${item.suggested_load_kg}, ${item.notes})`;
    }
  }
}

// ---------- API-016 draft.create ----------

export const draftCreate: OperationHandler = async (tx, ctx) => {
  const payload = parse(draftCreatePayloadSchema, ctx.payload);
  // Gestão do aluno (RN-002); a política repetiria a recusa, aqui com código próprio.
  const [managed] = await tx<{ ok: boolean }[]>`
    select app.manages_student(${payload.student_id}) as ok`;
  if (!managed?.ok) throw rejected("FORBIDDEN_ROLE");
  const [draft] = await tx`
    select id from public.program_versions
    where student_id = ${payload.student_id} and status = 'draft'`;
  if (draft) throw rejected("DRAFT_ALREADY_EXISTS");

  await tx`
    insert into public.programs (id, student_id)
    values (${crypto.randomUUID()}, ${payload.student_id})
    on conflict (student_id) do nothing`;
  const [program] = await tx<{ id: string }[]>`
    select id from public.programs where student_id = ${payload.student_id}`;
  if (!program) throw rejected("NOT_FOUND");

  let name = payload.name ?? "Meu programa";
  let splitType: string | null = null;
  let workouts: DraftForIssues["workouts"] = [];
  if (payload.source === "generated" && payload.generated) {
    // RF-021: nasce como rascunho; publicar continua sendo ação da pessoa (RN-009).
    splitType = payload.generated.split_type;
    workouts = payload.generated.workouts;
  }
  if (payload.source === "from_version") {
    // RF-027: rascunho idêntico à versão de origem, com novos identificadores.
    const [origin] = await tx<VersionRow[]>`
      select id, student_id, status, revision, name, split_type, version_number
      from public.program_versions
      where id = ${payload.from_version_id ?? ""} and student_id = ${payload.student_id}`;
    if (!origin) throw rejected("VERSION_NOT_AVAILABLE");
    name = payload.name ?? origin.name;
    splitType = origin.split_type;
    const rows = await tx<
      {
        workout_id: string;
        workout_name: string;
        item: Record<string, unknown> | null;
      }[]
    >`
      select w.id as workout_id, w.name as workout_name,
             case when i.id is null then null else jsonb_build_object(
               'exercise_id', i.exercise_id, 'measure_type', i.measure_type, 'sets', i.sets,
               'reps_min', i.reps_min, 'reps_max', i.reps_max, 'duration_s', i.duration_s,
               'rest_s', i.rest_s, 'suggested_load_kg', i.suggested_load_kg::float8,
               'notes', i.notes) end as item
      from public.workouts w
      left join public.workout_items i on i.workout_id = w.id
      where w.program_version_id = ${origin.id}
      order by w.position, i.position`;
    const byWorkout = new Map<
      string,
      { id: string; name: string; items: DraftForIssues["workouts"][number]["items"][number][] }
    >();
    for (const row of rows) {
      let workout = byWorkout.get(row.workout_id);
      if (!workout) {
        workout = { id: crypto.randomUUID(), name: row.workout_name, items: [] };
        byWorkout.set(row.workout_id, workout);
      }
      if (row.item) {
        workout.items.push({
          ...(row.item as unknown as DraftForIssues["workouts"][number]["items"][number]),
          id: crypto.randomUUID(),
          position: workout.items.length + 1,
        });
      }
    }
    workouts = [...byWorkout.values()];
  }

  await tx`
    insert into public.program_versions
      (id, program_id, student_id, status, name, split_type, origin, generator_report,
       created_from_version_id)
    values
      (${ctx.entityId}, ${program.id}, ${payload.student_id}, 'draft', ${name}, ${splitType},
       ${payload.source === "generated" ? "generated" : "manual"},
       ${payload.generated ? tx.json(payload.generated.report as never) : null},
       ${payload.source === "from_version" ? (payload.from_version_id ?? null) : null})`;
  await insertDocument(tx, ctx.entityId, workouts);
  return { revision: 1 };
};

// ---------- API-017 draft.save ----------

export const draftSave: OperationHandler = async (tx, ctx) => {
  const payload = parse(draftSavePayloadSchema, ctx.payload);
  await lockedDraft(tx, ctx);
  // Substituição integral (DAD-04 §5): apaga treinos e itens e grava o documento recebido.
  await tx`delete from public.workouts where program_version_id = ${ctx.entityId}`;
  await insertDocument(tx, ctx.entityId, payload.workouts);
  const [updated] = await tx<{ revision: number }[]>`
    update public.program_versions set name = ${payload.name}, split_type = ${payload.split_type}
    where id = ${ctx.entityId}
    returning revision`;
  return updated ? { revision: updated.revision } : {};
};

// ---------- API-018 draft.publish ----------

/** Documento atual do rascunho para calcular as pendências com a regra do domínio. */
async function readDocument(tx: Tx, versionId: string) {
  const rows = await tx<
    {
      workout_id: string;
      workout_name: string;
      item: Record<string, unknown> | null;
      active: boolean | null;
    }[]
  >`
    select w.id as workout_id, w.name as workout_name, e.active,
           case when i.id is null then null else jsonb_build_object(
             'id', i.id, 'position', i.position, 'exercise_id', i.exercise_id,
             'measure_type', i.measure_type, 'sets', i.sets, 'reps_min', i.reps_min,
             'reps_max', i.reps_max, 'duration_s', i.duration_s, 'rest_s', i.rest_s,
             'suggested_load_kg', i.suggested_load_kg::float8, 'notes', i.notes) end as item
    from public.workouts w
    left join public.workout_items i on i.workout_id = w.id
    left join public.exercises e on e.id = i.exercise_id
    where w.program_version_id = ${versionId}
    order by w.position, i.position`;
  const workouts = new Map<
    string,
    { id: string; name: string; items: DraftForIssues["workouts"][number]["items"][number][] }
  >();
  const inactive = new Set<string>();
  for (const row of rows) {
    let workout = workouts.get(row.workout_id);
    if (!workout) {
      workout = { id: row.workout_id, name: row.workout_name, items: [] };
      workouts.set(row.workout_id, workout);
    }
    if (row.item) {
      const item = row.item as unknown as DraftForIssues["workouts"][number]["items"][number];
      workout.items.push(item);
      if (row.active === false) inactive.add(item.exercise_id);
    }
  }
  return { workouts: [...workouts.values()], inactive };
}

export const draftPublish: OperationHandler = async (tx, ctx) => {
  parse(emptyPayloadSchema, ctx.payload);
  await lockedDraft(tx, ctx);
  const { workouts, inactive } = await readDocument(tx, ctx.entityId);
  const issues = draftIssues({ workouts }, (id) => !inactive.has(id));
  if (issues.length > 0) throw rejected("DRAFT_INVALID", { issues });
  // RF-116: rotina gerada com outros dias (proposta de ajuste) passa a ser a meta de dias do perfil.
  const [version] = await tx<{ student_id: string; days: number | null }[]>`
    select student_id, (generator_report -> 'inputs' ->> 'days_per_week')::int as days
    from public.program_versions where id = ${ctx.entityId}`;
  if (version && version.days !== null) {
    await tx`
      update public.training_profiles set days_per_week = ${version.days}
      where student_id = ${version.student_id} and days_per_week is distinct from ${version.days}`;
  }
  // TG-02 arquiva a versão ativa anterior e numera esta, na mesma transação.
  const [published] = await tx<{ revision: number }[]>`
    update public.program_versions set status = 'active' where id = ${ctx.entityId}
    returning revision`;
  // RN-025: a rotina nova responde aos dados atuais, então a marca de revisão sai.
  if (version) {
    await tx`
      update public.training_profiles set review_recommended_since = null
      where student_id = ${version.student_id} and review_recommended_since is not null`;
  }
  return published ? { revision: published.revision } : {};
};

// ---------- API-019 draft.discard ----------

export const draftDiscard: OperationHandler = async (tx, ctx) => {
  parse(emptyPayloadSchema, ctx.payload);
  await lockedDraft(tx, ctx);
  await tx`delete from public.program_versions where id = ${ctx.entityId}`;
  return {};
};
