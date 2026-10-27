import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { CircleAlert } from "lucide-react";
import styles from "./FormField.module.css";

// UX-06 §4: rótulo sempre visível, ajuda e erro associados por aria-describedby.
export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FormFieldProps {
  label: string;
  help?: string;
  error?: string | undefined;
  children: (control: FieldControlProps) => ReactNode;
}

export function FormField({ label, help, error, children }: FormFieldProps) {
  const id = useId();
  const helpId = `${id}-ajuda`;
  const errorId = `${id}-erro`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ");
  const control: FieldControlProps = { id };
  if (describedBy !== "") control["aria-describedby"] = describedBy;
  if (error) control["aria-invalid"] = true;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children(control)}
      {help ? (
        <p id={helpId} className={styles.help}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error}>
          <CircleAlert size={16} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={styles.input} {...props} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={styles.input} {...props} />;
}
