// API-032 `POST /ai/routine` (RF-110, RN-009, RN-060..063, ADR-093): motor + IA, com o motor como
// resultado garantido. Não grava o programa: o app cria o rascunho pela função de sincronização
// (ARQ-01), e publicar continua sendo o toque da pessoa. Nada do conteúdo vai para o log.
import {
  toLocalDate,
  type Equipment,
  type Restriction,
} from "../../../packages/domain/src/index.ts";
import {
  generateProgram,
  type MotorExercise,
  type MotorProfile,
  type MotorResult,
} from "../../../packages/domain/src/motor/index.ts";
import {
  applyAiReply,
  buildAiRequest,
  motorOnlyReport,
  validateAiReply,
  type AiExtras,
} from "../../../packages/domain/src/motor/ia.ts";
import type { Identity } from "../sync/process.ts";
import type { SyncDb, Tx } from "../sync/db.ts";
import type { AiProvider } from "./workers-ai.ts";

/** RN-063: valores definidos depois da prova de qualidade; a confirmar pelo usuário. */
export const USER_DAILY_LIMIT = 10;
export const DAILY_NEURON_LIMIT = 8_000;
const NOTES_LIMIT = 5;
const NOTE_LENGTH = 200;
const HISTORY_DAYS = 28;

export interface RoutineDeps {
  readonly db: SyncDb;
  readonly provider: AiProvider | null;
  readonly hash: (text: string) => Promise<string>;
  readonly now?: Date;
}

interface LoadedData {
  readonly profile: MotorProfile;
  readonly timezone: string;
  readonly staleData: boolean;
  readonly catalog: MotorExercise[];
  readonly previous: string[];
  readonly extras: AiExtras;
  readonly userCalls: number;
  readonly neuronsToday: number;
}

async function load(
  tx: Tx,
  userId: string,
  subject: string,
  now: Date,
): Promise<LoadedData | null> {
  const [row] = await tx<
    (Omit<MotorProfile, "emphasis_groups"> & {
      emphasis_groups: MotorProfile["emphasis_groups"];
      student_id: string;
      timezone: string;
      goal_weight_kg: number | null;
      review_recommended_since: string | null;
    })[]
  >`
    select s.id as student_id, s.birth_date, s.timezone, p.goal,
           p.goal_weight_kg::float8 as goal_weight_kg, p.experience_level, p.days_per_week,
           p.minutes_per_session, p.equipment_codes, p.restrictions_declared, p.restriction_codes,
           p.emphasis_groups, p.review_recommended_since
    from public.students s
    join public.training_profiles p on p.student_id = s.id
    where s.user_id = ${userId}`;
  if (!row) return null;

  const exercises = await tx<
    {
      id: string;
      source_ref: string | null;
      name: string;
      difficulty: MotorExercise["difficulty"];
      measure_type: MotorExercise["measure_type"];
      movement_pattern: MotorExercise["movement_pattern"];
      load_markers: MotorExercise["load_markers"];
      contraindications: Restriction[];
      primary_groups: MotorExercise["primary"];
      secondary_groups: MotorExercise["secondary"];
      equipment: Equipment[];
    }[]
  >`
    select e.id, e.source_ref, e.name, e.difficulty, e.measure_type, e.movement_pattern,
      e.load_markers,
      array(select c.restriction_code from public.exercise_contraindications c
            where c.exercise_id = e.id) as contraindications,
      array(select m.muscle_group_code from public.exercise_muscles m
            where m.exercise_id = e.id and m.role = 'primary') as primary_groups,
      array(select m.muscle_group_code from public.exercise_muscles m
            where m.exercise_id = e.id and m.role = 'secondary') as secondary_groups,
      array(select q.equipment_code from public.exercise_equipment q
            where q.exercise_id = e.id) as equipment
    from public.exercises e
    where e.active`;

  const previous = await tx<{ exercise_id: string }[]>`
    select i.exercise_id from public.workout_items i
    join public.workouts w on w.id = i.workout_id
    join public.program_versions v on v.id = w.program_version_id
    where v.student_id = ${row.student_id} and v.status = 'active'`;

  const since = new Date(now.getTime() - HISTORY_DAYS * 86_400_000).toISOString();
  const [history] = await tx<{ count: number }[]>`
    select count(*)::int as count from public.sessions
    where student_id = ${row.student_id} and deleted_at is null
      and status in ('completed', 'manual') and started_at >= ${since}`;
  const notes = await tx<{ notes: string }[]>`
    select notes from public.sessions
    where student_id = ${row.student_id} and deleted_at is null and notes is not null
      and started_at >= ${since}
    order by started_at desc limit ${NOTES_LIMIT}`;
  const [weight] = await tx<{ weight_kg: number }[]>`
    select weight_kg::float8 as weight_kg from public.weight_entries
    where student_id = ${row.student_id} and deleted_at is null
    order by measured_on desc limit 1`;

  const dayStart = `${now.toISOString().slice(0, 10)}T00:00:00Z`;
  const [usage] = await tx<{ user_calls: number; neurons: number }[]>`
    select count(*) filter (where subject_hash = ${subject} and outcome <> 'quota')::int as user_calls,
           coalesce(sum(neurons), 0)::float8 as neurons
    from public.ai_usage where occurred_at >= ${dayStart}`;

  const extras: AiExtras = {
    ...(weight ? { weight_kg: weight.weight_kg } : {}),
    ...(row.goal_weight_kg === null ? {} : { goal_weight_kg: row.goal_weight_kg }),
    sessions_per_week_recent: Math.round(((history?.count ?? 0) / (HISTORY_DAYS / 7)) * 10) / 10,
    session_notes: notes.map((n) => n.notes.slice(0, NOTE_LENGTH)),
  };
  return {
    profile: {
      birth_date: row.birth_date,
      goal: row.goal,
      experience_level: row.experience_level,
      days_per_week: row.days_per_week,
      minutes_per_session: row.minutes_per_session,
      equipment_codes: row.equipment_codes,
      restrictions_declared: row.restrictions_declared,
      restriction_codes: row.restriction_codes,
      emphasis_groups: row.emphasis_groups ?? null,
    },
    timezone: row.timezone,
    staleData: row.review_recommended_since !== null,
    catalog: exercises.map((e) => ({
      id: e.id,
      code: e.source_ref ?? e.id,
      name: e.name,
      difficulty: e.difficulty,
      measure_type: e.measure_type,
      movement_pattern: e.movement_pattern,
      load_markers: e.load_markers,
      contraindications: e.contraindications,
      primary: e.primary_groups,
      secondary: e.secondary_groups,
      equipment: e.equipment,
    })),
    previous: previous.map((p) => p.exercise_id),
    extras,
    userCalls: usage?.user_calls ?? 0,
    neuronsToday: usage?.neurons ?? 0,
  };
}

