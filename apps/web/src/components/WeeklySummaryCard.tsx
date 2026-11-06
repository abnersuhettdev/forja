import { ChevronRight } from "lucide-react";
import type { WeeklyFacts } from "@forja/domain/resumo";
import { Link } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import styles from "./WeeklySummaryCard.module.css";

const T = TEXTS.summary;
export const SUMMARY_PATH = "/resumo";

/** Cartão em Hoje enquanto o resumo da semana passada não foi aberto (decisão de 2026-11-05). */
export function WeeklySummaryCard({ facts }: { facts: WeeklyFacts }) {
  return (
    <Link to={SUMMARY_PATH} className={styles.card}>
      <span className={styles.text}>
        <span className={styles.title}>{T.card}</span>
        <span className={styles.facts}>
          {[T.cardFacts(facts.done, facts.goal), facts.streak > 0 ? T.weeks(facts.streak) : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <ChevronRight size={22} aria-hidden="true" />
    </Link>
  );
}
