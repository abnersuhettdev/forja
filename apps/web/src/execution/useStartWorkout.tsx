import { useState } from "react";
import { Dialog } from "../components/Dialog.tsx";
import { useSnackbar } from "../components/Snackbar.tsx";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { useOfflineData } from "../offline/OfflineDataProvider.tsx";
import { navigate } from "../app/router.tsx";
import { TEXTS } from "../app/texts.ts";
import { findActiveSession, SessionError, startSession } from "./session.ts";

const T = TEXTS.execution;
export const SESSION_PATH = "/sessao";

/**
 * Inicia o treino no aparelho (online ou offline — CA-060) e abre o modo foco. Com outra
 * sessão em andamento (inclusive abandonada), exige concluir ou descartar antes (RN-012).
 */
export function useStartWorkout() {
  const local = useLocalData();
  const { state: offline } = useOfflineData();
  const show = useSnackbar();
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  async function start(workoutId: string) {
    const program = offline.status === "ready" ? offline.program : null;
    if (local === null || program === null) return;
    try {
      await startSession(local.db, local.userId, program, workoutId);
      void local.engine.syncNow();
      navigate(SESSION_PATH);
    } catch (error) {
      if (error instanceof SessionError && error.code === "ACTIVE_EXISTS") {
        const active = await findActiveSession(local.db);
        setBlockedBy(active?.workout_name ?? "");
        return;
      }
      show({ text: T.startFailed });
    }
  }

  const dialog = (
    <Dialog
      open={blockedBy !== null}
      title={T.activeTitle(blockedBy ?? "")}
      confirmLabel={T.goToActive}
      onCancel={() => {
        setBlockedBy(null);
      }}
      onConfirm={() => {
        setBlockedBy(null);
        navigate(SESSION_PATH);
      }}
    >
      <p>{T.activeBody(blockedBy ?? "")}</p>
    </Dialog>
  );

  return { start, dialog };
}
