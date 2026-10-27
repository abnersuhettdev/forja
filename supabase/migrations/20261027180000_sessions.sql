-- TAR-019 — sessões, exercícios da sessão e séries (ENT-022..024).
-- Referências: DAD-02 §6, DAD-03 §5 (TG-03, TG-06, TG-07) e §7, RN-012, RN-018, RN-027,
-- RN-043..049, ADR-053. Escrita só pela função de sincronização (ADR-050).

-- ENT-022 — sessão (identificador gerado no aparelho).
create table public.sessions (
  id uuid primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  program_version_id uuid not null references public.program_versions (id),
  workout_id uuid not null references public.workouts (id),
  status text not null check (status in ('in_progress', 'completed', 'manual', 'abandoned')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_min smallint check (duration_min between 1 and 300),
  last_activity_at timestamptz not null,
  rpe smallint check (rpe between 0 and 10),
  notes text check (char_length(notes) <= 500),
  device_id uuid not null,
  possible_duplicate_of uuid references public.sessions (id) on delete set null,
  clock_suspect boolean not null default false,
  revision integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_finished_has_end check (
    status not in ('completed', 'manual') or ended_at is not null
  ),
  constraint sessions_end_after_start check (ended_at is null or ended_at >= started_at)
);
create index sessions_student_started_idx on public.sessions (student_id, started_at desc);

-- ENT-023 — exercício da sessão (cópia do item prescrito no início — RN-044).
create table public.session_exercises (
  id uuid primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  workout_item_id uuid references public.workout_items (id),
  exercise_id uuid not null references public.exercises (id),
  position smallint not null check (position between 1 and 50),
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  substituted_for_item_id uuid references public.workout_items (id),
  revision integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_exercises_session_idx on public.session_exercises (session_id);
create index session_exercises_exercise_idx on public.session_exercises (exercise_id);

-- ENT-024 — série registrada (RN-018).
create table public.set_logs (
  id uuid primary key,
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 20),
  load_kg numeric(4, 1) check (load_kg between 0 and 500 and mod(load_kg * 10, 5) = 0),
  reps smallint check (reps between 0 and 100),
  duration_s smallint check (duration_s between 0 and 3600),
  completed_at timestamptz not null,
  revision integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Valores obrigatórios fora da marca de exclusão (TG-07 apaga os valores).
  constraint set_logs_values_present check (
    deleted_at is not null
    or (load_kg is not null and (reps is null) <> (duration_s is null))
  )
);
create unique index set_logs_number_uq on public.set_logs (session_exercise_id, set_number)
  where deleted_at is null;

-- ---------- Revisão (TG-03) ----------
-- Atividade técnica (última série, marcas de horário e de duplicidade) não é alteração do
-- usuário: não incrementa a revisão, para que conclusão e edição continuem com a base atual.
create or replace function app.sessions_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
  elsif (new.status, new.started_at, new.ended_at, new.duration_min, new.rpe, new.notes,
         new.deleted_at, new.workout_id, new.program_version_id)
        is distinct from
        (old.status, old.started_at, old.ended_at, old.duration_min, old.rpe, old.notes,
         old.deleted_at, old.workout_id, old.program_version_id) then
    new.revision := old.revision + 1;
  else
    new.revision := old.revision;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger sessions_revision before insert or update on public.sessions
  for each row execute function app.sessions_revision();
create trigger session_exercises_revision before insert or update on public.session_exercises
  for each row execute function app.bump_revision();
create trigger set_logs_revision before insert or update on public.set_logs
  for each row execute function app.bump_revision();

-- ---------- TG-07 — marca de exclusão apaga valores pessoais (ADR-053) ----------
create or replace function app.sessions_clear_on_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.rpe := null;
    new.notes := null;
  end if;
  return new;
end
$$;

create or replace function app.set_logs_clear_on_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.load_kg := null;
    new.reps := null;
    new.duration_s := null;
  end if;
  return new;
end
$$;

create trigger sessions_clear_on_delete before update on public.sessions
  for each row execute function app.sessions_clear_on_delete();
create trigger set_logs_clear_on_delete before update on public.set_logs
  for each row execute function app.set_logs_clear_on_delete();

-- ---------- TG-06 — janela de edição de 60 dias (RN-027) ----------
-- Inserções (inclusive de sessões criadas offline há mais tempo) são sempre aceitas. Uma
-- sessão ainda em andamento continua sendo "criada": registrar séries e concluí-la não é
-- edição. A atividade técnica (última série) também não conta.
create or replace function app.session_in_edit_window(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select s.status = 'in_progress' or s.started_at >= now() - interval '60 days'
    from public.sessions s where s.id = p_session_id
  ), true)
