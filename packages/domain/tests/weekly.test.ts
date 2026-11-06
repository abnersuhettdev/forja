import { describe, expect, it } from "vitest";
import { FORBIDDEN } from "../src/motor/ia.ts";
import {
  buildSummaryRequest,
  previousWeekStart,
  unknownNumbers,
  validateSummaryText,
  weeklyFacts,
  type WeeklyExercise,
  type WeeklyInput,
  type WeeklySession,
} from "../src/weekly.ts";

// Hoje é segunda, 9/11/2026: o resumo trata de 2 a 8/11. Horários às 13h UTC (10h em Brasília).
const TODAY = "2026-11-09";
const session = (id: string, day: string, minutes = 50, status = "completed"): WeeklySession => ({
  id,
  started_at: `${day}T13:00:00Z`,
  ended_at: new Date(Date.parse(`${day}T13:00:00Z`) + minutes * 60_000).toISOString(),
  status,
});
const exercise = (
  sessionId: string,
  name: string,
  load: number | null,
  sets = 3,
  status = "done",
): WeeklyExercise => ({
  session_id: sessionId,
  exercise_name: name,
  status,
  max_load_kg: load,
  sets,
});

const base = (over: Partial<WeeklyInput>): WeeklyInput => ({
  today: TODAY,
  timeZone: "America/Sao_Paulo",
  goal: 4,
  routineSince: "2026-10-01",
  dataSince: "2026-08-11",
  sessions: [],
  exercises: [],
  weights: [],
  ...over,
});

/** Semanas (segundas) com o número de dias treinados em cada uma. */
function weeks(counts: Readonly<Record<string, number>>): WeeklySession[] {
  return Object.entries(counts).flatMap(([monday, n]) =>
    Array.from({ length: n }, (_, i) => {
      const day = new Date(Date.parse(`${monday}T00:00:00Z`) + i * 86_400_000)
        .toISOString()
        .slice(0, 10);
      return session(`${monday}-${String(i)}`, day);
    }),
  );
}

describe("fatos da semana (RF-115, TRN-05 §5A)", () => {
  it("a semana do resumo é a anterior, de segunda a domingo", () => {
    expect(previousWeekStart("2026-11-09")).toBe("2026-11-02");
    expect(previousWeekStart("2026-11-15")).toBe("2026-11-02");
  });

  it("conta dias, séries, minutos, carga que subiu, exercício de fora e peso", () => {
    const facts = weeklyFacts(
      base({
        sessions: [
          session("old", "2026-10-28"),
          session("a", "2026-11-02", 55),
          session("b", "2026-11-04", 50),
          session("b2", "2026-11-04", 10),
          session("c", "2026-11-06", 45),
        ],
        exercises: [
          exercise("old", "Supino reto com barra", 40),
          exercise("a", "Supino reto com barra", 42.5),
          exercise("b", "Cadeira flexora", null, 0, "skipped"),
          exercise("c", "Agachamento livre com barra", 60, 4),
        ],
        weights: [
          { measured_on: "2026-10-30", weight_kg: 82.4 },
          { measured_on: "2026-11-07", weight_kg: 82.1 },
        ],
      }),
    );
    expect(facts).toMatchObject({
      week_start: "2026-11-02",
      week_end: "2026-11-08",
      done: 3,
      goal: 4,
      sets: 7,
      minutes: 160,
      load_up: [{ exercise: "Supino reto com barra", from: 40, to: 42.5 }],
      skipped: [{ exercise: "Cadeira flexora", times: 1 }],
      weight: { from: 82.4, to: 82.1 },
      previous_done: 1,
    });
  });

  it("sem rotina nem treino na semana, não há resumo", () => {
    expect(weeklyFacts(base({ routineSince: "2026-11-08" }))).not.toBeNull();
    expect(weeklyFacts(base({ routineSince: "2026-11-09" }))).toBeNull();
    expect(weeklyFacts(base({ routineSince: null }))).toBeNull();
  });
});

describe("sequência na meta (RF-117)", () => {
  it("conta as semanas seguidas com a meta cumprida, até a primeira abaixo", () => {
    const facts = weeklyFacts(
      base({
        sessions: weeks({ "2026-10-12": 2, "2026-10-19": 4, "2026-10-26": 5, "2026-11-02": 4 }),
      }),
    );
    expect(facts?.streak).toBe(3);
  });

  it("semana abaixo da meta zera a sequência", () => {
    expect(
      weeklyFacts(base({ sessions: weeks({ "2026-10-26": 4, "2026-11-02": 3 }) }))?.streak,
    ).toBe(0);
  });
});

