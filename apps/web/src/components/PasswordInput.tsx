import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { TEXTS } from "../app/texts.ts";
import { IconButton } from "./Button.tsx";
import styles from "./FormField.module.css";

// Campo de senha com botão mostrar/ocultar (TELA-001, TELA-005).
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.withAction}>
      <input className={styles.input} type={visible ? "text" : "password"} {...props} />
      <IconButton
        label={visible ? TEXTS.auth.login.hidePassword : TEXTS.auth.login.showPassword}
        icon={visible ? <EyeOff size={20} /> : <Eye size={20} />}
        aria-pressed={visible}
        onClick={() => {
          setVisible((v) => !v);
        }}
      />
    </div>
  );
}
