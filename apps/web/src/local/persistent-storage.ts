// Pedido de armazenamento persistente (UX-08 §7; risco C-11 de limpeza no iPhone). Chamado
// após a primeira sessão concluída (TAR-019); o resultado fica registrado no banco local.
import { readMeta, writeMeta, type LocalDatabase } from "./db.ts";

export interface PersistenceRecord {
  readonly supported: boolean;
  readonly granted: boolean;
  readonly asked_at: string;
}

const KEY = "armazenamento_persistente";

export async function requestPersistentStorage(
  db: LocalDatabase,
  // Navegadores antigos não têm navigator.storage: passe null nesse caso.
  storage: Pick<StorageManager, "persist" | "persisted"> | null = "storage" in navigator
    ? navigator.storage
    : null,
  now: number = Date.now(),
): Promise<PersistenceRecord> {
  const previous = await readMeta<PersistenceRecord>(db, KEY);
  if (previous?.granted) return previous;
  const asked_at = new Date(now).toISOString();
  let record: PersistenceRecord;
  if (storage === null) {
    record = { supported: false, granted: false, asked_at };
  } else {
    const granted = (await storage.persisted()) || (await storage.persist());
    record = { supported: true, granted, asked_at };
  }
  await writeMeta(db, KEY, record);
  return record;
}