describe("proposta de ajuste (RF-116; decisão de 2026-11-05)", () => {
  it("2 semanas abaixo da meta: propõe a média, arredondada para cima", () => {
    const facts = weeklyFacts(base({ sessions: weeks({ "2026-10-26": 1, "2026-11-02": 2 }) }));
    expect(facts?.adjustment).toEqual({ days: 2 });
  });

  it("nenhum treino nas 2 semanas: no mínimo 1 dia", () => {
    expect(weeklyFacts(base({}))?.adjustment).toEqual({ days: 1 });
  });

  it("só uma semana abaixo, ou meta cumprida: sem proposta", () => {
    expect(
      weeklyFacts(base({ sessions: weeks({ "2026-10-26": 4, "2026-11-02": 2 }) }))?.adjustment,
    ).toBeNull();
    expect(
      weeklyFacts(base({ sessions: weeks({ "2026-10-26": 4, "2026-11-02": 4 }) }))?.adjustment,
    ).toBeNull();
  });

  it("rotina publicada há menos de 2 semanas inteiras: sem proposta", () => {
    const facts = weeklyFacts(
      base({ routineSince: "2026-10-28", sessions: weeks({ "2026-10-26": 1, "2026-11-02": 1 }) }),
    );
    expect(facts?.adjustment).toBeNull();
  });

  it("nunca propõe aumentar: com meta de 1 dia não há proposta", () => {
    expect(weeklyFacts(base({ goal: 1 }))?.adjustment).toBeNull();
  });
});

describe("texto da IA (CA-407, RN-030)", () => {
  const facts = weeklyFacts(
    base({
      sessions: weeks({ "2026-10-26": 4, "2026-11-02": 4 }),
      exercises: [
        exercise("2026-10-26-0", "Supino reto com barra", 40),
        exercise("2026-11-02-0", "Supino reto com barra", 42.5),
      ],
    }),
  );
  if (facts === null) throw new Error("fatos ausentes");

  it("aceita texto que só usa números dos fatos", () => {
    const text =
      "Semana completa: 4 de 4 treinos, e a sequência chegou a 2 semanas. O supino reto subiu de 40 para 42,5 kg.";
    expect(validateSummaryText(text, facts)).toBe(text);
  });

  it("recusa número inventado, saúde e marcação", () => {
    expect(unknownNumbers("Você treinou 5 vezes e queimou 300 calorias.", facts)).toEqual([
      "5",
      "300",
    ]);
    expect(
      validateSummaryText("Você treinou 5 vezes nesta semana, muito bem, continue assim.", facts),
    ).toBeNull();
    expect(
      validateSummaryText(
        "Semana completa com 4 treinos; cuide do joelho e evite a dor na próxima.",
        facts,
      ),
    ).toBeNull();
    expect(
      validateSummaryText(
        "**Resumo**: semana completa, 4 de 4 treinos, parabéns pela constância.",
        facts,
      ),
    ).toBeNull();
  });

  it("o pedido leva só fatos, sem nome nem identificador (RN-061)", () => {
    const { user } = buildSummaryRequest(facts);
    expect(JSON.parse(user)).toMatchObject({ treinos_na_semana: 4, meta_de_dias: 4 });
    expect(user).not.toMatch(/"(id|email|nome|student_id|user_id)"|@/u);
  });

  it("a rotina continua recusando carga em número e palavras de saúde", () => {
    expect(FORBIDDEN.test("Use 40 kg no supino.")).toBe(true);
    expect(FORBIDDEN.test("Isso protege o ombro.")).toBe(true);
    expect(FORBIDDEN.test("Mais volume para peitoral.")).toBe(false);
  });
});

