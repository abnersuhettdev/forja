import { useEffect, useState } from "react";
import type { WeeklyFacts } from "@forja/domain/resumo";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { readMeta } from "../local/db.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";

/** Semana (segunda) cujo resumo a pessoa já abriu; o cartão de Hoje some depois disso. */
export const SUMMARY_SEEN_KEY = "resumo.visto";

/**
 * Fatos da semana anterior com os dados do aparelho, para o cartão e a sequência em Hoje. O
 * cálculo carrega sob demanda, fora do pacote inicial; `undefined` enquanto carrega.
 */
export function useWeeklyFacts(goal: number | null): {
  readonly facts: WeeklyFacts | null | undefined;
  readonly seenWeek: string | null;
} {
  const local = useLocalData();
  const { state } = useOfflineData();
  const { state: user } = useUserContext();
  const timeZone =
    user.status === "ready" ? (user.context.student?.timezone ?? "America/Sao_Paulo") : null;
  const [result, setResult] = useState<{
    facts: WeeklyFacts | null | undefined;
    seenWeek: string | null;
  }>({ facts: undefined, seenWeek: null });

  useEffect(() => {
    if (local === null || state.status !== "ready" || timeZone === null) return;
    let active = true;
    Promise.all([
      import("./local.ts").then((m) =>
        m.localWeeklyFacts({ db: local.db, snapshot: state, goal, timeZone }),
      ),
      readMeta<string>(local.db, SUMMARY_SEEN_KEY),
    ]).then(
      ([facts, seen]) => {
        if (active) setResult({ facts, seenWeek: seen ?? null });
      },
      () => {
        // Banco fechado (saída) ou módulo indisponível: Hoje segue sem o cartão.
      },
    );
    return () => {
      active = false;
    };
  }, [local, state, goal, timeZone]);
  return result;
}
