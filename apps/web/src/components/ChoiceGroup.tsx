import { useId } from "react";
import styles from "./ChoiceGroup.module.css";

// Escolha única (radio) ou múltipla (checkbox) com legenda, como SegmentedControl/FilterChip de
// UX-06 §4. Controles nativos: teclado, leitor de tela e alvos de toque ≥ 44 px (UX-07).
export interface ChoiceOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
  readonly description?: string;
}

interface BaseProps<T extends string | number> {
  readonly legend: string;
  readonly options: readonly ChoiceOption<T>[];
  /** "row": opções lado a lado; "segmented": em pílula, sem o rádio; "list": uma por linha. */
  readonly layout?: "row" | "segmented" | "list";
  readonly hideLegend?: boolean;
}

interface SingleProps<T extends string | number> extends BaseProps<T> {
  readonly multiple?: false;
  readonly value: T | null;
  readonly onChange: (value: T) => void;
}

interface MultipleProps<T extends string | number> extends BaseProps<T> {
  readonly multiple: true;
  readonly value: readonly T[];
  readonly onChange: (value: T[]) => void;
}

export function ChoiceGroup<T extends string | number>(props: SingleProps<T> | MultipleProps<T>) {
  const name = useId();
  const layout = props.layout ?? "list";
  const isChecked = (value: T) =>
    props.multiple ? props.value.includes(value) : props.value === value;

  function toggle(value: T) {
    if (props.multiple) {
      props.onChange(
        props.value.includes(value)
          ? props.value.filter((item) => item !== value)
          : [...props.value, value],
      );
    } else {
      props.onChange(value);
    }
  }

  return (
    <fieldset className={styles.group}>
      <legend className={props.hideLegend ? "visually-hidden" : styles.legend}>
        {props.legend}
      </legend>
      <div className={styles[layout]}>
        {props.options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type={props.multiple ? "checkbox" : "radio"}
              name={name}
              className={styles.input}
              checked={isChecked(option.value)}
              onChange={() => {
                toggle(option.value);
              }}
            />
            <span className={styles.text}>
              <span className={styles.label}>{option.label}</span>
              {option.description ? (
                <span className={styles.description}>{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
