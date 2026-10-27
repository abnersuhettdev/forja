-- TAR-004 — avaliações e registros de peso.
-- Referências: DAD-02 §3, DAD-03 §3–§7, RN-014, RN-017, ADR-010, ADR-053, UXP-01.
-- Datas não futuras são verificadas pela função de sincronização com o relógio do
-- servidor (DAD-03 §4); a marca de exclusão (TG-07) chega com as sessões (TAR-019).

-- ENT-004 — avaliação com fotografia do perfil na data.
create table public.assessments (
  id uuid primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  assessed_on date not null,
  kind text not null check (kind in ('initial', 'periodic')),
  weight_kg numeric(4, 1) not null check (weight_kg between 30 and 300),
  profile_snapshot jsonb not null check (jsonb_typeof(profile_snapshot) = 'object'),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assessments_student_date_idx on public.assessments (student_id, assessed_on desc);
create trigger assessments_touch before update on public.assessments
  for each row execute function app.touch_updated_at();

-- ENT-005 — registro de peso (avulso ou da avaliação).
create table public.weight_entries (
  id uuid primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(4, 1) check (weight_kg between 30 and 300),
  source text not null check (source in ('manual', 'assessment')),
  assessment_id uuid references public.assessments (id) on delete cascade,
  revision integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Peso nulo somente em registro excluído (ADR-053).
  constraint weight_entries_value_present check (deleted_at is not null or weight_kg is not null),
  constraint weight_entries_assessment_link check (
    (source = 'assessment') = (assessment_id is not null)
  )
);
create index weight_entries_student_date_idx on public.weight_entries (student_id, measured_on desc)
  where deleted_at is null;
create unique index weight_entries_assessment_uq on public.weight_entries (assessment_id)
  where assessment_id is not null;
create trigger weight_entries_revision before insert or update on public.weight_entries
  for each row execute function app.bump_revision();

-- Permissões e políticas (DAD-03 §7.2).
do $$
declare
  t text;
begin
  foreach t in array array['assessments', 'weight_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, sync_writer', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to sync_writer', t);
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

create policy assessments_read on public.assessments
  for select to authenticated, sync_writer using (app.can_access_student(student_id));

-- Registros excluídos só aparecem para o próprio aluno, para reconciliação (DAD-03 §7.2).
create policy weight_entries_read on public.weight_entries
  for select to authenticated, sync_writer
  using (
    app.is_own_student(student_id)
    or (deleted_at is null and app.manages_student(student_id))
  );
