import { useState } from "react";
import { ChevronRight, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider.tsx";
import { useSignOut } from "../auth/useSignOut.ts";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { Link } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import styles from "./Screens.module.css";

const T = TEXTS.auth.account;

// TELA-004 — Conta (parcial): e-mail, Alterar senha e Sair (UX-04 §6.1). Área, aparência,
// descanso, sincronização e instalação chegam na TAR-011; saída com pendências na TAR-021.
export function AccountScreen() {
  const auth = useAuth();
  const local = useLocalData();
  const signOut = useSignOut();
  const [confirming, setConfirming] = useState(false);
  const [unsent, setUnsent] = useState<number | null>(null);

  return (
    <div className={styles.stack}>
      {auth.status === "signedIn" ? <p className={styles.muted}>{auth.email}</p> : null}
      <Link to="/conta/senha" className={styles.listLink}>
        <KeyRound size={20} aria-hidden="true" />
        <span>{T.changePassword}</span>
        <ChevronRight size={20} aria-hidden="true" />
      </Link>
      <p className={styles.muted}>{T.pendingRest}</p>
      <Button
        variant="danger"
        icon={<LogOut size={20} />}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {T.signOut}
      </Button>
      <Dialog
        open={confirming}
        title={T.signOutTitle}
        confirmLabel={T.signOut}
        destructive
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          void signOut().then((result) => {
            if (result.status === "has_unsent") setUnsent(result.count);
          });
        }}
      >
        <p>{T.signOutBody}</p>
      </Dialog>
      <Dialog
        open={unsent !== null}
        title={T.unsentTitle}
        confirmLabel={T.sendNow}
        onCancel={() => {
          setUnsent(null);
        }}
        onConfirm={() => {
          setUnsent(null);
          void local?.engine.syncNow();
        }}
      >
        <p>{T.unsentBody(unsent ?? 0)}</p>
      </Dialog>
    </div>
  );
}
