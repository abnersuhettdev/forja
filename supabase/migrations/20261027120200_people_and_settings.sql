-- TAR-004 — pessoas, configuração do sistema e funções de isolamento.
-- Referências: DAD-02 §2 e §8, DAD-03 §2–§7, DAD-05 §5, RN-001, RN-002, RN-010, RN-040.

-- ENT-028 — configuração do sistema. Escrita só por migrações.
create table public.system_settings (
  key text primary key,
  value jsonb not null
);
alter table public.system_settings enable row level security;
alter table public.system_settings force row level security;
revoke all on public.system_settings from anon, authenticated, sync_writer;
grant select on public.system_settings to authenticated;
-- O app só lê a chave do GATE-TER.
create policy system_settings_read_ter on public.system_settings
  for select to authenticated using (key = 'ter_enabled');

insert into public.system_settings (key, value) values ('ter_enabled', 'false'::jsonb);

-- ENT-001 — gestor. Criado pelo procedimento operacional de inicialização (DAD-05 §4).
create table public.managers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.managers enable row level security;
alter table public.managers force row level security;
revoke all on public.managers from anon, authenticated, sync_writer;
grant select on public.managers to authenticated, sync_writer;
create trigger managers_touch before update on public.managers
  for each row execute function app.touch_updated_at();

-- ENT-002 — aluno.
create table public.students (
  id uuid primary key,
  manager_id uuid not null references public.managers (id) on delete restrict,
  user_id uuid unique references auth.users (id) on delete restrict,
  is_self boolean not null default false,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  birth_date date not null,
  sex text check (sex in ('female', 'male', 'undisclosed')),
  height_cm numeric(4, 1) check (height_cm between 120 and 230),
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- PES: o aluno "próprio" é o usuário do gestor.
  constraint students_self_has_user check (not is_self or user_id is not null)
);
create index students_manager_idx on public.students (manager_id);
alter table public.students enable row level security;
alter table public.students force row level security;
revoke all on public.students from anon, authenticated, sync_writer;
grant select on public.students to authenticated;
grant select, insert, update, delete on public.students to sync_writer;
create trigger students_touch before update on public.students
  for each row execute function app.touch_updated_at();

-- Funções de isolamento (DAD-03 §7.1). As consultas internas ignoram as políticas
-- (security definer) para não recursar em students; o ator chega sempre de
-- app.current_actor(), avaliado no contexto de quem consulta.
create or replace function app.is_own_student_of(p_student_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor is not null and exists (
    select 1 from public.students s where s.id = p_student_id and s.user_id = p_actor
  )
$$;

create or replace function app.manages_student_of(p_student_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor is not null and exists (
    select 1
    from public.students s
    join public.managers m on m.id = s.manager_id
    where s.id = p_student_id and m.user_id = p_actor
  )
$$;

create or replace function app.is_manager_of(p_manager_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor is not null and exists (
    select 1 from public.managers m where m.id = p_manager_id and m.user_id = p_actor
  )
$$;

create or replace function app.is_own_student(p_student_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select app.is_own_student_of(p_student_id, app.current_actor())
$$;

create or replace function app.manages_student(p_student_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select app.manages_student_of(p_student_id, app.current_actor())
$$;

-- Acesso a dados do aluno: o próprio aluno ou o seu gestor (RN-001, RN-002).
create or replace function app.can_access_student(p_student_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select app.is_own_student(p_student_id) or app.manages_student(p_student_id)
$$;

revoke all on all functions in schema app from public;
grant execute on function
  app.current_actor(),
  app.is_own_student_of(uuid, uuid),
  app.manages_student_of(uuid, uuid),
  app.is_manager_of(uuid, uuid),
  app.is_own_student(uuid),
  app.manages_student(uuid),
  app.can_access_student(uuid)
to authenticated, sync_writer;

-- Políticas de managers: cada usuário vê só o próprio registro de gestor.
create policy managers_read on public.managers
  for select to authenticated, sync_writer using (user_id = app.current_actor());

-- Políticas de students.
create policy students_read on public.students
  for select to authenticated, sync_writer using (app.can_access_student(id));
-- Inserção: o gestor cadastra (TER) ou o próprio usuário conclui a configuração inicial
-- como aluno próprio do seu gestor (API-002).
create policy students_insert on public.students
  for insert to sync_writer
  with check (
    app.is_manager_of(manager_id, app.current_actor())
    and (not is_self or user_id = app.current_actor())
  );
create policy students_update on public.students
  for update to sync_writer
  using (app.can_access_student(id))
  with check (app.can_access_student(id));
-- Exclusão definitiva é operação do gestor (RN-020, TER).
create policy students_delete on public.students
  for delete to sync_writer using (app.manages_student(id));

-- TG-04 — GATE-TER: com ter_enabled falso, o gestor tem no máximo um aluno (RN-040).
-- TG-05 — idade mínima de 18 anos na data de inserção, no fuso do aluno (RN-010, RN-028).
-- Gatilhos BEFORE rodam antes da política de inserção; por isso o dono é conferido primeiro,
-- para que um ator sem permissão receba recusa de acesso e não descubra nada sobre o
-- gestor alheio. As consultas privilegiadas ficam em funções auxiliares.
create or replace function app.ter_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value)::boolean from public.system_settings where key = 'ter_enabled'), false)
$$;

create or replace function app.manager_has_student(p_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.students s where s.manager_id = p_manager_id)
$$;

create or replace function app.students_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  local_today date;
begin
  if current_user = 'sync_writer'
     and not app.is_manager_of(new.manager_id, app.current_actor()) then
    raise exception 'OWNER_MISMATCH' using errcode = '42501';
  end if;

  if not app.ter_enabled() and app.manager_has_student(new.manager_id) then
    raise exception 'TER_DISABLED' using errcode = 'P0001', hint = 'RN-040';
  end if;

  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001', hint = 'timezone';
  end if;

  local_today := (now() at time zone new.timezone)::date;
  if new.birth_date > local_today - interval '18 years' then
    raise exception 'AGE_UNDER_18' using errcode = 'P0001', hint = 'RN-010';
  end if;

  return new;
end
$$;

revoke all on all functions in schema app from public;
grant execute on function app.ter_enabled(), app.manager_has_student(uuid) to sync_writer;

create trigger students_before_insert before insert on public.students
  for each row execute function app.students_before_insert();

-- Fuso alterado depois também precisa ser válido.
create or replace function app.students_validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001', hint = 'timezone';
  end if;
  return new;
end
$$;

create trigger students_validate_timezone before update of timezone on public.students
  for each row execute function app.students_validate_timezone();

-- Dono imutável: vínculo ao gestor, usuário e papel próprio não mudam por atualização
-- (a política de atualização enxerga a linha antiga; este gatilho protege a nova).
create or replace function app.students_guard_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
     or new.manager_id <> old.manager_id
     or new.user_id is distinct from old.user_id
     or new.is_self <> old.is_self then
    raise exception 'OWNER_MISMATCH' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger students_guard_owner before update on public.students
  for each row execute function app.students_guard_owner();
