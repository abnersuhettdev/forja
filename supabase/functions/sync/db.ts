// Conexão da função com o papel sync_writer (ADR-050): sem privilégio administrativo; cada
// transação fixa o ator verificado, e as políticas por linha comparam cada linha com ele.
import postgres from "postgres";

export type Tx = postgres.TransactionSql;

/** Valor já serializável em JSON (resultados e detalhes montados pela própria função). */
export const asJson = (value: unknown): postgres.JSONValue => value as postgres.JSONValue;

export interface SyncDb {
  /** Executa `work` numa transação com app.actor_id = `userId`. */
  inActorTransaction<T>(userId: string, work: (tx: Tx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createSyncDb(url: string): SyncDb {
  const sql = postgres(url, {
    // Compatível com o pooler em modo transação (sem instruções preparadas).
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    // Datas e números como texto/float, sem conversões implícitas de fuso.
    types: {
      date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v },
    },
    onnotice: () => undefined,
  });
  return {
    async inActorTransaction(userId, work) {
      // begin devolve o valor da função, mas o tipo dele é genérico demais; reafirma T.
      return (await sql.begin(async (tx) => {
        await tx`select set_config('app.actor_id', ${userId}, true)`;
        return work(tx);
      })) as Awaited<ReturnType<typeof work>>;
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
