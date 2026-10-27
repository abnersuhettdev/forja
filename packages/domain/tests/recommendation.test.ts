import { describe, expect, it } from "vitest";
import {
  DEFAULT_REST_CONFIG,
  estimateWorkoutMinutes,
  recommendWorkout,
  restHoursFor,
  sessionGroups,
  type RecommendationInput,
  type RecommendationSession,
} from "../src/index.ts";

// Datas fictícias: 26/10/2026 é segunda-feira; São Paulo = UTC−3.
const A = { id: "treino-a", groups: ["chest", "triceps"] };
const B = { id: "treino-b", groups: ["upper_back", "biceps"] };
const C = { id: "treino-c", groups: ["quadriceps", "glutes"] };

function input(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    workouts: [A, B, C],
    publishedAt: "2026-10-01T12:00:00Z",
    sessions: [],
    rest: DEFAULT_REST_CONFIG,
    daysPerWeek: 4,
    preferredWeekdays: [],
    timeZone: "America/Sao_Paulo",
    now: new Date("2026-10-27T13:00:00Z"), // terça, 10 h
    ...overrides,
  };
}

let counter = 0;
function session(
  workout: { id: string; groups: string[] },
  startedAt: string,
  minutes = 60,
  extra: Partial<RecommendationSession> = {},
): RecommendationSession {
  const ended = new Date(new Date(startedAt).getTime() + minutes * 60_000).toISOString();
  counter += 1;
  return {
    id: `sessao-${String(counter)}`,
    workoutId: workout.id,
    status: "completed",
    startedAt,
    endedAt: ended,
    lastActivityAt: ended,
    groups: workout.groups,
    ...extra,
  };
}

describe("recomendação do treino (TRN-04 §4, casos de referência)", () => {
  it("CT-REC-01: nada feito → recomenda o primeiro da sequência", () => {
    const rec = recommendWorkout(input());
    expect(rec.state).toEqual({ kind: "workout" });
    expect(rec.next).toEqual({ workoutId: "treino-a", lastTrained: null });
    expect(rec.workouts.map((w) => w.recommended)).toEqual([true, false, false]);
  });

  it("CT-REC-02: A feito ontem às 19 h (peitoral) → recomenda B, que usa costas", () => {
    // Segunda 19 h em São Paulo = 22 h UTC; agora terça 10 h (15 h depois, já com o término).
    const rec = recommendWorkout(input({ sessions: [session(A, "2026-10-26T22:00:00Z")] }));
    expect(rec.state).toEqual({ kind: "workout" });
    expect(rec.next?.workoutId).toBe("treino-b");
    expect(rec.workouts[0]?.doneInCycleOn).toBe("2026-10-26");
  });

  it("CT-REC-03: corpo inteiro, A feito há 20 h com descanso 48 h → descanso com horário", () => {
    const fullA = { id: "corpo-a", groups: ["chest", "quadriceps"] };
    const fullB = { id: "corpo-b", groups: ["upper_back", "quadriceps"] };
    const now = new Date("2026-10-27T13:00:00Z");
    const started = new Date(now.getTime() - 21 * 3_600_000).toISOString(); // termina há 20 h
    const rec = recommendWorkout(
      input({ workouts: [fullA, fullB], sessions: [session(fullA, started)], now }),
    );
    expect(rec.state).toEqual({
      kind: "rest_recovery",
      availableAt: new Date(now.getTime() + 28 * 3_600_000).toISOString(),
    });
    expect(rec.next).toBeNull();
    const block = rec.workouts[1]?.block;
    expect(block?.group).toBe("quadriceps");
    expect(block?.hoursSince).toBeCloseTo(20);
    expect(block?.restHours).toBe(48);
  });

  it("CT-REC-04: meta de 3 por semana já atingida → descanso (meta)", () => {
    const sessions = [
      session(A, "2026-10-19T12:00:00Z"), // semana anterior: não conta
      session(B, "2026-10-26T11:00:00Z"), // segunda
      session(C, "2026-10-26T20:00:00Z"), // mesma segunda: um só dia
    ];
    expect(recommendWorkout(input({ daysPerWeek: 2, sessions })).week).toEqual({
      count: 1,
      goal: 2,
    });
    const reached = recommendWorkout(
      input({
        daysPerWeek: 3,
        now: new Date("2026-10-29T13:00:00Z"),
        sessions: [
          session(A, "2026-10-26T11:00:00Z"),
          session(B, "2026-10-27T11:00:00Z"),
          session(C, "2026-10-28T11:00:00Z"),
        ],
      }),
    );
    expect(reached.state).toEqual({ kind: "rest_goal" });
    expect(reached.week).toEqual({ count: 3, goal: 3 });
  });

  it("CT-REC-05: abdômen com 0 h é ignorado na compatibilidade", () => {
    const x = { id: "x", groups: ["chest", "abs"] };
    const y = { id: "y", groups: ["upper_back", "abs"] };
    const sessions = [session(x, "2026-10-26T20:00:00Z")];
    const blocked = recommendWorkout(input({ workouts: [x, y], sessions }));
    expect(blocked.state.kind).toBe("rest_recovery");
    expect(blocked.next).toBeNull();
    const rec = recommendWorkout(
      input({
        workouts: [x, y],
        sessions,
        rest: { defaultHours: 48, overrides: { abs: 0 } },
      }),
    );
    expect(rec.state).toEqual({ kind: "workout" });
    expect(rec.next?.workoutId).toBe("y");
  });

  it("CT-REC-06: sessão pendente de envio ontem é considerada (RN-049)", () => {
    // A sessão vem da cópia do aparelho, com ou sem envio: o cálculo não distingue.
    const rec = recommendWorkout(input({ sessions: [session(A, "2026-10-26T22:00:00Z")] }));
    expect(rec.next?.workoutId).toBe("treino-b");
    expect(rec.week.count).toBe(1);
  });

  it("CT-REC-07: nova versão publicada hoje → ciclo recomeça no primeiro treino", () => {
    const sessions = [session(A, "2026-10-20T12:00:00Z"), session(B, "2026-10-22T12:00:00Z")];
    expect(recommendWorkout(input({ sessions })).next?.workoutId).toBe("treino-c");
    const rec = recommendWorkout(input({ sessions, publishedAt: "2026-10-27T12:30:00Z" }));
    expect(rec.next?.workoutId).toBe("treino-a");
    expect(rec.workouts.every((w) => w.doneInCycleOn === null)).toBe(true);
  });
});

