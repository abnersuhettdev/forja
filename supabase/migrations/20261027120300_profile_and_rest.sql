-- TAR-004 — perfil de treinamento e descanso.
-- Referências: DAD-02 §2–§3, DAD-03 §5 (TG-03, TG-08) e §7, RN-006, RN-025, RN-050, ADR-021.

-- ENT-003 — perfil de treinamento atual (1:1 com o aluno).
create table public.training_profiles (
  student_id uuid primary key references public.students (id) on delete cascade,
  goal text references public.goals (code),
  goal_weight_kg numeric(4, 1) check (goal_weight_kg between 30 and 300),
  experience_level text references public.experience_levels (code),
  activity_level text references public.activity_levels (code),
  days_per_week smallint check (days_per_week between 1 and 7),
  minutes_per_session smallint check (minutes_per_session between 15 and 180),
  preferred_weekdays smallint[] check (
    preferred_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(preferred_weekdays) <= 7
  ),
  training_location text references public.training_locations (code),
  equipment_codes text[],
  restrictions_declared text check (restrictions_declared in ('none', 'listed')),
  restriction_codes text[],
  restrictions_note text check (char_length(restrictions_note) <= 500),
  preferences_note text check (char_length(preferences_note) <= 500),
  reassessment_interval_days smallint not null default 30 check (reassessment_interval_days = 30),
  reassessment_snooze_until date,
  review_recommended_since timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- RN-006: "nenhuma" restrição declarada não convive com restrições listadas.
  constraint training_profiles_restrictions_coherent check (
    restrictions_declared is distinct from 'none' or coalesce(cardinality(restriction_codes), 0) = 0
  ),
  constraint training_profiles_restrictions_listed check (
    restrictions_declared is distinct from 'listed' or coalesce(cardinality(restriction_codes), 0) > 0
  )
);

-- Códigos em listas não podem ter chave estrangeira; o gatilho confere contra as taxonomias.
create or replace function app.training_profiles_validate_codes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.equipment_codes is not null and exists (
    select 1 from unnest(new.equipment_codes) c
    where c is null or not exists (select 1 from public.equipment e where e.code = c)
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001', hint = 'equipment_codes';
  end if;
  if new.restriction_codes is not null and exists (
    select 1 from unnest(new.restriction_codes) c
    where c is null or not exists (select 1 from public.restriction_categories r where r.code = c)
  ) then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001', hint = 'restriction_codes';
  end if;
  return new;
end
$$;

-- Existe versão ativa de programa para o aluno? Programas chegam na TAR-015, que
-- substitui esta função pela consulta real a program_versions.
create or replace function app.has_active_program(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false
$$;

-- TG-08 — revisão recomendada (RN-025): mudança em objetivo, disponibilidade, local,
-- equipamentos ou restrições com versão ativa existente.
create or replace function app.training_profiles_review_recommended()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.goal, new.days_per_week, new.minutes_per_session, new.preferred_weekdays,
      new.training_location, new.equipment_codes, new.restrictions_declared,
      new.restriction_codes)
     is distinct from
     (old.goal, old.days_per_week, old.minutes_per_session, old.preferred_weekdays,
      old.training_location, old.equipment_codes, old.restrictions_declared,
      old.restriction_codes)
     and app.has_active_program(new.student_id) then
    new.review_recommended_since := coalesce(old.review_recommended_since, now());
  end if;
  return new;
end
$$;

create trigger training_profiles_validate_codes before insert or update on public.training_profiles
  for each row execute function app.training_profiles_validate_codes();
create trigger training_profiles_review_recommended before update on public.training_profiles
  for each row execute function app.training_profiles_review_recommended();
create trigger training_profiles_revision before insert or update on public.training_profiles
  for each row execute function app.bump_revision();

-- ENT-008 — descanso padrão (48 h iniciais — ADR-021).
create table public.rest_settings (
  student_id uuid primary key references public.students (id) on delete cascade,
  default_hours smallint not null default 48 check (default_hours between 0 and 168),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rest_settings_revision before insert or update on public.rest_settings
  for each row execute function app.bump_revision();

-- ENT-009 — descanso por grupo muscular.
create table public.rest_overrides (
  student_id uuid not null references public.students (id) on delete cascade,
  muscle_group_code text not null references public.muscle_groups (code),
  hours smallint not null check (hours between 0 and 168),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, muscle_group_code)
);
create trigger rest_overrides_revision before insert or update on public.rest_overrides
  for each row execute function app.bump_revision();

-- Permissões e políticas (DAD-03 §7.2): leitura pelo aluno e pelo gestor; escrita só pelo
-- papel de sincronização, na mesma condição aplicada ao ator.
do $$
declare
  t text;
begin
  foreach t in array array['training_profiles', 'rest_settings', 'rest_overrides'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, sync_writer', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to sync_writer', t);
    execute format(
      'create policy %I on public.%I for select to authenticated, sync_writer
         using (app.can_access_student(student_id))', t || '_read', t);
    execute format(
      'create policy %I on public.%I for insert to sync_writer
         with check (app.can_access_student(student_id))', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to sync_writer
         using (app.can_access_student(student_id))
         with check (app.can_access_student(student_id))', t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to sync_writer
         using (app.can_access_student(student_id))', t || '_delete', t);
  end loop;
end
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
