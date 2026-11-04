// Contrato com a IA e prova de qualidade, sem rede (ADR-093; CA-402, CA-404; RN-060, RN-061).
import { describe, expect, it } from "vitest";
import { generateProgram, type MotorExercise } from "../../packages/domain/src/motor/index.ts";
import {
  ageBand,
  buildAiRequest,
  validateAiReply,
  type AiRequest,
} from "../../packages/domain/src/motor/ia.ts";
import { readCatalog } from "../catalog/seed-sql.ts";
import { PROFILES } from "./perfis.ts";
import { looksPortuguese, neuronsOf, renderReport, replyText, runOne } from "./prova-qualidade.ts";

const REFERENCE = "2026-11-10";
const CATALOG: MotorExercise[] = readCatalog().map((e) => ({
  id: e.codigo,
  code: e.source_ref,
  name: e.name,
  difficulty: e.difficulty,
  measure_type: e.measure_type,
  movement_pattern: e.movement_pattern,
  load_markers: [...e.load_markers, ...e.load_markers_v12],
  contraindications: e.contraindications,
  primary: e.primary_muscles,
  secondary: e.secondary_muscles,
  equipment: e.equipment,
}));

function requestFor(index: number): AiRequest {
  const entry = PROFILES[index];
  if (entry === undefined) throw new Error("perfil");
  const generated = generateProgram({
    profile: entry.profile,
    catalog: CATALOG,
    referenceDate: REFERENCE,
  });
  if (generated.status !== "generated") throw new Error("rascunho");
  const request = buildAiRequest({
    profile: entry.profile,
    catalog: CATALOG,
    referenceDate: REFERENCE,
    workouts: generated.program.workouts,
    extras: entry.extras,
  });
  if (request === null) throw new Error("pedido");
  return request;
}

const firstOption = (request: AiRequest) => {
  const slot = request.slots.find((s) => s.options.length > 0);
  const option = slot?.options[0];
  if (slot === undefined || option === undefined) throw new Error("sem opção");
  return { slot, option };
};
const reply = (trocas: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    trocas,
    motivos: ["Rotina equilibrada."],
    resumo: "Rotina ajustada.",
    ...extra,
  });

describe("pedido à IA (RN-061, CA-404)", () => {
  it("são 20 perfis, e todos geram rascunho", () => {
    expect(PROFILES).toHaveLength(20);
    expect(new Set(PROFILES.map((p) => p.id)).size).toBe(20);
    for (const [index] of PROFILES.entries())
      expect(requestFor(index).slots.length).toBeGreaterThan(0);
  });

  it("não leva nome, e-mail, data de nascimento nem identificador", () => {
    const text = requestFor(0).user;
    expect(text).not.toMatch(/@|birth|nascimento|student|user_id|e-?mail/iu);
    expect(text).not.toContain("1992-01-15");
    expect(text).toContain("30 a 39");
    expect(ageBand(65)).toBe("60 ou mais");
    expect(text).toContain("Hipertrofia");
    expect(text).not.toMatch(/hypertrophy|intermediate|barbell/u);
  });

  it("só oferece opções elegíveis para as restrições", () => {
    const index = PROFILES.findIndex((p) => p.profile.restriction_codes?.includes("lower_back"));
    const byId = new Map(CATALOG.map((e) => [e.id, e]));
    for (const slot of requestFor(index).slots) {
      for (const option of slot.options) {
        expect(byId.get(option.exercise_id)?.contraindications).not.toContain("lower_back");
        expect(byId.get(option.exercise_id)?.load_markers).not.toContain("axial_spine_load");
      }
    }
  });
});