describe("recomendação — demais regras", () => {
  it("ciclo completo recomeça a contagem", () => {
    const sessions = [
      session(A, "2026-10-15T12:00:00Z"),
      session(B, "2026-10-17T12:00:00Z"),
      session(C, "2026-10-19T12:00:00Z"),
      session(A, "2026-10-21T12:00:00Z"),
    ];
    const rec = recommendWorkout(input({ sessions }));
    expect(rec.next?.workoutId).toBe("treino-b");
    expect(rec.workouts.map((w) => w.doneInCycleOn)).toEqual(["2026-10-21", null, null]);
  });

  it("ciclo anterior à janela de 90 dias começa no início da janela", () => {
    const rec = recommendWorkout(
      input({
        publishedAt: "2026-01-01T12:00:00Z",
        sessions: [session(A, "2026-02-01T12:00:00Z")], // fora da janela: ignorada no ciclo
      }),
    );
    expect(rec.next?.workoutId).toBe("treino-a");
  });

  it("pula o pendente em descanso e informa o grupo mais recente no motivo", () => {
    const sessions = [
      session(A, "2026-10-24T12:00:00Z"),
      session({ id: "outro", groups: ["upper_back"] }, "2026-10-26T12:00:00Z"),
    ];
    const rec = recommendWorkout(input({ sessions }));
    expect(rec.next?.workoutId).toBe("treino-c");
    expect(rec.workouts[1]?.block?.group).toBe("upper_back");
    const rec2 = recommendWorkout(input({ sessions: [session(C, "2026-10-20T13:00:00Z")] }));
    expect(rec2.next?.workoutId).toBe("treino-a");
    const withHistory = recommendWorkout(
      input({ sessions: [session(A, "2026-10-20T13:00:00Z"), session(B, "2026-10-22T13:00:00Z")] }),
    );
    expect(withHistory.next?.workoutId).toBe("treino-c");
    expect(withHistory.next?.lastTrained).toBeNull();
    const reason = recommendWorkout(
      input({
        workouts: [A, B],
        sessions: [
          session(A, "2026-10-20T13:00:00Z"),
          session(B, "2026-10-22T13:00:00Z"),
          session(A, "2026-10-23T13:00:00Z"),
        ],
      }),
    );
    expect(reason.next?.workoutId).toBe("treino-b");
    expect(reason.next?.lastTrained?.group).toBe("upper_back");
    expect(reason.next?.lastTrained?.hoursSince).toBeCloseTo(119);
  });

  it("sessão em andamento ativa → continuar; sem atividade há mais de 6 h não conta", () => {
    const active = session(B, "2026-10-27T12:30:00Z", 0, {
      status: "in_progress",
      endedAt: null,
      lastActivityAt: "2026-10-27T12:50:00Z",
    });
    const older = { ...active, id: "mais-antiga", lastActivityAt: "2026-10-27T12:40:00Z" };
    expect(recommendWorkout(input({ sessions: [older, active] })).state).toEqual({
      kind: "continue",
      sessionId: active.id,
      workoutId: "treino-b",
    });
    const stale = { ...active, lastActivityAt: "2026-10-27T06:00:00Z" };
    expect(recommendWorkout(input({ sessions: [stale] })).state.kind).toBe("workout");
  });

  it("concluído hoje mostra o próximo; dia não planejado vira observação", () => {
    const today = session(A, "2026-10-27T10:00:00Z");
    const earlier = session(C, "2026-10-27T09:00:00Z", 30);
    const rec = recommendWorkout(
      input({ sessions: [earlier, today], preferredWeekdays: [1, 3, 5] }),
    );
    expect(rec.state).toEqual({
      kind: "completed_today",
      sessionId: today.id,
      workoutId: "treino-a",
    });
    expect(rec.next?.workoutId).toBe("treino-b");
    expect(rec.notPlannedToday).toBe(true);
    expect(recommendWorkout(input({ preferredWeekdays: [2] })).notPlannedToday).toBe(false);
  });

  it("abandonadas e em andamento não contam como presença nem como feitas", () => {
    const abandoned = session(A, "2026-10-26T12:00:00Z", 30, { status: "abandoned" });
    const rec = recommendWorkout(input({ sessions: [abandoned], daysPerWeek: null }));
    expect(rec.week).toEqual({ count: 0, goal: null });
    expect(rec.next?.workoutId).toBe("treino-a");
  });

  it("sem treino compatível nem liberação conhecida devolve horário nulo", () => {
    const rec = recommendWorkout(
      input({ workouts: [A], sessions: [session(A, "2026-10-26T12:00:00Z")] }),
    );
    // Um único treino: o ciclo recomeça ao fazê-lo; o peitoral ainda descansa.
    expect(rec.state.kind).toBe("rest_recovery");
    expect(recommendWorkout(input({ workouts: [] })).state).toEqual({
      kind: "rest_recovery",
      availableAt: null,
    });
  });
});

