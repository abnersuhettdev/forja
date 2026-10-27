-- TAR-014 / ADR-091 — correção de exercícios importados (RF-032, API-020, DAD-03 §7.2):
-- o papel de sincronização altera só nome, instruções e dicas de um importado, quando o ator é
-- gestor e o GATE-TER está fechado (ter_enabled falso). O texto da fonte fica em
-- original_text na primeira correção e nunca é sobrescrito. Rever no GATE-TER.

create or replace function app.can_correct_imported_of(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor is not null
    and exists (select 1 from public.managers m where m.user_id = p_actor)
    and not app.ter_enabled()
$$;

create or replace function app.can_correct_imported()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app.can_correct_imported_of(app.current_actor())
$$;

revoke all on function app.can_correct_imported_of(uuid), app.can_correct_imported() from public;
grant execute on function app.can_correct_imported_of(uuid), app.can_correct_imported()
  to sync_writer;
grant execute on function app.ter_enabled() to sync_writer;

create policy exercises_imported_correct on public.exercises
  for update to sync_writer
  using (origin = 'imported' and app.can_correct_imported())
  with check (origin = 'imported' and app.can_correct_imported());

-- Pela sincronização, um importado só muda nome, instruções e dicas; o original da fonte é
-- guardado na primeira correção e a correção fica marcada (RN-036).
create or replace function app.exercises_imported_correction()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.origin <> 'imported' or current_user <> 'sync_writer' then
    return new;
  end if;
  if (new.difficulty, new.measure_type, new.is_bodyweight, new.movement_pattern,
      new.load_markers, new.active, new.source_ref, new.text_reviewed_at)
     is distinct from
     (old.difficulty, old.measure_type, old.is_bodyweight, old.movement_pattern,
      old.load_markers, old.active, old.source_ref, old.text_reviewed_at)
     or new.original_text is distinct from old.original_text and old.original_text is not null then
    raise exception 'FORBIDDEN_ROLE' using errcode = 'P0001', hint = 'ADR-091';
  end if;
  new.original_text := coalesce(
    old.original_text,
    jsonb_build_object(
      'name', old.name,
      'instructions', old.instructions,
      'safety_tips', old.safety_tips
    )
  );
  new.edited_by_manager_at := now();
  return new;
end
$$;

create trigger exercises_imported_correction before update on public.exercises
  for each row execute function app.exercises_imported_correction();
