// Fila de saída descrita para pessoas (TELA-007; RF-100, RN-045, RN-046, RN-051, ADR-022) e as
// decisões do usuário sobre ela. Nada é descartado sem ação explícita; a cópia local volta a
// refletir o servidor só depois da decisão.
import { ACTION_REQUIRED_STATES, sessionDurationMinutes } from "@forja/domain";
import type { LocalDatabase } from "../local/db.ts";
import { enqueue, listOutbox, type QueuedOperation } from "../local/outbox.ts";
import {
  readSession,
  type LocalSession,
  type LocalSessionExercise,
  type LocalSet,
  type SessionBundle,
} from "../execution/session.ts";
import { readStoredRest, type StoredRest } from "../training/rest.ts";

export type GroupKind = "session" | "rest" | "other";

export interface QueueGroup {
  /** Registro do usuário (sessão, descanso…) a que as operações pertencem. */
  readonly id: string;
  readonly kind: GroupKind;
  readonly ops: readonly QueuedOperation[];
  /** Primeira operação recusada ou em conflito, se houver (exige ação — RN-051). */
  readonly attention: QueuedOperation | null;
  readonly session: SessionBundle | null;
  readonly rest: StoredRest | null;
}

/**
 * Registro a que a operação pertence: o grupo gravado na fila ou, para operações sem grupo
 * (anteriores à TAR-020), a sessão encontrada pela série ou pelo exercício no aparelho.
 */
async function sessionLookup(db: LocalDatabase) {
  const [exercises, sets] = await Promise.all([
    db.table<LocalSessionExercise, string>("session_exercises").toArray(),
    db.table<LocalSet, string>("set_logs").toArray(),
  ]);
  const sessionOfExercise = new Map(exercises.map((e) => [e.id, e.session_id]));
  const exerciseOfSet = new Map(sets.map((s) => [s.id, s.session_exercise_id]));
  return (op: QueuedOperation): string => {
    if (op.group_id) return op.group_id;
    const payloadExercise =
      typeof op.payload.session_exercise_id === "string" ? op.payload.session_exercise_id : null;
    const exercise = payloadExercise ?? exerciseOfSet.get(op.entity_id) ?? op.entity_id;
    return sessionOfExercise.get(exercise) ?? op.entity_id;
  };
}

const kindOf = (op: QueuedOperation): GroupKind =>
  op.type === "rest.update"
    ? "rest"
    : op.type.startsWith("session") || op.type.startsWith("set.")
      ? "session"
      : "other";

/** Agrupa a fila por registro do usuário, na ordem da operação mais antiga de cada grupo. */
export async function readQueueGroups(db: LocalDatabase): Promise<QueueGroup[]> {
  const ops = await listOutbox(db);
  const groupOf = await sessionLookup(db);
  const byGroup = new Map<string, QueuedOperation[]>();
  for (const op of ops) {
    const list = byGroup.get(groupOf(op)) ?? [];
    list.push(op);
    byGroup.set(groupOf(op), list);
  }
  const groups: QueueGroup[] = [];
  for (const [id, list] of byGroup) {
    const first = list[0];
    if (!first) continue;
    const kind = kindOf(first);
    groups.push({
      id,
      kind,
      ops: list,
      attention: list.find((op) => ACTION_REQUIRED_STATES.includes(op.state)) ?? null,
      session: kind === "session" ? ((await readSession(db, id)) ?? null) : null,
      rest: kind === "rest" ? ((await readStoredRest(db)) ?? null) : null,
    });
  }
  return groups;
}

// ---------- Possíveis duplicidades (RN-045) ----------

export interface DuplicatePair {
  readonly first: SessionBundle;
  readonly second: SessionBundle;
}