describe("descanso e grupos", () => {
  it("usa o ajuste do grupo ou o padrão", () => {
    const rest = { defaultHours: 72, overrides: { chest: 24 } };
    expect(restHoursFor(rest, "chest")).toBe(24);
    expect(restHoursFor(rest, "lats")).toBe(72);
  });

  it("grupos da sessão: exercícios com séries; manual sem séries usa o treino", () => {
    expect(sessionGroups("completed", [["chest"], ["chest", "triceps"]], ["x"]).sort()).toEqual([
      "chest",
      "triceps",
    ]);
    expect(sessionGroups("manual", [], ["lats"])).toEqual(["lats"]);
    expect(sessionGroups("completed", [], ["lats"])).toEqual([]);
  });
});

describe("duração estimada (TRN-04 §5, ADR-065)", () => {
  it("séries × (45 s + descanso) + 60 s por exercício, arredondada para 5 min", () => {
    // 3 × (45 + 90) + 60 = 465 s; dois itens = 930 s = 15,5 min → 15 min.
    const item = { measure_type: "reps" as const, sets: 3, duration_s: null, rest_s: 90 };
    expect(estimateWorkoutMinutes([item, item])).toBe(15);
    // Item por duração usa a duração prescrita: 3 × (60 + 60) + 60 = 420 s = 7 min → 5 min.
    expect(
      estimateWorkoutMinutes([{ measure_type: "duration", sets: 3, duration_s: 60, rest_s: 60 }]),
    ).toBe(5);
    expect(
      estimateWorkoutMinutes([{ measure_type: "reps", sets: 1, duration_s: null, rest_s: 0 }]),
    ).toBe(5);
    expect(estimateWorkoutMinutes([])).toBe(0);
  });
});
