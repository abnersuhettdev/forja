import Dexie, { type Table } from "dexie";
import type { OutboxOperation } from "@forja/domain";
import { LOCAL_SCHEMA, type LocalSchemaVersion } from "./schema.ts";

/** Operação guardada: `seq` é atribuído pelo banco na inserção. */
export type StoredOperation = Omit<OutboxOperation, "seq"> & { seq?: number };

export interface MetaRecord {
  key: string;
  value: unknown;
}

// Banco local de UM usuário (ADR-028 L1). Abra só o do usuário autenticado.
export class LocalDatabase extends Dexie {
  declare outbox: Table<StoredOperation, number>;
  declare sync_meta: Table<MetaRecord, string>;

  constructor(name: string, schema: readonly LocalSchemaVersion[] = LOCAL_SCHEMA) {
    super(name);
    for (const { version, stores, upgrade } of schema) {
      const declared = this.version(version).stores(stores);
      if (upgrade) declared.upgrade(upgrade);
    }
  }
}

export async function readMeta<T>(db: LocalDatabase, key: string): Promise<T | undefined> {
  const record = await db.sync_meta.get(key);
  return record?.value as T | undefined;
}

export async function writeMeta(db: LocalDatabase, key: string, value: unknown): Promise<void> {
  await db.sync_meta.put({ key, value });
}
