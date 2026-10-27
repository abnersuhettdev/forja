-- Isolamento por usuário (RN-001, RNF-014, ADR-028 L4, ADR-050; CA-214, CA-224).
-- Dados fictícios (RN-037): dois usuários, cada um gestor de si mesmo (PES).
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Fixtures (como administrador do banco).
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ficticio.a@exemplo.test'),
  ('00000000-0000-4000-8000-00000000000b', 'ficticio.b@exemplo.test');
insert into public.managers (id, user_id) values
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a'),
  ('10000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b');
insert into public.students (id, manager_id, user_id, is_self, full_name, birth_date) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000000a', true, 'Pessoa Fictícia A', '1990-01-01'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-00000000000b', true, 'Pessoa Fictícia B', '1991-01-01');
insert into public.training_profiles (student_id, goal) values
  ('20000000-0000-4000-8000-00000000000a', 'strength'),
  ('20000000-0000-4000-8000-00000000000b', 'hypertrophy');
insert into public.rest_settings (student_id) values
  ('20000000-0000-4000-8000-00000000000a'), ('20000000-0000-4000-8000-00000000000b');
insert into public.weight_entries (id, student_id, measured_on, weight_kg, source) values
  ('30000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', '2026-10-01', 80.5, 'manual'),
  ('30000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b', '2026-10-01', 70.0, 'manual');

grant sync_writer to current_user;
-- Só para o teste (desfeito no rollback): o papel de sincronização usa as funções do pgTAP.
grant usage on schema extensions to sync_writer;
grant execute on all functions in schema extensions to sync_writer;
grant all on all tables in schema pg_temp to sync_writer;
grant all on all sequences in schema pg_temp to sync_writer;

-- ---------- Visitante sem login ----------
set local role anon;
select throws_ok('select * from public.students', '42501', null, 'anon não lê alunos');
select throws_ok('select * from public.goals', '42501', null, 'anon não lê nem taxonomias');
reset role;

-- ---------- Usuário A pela API de dados (authenticated) ----------
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}';

select results_eq('select full_name from public.students', $$ values ('Pessoa Fictícia A') $$,
  'A vê só o próprio aluno');
select results_eq('select goal from public.training_profiles', $$ values ('strength') $$,
  'A vê só o próprio perfil');
select results_eq('select weight_kg from public.weight_entries', $$ values (80.5::numeric(4,1)) $$,
  'A vê só os próprios pesos');
select results_eq('select user_id from public.managers',
  $$ values ('00000000-0000-4000-8000-00000000000a'::uuid) $$, 'A vê só o próprio registro de gestor');
select is((select count(*)::int from public.system_settings), 1, 'A lê apenas ter_enabled');
select is((select count(*)::int from public.muscle_groups), 16, 'A lê as taxonomias');

select throws_ok(
  $$ insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
     values (gen_random_uuid(), '20000000-0000-4000-8000-00000000000a', '2026-10-02', 81, 'manual') $$,
  '42501', null, 'escrita direta pela API de dados é recusada, mesmo nos próprios dados');
select throws_ok(
  $$ update public.training_profiles set goal = 'maintenance' $$,
  '42501', null, 'atualização direta é recusada');

-- Tentar escolher o ator não tem efeito fora do papel de sincronização.
set local app.actor_id = '00000000-0000-4000-8000-00000000000b';
select results_eq('select full_name from public.students', $$ values ('Pessoa Fictícia A') $$,
  'app.actor_id é ignorado para authenticated');
reset role;

-- ---------- Papel de sincronização agindo por A ----------
set local role sync_writer;
set local app.actor_id = '00000000-0000-4000-8000-00000000000a';
-- O token de outro usuário não muda o ator da sincronização.
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000b"}';

select lives_ok(
  $$ insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
     values ('30000000-0000-4000-8000-0000000000a2', '20000000-0000-4000-8000-00000000000a',
             '2026-10-02', 81, 'manual') $$,
  'sincronização grava nos dados do ator');
select throws_ok(
  $$ insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
     values (gen_random_uuid(), '20000000-0000-4000-8000-00000000000b', '2026-10-02', 71, 'manual') $$,
  '42501', null, 'sincronização recusa gravar para aluno de outro usuário');
select results_eq(
  $$ with changed as (update public.training_profiles set goal = 'maintenance'
                      where student_id = '20000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from changed $$,
  $$ values (0) $$, 'sincronização não altera perfil de outro usuário');
select results_eq(
  $$ with removed as (delete from public.weight_entries
                      where id = '30000000-0000-4000-8000-00000000000b' returning 1)
     select count(*)::int from removed $$,
  $$ values (0) $$, 'sincronização não exclui peso de outro usuário');
select throws_ok(
  $$ update public.weight_entries set student_id = '20000000-0000-4000-8000-00000000000b'
     where id = '30000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'sincronização não transfere registro para outro aluno');
select throws_ok(
  $$ insert into public.students (id, manager_id, user_id, is_self, full_name, birth_date)
     values (gen_random_uuid(), '10000000-0000-4000-8000-00000000000b',
             '00000000-0000-4000-8000-00000000000a', false, 'Intrusa', '1990-01-01') $$,
  '42501', null, 'sincronização não cria aluno sob outro gestor');
select throws_ok(
  'select * from public.system_settings', '42501', null,
  'sincronização não lê a configuração do sistema');

-- Sem ator fixado, a sincronização não enxerga nada.
set local app.actor_id = '';
select is((select count(*)::int from public.students), 0, 'sem ator, nenhuma linha visível');
reset role;

-- Confirmação final como administrador: os dados de B ficaram intactos.
select results_eq(
  $$ select goal, (select count(*)::int from public.weight_entries
                   where student_id = '20000000-0000-4000-8000-00000000000b')
     from public.training_profiles where student_id = '20000000-0000-4000-8000-00000000000b' $$,
  $$ values ('hypertrophy', 1) $$,
  'dados de B intactos');

select * from finish();
rollback;
