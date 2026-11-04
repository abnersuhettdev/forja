-- V12-08 (RN-063, DAD-02): consumo da IA, sem conteúdo enviado ou recebido; 30 dias (SEG-02).
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('routine', 'summary')),
  model text check (char_length(model) <= 100),
  outcome text not null check (outcome in ('ok', 'invalid', 'unavailable', 'quota')),
  neurons numeric(10, 2) not null default 0 check (neurons >= 0),
  occurred_at timestamptz not null default now()
);
create index ai_usage_occurred_idx on public.ai_usage (occurred_at);
alter table public.ai_usage enable row level security;
alter table public.ai_usage force row level security;
revoke all on public.ai_usage from anon, authenticated, sync_writer;
-- A cota do dia é global, por isso a função soma todas as linhas; nelas não há dado pessoal.
grant select, insert on public.ai_usage to sync_writer;
create policy ai_usage_read on public.ai_usage for select to sync_writer using (true);
create policy ai_usage_insert on public.ai_usage for insert to sync_writer with check (true);

create or replace function app.run_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sessions int;
  v_exercises int;
  v_sets int;
  v_weights int;
  v_operations int;
  v_reports int;
  v_audit int;
  v_ai int;
  v_limit constant timestamptz := now() - interval '90 days';
begin
  -- Sessões primeiro: exercícios e séries delas saem em cascata.
  delete from public.sessions where deleted_at < v_limit;
  get diagnostics v_sessions = row_count;
  delete from public.session_exercises where deleted_at < v_limit;
  get diagnostics v_exercises = row_count;
  delete from public.set_logs where deleted_at < v_limit;
  get diagnostics v_sets = row_count;
  delete from public.weight_entries where deleted_at < v_limit;
  get diagnostics v_weights = row_count;
  delete from public.sync_operations where received_at < v_limit;
  get diagnostics v_operations = row_count;
  v_reports := app.purge_client_error_reports();
  delete from public.audit_events where occurred_at < now() - interval '2 years';
  get diagnostics v_audit = row_count;
  delete from public.ai_usage where occurred_at < now() - interval '30 days';
  get diagnostics v_ai = row_count;
  return jsonb_build_object(
    'sessions', v_sessions,
    'session_exercises', v_exercises,
    'set_logs', v_sets,
    'weight_entries', v_weights,
    'sync_operations', v_operations,
    'client_error_reports', v_reports,
    'audit_events', v_audit,
    'ai_usage', v_ai
  );
end
$$;