/** Pares de sessões marcadas como possível duplicidade, ambas presentes no aparelho. */
export async function readDuplicates(db: LocalDatabase): Promise<DuplicatePair[]> {
  const sessions = await db.table<LocalSession, string>("sessions").toArray();
  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();
  for (const session of sessions) {
    if (!session.possible_duplicate_of || session.deleted_at) continue;
    // Um par aparece uma vez, mesmo que as duas sessões estejam marcadas.
    const key = [session.id, session.possible_duplicate_of].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const [second, first] = await Promise.all([
      readSession(db, session.id),
      readSession(db, session.possible_duplicate_of),
    ]);
    if (first && second && !first.session.deleted_at) pairs.push({ first, second });
  }
  return pairs;
}

/** "Manter ambas": limpa a marca no aparelho e no servidor. */
export async function keepBoth(
  db: LocalDatabase,
  owner: string,
  pair: DuplicatePair,
): Promise<void> {
  const sessions = db.table<LocalSession, string>("sessions");
  await db.transaction("rw", [sessions, db.outbox], async () => {
    await sessions.update(pair.second.session.id, { possible_duplicate_of: null });
    await enqueue(db, {
      ownerUserId: owner,
      type: "session.update",
      entityId: pair.second.session.id,
      baseRevision: pair.second.session.revision ?? 1,
      payload: { possible_duplicate_of: null },
      groupId: pair.second.session.id,
    });
  });
}

/** "Excluir uma": exclui a sessão escolhida (marca de exclusão no servidor — ADR-053). */
export async function deleteSession(
  db: LocalDatabase,
  owner: string,
  bundle: SessionBundle,
): Promise<void> {
  const t = tables(db);
  await db.transaction("rw", [t.sessions, t.exercises, t.sets, db.outbox], async () => {
    await removeLocalSession(db, bundle);
    // A outra deixa de ter par: a marca dela aponta para a excluída e some no próximo download.
    await enqueue(db, {
      ownerUserId: owner,
      type: "session.delete",
      entityId: bundle.session.id,
      baseRevision: bundle.session.revision ?? 1,
      payload: {},
      groupId: bundle.session.id,
    });
  });
}

// ---------- Decisões sobre recusados e conflitos ----------

/** Cópia sem os campos indicados (ex.: revisão de um registro que será recriado). */
function omit<T extends object, K extends keyof T>(value: T, ...keys: K[]): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;
}

function tables(db: LocalDatabase) {
  return {
    sessions: db.table<LocalSession, string>("sessions"),
    exercises: db.table<LocalSessionExercise, string>("session_exercises"),
    sets: db.table<LocalSet, string>("set_logs"),
  };
}

async function removeLocalSession(db: LocalDatabase, bundle: SessionBundle): Promise<void> {
  const t = tables(db);
  await t.sets.bulkDelete(bundle.sets.map((s) => s.id));
  await t.exercises.bulkDelete(bundle.exercises.map((e) => e.id));
  await t.sessions.delete(bundle.session.id);
}

async function deleteOps(db: LocalDatabase, ops: readonly QueuedOperation[]): Promise<void> {
  await db.outbox.bulkDelete(ops.map((op) => op.seq));
}

/**
 * Descarta as operações do grupo (após confirmação que mostra o conteúdo). A cópia local volta
 * ao estado do servidor: uma sessão que nunca chegou lá sai do aparelho; as demais e o descanso
 * são substituídos no próximo download (`afterDiscard` dispara a atualização).
 */
export async function discardGroup(db: LocalDatabase, group: QueueGroup): Promise<void> {
  const t = tables(db);
  await db.transaction("rw", [t.sessions, t.exercises, t.sets, db.outbox], async () => {
    await deleteOps(db, group.ops);
    const bundle = group.session;
    if (bundle && bundle.session.revision === undefined) await removeLocalSession(db, bundle);
  });
}

/** Conflito — "Manter a deste aparelho": reenvia sobre a revisão atual do servidor (RN-046). */
export async function keepLocal(db: LocalDatabase, op: QueuedOperation): Promise<void> {
  const revision = op.server_record?.revision;
  await db.outbox.update(op.seq, {
    state: "pending",
    attempts: 0,
    next_attempt_at: null,
    last_error: null,
    base_revision: typeof revision === "number" ? revision : op.base_revision,
    server_record: null,
  });
}