describe("casos de borda dos fatos", () => {
  it("sessão sem término não soma minutos; sem meta, sem sequência nem proposta", () => {
    const facts = weeklyFacts(
      base({
        goal: null,
        sessions: [
          { id: "x", started_at: "2026-11-03T13:00:00Z", ended_at: null, status: "completed" },
        ],
      }),
    );
    expect(facts).toMatchObject({ done: 1, minutes: 0, goal: null, streak: 0, adjustment: null });
  });

  it("sessão em andamento ou abandonada não conta como treino", () => {
    const facts = weeklyFacts(
      base({
        sessions: [
          session("x", "2026-11-03", 50, "in_progress"),
          session("y", "2026-11-04", 50, "abandoned"),
        ],
      }),
    );
    expect(facts?.done).toBe(0);
  });

  it("treino na semana conta mesmo sem rotina publicada", () => {
    expect(
      weeklyFacts(base({ routineSince: null, sessions: [session("a", "2026-11-03")] }))?.done,
    ).toBe(1);
  });

  it("a sequência para no começo dos dados disponíveis", () => {
    const facts = weeklyFacts(
      base({
        dataSince: "2026-10-26",
        sessions: weeks({ "2026-10-19": 4, "2026-10-26": 4, "2026-11-02": 4 }),
      }),
    );
    expect(facts?.streak).toBe(2);
  });

  it("dados que não cobrem as 2 semanas: sem proposta", () => {
    expect(weeklyFacts(base({ dataSince: "2026-10-30" }))?.adjustment).toBeNull();
  });

  it("peso só da semana, sem registro anterior: sem variação", () => {
    const facts = weeklyFacts(base({ weights: [{ measured_on: "2026-11-04", weight_kg: 80 }] }));
    expect(facts?.weight).toBeNull();
  });

  it("exercícios de fora: mais vezes primeiro, depois por nome; carga igual não conta como subida", () => {
    const sessions = [
      session("old", "2026-10-28"),
      session("a", "2026-11-03"),
      session("b", "2026-11-05"),
    ];
    const facts = weeklyFacts(
      base({
        sessions,
        exercises: [
          exercise("old", "Remada curvada", 50),
          exercise("a", "Remada curvada", 50),
          exercise("a", "Panturrilha em pé", null, 0, "skipped"),
          exercise("a", "Abdominal", null, 0, "skipped"),
          exercise("b", "Panturrilha em pé", null, 0, "skipped"),
        ],
      }),
    );
    expect(facts?.skipped).toEqual([
      { exercise: "Panturrilha em pé", times: 2 },
      { exercise: "Abdominal", times: 1 },
    ]);
    expect(facts?.load_up).toEqual([]);
  });
});

describe("conferência do texto: tamanho, marcas e números aceitos", () => {
  const facts = weeklyFacts(
    base({
      goal: null,
      sessions: [session("a", "2026-11-03", 95)],
      weights: [
        { measured_on: "2026-10-30", weight_kg: 82.4 },
        { measured_on: "2026-11-07", weight_kg: 82.1 },
      ],
    }),
  );
  if (facts === null) throw new Error("fatos ausentes");

  it("tira o bloco de raciocínio e as aspas, e aceita horas, minutos e peso dos fatos", () => {
    const text =
      "Você treinou 1 vez, somando 1 h 35 min, e o peso foi de 82,4 para 82,1 kg (menos 0,3).";
    expect(validateSummaryText(`<think>rascunho com 99</think>"${text}"`, facts)).toBe(text);
  });

  it("recusa texto curto demais ou longo demais", () => {
    expect(validateSummaryText("Boa semana.", facts)).toBeNull();
    expect(validateSummaryText("Boa semana, continue assim. ".repeat(30), facts)).toBeNull();
  });

  it("recusa termo em inglês", () => {
    expect(
      validateSummaryText(
        "Sua streak continua firme: 1 treino nesta semana, siga no ritmo.",
        facts,
      ),
    ).toBeNull();
  });
});

describe("listas no resumo e no pedido", () => {
  it("cargas que subiram em ordem alfabética; o pedido leva as listas", () => {
    const facts = weeklyFacts(
      base({
        sessions: [session("old", "2026-10-28"), session("a", "2026-11-03")],
        exercises: [
          exercise("old", "Supino reto com barra", 40),
          exercise("old", "Agachamento livre com barra", 60),
          exercise("a", "Supino reto com barra", 42.5),
          exercise("a", "Agachamento livre com barra", 62.5),
          exercise("a", "Cadeira flexora", null, 0, "skipped"),
        ],
      }),
    );
    if (facts === null) throw new Error("fatos ausentes");
    expect(facts.load_up.map((l) => l.exercise)).toEqual([
      "Agachamento livre com barra",
      "Supino reto com barra",
    ]);
    const request = JSON.parse(buildSummaryRequest(facts).user) as {
      carga_subiu: unknown[];
      ficou_de_fora: unknown[];
    };
    expect(request.carga_subiu).toHaveLength(2);
    expect(request.ficou_de_fora).toEqual([{ exercicio: "Cadeira flexora", vezes: 1 }]);
    expect(
      unknownNumbers("A cadeira flexora ficou de fora 1 vez; o supino subiu 2,5.", facts),
    ).toEqual([]);
  });
});
