import { useState } from "react";
import { Plus, SearchX } from "lucide-react";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
} from "@forja/domain";
import { filterCatalog, NO_FILTERS, type CatalogFilters } from "../catalog/catalog.ts";
import { useCatalog } from "../catalog/useCatalog.ts";
import { Button } from "../components/Button.tsx";
import { ExerciseImage } from "../components/ExerciseImage.tsx";
import { EmptyState, ErrorState, Skeleton } from "../components/Feedback.tsx";
import { FormField, SelectInput, TextInput } from "../components/FormField.tsx";
import { Link, navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { formatUpdatedAt } from "../training/format.ts";
import styles from "./Screens.module.css";

const T = TEXTS.catalog;

// TELA-034 — Catálogo (RF-030, RF-038, RN-036, RN-037): busca por nome e filtros por grupo,
// equipamento, dificuldade e origem; tocar abre o detalhe (TELA-014).
export function CatalogScreen() {
  const { state, reload } = useCatalog();
  const [filters, setFilters] = useState<CatalogFilters>(NO_FILTERS);
  const set = (changes: Partial<CatalogFilters>) => {
    setFilters((current) => ({ ...current, ...changes }));
  };

  if (state.status === "loading") return <Skeleton lines={6} />;
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

  const results = filterCatalog(state.exercises, filters);
  const select = <V extends string>(
    label: string,
    value: V | "",
    options: readonly { value: V; label: string }[],
    onChange: (value: V | "") => void,
  ) => (
    <FormField label={label}>
      {(control) => (
        <SelectInput
          {...control}
          value={value}
          onChange={(e) => {
            onChange(e.target.value as V | "");
          }}
        >
          <option value="">{T.any}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      )}
    </FormField>
  );

  return (
    <div className={styles.stack}>
      <div className={styles.rowBetween}>
        <p className={styles.muted}>{formatUpdatedAt(state.updatedAt)}</p>
        <Button
          icon={<Plus size={20} />}
          onClick={() => {
            navigate("/gestao/catalogo/novo");
          }}
        >
          {T.newExercise}
        </Button>
      </div>
      <search className={styles.stack}>
        <FormField label={T.search}>
          {(control) => (
            <TextInput
              {...control}
              type="search"
              value={filters.query}
              onChange={(e) => {
                set({ query: e.target.value });
              }}
            />
          )}
        </FormField>
        <div className={styles.filters}>
          {select(
            T.muscle,
            filters.muscle,
            MUSCLE_GROUPS.map((value) => ({ value, label: MUSCLE_GROUP_LABELS[value] })),
            (muscle) => {
              set({ muscle });
            },
          )}
          {select(
            T.equipment,
            filters.equipment,
            EQUIPMENT.map((value) => ({ value, label: EQUIPMENT_LABELS[value] })),
            (equipment) => {
              set({ equipment });
            },
          )}
          {select(
            T.difficulty,
            filters.difficulty,
            DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] })),
            (difficulty) => {
              set({ difficulty });
            },
          )}
          {select(
            T.origin,
            filters.origin,
            (["imported", "custom"] as const).map((value) => ({ value, label: T.origins[value] })),
            (origin) => {
              set({ origin });
            },
          )}
        </div>
      </search>
      <p className={styles.muted} role="status">
        {T.count(results.length)}
      </p>
      {results.length === 0 ? (
        <EmptyState
          icon={<SearchX size={32} />}
          title={T.empty}
          description={T.emptyHint}
          action={
            <Button
              onClick={() => {
                setFilters(NO_FILTERS);
              }}
            >
              {T.clear}
            </Button>
          }
        />
      ) : (
        <ul className={styles.list} aria-label={TEXTS.nav.catalog}>
          {results.map((exercise) => (
            <li key={exercise.id}>
              <Link to={`/exercicios/${exercise.id}`} className={styles.listLink}>
                <ExerciseImage images={exercise.images} size="thumb" />
                <span className={styles.listText}>
                  <span>{exercise.name}</span>
                  <span className={styles.muted}>
                    {[
                      exercise.primary.map((m) => MUSCLE_GROUP_LABELS[m]).join(", "),
                      exercise.equipment.map((q) => EQUIPMENT_LABELS[q]).join(", "),
                    ].join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
