import { Pencil, SearchX } from "lucide-react";
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from "@forja/domain";
import { useCatalog } from "../catalog/useCatalog.ts";
import { Button } from "../components/Button.tsx";
import type { NavArea } from "../app/navigation.ts";
import { navigate } from "../app/router.tsx";
import { ExerciseImage } from "../components/ExerciseImage.tsx";
import { EmptyState, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { TEXTS } from "../app/texts.ts";
import styles from "./Screens.module.css";

const T = TEXTS.catalog;

function Chips({ label, items }: { label: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className={styles.sectionLabel}>{label}</h3>
      <ul className={styles.chips}>
        {items.map((item) => (
          <li key={item} className={styles.chip}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// TELA-014 — Detalhe do exercício (RF-031, RF-034, RN-036): imagem ou placeholder, grupos,
// equipamentos, dificuldade, instruções, dicas e créditos com fonte e licença. Prescrição e
// "Última vez" chegam com os programas e a execução (TAR-017/TAR-019).
export function ExerciseScreen({
  area,
  params,
}: {
  area: NavArea;
  params: Readonly<Record<string, string>>;
}) {
  const { state, reload } = useCatalog();
  if (state.status === "loading") return <Skeleton lines={8} />;
  if (state.status === "unavailable") {
    return (
      <ErrorState
        title={TEXTS.error.title}
        description={T.unavailable}
        onRetry={() => {
          void reload();
        }}
      />
    );
  }
  const exercise = state.exercises.find((e) => e.id === params.id);
  if (!exercise) {
    return (
      <EmptyState icon={<SearchX size={32} />} title={T.notFound} description={T.notFoundHint} />
    );
  }

  return (
    <article className={styles.stack}>
      <ExerciseImage images={exercise.images} />
      <h2 className={styles.exerciseName}>{exercise.name}</h2>
      {/* Variante Gestão (TELA-014): editar personalizado ou corrigir importado (ADR-091). */}
      {area === "gestao" ? (
        <Button
          icon={<Pencil size={20} />}
          onClick={() => {
            navigate(`/gestao/catalogo/${exercise.id}/editar`);
          }}
        >
          {TEXTS.exerciseForm.edit}
        </Button>
      ) : null}
      <Chips label={T.primary} items={exercise.primary.map((m) => MUSCLE_GROUP_LABELS[m])} />
      <Chips label={T.secondary} items={exercise.secondary.map((m) => MUSCLE_GROUP_LABELS[m])} />
      <Chips label={T.equipment} items={exercise.equipment.map((q) => EQUIPMENT_LABELS[q])} />
      <Chips label={T.difficulty} items={[DIFFICULTY_LABELS[exercise.difficulty]]} />

      <section>
        <h3 className={styles.sectionLabel}>{T.instructions}</h3>
        <ol className={styles.steps}>
          {exercise.instructions.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>
      {exercise.safety_tips.length > 0 ? (
        <section>
          <h3 className={styles.sectionLabel}>{T.safety}</h3>
          <ul className={styles.steps}>
            {exercise.safety_tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.details}>
        <h3 className={styles.sectionLabel}>{T.credits}</h3>
        {exercise.source ? (
          <>
            <p>
              {exercise.source.url ? (
                <a href={exercise.source.url} target="_blank" rel="noopener noreferrer">
                  {exercise.source.name}
                </a>
              ) : (
                exercise.source.name
              )}
            </p>
            <p>
              {T.license}:{" "}
              {exercise.source.license_url ? (
                <a href={exercise.source.license_url} target="_blank" rel="noopener noreferrer">
                  {exercise.source.license_name}
                </a>
              ) : (
                exercise.source.license_name
              )}
            </p>
            {exercise.source.attribution_text ? <p>{exercise.source.attribution_text}</p> : null}
          </>
        ) : (
          <p>{T.custom}</p>
        )}
        {exercise.edited_by_manager_at ? <p>{T.edited}</p> : null}
        {exercise.images.length > 0 ? (
          <p>
            {T.imageCredits}:{" "}
            {exercise.images
              .map((image) =>
                [image.attribution_text, image.license_name].filter(Boolean).join(" · "),
              )
              .join("; ")}
          </p>
        ) : null}
      </section>
    </article>
  );
}
