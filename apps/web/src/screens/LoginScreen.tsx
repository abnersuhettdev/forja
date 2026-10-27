import { useEffect, useState, type SubmitEvent } from "react";
import {
  INITIAL_LOGIN_ATTEMPTS,
  registerLoginFailure,
  remainingWaitSeconds,
  type LoginAttemptState,
} from "@forja/domain";
import { getSupabase } from "../auth/client.ts";
import { readLoginAttempts, writeLoginAttempts } from "../auth/login-attempts.ts";
import { Button } from "../components/Button.tsx";
import { Banner } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { PasswordInput } from "../components/PasswordInput.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import styles from "./Screens.module.css";

const T = TEXTS.auth.login;

// TELA-001 — Login (RF-001, RN-031). Erro de credenciais genérico, sem dizer qual campo errou.
export function LoginScreen() {
  const online = useOnline();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<LoginAttemptState>(readLoginAttempts);
  const [now, setNow] = useState(() => Date.now());

  const wait = remainingWaitSeconds(attempts, now);
  useEffect(() => {
    if (wait === 0) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [wait]);

  const emailError = touched && email.trim() === "" ? T.required : undefined;
  const passwordError = touched && password === "" ? T.required : undefined;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setError(null);
    if (email.trim() === "" || password === "") return;
    if (!online) {
      setError(T.offline);
      return;
    }
    if (remainingWaitSeconds(attempts, Date.now()) > 0) return;
    const supabase = getSupabase();
    if (supabase === null) return;

    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (authError === null) {
      writeLoginAttempts(INITIAL_LOGIN_ATTEMPTS);
      return; // A troca de sessão leva à área inicial (AppShell).
    }
    if (authError.status === 429) {
      setError(T.tooMany);
      return;
    }
    if (authError.status === 400 || authError.code === "invalid_credentials") {
      const next = registerLoginFailure(attempts, Date.now());
      writeLoginAttempts(next);
      setAttempts(next);
      setNow(Date.now());
      setError(T.invalid);
      return;
    }
    setError(T.failed);
  }

  return (
    <div className={styles.authPage}>
      <h1 tabIndex={-1} className={styles.brand}>
        {TEXTS.appName}
      </h1>
      <form className={styles.stack} noValidate onSubmit={(e) => void submit(e)}>
        {!online ? <Banner tone="info">{T.offline}</Banner> : null}
        {wait > 0 ? (
          <Banner tone="warning">{T.wait(wait)}</Banner>
        ) : error !== null ? (
          <Banner tone="danger">{error}</Banner>
        ) : null}
        <FormField label={T.email} error={emailError}>
          {(control) => (
            <TextInput
              {...control}
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              disabled={submitting}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          )}
        </FormField>
        <FormField label={T.password} error={passwordError}>
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="current-password"
              value={password}
              disabled={submitting}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />
          )}
        </FormField>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={wait > 0 || !online}
        >
          {T.submit}
        </Button>
        <p className={styles.muted}>{T.forgot}</p>
      </form>
    </div>
  );
}
