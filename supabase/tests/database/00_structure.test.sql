-- Estrutura e permissões (DAD-03 §7, DAD-07 §2 verificações a e c; CA-222).
-- Toda tabela do esquema público tem políticas por linha habilitadas e forçadas, ao menos
-- uma política, e nenhuma permissão para anon; authenticated só lê.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is(
  array(
    select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not (c.relrowsecurity and c.relforcerowsecurity)
    order by 1
  ),
  array[]::text[],
  'toda tabela pública tem políticas por linha habilitadas e forçadas'
);

select is(
  array(
    select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_policies p
                      where p.schemaname = 'public' and p.tablename = c.relname)
    order by 1
  ),
  array[]::text[],
  'toda tabela pública tem ao menos uma política (tabela sem política reprova)'
);

select is(
  array(
    select distinct table_name::text from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon' order by 1
  ),
  array[]::text[],
  'anon não tem permissão em nenhuma tabela de dados'
);

select is(
  array(
    select distinct table_name || ':' || privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT'
    order by 1
  ),
  array[]::text[],
  'authenticated só tem leitura (escrita somente pela sincronização — ADR-050)'
);

select is(
  array(
    select distinct table_name::text from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'sync_writer'
      and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
    order by 1
  ),
  array[]::text[],
  'sync_writer não recebe TRUNCATE, REFERENCES nem TRIGGER'
);

select ok(
  (select not rolsuper and not rolbypassrls and not rolcreaterole and not rolcreatedb
   from pg_roles where rolname = 'sync_writer'),
  'sync_writer sem superusuário, sem BYPASSRLS e sem criar papéis ou bancos'
);

select ok(
  not exists (select 1 from information_schema.role_table_grants
              where grantee = 'sync_writer' and table_schema = 'auth'),
  'sync_writer não lê tabelas do serviço de autenticação'
);

select is(
  (select value from public.system_settings where key = 'ter_enabled'),
  'false'::jsonb,
  'GATE-TER fechado por padrão (RN-040)'
);

select results_eq(
  $$ select (select count(*) from public.goals)::int, (select count(*) from public.experience_levels)::int,
            (select count(*) from public.activity_levels)::int, (select count(*) from public.training_locations)::int,
            (select count(*) from public.restriction_categories)::int, (select count(*) from public.muscle_groups)::int,
            (select count(*) from public.equipment)::int $$,
  $$ values (6, 3, 4, 4, 12, 16, 13) $$,
  'taxonomias de TRN-01/TRN-03 carregadas'
);

select * from finish();
rollback;
