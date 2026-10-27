// API-R01 — "Meu contexto" (DAD-04 §3): papéis do usuário, aluno, perfil, descanso e GATE-TER.
// Lido pela API de dados (políticas por linha) e guardado no banco local do usuário para abrir
// offline (UX-08 §6.2).
import type { SupabaseClient } from "@supabase/supabase-js";
import { readMeta, writeMeta, type LocalDatabase } from "../local/db.ts";

export interface StudentSummary {
  readonly id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly timezone: string;
  readonly onboarding_completed_at: string | null;
}

export interface UserContext {
  readonly userId: string;
  readonly isManager: boolean;
  /** Aluno do próprio usuário (PES: is_self); null = configuração inicial pendente. */
  readonly student: StudentSummary | null;
  readonly profileRevision: number | null;
  readonly restRevision: number | null;
  readonly terEnabled: boolean;
  /** ISO 8601 da última leitura bem-sucedida no servidor. */
  readonly fetchedAt: string;
}

const CONTEXT_KEY = "contexto";

/** Lê o contexto no servidor; dados pessoais nunca vão em URL (filtros por identificador). */
export async function fetchUserContext(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<{ context: UserContext; profile: unknown; rest: unknown }> {
  const [manager, student, ter] = await Promise.all([
    supabase.from("managers").select("id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("students")
      .select("id, full_name, email, timezone, onboarding_completed_at")
      .eq("user_id", userId)
      .maybeSingle<StudentSummary>(),
    supabase.from("system_settings").select("value").eq("key", "ter_enabled").maybeSingle(),
  ]);
  for (const result of [manager, student, ter]) if (result.error) throw result.error;

  let profile: { revision: number } | null = null;
  let rest: { revision: number; overrides?: unknown } | null = null;
  if (student.data) {
    const studentId = student.data.id;
    const [profileResult, restResult, overridesResult] = await Promise.all([
      supabase
        .from("training_profiles")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle<{ revision: number }>(),
      supabase
        .from("rest_settings")
        .select("student_id, default_hours, revision")
        .eq("student_id", studentId)
        .maybeSingle<{ revision: number }>(),
      supabase
        .from("rest_overrides")
        .select("muscle_group_code, hours")
        .eq("student_id", studentId),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (restResult.error) throw restResult.error;
    if (overridesResult.error) throw overridesResult.error;
    profile = profileResult.data;
    rest = restResult.data ? { ...restResult.data, overrides: overridesResult.data } : null;
  }

  return {
    context: {
      userId,
      isManager: manager.data !== null,
      student: student.data,
      profileRevision: profile?.revision ?? null,
      restRevision: rest?.revision ?? null,
      terEnabled: (ter.data?.value as unknown) === true,
      fetchedAt: now.toISOString(),
    },
    profile,
    rest,
  };
}

export async function readCachedContext(db: LocalDatabase): Promise<UserContext | undefined> {
  return readMeta<UserContext>(db, CONTEXT_KEY);
}

export async function cacheContext(
  db: LocalDatabase,
  data: { context: UserContext; profile: unknown; rest: unknown },
): Promise<void> {
  await db.transaction("rw", [db.sync_meta, db.table("profile"), db.table("rest")], async () => {
    await writeMeta(db, CONTEXT_KEY, data.context);
    if (data.profile) await db.table("profile").put({ key: "current", ...data.profile });
    if (data.rest) await db.table("rest").put({ key: "current", ...data.rest });
  });
}
