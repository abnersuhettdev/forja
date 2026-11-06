-- V12-09 (RF-115..117; DAD-02 `weekly_summaries`): um resumo por aluno e semana, com os fatos
-- calculados pelas regras e o texto da IA, gravado pela função de IA (API-033).
create table public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  week_start date not null,
  facts jsonb not null check (jsonb_typeof(facts) = 'object'),
  text text check (char_length(text) <= 600),
  model text check (char_length(model) <= 100),
  created_at timestamptz not null default now(),
  constraint weekly_summaries_week_uq unique (student_id, week_start)
);

alter table public.weekly_summaries enable row level security;
alter table public.weekly_summaries force row level security;
revoke all on public.weekly_summaries from anon, authenticated, sync_writer;
grant select on public.weekly_summaries to authenticated;
grant select, insert on public.weekly_summaries to sync_writer;
create policy weekly_summaries_read on public.weekly_summaries
  for select to authenticated, sync_writer using (app.can_access_student(student_id));
create policy weekly_summaries_insert on public.weekly_summaries
  for insert to sync_writer with check (app.can_access_student(student_id));
