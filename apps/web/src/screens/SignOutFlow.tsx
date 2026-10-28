import { useState } from "react";
import { useSignOut } from "../auth/useSignOut.ts";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { Banner } from "../components/Feedback.tsx";
import { FormField, TextInput } from "../components/FormField.tsx";
import { PasswordInput } from "../components/PasswordInput.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { findActiveSession } from "../execution/session.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { describeGroup } from "../sync/describe.ts";
import { readQueueGroups } from "../sync/queue.ts";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { useOnline } from "../app/useOnline.ts";
import shared from "./Screens.module.css";

const T = TEXTS.signOut;
const A = TEXTS.auth.account;

type Step =
  | { readonly kind: "closed" }
  | { readonly kind: "confirm" }
  | { readonly kind: "options"; readonly items: readonly string[]; readonly notice?: string }
  | { readonly kind: "attention"; readonly count: number; readonly items: readonly string[] }
  | { readonly kind: "keep"; readonly items: readonly string[] }
  | { readonly kind: "discard"; readonly items: readonly string[] };

// Saída da conta (UX-04 §6.1; RF-002, RF-101..103; RN-052; ADR-028 L6): sem pendências, um
// diálogo; com pendências, as três opções com consequências explícitas. Nunca descarta em
// silêncio.
export function useSignOutFlow(): { start: () => void; dialogs: React.JSX.Element } {
  const local = useLocalData();
  const online = useOnline();
  const actions = useSignOut();
  const [step, setStep] = useState<Step>({ kind: "closed" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [typed, setTyped] = useState("");

  /** Registros não enviados em linguagem simples (inclui a sessão em andamento). */
  async function pendingItems(): Promise<string[]> {
    if (local === null) return [];
    const groups = await readQueueGroups(local.db);
    const items = groups.map((g) => {
      const { title, detail } = describeGroup(g);
      return [title, detail].filter(Boolean).join(" · ");
    });
    const active = await findActiveSession(local.db);
    if (active && !groups.some((g) => g.id === active.id))
      items.push(T.activeSession(active.workout_name ?? ""));
    return items;
  }

  /** Abre no passo certo: confirmação simples ou as opções com pendências. */
  function start() {
    void (async () => {
      const pending = await actions.hasPending();
      setStep(pending ? { kind: "options", items: await pendingItems() } : { kind: "confirm" });
    })();
  }

  function close() {
    setStep({ kind: "closed" });
    setError(null);
    setPassword("");
    setAgain("");
    setTyped("");
  }

  async function send() {
    setBusy(true);
    setError(null);
    const result = await actions.sendAndSignOut();
    setBusy(false);
    if (result.status === "signed_out") return;
    const items = await pendingItems();
    if (result.status === "attention") setStep({ kind: "attention", count: result.count, items });
    else setStep({ kind: "options", items, notice: T.remaining(result.count) });
  }

  async function keep() {
    if (password === "") return;
    if (!online && password !== again) {
      setError(T.passwordMismatch);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await actions.keepAndSignOut(password, online);
    setBusy(false);
    if (result.status === "wrong_password") setError(T.wrongPassword);
    if (result.status === "failed") setError(T.failed);
  }

  async function discard() {
    setBusy(true);
    await actions.discardAndSignOut();
    setBusy(false);
  }

  const itemsList = (items: readonly string[]) => (
    <ul className={shared.steps}>
      {items.map((item, index) => (
        <li key={`${String(index)}-${item}`}>{item}</li>
      ))}
    </ul>
  );

  const dialogs = (
    <>
      <Dialog
        open={step.kind === "confirm"}
        title={A.signOutTitle}
        confirmLabel={A.signOut}
        destructive
        onCancel={close}
        onConfirm={() => void actions.signOut()}
      >
        <p>{A.signOutBody}</p>
      </Dialog>

      <Sheet open={step.kind === "options"} title={T.pendingTitle} onClose={close}>
        {step.kind === "options" ? (
          <div className={shared.stack}>
            {step.notice ? <Banner tone="warning">{step.notice}</Banner> : null}
            <p>{T.pendingIntro(step.items.length)}</p>
            {itemsList(step.items)}
            <div className={shared.stack}>
              <Button
                variant="primary"
                loading={busy}
                disabled={!online}
                onClick={() => void send()}
              >
                {T.send}
              </Button>
              <p className={shared.muted}>{online ? T.sendHint : T.sendOffline}</p>
            </div>
            <div className={shared.stack}>
              <Button
                onClick={() => {
                  setError(null);
                  setStep({ kind: "keep", items: step.items });
                }}
              >
                {T.keep}
              </Button>
              <p className={shared.muted}>{T.keepShort}</p>
            </div>
            <div className={shared.stack}>
              <Button
                variant="danger"
                onClick={() => {
                  setTyped("");
                  setStep({ kind: "discard", items: step.items });
                }}
              >
                {T.discard}
              </Button>
              <p className={shared.muted}>{T.discardShort}</p>
            </div>
            <Button variant="ghost" onClick={close}>
              {TEXTS.common.cancel}
            </Button>
          </div>
        ) : null}
      </Sheet>

      <Dialog
        open={step.kind === "attention"}
        title={T.attentionTitle}
        confirmLabel={T.resolve}
        cancelLabel={T.otherOptions}
        onCancel={() => {
          if (step.kind === "attention") setStep({ kind: "options", items: step.items });
        }}
        onConfirm={() => {
          close();
          navigate("/conta/sincronizacao");
        }}
      >
        <p>{step.kind === "attention" ? T.attentionBody(step.count) : ""}</p>
      </Dialog>

      <Sheet open={step.kind === "keep"} title={T.keep} onClose={close}>
        {step.kind === "keep" ? (
          <form
            className={shared.stack}
            onSubmit={(event) => {
              event.preventDefault();
              void keep();
            }}
          >
            <p>{T.keepHint(step.items.length)}</p>
            {online ? null : <p className={shared.muted}>{T.passwordOfflineHint}</p>}
            {error ? <Banner tone="danger">{error}</Banner> : null}
            <FormField label={T.password}>
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
            {online ? null : (
              <FormField label={T.passwordAgain}>
                {(control) => (
                  <PasswordInput
                    {...control}
                    autoComplete="current-password"
                    value={again}
                    onChange={(event) => {
                      setAgain(event.target.value);
                    }}
                  />
                )}
              </FormField>
            )}
            <Button type="submit" variant="primary" loading={busy} disabled={password === ""}>
              {T.keepConfirm}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStep({ kind: "options", items: step.items });
              }}
            >
              {T.back}
            </Button>
          </form>
        ) : null}
      </Sheet>

      <Sheet open={step.kind === "discard"} title={T.discard} onClose={close}>
        {step.kind === "discard" ? (
          <div className={shared.stack}>
            <Banner tone="danger">{T.discardHint(step.items.length)}</Banner>
            {itemsList(step.items)}
            <FormField label={T.discardType}>
              {(control) => (
                <TextInput
                  {...control}
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={typed}
                  onChange={(event) => {
                    setTyped(event.target.value);
                  }}
                />
              )}
            </FormField>
            <Button
              variant="danger"
              loading={busy}
              disabled={typed.trim() !== T.discardWord}
              onClick={() => void discard()}
            >
              {T.discardConfirm}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStep({ kind: "options", items: step.items });
              }}
            >
              {T.back}
            </Button>
          </div>
        ) : null}
      </Sheet>
    </>
  );

  return { start, dialogs };
}
