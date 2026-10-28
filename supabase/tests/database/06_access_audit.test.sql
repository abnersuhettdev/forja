-- Auditoria de acesso em 100% das tabelas (TAR-024; CA-214, RNF-014; SEG-03 §3; DAD-03 §7).
-- Varre o catálogo do banco: toda tabela nova entra na verificação sem editar este arquivo.
-- Roda sobre o banco local com os dados fictícios dos testes (RN-037).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Tabelas de referência compartilhadas (taxonomias, catálogo importado, chave GATE-TER).
create temp table referencia (nome name primary key);
insert into referencia values
  ('activity_levels'), ('content_sources'), ('equipment'), ('experience_levels'), ('goals'),
  ('muscle_groups'), ('restriction_categories'), ('training_locations'), ('system_settings'),
  ('exercises'), ('exercise_alternatives'), ('exercise_contraindications'),
  ('exercise_equipment'), ('exercise_images'), ('exercise_muscles');
grant select on referencia to authenticated;

create temp view tabelas as
  select c.oid, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v');
grant select on tabelas to authenticated;

select ok((select count(*) from tabelas where relkind in ('r', 'p')) >= 32,
  'o catálogo do banco lista as tabelas do app');

select is(
  (select array_agg(relname order by relname) from tabelas
   where relkind in ('r', 'p') and not (relrowsecurity and relforcerowsecurity)),
  null::name[], 'RLS ligada e forçada em todas as tabelas');

select is(
  (select array_agg(relname order by relname) from tabelas
   where has_table_privilege('anon', oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')),
  null::name[], 'visitante sem login não tem nenhum privilégio em tabela ou visão');

select is(
  (select array_agg(relname order by relname) from tabelas
   where has_table_privilege('authenticated', oid, 'INSERT, UPDATE, DELETE, TRUNCATE')),
  null::name[], 'usuário conectado nunca escreve direto (só pela função — ADR-050)');

select is(
  (select array_agg(relname order by relname) from tabelas
   where has_table_privilege('sync_writer', oid, 'TRUNCATE, REFERENCES, TRIGGER')),
  null::name[], 'papel de sincronização sem TRUNCATE, REFERENCES ou TRIGGER');

select is(
  (select array_agg(t.relname order by t.relname) from tabelas t
   where t.relkind in ('r', 'p')
     and not exists (select 1 from pg_policy p where p.polrelid = t.oid)
     and has_table_privilege('authenticated', t.oid, 'SELECT')),
  null::name[], 'toda tabela legível pelo app tem política por linha');

-- Um estranho conectado, sem aluno nem papel de gestão.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000f1', 'estranho.ficticio@exemplo.test');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000f1", "role": "authenticated"}';

select is(
  (select array_agg(relname order by relname) from tabelas t
   where relname not in (select nome from referencia)
     and has_table_privilege(t.oid, 'SELECT')
     and (xpath('/row/n/text()',
           query_to_xml(format('select count(*) as n from public.%I', relname), false, true, '')
         ))[1]::text::int > 0),
  null::name[], 'estranho não vê nenhuma linha de nenhuma tabela ou visão de dados');

select is((select count(*)::int from public.exercises where origin = 'custom'), 0,
  'estranho não vê exercícios personalizados de outros gestores');
select is(
  (select count(*)::int from public.exercise_muscles m
   join public.exercises e on e.id = m.exercise_id where e.origin = 'custom'), 0,
  'nem a classificação deles');
reset role;

-- Controle positivo: a mesma sonda, com um usuário fictício que tem dados, encontra linhas.
create temp table dono as
  select u.id::text as sub from auth.users u join public.students s on s.user_id = u.id
  where u.email = 'pessoa.ficticia@exemplo.test';
grant select on dono to authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select sub from dono), 'role', 'authenticated')::text, true);
set local role authenticated;
select ok(
  'students' = any(
    select relname from tabelas t
    where relname not in (select nome from referencia)
      and has_table_privilege(t.oid, 'SELECT')
      and (xpath('/row/n/text()',
            query_to_xml(format('select count(*) as n from public.%I', relname), false, true, '')
          ))[1]::text::int > 0),
  'a sonda encontra os dados do próprio usuário (o teste do estranho não é vazio por engano)');
reset role;

select * from finish();
rollback;
