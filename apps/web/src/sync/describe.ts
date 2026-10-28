// Registros da fila em linguagem simples (TELA-007 e saída da conta — UX-04 §6.1).
import { toLocalDate } from "@forja/domain";
import type { SessionBundle } from "../execution/session.ts";
import { formatKg, formatShortDate } from "../training/format.ts";
import { TEXTS } from "../app/texts.ts";
import type { QueueGroup } from "./queue.ts";

const T = TEXTS.sync;
const TIME_ZONE = "America/Sao_Paulo";

export function sessionLabel(bundle: SessionBundle): string {
  const date = formatShortDate(toLocalDate(new Date(bundle.session.started_at), TIME_ZONE));
  return T.sessionLabel(date, bundle.session.workout_name ?? "");
}

/** Título e detalhe de um registro da fila, em linguagem simples. */
export function describeGroup(group: QueueGroup): { title: string; detail: string } {
  if (group.kind === "session") {
    return group.session
      ? { title: sessionLabel(group.session), detail: T.sessionDetail(group.session.sets.length) }
      : { title: T.sessionDiscarded, detail: "" };
  }
  if (group.kind === "rest") {
    // O conteúdo é o da alteração na fila (o que seria enviado ou perdido), não a cópia atual.
    const payload = group.ops.at(-1)?.payload ?? {};
    const hours = typeof payload.default_hours === "number" ? payload.default_hours : null;
    const overrides = Array.isArray(payload.overrides) ? payload.overrides.length : 0;
    return { title: T.restLabel, detail: hours === null ? "" : T.restDetail(hours, overrides) };
  }
  if (group.kind === "weight") {
    // O conteúdo é o do registro na fila (criação) — a exclusão não leva valor.
    const created = group.ops.find((op) => op.type === "weight.create")?.payload ?? {};
    const date =
      typeof created.measured_on === "string" ? formatShortDate(created.measured_on) : null;
    const kg = typeof created.weight_kg === "number" ? created.weight_kg : null;
    return {
      title: date === null ? T.weightDeleted : T.weightLabel(date),
      detail: kg === null ? "" : T.weightDetail(formatKg(kg)),
    };
  }
  return { title: T.otherLabel, detail: "" };
}
