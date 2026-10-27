-- TAR-004 — base: papel de sincronização, identidade do ator e gatilhos genéricos.
-- Referências: DAD-03 §5 e §7, DAD-05 §5.1, ADR-050.

-- Esquema privado para funções auxiliares (não exposto pela API de dados).
create schema if not exists app;
revoke all on schema app from public;

-- Papel de escrita da função de sincronização (ADR-050). Criado sem login: a senha e o
-- atributo LOGIN são definidos por procedimento operacional, com a senha guardada só nos
-- segredos da função (IMP-01 §2). Nunca recebe BYPASSRLS nem privilégio administrativo.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sync_writer') then
    create role sync_writer nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end
$$;

grant usage on schema public to sync_writer;
grant usage on schema app to authenticated, sync_writer;

-- Tabelas novas não recebem permissões automáticas para anon/authenticated: cada migração
-- concede explicitamente o mínimo (DAD-03 §7.2).
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Usuário identificado (DAD-03 §7.1): para o papel de sincronização, o ator fixado pela
-- função na transação (set_config('app.actor_id', ..., true)); para os demais, o usuário do
-- token de acesso. Um papel que não seja sync_writer não consegue escolher o ator.
create or replace function app.current_actor()
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when current_user = 'sync_writer' then
      nullif(current_setting('app.actor_id', true), '')::uuid
    else
      coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      )::uuid
  end
$$;

-- updated_at mantido pelo servidor (DAD-02 §1).
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- TG-03 — revisão incrementada pelo servidor a cada alteração aceita (ADR-053).
create or replace function app.bump_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
  else
    new.revision := old.revision + 1;
  end if;
  new.updated_at := now();
  return new;
end
$$;

revoke all on all functions in schema app from public;
grant execute on function app.current_actor() to authenticated, sync_writer;
