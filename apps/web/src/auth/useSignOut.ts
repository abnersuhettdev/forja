import { useCallback } from "react";
import { navigate } from "../app/router.tsx";
import { collectPending, hasPending } from "../local/kept.ts";
import { useLocalData } from "../local/LocalDataProvider.tsx";
import { listOutbox, releaseRetries } from "../local/outbox.ts";
import { seal, storeSealed } from "../local/vault.ts";
import { useAuth } from "./AuthProvider.tsx";
import { getSupabase } from "./client.ts";
import { clearUserLocalData } from "./local-data.ts";

// Saída da conta (RF-002, RF-101..103; RN-052, RN-053; UX-04 §6.1; ADR-028 L6). Sem pendências:
// remove os dados locais do usuário e encerra a sessão neste aparelho. Com pendências (fila ou
// sessão em andamento), nada sai sem uma das escolhas explícitas abaixo.

export type SendResult =
  | { readonly status: "signed_out" }
  /** Envio total ou parcialmente sem sucesso: as opções voltam com a contagem atualizada. */
  | { readonly status: "remaining"; readonly count: number }
  /** Recusados ou conflitos: exigem resolução ou outra opção antes de sair. */
  | { readonly status: "attention"; readonly count: number };

export type KeepResult =
  | { readonly status: "signed_out" }
  | { readonly status: "wrong_password" }
  | { readonly status: "failed" };

export interface SignOutActions {
  /** Há algo que não pode ser apagado em silêncio (RN-052 b). */
  readonly hasPending: () => Promise<boolean>;
  /** RN-052 a — sem pendências, após a confirmação. */
  readonly signOut: () => Promise<void>;
  /** "Enviar e sair" (só online). */
  readonly sendAndSignOut: () => Promise<SendResult>;
  /** "Sair e manter neste aparelho": cifra as pendências com a senha (ADR-070). */
  readonly keepAndSignOut: (password: string, online: boolean) => Promise<KeepResult>;
  /** "Descartar e sair": apaga as pendências definitivamente (confirmação digitada na tela). */
  readonly discardAndSignOut: () => Promise<void>;
}

const ATTENTION = new Set(["rejected", "conflict"]);

export function useSignOut(): SignOutActions {
  const local = useLocalData();
  const auth = useAuth();
  const email = auth.status === "signedIn" ? auth.email : null;

  /** Apaga o banco do usuário enquanto ele ainda está aberto e encerra a sessão aqui. */
  const finish = useCallback(async () => {
    await local?.destroy();
    clearUserLocalData();
    // "local" encerra só neste aparelho, mesmo sem conexão.
    await getSupabase()?.auth.signOut({ scope: "local" });
    navigate("/entrar", { replace: true });
  }, [local]);

  const pendingNow = useCallback(
    async () => (local === null ? false : hasPending(local.db)),
    [local],
  );

  const sendAndSignOut = useCallback(async (): Promise<SendResult> => {
    if (local === null) return { status: "remaining", count: 0 };
    // Pedido explícito: a espera de nova tentativa não vale (UX-08 §6.3, "Enviar agora").
    await releaseRetries(local.db);
    await local.engine.syncNow();
    const operations = await listOutbox(local.db);
    const records = (states?: Set<string>) =>
      new Set(
        operations
          .filter((op) => states === undefined || states.has(op.state))
          .map((op) => op.group_id ?? op.entity_id),
      ).size;
    const attention = records(ATTENTION);
    if (attention > 0) return { status: "attention", count: attention };
    if (operations.length > 0) return { status: "remaining", count: records() };
    // Tudo enviado (a sessão em andamento também já está no servidor).
    await finish();
    return { status: "signed_out" };
  }, [local, finish]);

  const keepAndSignOut = useCallback(
    async (password: string, online: boolean): Promise<KeepResult> => {
      if (local === null) return { status: "failed" };
      // Online, a senha é conferida no serviço de autenticação; offline, a derivação é local
      // e a tela pede a senha duas vezes (ADR-028 L6: "Sair e manter" funciona offline).
      if (online && email !== null) {
        const { error } = (await getSupabase()?.auth.signInWithPassword({ email, password })) ?? {
          error: null,
        };
        if (error) return { status: error.status === 400 ? "wrong_password" : "failed" };
      }
      try {
        const content = await collectPending(local.db);
        await storeSealed(await seal(local.ownerKey, password, content));
      } catch {
        // Sem cofre gravado, nada é apagado.
        return { status: "failed" };
      }
      await finish();
      return { status: "signed_out" };
    },
    [local, email, finish],
  );

  return {
    hasPending: pendingNow,
    signOut: finish,
    sendAndSignOut,
    keepAndSignOut,
    discardAndSignOut: finish,
  };
}
