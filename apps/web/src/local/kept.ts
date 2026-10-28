// O que "Sair e manter neste aparelho" guarda e o que o login seguinte devolve (RN-052 b,
// RN-053 e; UX-04 §6.1): a fila de saída inteira, a sessão em andamento e os registros locais
// de que essas operações dependem (sessões, exercícios, séries e o descanso alterado).
import type { LocalDatabase, MetaRecord, StoredOperation } from "./db.ts";
import { listOutbox } from "./outbox.ts";

export interface KeptContent {
  readonly version: 1;
  readonly outbox: readonly StoredOperation[];
  readonly tables: Readonly<Record<string, readonly unknown[]>>;
  readonly meta: readonly MetaRecord[];
}

/** Metas da execução que acompanham a sessão em andamento (posição e descanso). */
const KEPT_META = ["execucao.posicao", "execucao.resumo"];

interface SessionRow {
  id: string;
  status: string;
}
interface ExerciseRow {
  id: string;
  session_id: string;
}
interface SetRow {
  session_exercise_id: string;
}

/** Há algo que a saída não pode apagar em silêncio: fila ou sessão em andamento (RN-052 b). */
export async function hasPending(db: LocalDatabase): Promise<boolean> {
  if ((await db.outbox.count()) > 0) return true;
  const sessions = (await db.table("sessions").toArray()) as SessionRow[];
  return sessions.some((s) => s.status === "in_progress");
}

export async function collectPending(db: LocalDatabase): Promise<KeptContent> {
  const operations = await listOutbox(db);
  const sessions = (await db.table("sessions").toArray()) as SessionRow[];
  const exercises = (await db.table("session_exercises").toArray()) as ExerciseRow[];
  const sets = (await db.table("set_logs").toArray()) as SetRow[];

  const sessionIds = new Set<string>(
    sessions.filter((s) => s.status === "in_progress").map((s) => s.id),
  );
  const exerciseOwner = new Map(exercises.map((e) => [e.id, e.session_id]));
  for (const op of operations) {
    for (const id of [op.group_id, op.entity_id]) {
      if (!id) continue;
      if (sessions.some((s) => s.id === id)) sessionIds.add(id);
      const owner = exerciseOwner.get(id);
      if (owner) sessionIds.add(owner);
    }
  }
  const keptExercises = exercises.filter((e) => sessionIds.has(e.session_id));
  const exerciseIds = new Set(keptExercises.map((e) => e.id));
  const rest = operations.some((op) => op.type === "rest.update")
    ? await db.table("rest").toArray()
    : [];
  const meta = (await db.sync_meta.bulkGet(KEPT_META)).filter(
    (record): record is MetaRecord => record !== undefined,
  );
  return {
    version: 1,
    // Sem `seq`: o banco do próximo login numera de novo, na mesma ordem.
    outbox: operations.map(
      (op) =>
        Object.fromEntries(Object.entries(op).filter(([key]) => key !== "seq")) as StoredOperation,
    ),
    tables: {
      sessions: sessions.filter((s) => sessionIds.has(s.id)),
      session_exercises: keptExercises,
      set_logs: sets.filter((s) => exerciseIds.has(s.session_exercise_id)),
      rest,
    },
    meta,
  };
}

function isKeptContent(value: unknown): value is KeptContent {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === 1 &&
    "outbox" in value &&
    Array.isArray(value.outbox)
  );
}

/** Devolve ao banco do usuário o que foi guardado, mantendo a ordem e os op_id (RN-042). */
export async function restorePending(db: LocalDatabase, content: unknown): Promise<boolean> {
  if (!isKeptContent(content)) return false;
  const names = Object.keys(content.tables);
  await db.transaction(
    "rw",
    [db.outbox, db.sync_meta, ...names.map((n) => db.table(n))],
    async () => {
      for (const name of names) await db.table(name).bulkPut([...(content.tables[name] ?? [])]);
      for (const op of content.outbox) {
        const exists = await db.outbox.where("op_id").equals(op.op_id).count();
        if (exists === 0)
          await db.outbox.add({ ...op, state: op.state === "sending" ? "pending" : op.state });
      }
      await db.sync_meta.bulkPut([...content.meta]);
    },
  );
  return true;
}
