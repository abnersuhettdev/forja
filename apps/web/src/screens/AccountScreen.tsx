import { useState, type ReactNode } from "react";
import { ChevronRight, Download, Hourglass, KeyRound, LogOut, RefreshCw } from "lucide-react";
import { useUserContext } from "../account/UserContextProvider.tsx";
import { useAuth } from "../auth/AuthProvider.tsx";
import { useSignOut } from "../auth/useSignOut.ts";
import { Button } from "../components/Button.tsx";
import { ChoiceGroup } from "../components/ChoiceGroup.tsx";
import { Dialog } from "../components/Dialog.tsx";
import {
  readThemePreference,
  saveThemePreference,
  THEME_PREFERENCES,
  type ThemePreference,
} from "../design/theme.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import type { NavArea } from "../app/navigation.ts";
import { Link, navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import styles from "./Screens.module.css";

const T = TEXTS.account;
const A = TEXTS.auth.account;

function ListLink({
  to,
  icon,
  label,
  detail,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  detail?: string;
}) {
  return (
    <Link to={to} className={styles.listLink}>
      {icon}
      <span className={styles.listText}>
        <span>{label}</span>
        {detail ? <span className={styles.muted}>{detail}</span> : null}
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </Link>
  );
}

// TELA-004 — Conta (RF-002, RF-005, RF-007, RF-101): dados, chave de área (papel duplo),
// aparência, atalhos, "Sobre e privacidade" (SEG-01 §6.1) e Sair (UX-04 §6.1).
export function AccountScreen({ area }: { area: NavArea }) {
  const auth = useAuth();
  const { state } = useUserContext();
  const local = useLocalData();
  const signOut = useSignOut();
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);
  const [confirming, setConfirming] = useState(false);
  const [unsent, setUnsent] = useState<number | null>(null);
  const context = state.status === "ready" ? state.context : null;
  const dualRole = context !== null && context.isManager && context.student !== null;
  const pending = local?.unsent ?? 0;

  return (
    <div className={styles.stack}>
      <div>
        {context?.student ? <p className={styles.strong}>{context.student.full_name}</p> : null}
        {auth.status === "signedIn" ? <p className={styles.muted}>{auth.email}</p> : null}
      </div>

      {dualRole ? (
        <ChoiceGroup<NavArea>
          legend={T.area}
          layout="row"
          options={[
            { value: "aluno", label: TEXTS.nav.myTraining },
            { value: "gestao", label: TEXTS.nav.management },
          ]}
          value={area}
          onChange={(next) => {
            navigate(next === "aluno" ? "/hoje" : "/gestao/programa");
          }}
        />
      ) : null}

      <ChoiceGroup<ThemePreference>
        legend={T.appearance}
        layout="row"
        options={THEME_PREFERENCES.map((value) => ({ value, label: T.themes[value] }))}
        value={theme}
        onChange={(next) => {
          saveThemePreference(next);
          setTheme(next);
        }}
      />

      <nav aria-label={TEXTS.nav.account} className={styles.list}>
        <ListLink
          to="/conta/descanso"
          icon={<Hourglass size={20} aria-hidden="true" />}
          label={T.rest}
        />
        <ListLink
          to="/conta/sincronizacao"
          icon={<RefreshCw size={20} aria-hidden="true" />}
          label={T.sync}
          detail={pending > 0 ? T.syncPending(pending) : T.syncDone}
        />
        <ListLink
          to="/conta/instalar"
          icon={<Download size={20} aria-hidden="true" />}
          label={T.install}
        />
        <ListLink
          to="/conta/senha"
          icon={<KeyRound size={20} aria-hidden="true" />}
          label={A.changePassword}
        />
      </nav>

      <details className={styles.details}>
        <summary>{T.about}</summary>
        <p>{T.privacy}</p>
        <p>{TEXTS.onboarding.healthNotice}</p>
      </details>

      <Button
        variant="danger"
        icon={<LogOut size={20} />}
        onClick={() => {
          setConfirming(true);
        }}
      >
        {A.signOut}
      </Button>
      <Dialog
        open={confirming}
        title={A.signOutTitle}
        confirmLabel={A.signOut}
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
        <p>{A.signOutBody}</p>
      </Dialog>
      <Dialog
        open={unsent !== null}
        title={A.unsentTitle}
        confirmLabel={A.sendNow}
        onCancel={() => {
          setUnsent(null);
        }}
        onConfirm={() => {
          setUnsent(null);
          void local?.engine.syncNow();
        }}
      >
        <p>{A.unsentBody(unsent ?? 0)}</p>
      </Dialog>
    </div>
  );
}
