// Resumo da semana (TRN-05 §5A; RF-115..117; RN-060, RN-062): as regras calculam os fatos da semana
// anterior (seg–dom, fuso do aluno). A IA só escreve o texto a partir deles, sem inventar números.
import { addDays, toLocalDate, weekBounds } from "./time.ts";

export interface WeeklySession {
  readonly id: string;
  readonly started_at: string;
  readonly ended_at: string | null;
  readonly status: string;
}

export interface WeeklyExercise {
  readonly session_id: string;
  readonly exercise_name: string;
  readonly status: string;
  /** Maior carga registrada no exercício nesta sessão; null sem séries. */
  readonly max_load_kg: number | null;
  readonly sets: number;
}

export interface WeeklyWeight {
  readonly measured_on: string;
  readonly weight_kg: number;
}

export interface WeeklyInput {
  readonly today: string;
  readonly timeZone: string;
  /** Meta de dias por semana (RN-038); null sem perfil completo. */
  readonly goal: number | null;
  /** Publicação da rotina ativa (data local); a proposta de ajuste só conta semanas inteiras dela. */
  readonly routineSince: string | null;
  /** Primeiro dia com dados disponíveis (janela do aparelho ou do servidor). */
  readonly dataSince: string;
  readonly sessions: readonly WeeklySession[];
  readonly exercises: readonly WeeklyExercise[];
  readonly weights: readonly WeeklyWeight[];
}

export interface WeeklyFacts {
  readonly week_start: string;
  readonly week_end: string;
  readonly done: number;
  readonly goal: number | null;
  readonly sets: number;
  readonly minutes: number;
  readonly load_up: readonly {
    readonly exercise: string;
    readonly from: number;
    readonly to: number;
  }[];
  readonly skipped: readonly { readonly exercise: string; readonly times: number }[];
  readonly weight: { readonly from: number; readonly to: number } | null;
  /** Semanas seguidas cumprindo a meta, contando a semana do resumo (RF-117). */
  readonly streak: number;
  readonly previous_done: number;
  /** RF-116: rotina com menos dias, depois de 2 semanas seguidas abaixo da meta. */
  readonly adjustment: { readonly days: number } | null;
}

const FINISHED = new Set(["completed", "manual"]);
const LIST_LIMIT = 3;
/** Até onde a sequência olha para trás (a janela de sessões do aparelho é de 90 dias). */
const STREAK_WEEKS = 12;

/** Segunda-feira da semana anterior a `today`. */
export function previousWeekStart(today: string): string {
  return addDays(weekBounds(today).start, -7);
}

function localDay(iso: string, timeZone: string): string {
  return toLocalDate(new Date(iso), timeZone);
}

export function weeklyFacts(input: WeeklyInput): WeeklyFacts | null {
  const { timeZone } = input;
  const start = previousWeekStart(input.today);
  const end = addDays(start, 6);
  const finished = input.sessions.filter((s) => FINISHED.has(s.status));
  const dayOf = new Map(finished.map((s) => [s.id, localDay(s.started_at, timeZone)]));
  const presence = (from: string, to: string) =>
    new Set([...dayOf.values()].filter((day) => day >= from && day <= to)).size;

  const inWeek = finished.filter((s) => {
    const day = dayOf.get(s.id) ?? "";
    return day >= start && day <= end;
  });
  const hadRoutine = input.routineSince !== null && input.routineSince <= end;
  if (inWeek.length === 0 && !hadRoutine) return null;

  const weekIds = new Set(inWeek.map((s) => s.id));
  const weekExercises = input.exercises.filter((e) => weekIds.has(e.session_id));
  const minutes = inWeek.reduce((sum, s) => {
    if (s.ended_at === null) return sum;
    return sum + Math.max(0, (Date.parse(s.ended_at) - Date.parse(s.started_at)) / 60_000);
  }, 0);

  // Carga que subiu: maior carga da semana contra a da sessão anterior mais recente do exercício.
  const before = input.exercises
    .flatMap((e) => {
      const day = dayOf.get(e.session_id);
      return day !== undefined && day < start && e.max_load_kg !== null
        ? [{ day, name: e.exercise_name, load: e.max_load_kg }]
        : [];
    })
    .sort((a, b) => a.day.localeCompare(b.day));
  const lastBefore = new Map(before.map((e) => [e.name, e.load]));
  const weekMax = new Map<string, number>();
  for (const e of weekExercises) {
    if (e.max_load_kg === null) continue;
    weekMax.set(e.exercise_name, Math.max(weekMax.get(e.exercise_name) ?? 0, e.max_load_kg));
  }
  const load_up = [...weekMax]
    .flatMap(([exercise, to]) => {
      const from = lastBefore.get(exercise);
      return from !== undefined && to > from ? [{ exercise, from, to }] : [];
    })
    .sort((a, b) => a.exercise.localeCompare(b.exercise, "pt-BR"))
    .slice(0, LIST_LIMIT);

  const skippedCount = new Map<string, number>();
  for (const e of weekExercises) {
    if (e.status === "skipped")
      skippedCount.set(e.exercise_name, (skippedCount.get(e.exercise_name) ?? 0) + 1);
  }
  const skipped = [...skippedCount]
    .map(([exercise, times]) => ({ exercise, times }))
    .sort((a, b) => b.times - a.times || a.exercise.localeCompare(b.exercise, "pt-BR"))
    .slice(0, LIST_LIMIT);

  const byDate = [...input.weights].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  const fromWeight = byDate.filter((w) => w.measured_on < start).at(-1);
  const toWeight = byDate.filter((w) => w.measured_on >= start && w.measured_on <= end).at(-1);

  const done = presence(start, end);
  const goal = input.goal;
  let streak = 0;
  if (goal !== null) {
    for (let k = 0; k < STREAK_WEEKS; k++) {
      const from = addDays(start, -7 * k);
      if (from < input.dataSince || presence(from, addDays(from, 6)) < goal) break;
      streak++;
    }
  }

  const previousStart = addDays(start, -7);
  const previous_done = presence(previousStart, addDays(previousStart, 6));
  const fullWeeks =
    input.routineSince !== null &&
    input.routineSince <= previousStart &&
    input.dataSince <= previousStart;
  let adjustment: WeeklyFacts["adjustment"] = null;
  if (goal !== null && fullWeeks && done < goal && previous_done < goal) {
    const days = Math.max(1, Math.ceil((done + previous_done) / 2));
    if (days < goal) adjustment = { days };
  }

  return {
    week_start: start,
    week_end: end,
    done,
    goal,
    sets: weekExercises.reduce((sum, e) => sum + e.sets, 0),
    minutes: Math.round(minutes),
    load_up,
    skipped,
    weight: fromWeight && toWeight ? { from: fromWeight.weight_kg, to: toWeight.weight_kg } : null,
    streak,
    previous_done,
    adjustment,
  };
}

