-- TAR-010 — idempotência da sincronização e eventos de auditoria.
-- Referências: DAD-02 §8, DAD-04 §4.3, RN-042, ADR-050, SEG-01. Nenhuma leitura pelo app.

-- ENT-025 — operação recebida (retida 90 dias; limpeza na TAR-007).
create table public.sync_operations (
  op_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  op_type text not null check (char_length(op_type) between 1 and 60),
  entity_id uuid,
  result text not null check (result in ('accepted', 'rejected')),
  -- Resposta devolvida ao aparelho: só identificadores, revisões e códigos (sem dado pessoal).
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  received_at timestamptz not null default now()
);
create index sync_operations_received_idx on public.sync_operations (received_at);
alter table public.sync_operations enable row level security;
alter table public.sync_operations force row level security;
revoke all on public.sync_operations from anon, authenticated, sync_writer;
grant select, insert on public.sync_operations to sync_writer;
create policy sync_operations_own_read on public.sync_operations
  for select to sync_writer using (user_id = app.current_actor());
create policy sync_operations_own_insert on public.sync_operations
  for insert to sync_writer with check (user_id = app.current_actor());

-- ENT-026 — evento de auditoria: sem dados pessoais (subject_hash nunca é e-mail).
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (char_length(event_type) between 1 and 60),
  subject_hash text check (subject_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object')
);
create index audit_events_occurred_idx on public.audit_events (occurred_at);
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
revoke all on public.audit_events from anon, authenticated, sync_writer;
grant insert on public.audit_events to sync_writer;
-- Só grava quem age por um ator verificado; ninguém lê pelo app.
create policy audit_events_insert on public.audit_events
  for insert to sync_writer with check (app.current_actor() is not null);