export async function generateRoutine(
  identity: Identity,
  deps: RoutineDeps,
): Promise<{ status: number; body: unknown }> {
  const now = deps.now ?? new Date();
  const subject = await deps.hash(identity.userId);
  const data = await deps.db.inActorTransaction(identity.userId, (tx) =>
    load(tx, identity.userId, subject, now),
  );
  if (data === null) return { status: 404, body: { code: "NOT_FOUND" } };

  const referenceDate = toLocalDate(now, data.timezone);
  const motor: MotorResult = generateProgram({
    profile: data.profile,
    catalog: data.catalog,
    referenceDate,
    previousExerciseIds: data.previous,
    staleData: data.staleData,
  });
  if (motor.status === "blocked") {
    return { status: 200, body: { status: "blocked", pending: motor.pending } };
  }

  const finish = async (
    outcome: "ok" | "invalid" | "unavailable" | "quota",
    neurons: number,
    model: string | null,
    result: typeof motor,
  ) => {
    await deps.db.inActorTransaction(identity.userId, (tx) =>
      tx`
        insert into public.ai_usage (subject_hash, kind, model, outcome, neurons)
        values (${subject}, 'routine', ${model}, ${outcome}, ${neurons})`.then(() => undefined),
    );
    return { status: 200, body: result };
  };

  // Sem IA, sem cota ou com resposta inválida, vale o motor (RN-062).
  if (data.userCalls >= USER_DAILY_LIMIT || data.neuronsToday >= DAILY_NEURON_LIMIT) {
    return finish("quota", 0, null, motorOnlyReport(motor, "quota"));
  }
  if (deps.provider === null)
    return finish("unavailable", 0, null, motorOnlyReport(motor, "unavailable"));

  const request = buildAiRequest({
    profile: data.profile,
    catalog: data.catalog,
    referenceDate,
    workouts: motor.program.workouts,
    extras: data.extras,
  });
  if (request === null)
    return finish("unavailable", 0, null, motorOnlyReport(motor, "unavailable"));

  let answer;
  try {
    answer = await deps.provider.complete(request.system, request.user);
  } catch {
    return finish("unavailable", 0, deps.provider.model, motorOnlyReport(motor, "unavailable"));
  }
  const reply = validateAiReply(answer.content, request);
  const applied = reply.ok
    ? applyAiReply({
        result: motor,
        reply,
        profile: data.profile,
        catalog: data.catalog,
        referenceDate,
        model: deps.provider.model,
      })
    : null;
  if (applied === null) {
    return finish(
      "invalid",
      answer.neurons,
      deps.provider.model,
      motorOnlyReport(motor, "invalid"),
    );
  }
  return finish("ok", answer.neurons, deps.provider.model, applied);
}
