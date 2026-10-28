-- TAR-023 — exclusão de peso (API-006, UXP-01): a marca de exclusão apaga o valor (TG-07,
-- ADR-053), como nas séries. Pesos de avaliação são corrigidos pela avaliação (NOT_DELETABLE).
create or replace function app.weight_entries_clear_on_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    if old.source = 'assessment' then
      raise exception 'NOT_DELETABLE' using errcode = 'P0001', hint = 'UXP-01';
    end if;
    new.weight_kg := null;
  end if;
  return new;
end
$$;

create trigger weight_entries_clear_on_delete before update on public.weight_entries
  for each row execute function app.weight_entries_clear_on_delete();
