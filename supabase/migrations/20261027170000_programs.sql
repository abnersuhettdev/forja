-- TAR-015 — programas, versões, treinos e exercícios prescritos.
-- Referências: DAD-01 §5, DAD-02 §5, DAD-03 §2–§7 (TG-01, TG-02, TG-03, TG-09), RN-003, RN-004,
-- RN-005, RN-009, RN-021, RN-035.

-- ENT-018 — programa (um por aluno no MVP).
create table public.programs (
  id uuid primary key,
  student_id uuid not null unique references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ENT-019 — versão do programa.
create table public.program_versions (
  id uuid primary key,
  program_id uuid not null references public.programs (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  version_number integer check (version_number >= 1),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  split_type text check (split_type in ('full_body', 'ab', 'abc', 'abcd', 'upper_lower', 'other')),
  origin text not null default 'manual' check (origin in ('manual', 'generated')),
  generator_report jsonb check (jsonb_typeof(generator_report) = 'object'),
  created_from_version_id uuid references public.program_versions (id) on delete set null,
  published_at timestamptz,
  archived_at timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_versions_published_coherent check (
    (status = 'draft') = (version_number is null and published_at is null)
  ),
  constraint program_versions_archived_coherent check ((status = 'archived') = (archived_at is not null))
);
-- RN-003: no máximo uma versão ativa e um rascunho por aluno.
create unique index program_versions_one_active on public.program_versions (student_id)
  where status = 'active';
create unique index program_versions_one_draft on public.program_versions (student_id)
  where status = 'draft';
create unique index program_versions_number_uq on public.program_versions (student_id, version_number);
create index program_versions_student_status_idx on public.program_versions (student_id, status);

-- ENT-020 — treino (posição = sequência planejada, RN-035).
create table public.workouts (
  id uuid primary key,
  program_version_id uuid not null references public.program_versions (id) on delete cascade,
  position smallint not null check (position between 1 and 7),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  unique (program_version_id, position)
);

-- ENT-021 — exercício prescrito (RN-035).
create table public.workout_items (
  id uuid primary key,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  position smallint not null check (position >= 1),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  measure_type text not null check (measure_type in ('reps', 'duration')),
  sets smallint not null check (sets between 1 and 10),
  reps_min smallint check (reps_min between 1 and 100),
  reps_max smallint check (reps_max between 1 and 100),
  duration_s smallint check (duration_s between 1 and 3600),
  rest_s smallint not null check (rest_s between 0 and 600),
  suggested_load_kg numeric(4, 1) check (
    suggested_load_kg between 0 and 500 and suggested_load_kg * 2 = trunc(suggested_load_kg * 2)
  ),
  notes text check (char_length(notes) <= 500),
  unique (workout_id, position),
  constraint workout_items_measure check (
    (measure_type = 'reps' and reps_min is not null and reps_max is not null
      and reps_min <= reps_max and duration_s is null)
    or (measure_type = 'duration' and duration_s is not null and reps_min is null and reps_max is null)
  )
);
create index workout_items_exercise_idx on public.workout_items (exercise_id);

-- TG-09 — coerência de dono: a versão pertence ao aluno do programa.
create or replace function app.program_versions_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.programs p where p.id = new.program_id and p.student_id = new.student_id
  ) then
    raise exception 'OWNER_MISMATCH' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger program_versions_owner before insert or update of program_id, student_id
  on public.program_versions for each row execute function app.program_versions_owner();

-- Pendências que impedem publicar (RN-035, RN-021): a mesma regra de draftIssues no domínio.
create or replace function app.draft_has_issues(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.workouts w where w.program_version_id = p_version_id)
      not between 1 and 7
    or exists (
      select 1 from public.workouts w
      where w.program_version_id = p_version_id
        and not exists (select 1 from public.workout_items i where i.workout_id = w.id)
    )
    or exists (
      select 1 from public.workouts w
      join public.workout_items i on i.workout_id = w.id
      join public.exercises e on e.id = i.exercise_id
      where w.program_version_id = p_version_id and not e.active
    )
$$;

-- TG-01 — imutabilidade (RN-004) e TG-02 — publicação atômica (RN-003, RN-035).
create or replace function app.program_versions_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Só rascunhos são descartados; versões publicadas só saem na exclusão do aluno (cascata).
    if old.status <> 'draft' and pg_trigger_depth() <= 1 then
      raise exception 'VERSION_NOT_AVAILABLE' using errcode = 'P0001', hint = 'RN-004';
    end if;
    return old;
  end if;

  if old.status = 'draft' and new.status = 'active' then
    if app.draft_has_issues(new.id) then
      raise exception 'DRAFT_INVALID' using errcode = 'P0001', hint = 'RN-035';
    end if;
    update public.program_versions
      set status = 'archived', archived_at = now()
      where student_id = new.student_id and status = 'active' and id <> new.id;
    new.version_number := coalesce(
      (select max(v.version_number) from public.program_versions v where v.student_id = new.student_id),
      0
    ) + 1;
    new.published_at := now();
    return new;
  end if;

  if old.status = 'active' and new.status = 'archived' then
    -- Arquivar não altera o conteúdo.
    if (new.name, new.split_type, new.version_number, new.published_at, new.origin)
       is distinct from (old.name, old.split_type, old.version_number, old.published_at, old.origin) then
      raise exception 'VERSION_NOT_AVAILABLE' using errcode = 'P0001', hint = 'RN-004';
    end if;
    return new;
  end if;

  if old.status <> 'draft' or new.status <> old.status then
    raise exception 'VERSION_NOT_AVAILABLE' using errcode = 'P0001', hint = 'RN-004';
  end if;
  return new;
end
$$;
create trigger program_versions_lifecycle before update or delete on public.program_versions
  for each row execute function app.program_versions_lifecycle();
create trigger program_versions_revision before insert or update on public.program_versions
  for each row execute function app.bump_revision();

-- Uma versão nasce como rascunho (RN-009: nada nasce publicado).
create or replace function app.program_versions_born_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'draft' then
    raise exception 'VERSION_NOT_AVAILABLE' using errcode = 'P0001', hint = 'RN-009';
  end if;
  return new;
end
$$;
create trigger program_versions_born_draft before insert on public.program_versions
  for each row execute function app.program_versions_born_draft();

-- TG-01 para treinos e itens: só mudam enquanto a versão é rascunho.
create or replace function app.version_is_draft(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.program_versions v where v.id = p_version_id and v.status = 'draft'
  )
$$;

create or replace function app.workouts_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
begin
  if pg_trigger_depth() > 1 and tg_op = 'DELETE' then
    return old; -- cascata de exclusão da versão ou do aluno
  end if;
  if tg_table_name = 'workouts' then
    version_id := coalesce(new.program_version_id, old.program_version_id);
  else
    select w.program_version_id into version_id
    from public.workouts w where w.id = coalesce(new.workout_id, old.workout_id);
  end if;
  if not app.version_is_draft(version_id) then
    raise exception 'VERSION_NOT_AVAILABLE' using errcode = 'P0001', hint = 'RN-004';
  end if;
  return coalesce(new, old);
end
$$;
create trigger workouts_immutable before insert or update or delete on public.workouts
  for each row execute function app.workouts_immutable();
create trigger workout_items_immutable before insert or update or delete on public.workout_items
  for each row execute function app.workouts_immutable();

-- RN-021: exercício desativado não entra em rascunho.
create or replace function app.workout_items_active_exercise()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.exercises e where e.id = new.exercise_id and e.active) then
    raise exception 'EXERCISE_INACTIVE' using errcode = 'P0001', hint = 'RN-021';
  end if;
  return new;
