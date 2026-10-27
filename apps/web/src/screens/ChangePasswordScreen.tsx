import { useEffect, useState, type SubmitEvent } from "react";
import { passwordIssues, type PasswordIssue } from "@forja/domain";
import { useAuth } from "../auth/AuthProvider.tsx";
import { getSupabase } from "../auth/client.ts";
import { loadCommonPasswords } from "../auth/common-passwords.ts";
import { Button } from "../components/Button.tsx";
import { Banner } from "../components/Feedback.tsx";
import { FormField } from "../components/FormField.tsx";
import { PasswordInput } from "../components/PasswordInput.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import styles from "./Screens.module.css";

const T = TEXTS.auth.changePassword;

const ISSUE_TEXT: Record<PasswordIssue, string> = {
  too_short: T.tooShort,
  equals_email: T.equalsEmail,
  common: T.common,
  same_as_current: T.sameAsCurrent,
};

// TELA-005 — Alterar senha (RF-007, RN-031): confere a senha atual e valida a nova em tempo
// real após a primeira digitação.
export function ChangePasswordScreen() {
  const auth = useAuth();
  const email = auth.status === "signedIn" ? auth.email : "";
  const online = useOnline();
  const show = useSnackbar();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [common, setCommon] = useState<ReadonlySet<string> | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentError, setCurrentError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadCommonPasswords().then((set) => {
      if (active) setCommon(set);
    });
    return () => {
      active = false;
    };
  }, []);

  const isCommon = (p: string) => common?.has(p) ?? false;
  const issues = passwordIssues(
    current === ""
      ? { password: next, email, isCommon }
      : { password: next, email, currentPassword: current, isCommon },
  );
  const nextError = next !== "" || submitted ? issues.map((i) => ISSUE_TEXT[i])[0] : undefined;
  const confirmError = (confirm !== "" || submitted) && confirm !== next ? T.mismatch : undefined;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setError(null);
    setCurrentError(current === "" ? TEXTS.auth.login.required : undefined);
    const supabase = getSupabase();
    if (current === "" || issues.length > 0 || confirm !== next || common === null) return;
    if (!online || supabase === null) return;

    setSubmitting(true);
    // Confirma a senha atual antes de trocar (RF-007).
    const check = await supabase.auth.signInWithPassword({ email, password: current });
    if (check.error !== null) {
      setSubmitting(false);
      if (check.error.status === 429) setError(TEXTS.auth.login.tooMany);
      else if (check.error.status === 400) setCurrentError(T.wrongCurrent);
      else setError(T.failed);
      return;
    }
    const update = await supabase.auth.updateUser({ password: next });
    setSubmitting(false);
    if (update.error !== null) {
      setError(
        update.error.code === "weak_password"
          ? T.tooShort
          : update.error.code === "same_password"
            ? T.sameAsCurrent
            : T.failed,
      );
      return;
    }
    show({ text: T.done });
    navigate("/conta");
  }

  const disabled = !online || submitting;
  return (
    <form className={styles.stack} noValidate onSubmit={(e) => void submit(e)}>
      {!online ? <Banner tone="info">{T.offline}</Banner> : null}
      {error !== null ? <Banner tone="danger">{error}</Banner> : null}
      <FormField label={T.current} error={currentError}>
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="current-password"
            value={current}
            disabled={disabled}
            onChange={(e) => {
              setCurrent(e.target.value);
              setCurrentError(undefined);
            }}
          />
        )}
      </FormField>
      <FormField label={T.next} help={T.rules} error={nextError}>
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={next}
            disabled={disabled}
            onChange={(e) => {
              setNext(e.target.value);
            }}
          />
        )}
      </FormField>
      <FormField label={T.confirm} error={confirmError}>
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={confirm}
            disabled={disabled}
            onChange={(e) => {
              setConfirm(e.target.value);
            }}
          />
        )}
      </FormField>
      <Button type="submit" variant="primary" size="lg" loading={submitting} disabled={!online}>
        {T.submit}
      </Button>
    </form>
  );
}
