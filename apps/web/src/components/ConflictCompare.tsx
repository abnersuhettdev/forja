import { ArrowLeftRight } from "lucide-react";
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@forja/domain";
import { TEXTS } from "../app/texts.ts";
import { Button } from "./Button.tsx";
import styles from "./ConflictCompare.module.css";

const T = TEXTS.sync;
type Field = keyof typeof T.fields;
const FIELDS = Object.keys(T.fields) as Field[];
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Valor legível; dados do servidor são tratados como texto, nunca como marcação. */
export function formatValue(field: Field, value: unknown): string {
  if (value === null || value === undefined || value === "") return T.empty;
  if (field === "overrides" && Array.isArray(value)) {
    if (value.length === 0) return T.empty;
    return value
      .map((item: unknown) => {
        if (typeof item !== "object" || item === null) return "";
        const code = "muscle_group_code" in item ? String(item.muscle_group_code) : "";
        const hours = "hours" in item ? Number(item.hours) : Number.NaN;
        const name = code in MUSCLE_GROUP_LABELS ? MUSCLE_GROUP_LABELS[code as MuscleGroup] : code;
        return `${name} ${number.format(hours)} h`;
      })
      .join(", ");
  }
  if ((field === "started_at" || field === "ended_at") && typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : dateTime.format(date);
  }
  if (typeof value === "number") return number.format(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// ConflictCompare (UX-06): "Neste aparelho" × "No servidor", diferenças por ícone e texto,
// "Manter esta" em cada lado (RN-046). Empilhado no celular, lado a lado em telas largas.
export function ConflictCompare({
  local,
  server,
  onKeepLocal,
  onKeepServer,
}: {
  local: Readonly<Record<string, unknown>>;
  server: Readonly<Record<string, unknown>> | null;
  onKeepLocal: () => void;
  onKeepServer: () => void;
}) {
  const fields = FIELDS.filter((field) => field in local);
  const deleted =
    server === null || (server.deleted_at !== null && server.deleted_at !== undefined);
  const column = (
    title: string,
    values: Readonly<Record<string, unknown>> | null,
    onKeep: () => void,
  ) => (
    <section className={styles.column} aria-label={title}>
      <h3 className={styles.title}>{title}</h3>
      <dl className={styles.values}>
        {fields.map((field) => {
          const differs = server !== null && !deleted && !same(local[field], server[field]);
          return (
            <div key={field} className={differs ? styles.differs : undefined}>
              <dt>
                {T.fields[field]}
                {differs ? (
                  <>
                    {" "}
                    <ArrowLeftRight size={14} aria-hidden="true" />
                    <span className={styles.hint}> ({T.differs})</span>
                  </>
                ) : null}
              </dt>
              <dd>{values === null ? T.deletedValue : formatValue(field, values[field])}</dd>
            </div>
          );
        })}
      </dl>
      <Button onClick={onKeep}>{T.keepThis}</Button>
    </section>
  );
  return (
    <div className={styles.compare}>
      {column(T.here, local, onKeepLocal)}
      {column(T.server, deleted ? null : server, onKeepServer)}
    </div>
  );
}
