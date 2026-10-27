-- TAR-014 — escrita de exercícios personalizados pela sincronização (DAD-03 §7.2, ADR-050):
-- só o gestor dono, só origem `custom`. Importados continuam escritos apenas por migrações.

-- Correção da TAR-013: funções security definer enxergam o dono da função como usuário atual,
-- então app.current_actor() precisa ser avaliado por quem consulta e chegar por parâmetro
-- (mesmo padrão de app.is_own_student_of). Sem isto, o papel de sincronização não via o
-- catálogo. As políticas existentes continuam chamando app.can_see_exercise(origin, manager).
create or replace function app.can_see_exercise_of(p_origin text, p_manager_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor is not null and case
    when p_origin = 'imported' then true
    else app.is_manager_of(p_manager_id, p_actor) or exists (
      select 1 from public.students s
      where s.manager_id = p_manager_id and s.user_id = p_actor
    )
  end
$$;

create or replace function app.can_see_exercise(p_origin text, p_manager_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app.can_see_exercise_of(p_origin, p_manager_id, app.current_actor())
$$;
revoke all on function app.can_see_exercise_of(text, uuid, uuid) from public;
grant execute on function app.can_see_exercise_of(text, uuid, uuid) to authenticated, sync_writer;

grant insert, update on public.exercises to sync_writer;
grant insert, delete on public.exercise_muscles, public.exercise_equipment to sync_writer;

create policy exercises_custom_insert on public.exercises
  for insert to sync_writer
  with check (origin = 'custom' and app.is_manager_of(manager_id, app.current_actor()));

create policy exercises_custom_update on public.exercises
  for update to sync_writer
  using (origin = 'custom' and app.is_manager_of(manager_id, app.current_actor()))
  with check (origin = 'custom' and app.is_manager_of(manager_id, app.current_actor()));

-- Classificação: só de exercícios personalizados do próprio gestor.
create or replace function app.owns_custom_exercise_of(p_exercise_id uuid, p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor is not null and exists (
    select 1 from public.exercises e
    where e.id = p_exercise_id
      and e.origin = 'custom'
      and app.is_manager_of(e.manager_id, p_actor)
  )
$$;
create or replace function app.owns_custom_exercise(p_exercise_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app.owns_custom_exercise_of(p_exercise_id, app.current_actor())
$$;
revoke all on function app.owns_custom_exercise_of(uuid, uuid) from public;
revoke all on function app.owns_custom_exercise(uuid) from public;
grant execute on function app.owns_custom_exercise_of(uuid, uuid), app.owns_custom_exercise(uuid)
  to sync_writer;

do $$
declare
  t text;
begin
  foreach t in array array['exercise_muscles', 'exercise_equipment'] loop
    execute format(
      'create policy %I on public.%I for insert to sync_writer
         with check (app.owns_custom_exercise(exercise_id))', t || '_custom_insert', t);
    execute format(
      'create policy %I on public.%I for delete to sync_writer
         using (app.owns_custom_exercise(exercise_id))', t || '_custom_delete', t);
  end loop;
end
$$;

-- O dono e a origem de um exercício não mudam (RN-037).
create or replace function app.exercises_guard_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.origin <> old.origin or new.manager_id is distinct from old.manager_id
     or new.source_id is distinct from old.source_id then
    raise exception 'OWNER_MISMATCH' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger exercises_guard_owner before update on public.exercises
  for each row execute function app.exercises_guard_owner();