/** Todos os números que o texto pode citar (CA-407), com vírgula ou ponto decimal. */
export function factNumbers(facts: WeeklyFacts): Set<string> {
  const values: number[] = [
    facts.done,
    facts.sets,
    facts.minutes,
    facts.streak,
    facts.previous_done,
    ...(facts.goal === null ? [] : [facts.goal]),
    ...facts.load_up.flatMap((l) => [l.from, l.to, Math.round((l.to - l.from) * 10) / 10]),
    ...facts.skipped.map((s) => s.times),
    ...(facts.weight
      ? [
          facts.weight.from,
          facts.weight.to,
          Math.abs(Math.round((facts.weight.to - facts.weight.from) * 10) / 10),
        ]
      : []),
    ...(facts.adjustment ? [facts.adjustment.days] : []),
    Math.floor(facts.minutes / 60),
    facts.minutes % 60,
  ];
  const set = new Set<string>();
  for (const value of values) {
    const text = String(value);
    set.add(text);
    set.add(text.replace(".", ","));
  }
  return set;
}

/** Números citados no texto que não estão nos fatos; vazio = texto aceito. */
export function unknownNumbers(text: string, facts: WeeklyFacts): string[] {
  const allowed = factNumbers(facts);
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? []).filter((n) => !allowed.has(n));
}

/**
 * Diagnóstico, indicação médica, promessa sobre saúde ou região do corpo: nada disso vai para a
 * tela (RN-030). Barreira simples por palavras, usada também na rotina (motor/ia.ts).
 */
export const HEALTH_WORDS =
  /(?<![\p{L}])(diagn[oó]stic|tendinite|h[eé]rnia|artrose|lombalgia|prescrevo|medicamento|rem[eé]dio|anti-?inflamat|proteg|prote[cç][aã]o|segur[oaç]|les[aã]o|les[oõ]es|dor(?![\p{L}])|dores|desconforto|articula|preserva[cç][aã]o|sobrecarg|estresse|lombar|coluna|cervical|tor[aá]cic|joelho|tornozelo|cotovelo|punho|pulso)/iu;

const SUMMARY_SYSTEM = `Você escreve o resumo da semana de treino de uma pessoa, em português do Brasil, com 2 a 4 frases curtas, tratando a pessoa por "você".
Regras:
1. Use só os números que estão nos fatos, escritos como estão. Não invente números, datas nem exercícios.
2. Não fale de saúde, segurança, lesão, dor ou partes do corpo, e não sugira carga.
3. Se a meta foi cumprida, reconheça a sequência de semanas. Se ficou abaixo, incentive sem cobrar.
4. Se houver ajuste proposto, diga só que há uma proposta logo abaixo.
Responda apenas o texto, sem título, sem listas e sem aspas.`;

/** Pedido do resumo (API-033): só os fatos, sem nome, e-mail nem identificador (RN-061). */
export function buildSummaryRequest(facts: WeeklyFacts): { system: string; user: string } {
  const user = {
    treinos_na_semana: facts.done,
    meta_de_dias: facts.goal,
    semana_anterior: facts.previous_done,
    series: facts.sets,
    minutos: facts.minutes,
    semanas_seguidas_na_meta: facts.streak,
    carga_subiu: facts.load_up.map((l) => ({ exercicio: l.exercise, de: l.from, para: l.to })),
    ficou_de_fora: facts.skipped.map((s) => ({ exercicio: s.exercise, vezes: s.times })),
    peso: facts.weight ? { de: facts.weight.from, para: facts.weight.to } : null,
    ajuste_proposto: facts.adjustment ? { dias: facts.adjustment.days } : null,
  };
  return { system: SUMMARY_SYSTEM, user: JSON.stringify(user) };
}

/** Texto aceito ou null (vale só os fatos — RN-062). */
export function validateSummaryText(raw: string, facts: WeeklyFacts): string | null {
  const text = raw
    .replace(/<think>[\s\S]*?<\/think>/giu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/^["“]|["”]$/gu, "");
  if (text.length < 40 || text.length > 600) return null;
  if (HEALTH_WORDS.test(text) || /[*#`]|(?<![\p{L}])(week|streak|sets)(?![\p{L}])/iu.test(text))
    return null;
  return unknownNumbers(text, facts).length === 0 ? text : null;
}
