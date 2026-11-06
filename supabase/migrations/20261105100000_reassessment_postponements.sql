-- V12-09 / TAR-030 (RN-015, ADR-020; DAD-02 ENT-007): cada adiamento do lembrete de reavaliação
-- fica registrado; a data escolhida vai para `training_profiles.reassessment_snooze_until`.
create table public.reassessment_postponements (
  id uuid primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  postponed_from date not null,
  postponed_to date not null,
  created_at timestamptz not null default now(),
  constraint reassessment_postponements_future check (postponed_to > postponed_from)
);
create index reassessment_postponements_student_idx
  on public.reassessment_postponements (student_id, created_at desc);

alter table public.reassessment_postponements enable row level security;
alter table public.reassessment_postponements force row level security;
revoke all on public.reassessment_postponements from anon, authenticated, sync_writer;
grant select on public.reassessment_postponements to authenticated;
grant select, insert on public.reassessment_postponements to sync_writer;
create policy reassessment_postponements_read on public.reassessment_postponements
  for select to authenticated, sync_writer using (app.can_access_student(student_id));
create policy reassessment_postponements_insert on public.reassessment_postponements
  for insert to sync_writer with check (app.can_access_student(student_id));
