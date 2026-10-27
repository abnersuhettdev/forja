import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import type { Range } from "@forja/domain";
import { TEXTS } from "../app/texts.ts";
import { clampToRange, parseTypedValue, stepValue } from "./stepper-logic.ts";
import styles from "./Stepper.module.css";

// UX-06 §4: botões de 48 px, valor tocável para digitar, segurar = repetição acelerada.
interface StepperProps {
  label: string;
  /** null = ainda não informado (campo vazio, ex.: carga sem histórico — RF-061). */
  value: number | null;
  onChange: (value: number) => void;
  step: number;
  range: Range;
  unit?: string;
  /** "metric" usa números grandes (execução — UX-02 type.metric). */
  size?: "metric" | "default";
  /** Mensagem de validação junto ao controle (UX-06 §4). */
  error?: string | undefined;
}

const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 90;
const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function Stepper({
  label,
  value,
  onChange,
  step,
  range,
  unit,
  size = "default",
  error,
}: StepperProps) {
  const labelId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  // Chamado apenas em eventos (clique, tecla, repetição), nunca durante a renderização.
  function apply(direction: 1 | -1) {
    const next = stepValue(latest.current ?? range.min, step, direction, range);
    latest.current = next;
    onChange(next);
  }

  function commitDraft() {
    if (draft === null) return;
    const parsed = parseTypedValue(draft, range);
    if (parsed !== null) onChange(clampToRange(parsed, range));
    setDraft(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commitDraft();
    if (event.key === "Escape") setDraft(null);
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      apply(event.key === "ArrowUp" ? 1 : -1);
    }
  }

  return (
    <div
      className={[styles.stepper, styles[size]].join(" ")}
      role="group"
      aria-labelledby={labelId}
    >
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <div className={styles.controls}>
        <StepButton
          label={`${TEXTS.common.decrease} ${label.toLowerCase()}`}
          disabled={value === null || value <= range.min}
          onStep={() => {
            apply(-1);
          }}
        >
          <Minus aria-hidden="true" />
        </StepButton>
        <input
          className={[styles.value, "tabular"].join(" ")}
          inputMode="decimal"
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          value={draft ?? (value === null ? "" : format.format(value))}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
        />
        {unit ? <span className={styles.unit}>{unit}</span> : null}
        <StepButton
          label={`${TEXTS.common.increase} ${label.toLowerCase()}`}
          disabled={value !== null && value >= range.max}
          onStep={() => {
            apply(1);
          }}
        >
          <Plus aria-hidden="true" />
        </StepButton>
      </div>
      {error ? (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

// Botão de passo: toque aplica um passo; segurar repete de forma acelerada (UX-06 §4).
function StepButton({
  label,
  disabled,
  onStep,
  children,
}: {
  label: string;
  disabled: boolean;
  onStep: () => void;
  children: ReactNode;
}) {
  const timers = useRef<{ delay?: number; repeat?: number }>({});

  function stopHold() {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
  }

  useEffect(() => stopHold, []);

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      disabled={disabled}
      onPointerDown={() => {
        onStep();
        timers.current.delay = window.setTimeout(() => {
          timers.current.repeat = window.setInterval(onStep, HOLD_INTERVAL_MS);
        }, HOLD_DELAY_MS);
      }}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onStep();
        }
      }}
    >
      {children}
    </button>
  );
}
