import { useState } from "react";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { TEXTS } from "../app/texts.ts";
import { Button } from "./Button.tsx";
import { Dialog } from "./Dialog.tsx";
import { Banner } from "./Feedback.tsx";
import { FormField } from "./FormField.tsx";
import { PasswordInput } from "./PasswordInput.tsx";
import { Sheet } from "./Sheet.tsx";
import { useSnackbar } from "./Snackbar.tsx";
import styles from "./Feedback.module.css";

const T = TEXTS.signOut;

// Pendências de uma saída anterior que a senha deste login não liberou (ADR-028 L6, casos de
// borda): pede a senha anterior; sem ela, continuam cifradas, com opção explícita de descartar.
export function LockedKept() {
  const local = useLocalData();
  const show = useSnackbar();
  const [open, setOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  if (local === null || local.lockedKept === 0) return null;

  async function unlock() {
    if (local === null || password === "") return;
    setBusy(true);
    const ok = await local.unlockKept(password);
    setBusy(false);
    setError(!ok);
    if (ok) {
      setOpen(false);
      setPassword("");
      show({ text: T.unlocked });
    }
  }

  return (
    <>
      <Banner
        tone="warning"
        action={
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(true);
            }}
          >
            {T.unlock}
          </Button>
        }
      >
        {T.lockedTitle}
      </Banner>
      <Sheet
        open={open}
        title={T.lockedTitle}
        onClose={() => {
          setOpen(false);
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void unlock();
          }}
          className={styles.form}
        >
          <p>{T.lockedBody(local.lockedKept)}</p>
          {error ? <Banner tone="danger">{T.unlockFailed}</Banner> : null}
          <FormField label={T.unlockPassword}>
            {(control) => (
              <PasswordInput
                {...control}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
              />
            )}
          </FormField>
          <Button type="submit" variant="primary" loading={busy} disabled={password === ""}>
            {T.unlock}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmDiscard(true);
            }}
          >
            {T.discardLocked}
          </Button>
        </form>
      </Sheet>
      <Dialog
        open={confirmDiscard}
        title={T.discardLocked}
        confirmLabel={T.discardLocked}
        destructive
        onCancel={() => {
          setConfirmDiscard(false);
        }}
        onConfirm={() => {
          setConfirmDiscard(false);
          setOpen(false);
          void local.discardKept().then(() => {
            show({ text: T.discardedLocked });
          });
        }}
      >
        <p>{T.discardLockedHint}</p>
      </Dialog>
    </>
  );
}
