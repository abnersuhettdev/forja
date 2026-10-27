import { createContext, use, useEffect, useState, type ReactNode } from "react";
import Dexie from "dexie";
import { useAuth } from "../auth/AuthProvider.tsx";
import { getSupabase } from "../auth/client.ts";
import { LocalDatabase } from "./db.ts";
import { deviceIdentity, localDatabaseName } from "./device.ts";
import { SyncEngine } from "./engine.ts";
import { countUnsent, enqueue, listOutbox, recoverInterrupted } from "./outbox.ts";
import { createHttpTransport, type SyncTransport } from "./transport.ts";

// Banco local e fila do usuário autenticado (ADR-028 L1): abre só o banco desse usuário e
// fecha tudo ao trocar de usuário. Expiração da sessão não apaga nada (RN-052 d).
export interface LocalData {
  readonly userId: string;
  readonly db: LocalDatabase;
  readonly engine: SyncEngine;
  /** Operações ainda não confirmadas pelo servidor. */
  readonly unsent: number;
  /** Encerra o motor, fecha e apaga o banco deste usuário (saída sem pendências). */
  readonly destroy: () => Promise<void>;
  /** Envio direto à função (ações que exigem conexão, como concluir a configuração inicial). */
  readonly transport: SyncTransport;
  readonly deviceId: string;
}

const LocalDataContext = createContext<LocalData | null>(null);

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.userId : null;
  const [state, setState] = useState<LocalData | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (userId === null || supabase === null) return;
    // Objeto mutável: a limpeza do efeito pode ocorrer durante a abertura assíncrona.
    const run = { cancelled: false };
    const isCancelled = () => run.cancelled;
    let engine: SyncEngine | null = null;
    let db: LocalDatabase | null = null;

    void (async () => {
      const device = deviceIdentity();
      const name = await localDatabaseName(userId, device.salt);
      if (isCancelled()) return;
      const opened = new LocalDatabase(name);
      db = opened;
      await opened.open();
      await recoverInterrupted(opened);
      const refresh = () => {
        void countUnsent(opened).then((unsent) => {
          if (!run.cancelled)
            setState((prev) => (prev?.db === opened ? { ...prev, unsent } : prev));
        });
      };
      const transport = createHttpTransport({
        baseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
        publicKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
        accessToken: async () =>
          (await supabase.auth.getSession()).data.session?.access_token ?? null,
      });
      const created = new SyncEngine({
        db: opened,
        sessionUserId: userId,
        deviceId: device.id,
        transport,
        onChange: refresh,
      });
      engine = created;
      if (isCancelled()) return;
      setState({
        userId,
        db: opened,
        engine: created,
        transport,
        deviceId: device.id,
        unsent: await countUnsent(opened),
        destroy: async () => {
          created.stop();
          opened.close();
          await Dexie.delete(name);
        },
      });
      created.start();
      if (import.meta.env.DEV) exposeTestHooks(opened, created, userId, refresh);
    })();

    return () => {
      run.cancelled = true;
      engine?.stop();
      db?.close();
      setState(null);
      if (import.meta.env.DEV) delete (window as DevWindow).__forjaLocal;
    };
  }, [userId]);

  return <LocalDataContext value={state}>{children}</LocalDataContext>;
}

export function useLocalData(): LocalData | null {
  return use(LocalDataContext);
}

// ---------- Ganchos de teste (somente em desenvolvimento) ----------

interface DevWindow extends Window {
  __forjaLocal?: {
    userId: string;
    dbName: string;
    enqueue: (op: {
      ownerUserId?: string;
      type: string;
      entityId: string;
      payload?: Record<string, unknown>;
    }) => Promise<string>;
    outbox: () => Promise<unknown[]>;
    read: (table: string) => Promise<unknown[]>;
    syncNow: () => Promise<void>;
  };
}

function exposeTestHooks(
  db: LocalDatabase,
  engine: SyncEngine,
  userId: string,
  refresh: () => void,
): void {
  (window as DevWindow).__forjaLocal = {
    userId,
    dbName: db.name,
    enqueue: async ({ ownerUserId, type, entityId, payload }) => {
      const op = await enqueue(db, {
        ownerUserId: ownerUserId ?? userId,
        type,
        entityId,
        baseRevision: null,
        payload: payload ?? {},
      });
      refresh();
      return op.op_id;
    },
    outbox: () => listOutbox(db),
    read: (table) => db.table(table).toArray(),
    syncNow: () => engine.syncNow(),
  };
}