describe("resposta da IA (RN-060, CA-402)", () => {
  const request = requestFor(0);
  const { slot, option } = firstOption(request);

  it("aceita troca dentro das opções, e lista vazia", () => {
    const ok = validateAiReply(
      reply([{ vaga: slot.key, para: option.code, motivo: "Varia o estímulo." }]),
      request,
    );
    expect(ok).toMatchObject({ ok: true, swaps: [{ exercise_id: option.exercise_id }] });
    expect(validateAiReply(reply([]), request)).toMatchObject({ ok: true, swaps: [] });
  });

  it("lê resposta com raciocínio e cerca de código, e também objeto pronto", () => {
    const wrapped = `<think>pensando {"x":1}</think>\n\`\`\`json\n${reply([])}\n\`\`\``;
    expect(validateAiReply(wrapped, request).ok).toBe(true);
    expect(validateAiReply(JSON.parse(reply([])), request).ok).toBe(true);
  });

  it.each([
    ["texto solto", "Aqui está a sua rotina.", "not_json"],
    ["formato errado", JSON.stringify({ trocas: "nenhuma" }), "bad_format"],
    ["resumo vazio", reply([], { resumo: " " }), "bad_format"],
    ["vaga inexistente", reply([{ vaga: "Z9", para: "e1", motivo: "x" }]), "unknown_slot"],
  ])("descarta: %s", (_name, raw, problem) => {
    expect(validateAiReply(raw, request)).toEqual({ ok: false, problem });
  });

  it("descarta exercício fora das opções, inventado ou restrito", () => {
    expect(
      validateAiReply(reply([{ vaga: slot.key, para: "e999", motivo: "x" }]), request),
    ).toEqual({ ok: false, problem: "option_not_allowed" });
  });

  it("descarta troca repetida, excesso de trocas e exercício duplicado no treino", () => {
    const swap = { vaga: slot.key, para: option.code, motivo: "x" };
    expect(validateAiReply(reply([swap, swap]), request)).toEqual({
      ok: false,
      problem: "repeated_slot",
    });
    expect(validateAiReply(reply([swap, swap, swap, swap, swap]), request)).toEqual({
      ok: false,
      problem: "too_many_swaps",
    });
    const sibling = request.slots.find(
      (s) => s.key !== slot.key && s.options.some((o) => o.code === option.code),
    );
    expect(sibling).toBeDefined();
    if (sibling) {
      expect(
        validateAiReply(
          reply([swap, { vaga: sibling.key, para: option.code, motivo: "x" }]),
          request,
        ),
      ).toEqual({ ok: false, problem: "repeated_exercise" });
    }
  });

  it.each([
    ["carga (RN-026)", "Use 40 kg no supino."],
    ["diagnóstico (RN-030)", "Isso parece uma tendinite."],
    ["remédio (RN-030)", "Tome um anti-inflamatório."],
    ["promessa de proteção", "Ajustes para proteger o ombro."],
    ["promessa de segurança", "Foco em estabilidade e segurança."],
    ["lesão", "Ajuda a evitar lesões."],
    ["região do corpo", "Reduzir carga na região lombar."],
    ["joelho", "Menos esforço no joelho."],
    ["dor", "Reduz a dor."],
    ["desconforto", "A rotina pode causar desconforto."],
    ["articulações", "Menor impacto nas articulações."],
    ["termo técnico", "Ajustes de biomecânica."],
    ["código em inglês", "Bom para o nível intermediate."],
  ])("descarta texto proibido: %s", (_name, resumo) => {
    expect(validateAiReply(reply([], { resumo }), request)).toEqual({
      ok: false,
      problem: "forbidden_text",
    });
  });

  it("não confunde palavras comuns com termos proibidos", () => {
    for (const resumo of [
      "Com 4 dias por semana, a rotina alterna superior e inferior.",
      "Dorsais e peitoral têm a mesma atenção para o objetivo de hipertrofia.",
      "A ênfase em glúteos aumentou as séries desse grupo.",
    ]) {
      expect(validateAiReply(reply([], { resumo }), request).ok).toBe(true);
    }
  });

  it("descarta troca sem motivo", () => {
    expect(
      validateAiReply(reply([{ vaga: slot.key, para: option.code, motivo: " " }]), request),
    ).toEqual({
      ok: false,
      problem: "bad_format",
    });
  });

  it("descarta texto longo demais", () => {
    expect(validateAiReply(reply([], { resumo: "a".repeat(401) }), request)).toEqual({
      ok: false,
      problem: "text_too_long",
    });
  });
});

describe("execução da prova, sem rede", () => {
  const entry = PROFILES[0];
  if (entry === undefined) throw new Error("perfil");
  const credentials = { accountId: "conta-ficticia", token: "token-ficticio" };
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it("mede formato, português e custo; lê os dois formatos de resposta", async () => {
    const text = JSON.stringify({
      trocas: [],
      motivos: ["A rotina combina exercícios de força para o seu objetivo."],
      resumo: "A rotina está boa para o que você quer e para os dias que tem.",
    });
    const result = await runOne("qwen", entry, CATALOG, credentials, () =>
      Promise.resolve(
        response({
          result: {
            choices: [{ message: { content: text } }],
            usage: { prompt_tokens: 1000, completion_tokens: 100 },
          },
        }),
      ),
    );
    expect(result).toMatchObject({ ok: true, portuguese: true, neurons: 7.7, swaps: 0 });
    expect(replyText({ result: { response: "x" } })).toBe("x");
    expect(neuronsOf("gemma", {})).toBe(0);
  });

  it("não envia nada além do pedido e usa o token só no cabeçalho", async () => {
    let url = "";
    let init: RequestInit = {};
    await runOne("gemma", entry, CATALOG, credentials, (u, i) => {
      url = u;
      init = i;
      return Promise.resolve(response({ result: { response: "{}" } }));
    });
    expect(url).toContain("/ai/run/@cf/google/gemma-4-26b-a4b-it");
    expect(url).not.toContain("token-ficticio");
    expect(typeof init.body === "string" ? init.body : "").not.toContain("token-ficticio");
  });

  it("identifica cota esgotada e erro do serviço", async () => {
    expect(
      await runOne("llama", entry, CATALOG, credentials, () => Promise.resolve(response({}, 429))),
    ).toBe("quota");
    const quiet = console.error;
    console.error = () => undefined;
    expect(
      await runOne("llama", entry, CATALOG, credentials, () => Promise.resolve(response({}, 500))),
    ).toBe("failed");
    console.error = quiet;
  });

  it("o relatório traz a tabela e os textos", () => {
    const report = renderReport([
      {
        model: "qwen",
        profile: "p01",
        ok: true,
        problem: null,
        swaps: 1,
        violations: 0,
        portuguese: true,
        ms: 2000,
        neurons: 50,
        summary: "Resumo da rotina.",
        reasons: ["Motivo."],
      },
    ]);
    expect(report).toContain("| 200 |");
    expect(report).toContain("Resumo da rotina.");
  });

  it("detecta texto fora do português", () => {
    expect(looksPortuguese("The routine is good for your goal and for the days.")).toBe(false);
    expect(looksPortuguese("A rotina é boa para o seu objetivo e para os dias.")).toBe(true);
    expect(looksPortuguese("")).toBe(false);
  });
});
