// Esquema versionado do banco local (DAD-01 §7, DAD-07 §4). Cada versão nova é ACRESCENTADA
// aqui com seus índices e, se preciso, uma função de atualização; versões antigas nunca são
// editadas. A fila de saída e a sessão em andamento nunca são apagadas por migração.
import type { Transaction } from "dexie";

export interface LocalSchemaVersion {
  readonly version: number;
  readonly stores: Readonly<Record<string, string | null>>;
  readonly upgrade?: (tx: Transaction) => Promise<void>;
}

export const LOCAL_SCHEMA: readonly LocalSchemaVersion[] = [
  {
    version: 1,
    stores: {
      // Fila de saída: seq = ordem de criação; op_id único (RN-042).
      outbox: "++seq, &op_id, state, entity_id",
      profile: "key",
      rest: "key",
      program: "key",
      catalog_cache: "id",
      sessions: "id, started_at",
      session_exercises: "id, session_id",
      set_logs: "id, session_exercise_id",
      weights: "id, measured_on",
      last_execution: "exercise_id",
      sync_meta: "key",
    },
  },
];

export const LOCAL_SCHEMA_VERSION = LOCAL_SCHEMA.at(-1)?.version ?? 1;