/**
 * Conflito — "Manter a do servidor": a alteração local deste registro é descartada (após
 * confirmação) e a cópia local recebe a versão do servidor.
 */
export async function keepServer(db: LocalDatabase, op: QueuedOperation): Promise<void> {
  const record = op.server_record ?? null;
  const t = tables(db);
  const rest = db.table("rest");
  await db.transaction("rw", [t.sessions, t.exercises, t.sets, rest, db.outbox], async () => {
    const sameEntity = (await listOutbox(db)).filter(
      (other) => other.entity_id === op.entity_id && other.seq >= op.seq,
    );
    await deleteOps(db, sameEntity);
    if (record === null) return;
    if (op.type === "rest.update") {
      await rest.put({ ...record, key: "current" });
    } else if (op.type.startsWith("session.")) {
      await t.sessions.update(op.entity_id, record);
    } else if (op.type.startsWith("set.")) {
      await t.sets.update(op.entity_id, record);
    } else if (op.type === "session_exercise.update") {
      await t.exercises.update(op.entity_id, record);
    }
  });
}

/**
 * Conflito por registro excluído em outro aparelho — "Recriar como novo registro": a sessão
 * deste aparelho volta à fila como uma sessão nova, com novos identificadores (ADR-022).
 */
export async function recreateSession(
  db: LocalDatabase,
  owner: string,
  group: QueueGroup,
): Promise<string | null> {
  const bundle = group.session;
  if (!bundle) return null;
  const t = tables(db);
  const sessionId = crypto.randomUUID();
  const exerciseIds = new Map(bundle.exercises.map((e) => [e.id, crypto.randomUUID()]));
  await db.transaction("rw", [t.sessions, t.exercises, t.sets, db.outbox], async () => {
    await deleteOps(db, group.ops);
    await removeLocalSession(db, bundle);
    const session = omit(bundle.session, "revision", "possible_duplicate_of");
    const exercises = bundle.exercises.map((e) => ({
      ...omit(e, "revision"),
      id: exerciseIds.get(e.id) ?? e.id,
      session_id: sessionId,
    }));
    const sets = bundle.sets.map((s) => ({
      ...omit(s, "revision"),
      id: crypto.randomUUID(),
      session_exercise_id: exerciseIds.get(s.session_exercise_id) ?? s.session_exercise_id,
    }));
    await t.sessions.add({ ...session, id: sessionId, deleted_at: null });
    await t.exercises.bulkAdd(exercises);
    await t.sets.bulkAdd(sets);
    const common = { ownerUserId: owner, groupId: sessionId };
    await enqueue(db, {
      ...common,
      type: "session.start",
      entityId: sessionId,
      baseRevision: null,
      payload: {
        program_version_id: session.program_version_id,
        workout_id: session.workout_id,
        started_at: session.started_at,
        exercises: exercises.map((e) => ({
          id: e.id,
          workout_item_id: e.workout_item_id,
          exercise_id: e.exercise_id,
          position: e.position,
        })),
      },
    });
    for (const set of sets) {
      await enqueue(db, {
        ...common,
        type: "set.upsert",
        entityId: set.id,
        baseRevision: null,
        payload: {
          session_exercise_id: set.session_exercise_id,
          set_number: set.set_number,
          load_kg: set.load_kg,
          reps: set.reps,
          duration_s: set.duration_s,
          completed_at: set.completed_at,
        },
      });
    }
    for (const exercise of exercises.filter((e) => e.status !== "pending")) {
      await enqueue(db, {
        ...common,
        type: "session_exercise.update",
        entityId: exercise.id,
        baseRevision: 1,
        payload: { status: exercise.status },
      });
    }
    if (session.status === "completed" && session.ended_at) {
      await enqueue(db, {
        ...common,
        type: "session.complete",
        entityId: sessionId,
        baseRevision: 1,
        payload: {
          ended_at: session.ended_at,
          duration_min:
            session.duration_min ?? sessionDurationMinutes(session.started_at, session.ended_at),
          rpe: session.rpe,
          notes: session.notes,
        },
      });
    }
  });
  return sessionId;
}
