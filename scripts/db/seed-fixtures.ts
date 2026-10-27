// Cria os usuários fictícios de supabase/fixtures no Supabase LOCAL (RN-037, ADR-090).
// `aluno: true` já deixa a configuração inicial feita (aluno próprio, perfil e descanso);
// `aluno: false` deixa o usuário no primeiro acesso.
//   node scripts/db/seed-fixtures.ts                    cria/garante todos
//   node scripts/db/seed-fixtures.ts --reset <e-mail>   volta o usuário ao primeiro acesso
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { createUser, ensureManager, findUserByEmail, setUserPassword } from "../ops/managers.ts";
import { localStatus } from "./local.ts";

interface Fixture {
  email: string;
  senha: string;
  gestor: boolean;
  aluno: boolean;
}

function readFixtures(): Fixture[] {
  const { usuarios } = JSON.parse(
    readFileSync(
      new URL("../../supabase/fixtures/usuarios-ficticios.json", import.meta.url),
      "utf8",
    ),
  ) as { usuarios: Fixture[] };
  return usuarios;
}

async function ensureSelfStudent(sql: postgres.Sql, userId: string, email: string): Promise<void> {
  await sql`
    insert into public.students
      (id, manager_id, user_id, is_self, full_name, email, birth_date, onboarding_completed_at)
    select gen_random_uuid(), m.id, ${userId}, true, 'Pessoa Fictícia', ${email}, '1990-01-01', now()
    from public.managers m
    where m.user_id = ${userId}
      -- Gatilhos BEFORE rodam antes de "on conflict": a existência é conferida aqui.
      and not exists (select 1 from public.students s where s.user_id = ${userId})`;
  await sql`
    insert into public.training_profiles (student_id, goal)
    select id, 'hypertrophy' from public.students where user_id = ${userId}
    on conflict (student_id) do nothing`;
  await sql`
    insert into public.rest_settings (student_id)
    select id from public.students where user_id = ${userId}
    on conflict (student_id) do nothing`;
}

export async function seedFixtures(): Promise<Fixture[]> {
  const status = localStatus();
  const creds = { url: status.API_URL, serviceKey: status.SERVICE_ROLE_KEY };
  const sql = postgres(status.DB_URL, { onnotice: () => undefined });
  const fixtures = readFixtures();
  try {
    for (const fixture of fixtures) {
      const existing = await findUserByEmail(creds, fixture.email);
      // Testes que trocam a senha podem ter sido interrompidos: volta à senha do arquivo.
      if (existing) await setUserPassword(creds, existing.id, fixture.senha);
      const user = existing ?? (await createUser(creds, fixture.email, fixture.senha));
      if (fixture.gestor) await ensureManager(creds, user.id);
      if (fixture.aluno) await ensureSelfStudent(sql, user.id, fixture.email);
    }
  } finally {
    await sql.end();
  }
  return fixtures;
}

/** Apaga o aluno do usuário fictício (cascata), voltando-o ao primeiro acesso. */
export async function resetOnboarding(email: string): Promise<void> {
  if (!readFixtures().some((fixture) => fixture.email === email)) {
    throw new Error("Só usuários fictícios podem ser reiniciados.");
  }
  const sql = postgres(localStatus().DB_URL, { onnotice: () => undefined });
  try {
    await sql`
      delete from public.students
      where user_id = (select id from auth.users where email = ${email})`;
  } finally {
    await sql.end();
  }
}

if (import.meta.main) {
  const [flag, email] = process.argv.slice(2);
  if (flag === "--reset" && email) {
    await resetOnboarding(email);
    console.log("Usuário fictício de volta ao primeiro acesso.");
  } else {
    const created = await seedFixtures();
    console.log(`Usuários fictícios prontos: ${String(created.length)}`);
  }
}