end
$$;
create trigger workout_items_active_exercise before insert or update of exercise_id
  on public.workout_items for each row execute function app.workout_items_active_exercise();

-- RN-025 (TG-08): a revisão recomendada passa a considerar a versão ativa real.
create or replace function app.has_active_program(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.program_versions v where v.student_id = p_student_id and v.status = 'active'
  )
$$;

-- Leitura (DAD-03 §7.2, RN-005): aluno vê só versões publicadas; gestor vê todas.
create or replace function app.can_read_version(p_student_id uuid, p_status text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app.manages_student(p_student_id)
    or (p_status <> 'draft' and app.is_own_student(p_student_id))
$$;

create or replace function app.can_read_version_by_id(p_version_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.program_versions v where v.id = p_version_id
  )
$$;

revoke all on function app.draft_has_issues(uuid), app.version_is_draft(uuid),
  app.can_read_version(uuid, text), app.can_read_version_by_id(uuid) from public;
grant execute on function app.draft_has_issues(uuid), app.version_is_draft(uuid),
  app.can_read_version(uuid, text), app.can_read_version_by_id(uuid) to authenticated, sync_writer;

do $$
declare
  t text;
begin
  foreach t in array array['programs', 'program_versions', 'workouts', 'workout_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, sync_writer', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to sync_writer', t);
  end loop;
end
$$;

create policy programs_read on public.programs for select to authenticated, sync_writer
  using (app.can_access_student(student_id));
create policy programs_write on public.programs for insert to sync_writer
  with check (app.manages_student(student_id));

create policy program_versions_read on public.program_versions for select to authenticated, sync_writer
  using (app.can_read_version(student_id, status));
create policy program_versions_insert on public.program_versions for insert to sync_writer
  with check (app.manages_student(student_id));
create policy program_versions_update on public.program_versions for update to sync_writer
  using (app.manages_student(student_id)) with check (app.manages_student(student_id));
create policy program_versions_delete on public.program_versions for delete to sync_writer
  using (app.manages_student(student_id));

-- Treinos e itens: visíveis quando a versão é visível (a política dela vale na subconsulta);
-- escritos só pelo gestor do aluno.
create policy workouts_read on public.workouts for select to authenticated, sync_writer
  using (app.can_read_version_by_id(program_version_id));
create policy workout_items_read on public.workout_items for select to authenticated, sync_writer
  using (exists (select 1 from public.workouts w where w.id = workout_id));

create or replace function app.manages_version_of(p_version_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.program_versions v
    where v.id = p_version_id and app.manages_student_of(v.student_id, p_actor)
  )
$$;
create or replace function app.manages_workout_of(p_workout_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workouts w
    where w.id = p_workout_id and app.manages_version_of(w.program_version_id, p_actor)
  )
$$;
revoke all on function app.manages_version_of(uuid, uuid), app.manages_workout_of(uuid, uuid) from public;
grant execute on function app.manages_version_of(uuid, uuid), app.manages_workout_of(uuid, uuid)
  to sync_writer;

create policy workouts_write on public.workouts for all to sync_writer
  using (app.manages_version_of(program_version_id, app.current_actor()))
  with check (app.manages_version_of(program_version_id, app.current_actor()));
create policy workout_items_write on public.workout_items for all to sync_writer
  using (app.manages_workout_of(workout_id, app.current_actor()))
  with check (app.manages_workout_of(workout_id, app.current_actor()));
