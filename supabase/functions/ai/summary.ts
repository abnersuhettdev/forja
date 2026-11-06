// API-033 `POST /ai/summary` (RF-115..117, RN-060..063, ADR-093): as regras calculam os fatos da
// semana anterior; a IA só escreve o texto, que é conferido contra os fatos. No máximo um resumo
// gravado por semana. Sem IA, sem cota ou com texto inválido, vale só os fatos. Nada vai para o log.
import { addDays, toLocalDate } from "../../../packages/domain/src/index.ts";
import {
  buildSummaryRequest,
  previousWeekStart,
  validateSummaryText,
  weeklyFacts,
  type WeeklyFacts,
} from "../../../packages/domain/src/weekly.ts";
import type { Identity } from "../sync/process.ts";
import { asJson, type SyncDb } from "../sync/db.ts";
import { DAILY_NEURON_LIMIT, USER_DAILY_LIMIT } from "./routine.ts";
import type { AiProvider } from "./workers-ai.ts";

/** Janela de dados para a sequência (12 semanas além da semana do resumo). */
const DATA_DAYS = 91;

export interface SummaryDeps {
  readonly db: SyncDb;
  readonly provider: AiProvider | null;
  readonly hash: (text: string) => Promise<string>;
  readonly now?: Date;
}

export type SummaryBody =
  | { readonly status: "none" }
  | {
      readonly status: "ready";
      readonly facts: WeeklyFacts;
      readonly text: string | null;
      readonly model: string | null;
    };

export async function generateSummary(
  identity: Identity,
  deps: SummaryDeps,
): Promise<{ status: number; body: unknown }> {
  const now = deps.now ?? new Date();
  const subject = await deps.hash(identity.userId);
  const loaded = await deps.db.inActorTransaction(identity.userId, async (tx) => {
    const [student] = await tx<
      { id: string; timezone: string; days: number | null; published_at: Date | null }[]
    >`
      select s.id, s.timezone, p.days_per_week as days,
        (select v.published_at from public.program_versions v
         where v.student_id = s.id and v.status = 'active') as published_at
      from public.students s join public.training_profiles p on p.student_id = s.id
      where s.user_id = ${identity.userId}`;
    if (!student) return null;
    const today = toLocalDate(now, student.timezone);
    const since = addDays(today, -DATA_DAYS);
    const weekStart = previousWeekStart(today);
    const [stored] = await tx<{ facts: WeeklyFacts; text: string | null; model: string | null }[]>`
      select facts, text, model from public.weekly_summaries
      where student_id = ${student.id} and week_start = ${weekStart}`;
    if (stored) return { stored, studentId: student.id, weekStart, facts: null };

    const sinceInstant = new Date(Date.parse(`${since}T00:00:00Z`) - 86_400_000).toISOString();
    const sessions = await tx<
      { id: string; started_at: Date; ended_at: Date | null; status: string }[]
    >`
      select id, started_at, ended_at, status from public.sessions
      where student_id = ${student.id} and deleted_at is null and started_at >= ${sinceInstant}`;
    const exercises = await tx<
      {
        session_id: string;
        exercise_name: string;
        status: string;
        max_load_kg: number | null;
        sets: number;
      }[]
    >`
      select se.session_id, e.name as exercise_name, se.status,
             max(l.load_kg)::float8 as max_load_kg, count(l.id)::int as sets
      from public.session_exercises se
      join public.sessions s on s.id = se.session_id
      join public.exercises e on e.id = se.exercise_id
      left join public.set_logs l on l.session_exercise_id = se.id and l.deleted_at is null
      where s.student_id = ${student.id} and s.deleted_at is null and se.deleted_at is null
        and s.started_at >= ${sinceInstant}
      group by se.id, se.session_id, e.name, se.status`;
    const weights = await tx<{ measured_on: string; weight_kg: number }[]>`
      select measured_on::text, weight_kg::float8 as weight_kg from public.weight_entries
      where student_id = ${student.id} and deleted_at is null and measured_on >= ${since}`;
    const facts = weeklyFacts({
      today,
      timeZone: student.timezone,
      goal: student.days,
      routineSince:
        student.published_at === null ? null : toLocalDate(student.published_at, student.timezone),
      dataSince: since,
      sessions: sessions.map((s) => ({
        id: s.id,
        started_at: s.started_at.toISOString(),
        ended_at: s.ended_at === null ? null : s.ended_at.toISOString(),
        status: s.status,
      })),
      exercises: [...exercises],
      weights: [...weights],
    });
    const dayStart = `${now.toISOString().slice(0, 10)}T00:00:00Z`;
    const [usage] = await tx<{ user_calls: number; neurons: number }[]>`
      select count(*) filter (where subject_hash = ${subject} and outcome <> 'quota')::int as user_calls,
             coalesce(sum(neurons), 0)::float8 as neurons
      from public.ai_usage where occurred_at >= ${dayStart}`;
    return { stored: null, studentId: student.id, weekStart, facts, usage };
  });
  if (loaded === null) return { status: 404, body: { code: "NOT_FOUND" } };
  if (loaded.stored) {
    return { status: 200, body: { status: "ready", ...loaded.stored } satisfies SummaryBody };
  }
  const { facts, usage } = loaded;
  if (facts === null) return { status: 200, body: { status: "none" } satisfies SummaryBody };

  const record = (
    outcome: "ok" | "invalid" | "unavailable" | "quota",
    neurons: number,
    model: string | null,
  ) =>
    deps.db.inActorTransaction(identity.userId, (tx) =>
      tx`
        insert into public.ai_usage (subject_hash, kind, model, outcome, neurons)
        values (${subject}, 'summary', ${model}, ${outcome}, ${neurons})`.then(() => undefined),
    );
  const factsOnly: SummaryBody = { status: "ready", facts, text: null, model: null };

  if ((usage?.user_calls ?? 0) >= USER_DAILY_LIMIT || (usage?.neurons ?? 0) >= DAILY_NEURON_LIMIT) {
    await record("quota", 0, null);
    return { status: 200, body: factsOnly };
  }
  if (deps.provider === null) {
    await record("unavailable", 0, null);
    return { status: 200, body: factsOnly };
  }
  const request = buildSummaryRequest(facts);
  let answer;
  try {
    answer = await deps.provider.complete(request.system, request.user);
  } catch {
    await record("unavailable", 0, deps.provider.model);
    return { status: 200, body: factsOnly };
  }
  const text =
    typeof answer.content === "string" ? validateSummaryText(answer.content, facts) : null;
  await record(text === null ? "invalid" : "ok", answer.neurons, deps.provider.model);
  if (text === null) return { status: 200, body: factsOnly };
  const model = deps.provider.model;
  // Um por semana: se outro pedido gravou antes, vale o já gravado.
  const [saved] = await deps.db.inActorTransaction(identity.userId, async (tx) => {
    await tx`
      insert into public.weekly_summaries (student_id, week_start, facts, text, model)
      values (${loaded.studentId}, ${loaded.weekStart}, ${tx.json(asJson(facts))},
              ${text}, ${model})
      on conflict (student_id, week_start) do nothing`;
    return tx<{ facts: WeeklyFacts; text: string | null; model: string | null }[]>`
      select facts, text, model from public.weekly_summaries
      where student_id = ${loaded.studentId} and week_start = ${loaded.weekStart}`;
  });
  return {
    status: 200,
    body: { status: "ready", ...(saved ?? { facts, text, model }) } satisfies SummaryBody,
  };
}