$$;

create or replace function app.sessions_edit_window()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Exclusão em cascata (aluno removido — RN-020) não é edição do usuário.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  if old.status = 'in_progress' or old.started_at >= now() - interval '60 days' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'UPDATE'
     and (new.status, new.started_at, new.ended_at, new.duration_min, new.rpe, new.notes,
          new.deleted_at)
         is not distinct from
         (old.status, old.started_at, old.ended_at, old.duration_min, old.rpe, old.notes,
          old.deleted_at) then
    return new;
  end if;
  raise exception 'EDIT_WINDOW_EXPIRED' using errcode = 'P0001', hint = 'RN-027';
end
$$;

create or replace function app.session_children_edit_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session uuid;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  if tg_table_name = 'set_logs' then
    select se.session_id into v_session
    from public.session_exercises se where se.id = old.session_exercise_id;
  else
    v_session := old.session_id;
  end if;
  if not app.session_in_edit_window(v_session) then
    raise exception 'EDIT_WINDOW_EXPIRED' using errcode = 'P0001', hint = 'RN-027';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger sessions_edit_window before update or delete on public.sessions
  for each row execute function app.sessions_edit_window();
create trigger session_exercises_edit_window before update or delete on public.session_exercises
  for each row execute function app.session_children_edit_window();
create trigger set_logs_edit_window before update or delete on public.set_logs
  for each row execute function app.session_children_edit_window();

-- ---------- Isolamento (DAD-03 §7.2) ----------
-- Aluno da sessão, sem passar pelas políticas (usado só dentro das políticas).
create or replace function app.session_student(p_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.student_id from public.sessions s where s.id = p_session_id
$$;

create or replace function app.session_exercise_student(p_session_exercise_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.student_id
  from public.session_exercises se join public.sessions s on s.id = se.session_id
  where se.id = p_session_exercise_id
$$;

revoke all on function app.session_in_edit_window(uuid), app.session_student(uuid),
  app.session_exercise_student(uuid) from public;
grant execute on function app.session_in_edit_window(uuid), app.session_student(uuid),
  app.session_exercise_student(uuid) to authenticated, sync_writer;

do $$
declare
  t text;
  owner_expr text;
begin
  foreach t in array array['sessions', 'session_exercises', 'set_logs'] loop
    owner_expr := case t
      when 'sessions' then 'student_id'
      when 'session_exercises' then 'app.session_student(session_id)'
      else 'app.session_exercise_student(session_exercise_id)'
    end;
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, sync_writer', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to sync_writer', t);
    -- Registros excluídos só aparecem para o próprio aluno, para reconciliação.
    execute format(
      'create policy %I on public.%I for select to authenticated, sync_writer
         using (app.is_own_student(%s) or (deleted_at is null and app.manages_student(%s)))',
      t || '_read', t, owner_expr, owner_expr);
    execute format(
      'create policy %I on public.%I for insert to sync_writer
         with check (app.can_access_student(%s))', t || '_insert', t, owner_expr);
    execute format(
      'create policy %I on public.%I for update to sync_writer
         using (app.can_access_student(%s)) with check (app.can_access_student(%s))',
      t || '_update', t, owner_expr, owner_expr);
    execute format(
      'create policy %I on public.%I for delete to sync_writer
         using (app.can_access_student(%s))', t || '_delete', t, owner_expr);
  end loop;
end
$$;

-- ---------- API-R07 — última execução por exercício ----------
-- Sessão concluída ou registrada mais recente, não excluída, com série registrada do
-- exercício (TRN-04 §3). security_invoker: valem as políticas de quem consulta.
create view public.last_executions with (security_invoker = true) as
select distinct on (s.student_id, se.exercise_id)
  s.student_id,
  se.exercise_id,
  s.id as session_id,
  s.started_at,
  (
    select jsonb_agg(
      jsonb_build_object(
        'set_number', l.set_number,
        'load_kg', l.load_kg,
        'reps', l.reps,
        'duration_s', l.duration_s
      ) order by l.set_number)
    from public.set_logs l
    where l.session_exercise_id = se.id and l.deleted_at is null
  ) as sets
from public.sessions s
join public.session_exercises se on se.session_id = s.id and se.deleted_at is null
where s.status in ('completed', 'manual')
  and s.deleted_at is null
  and exists (
    select 1 from public.set_logs l where l.session_exercise_id = se.id and l.deleted_at is null
  )
order by s.student_id, se.exercise_id, s.started_at desc;

revoke all on public.last_executions from anon, authenticated, sync_writer;
grant select on public.last_executions to authenticated;
