-- TAR-024 — relatos técnicos do app (API-030; ADR-038; ARQ-05 §3; SEG-04 §3; SEG-05 §5).
-- Sem dados pessoais: versão do app, código de erro, rota lógica e plataforma. O autor aparece
-- só como resumo SHA-256 do identificador (para o limite de 20 por hora). Retenção de 30 dias.
create table public.client_error_reports (
  id uuid primary key default gen_random_uuid(),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  app_version text not null check (char_length(app_version) between 1 and 20),
  error_code text not null check (error_code ~ '^[A-Z_]{2,40}$'),
  -- Padrão da rota (ex.: "/sessoes/:id/editar"), nunca o endereço com identificadores.
  context text not null check (char_length(context) <= 80 and context ~ '^[a-z0-9/:._-]*$'),
  platform text not null check (platform in ('android', 'ios', 'desktop', 'other')),
  occurred_at timestamptz not null default now()
);
create index client_error_reports_subject_idx on public.client_error_reports (subject_hash, occurred_at);
create index client_error_reports_occurred_idx on public.client_error_reports (occurred_at);

alter table public.client_error_reports enable row level security;
alter table public.client_error_reports force row level security;
revoke all on public.client_error_reports from anon, authenticated, sync_writer;
grant select, insert on public.client_error_reports to sync_writer;

-- O resumo do ator verificado; a função grava e conta só os relatos dele.
create or replace function app.actor_hash()
returns text
language sql
stable
set search_path = ''
as $$
  select encode(sha256(convert_to(app.current_actor()::text, 'UTF8')), 'hex')
$$;
revoke all on function app.actor_hash() from public;
grant execute on function app.actor_hash() to sync_writer;

create policy client_error_reports_insert on public.client_error_reports
  for insert to sync_writer
  with check (app.current_actor() is not null and subject_hash = app.actor_hash());
create policy client_error_reports_own_read on public.client_error_reports
  for select to sync_writer using (subject_hash = app.actor_hash());

-- SEG-04 §3: retenção de 30 dias, executada pela tarefa diária de limpeza (SEG-02 §3).
create or replace function app.purge_client_error_reports()
returns integer
language sql
security definer
set search_path = ''
as $$
  with removed as (
    delete from public.client_error_reports where occurred_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::int from removed
$$;
revoke all on function app.purge_client_error_reports() from public;
