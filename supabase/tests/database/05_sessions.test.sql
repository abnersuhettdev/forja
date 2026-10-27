-- Sessões e séries (TAR-019): isolamento, revisão sem atividade técnica (TG-03), janela de
-- 60 dias (TG-06), limpeza na exclusão (TG-07), última execução (API-R07). Dados fictícios.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000c1', 'ficticio.c1@exemplo.test'),
  ('00000000-0000-4000-8000-0000000000c2', 'ficticio.c2@exemplo.test');
insert into public.managers (id, user_id) values
  ('10000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1'),
  ('10000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000c2');
insert into public.students (id, manager_id, user_id, is_self, full_name, birth_date) values
  ('20000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-0000000000c1',
   '00000000-0000-4000-8000-0000000000c1', true, 'Pessoa Fictícia C1', '1990-01-01'),
  ('20000000-0000-4000-8000-0000000000c2', '10000000-0000-4000-8000-0000000000c2',
   '00000000-0000-4000-8000-0000000000c2', true, 'Pessoa Fictícia C2', '1990-01-01');
insert into public.programs (id, student_id) values
  ('30000000-0000-4000-8000-0000000000c1', '20000000-0000-4000-8000-0000000000c1');
insert into public.program_versions (id, program_id, student_id, name) values
  ('40000000-0000-4000-8000-0000000000c1', '30000000-0000-4000-8000-0000000000c1',
   '20000000-0000-4000-8000-0000000000c1', 'Programa fictício');
insert into public.workouts (id, program_version_id, position, name) values
  ('50000000-0000-4000-8000-0000000000c1', '40000000-0000-4000-8000-0000000000c1', 1, 'Treino A');
insert into public.workout_items
  (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
select '90000000-0000-4000-8000-0000000000c1', '50000000-0000-4000-8000-0000000000c1', 1, id,
       'reps', 3, 8, 12, 90
from public.exercises where source_ref = 'Barbell_Squat';
update public.program_versions set status = 'active' where id = '40000000-0000-4000-8000-0000000000c1';

-- Uma sessão recente e uma antiga (75 dias), concluídas, com uma série cada.
insert into public.sessions
  (id, student_id, program_version_id, workout_id, status, started_at, ended_at,
   last_activity_at, rpe, notes, device_id)
values
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-0000000000c1',
   '40000000-0000-4000-8000-0000000000c1', '50000000-0000-4000-8000-0000000000c1', 'completed',
   now() - interval '2 hours', now() - interval '1 hour', now() - interval '1 hour', 7,
   'Observação fictícia', gen_random_uuid()),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-0000000000c1',
   '40000000-0000-4000-8000-0000000000c1', '50000000-0000-4000-8000-0000000000c1', 'completed',
   now() - interval '75 days', now() - interval '75 days' + interval '1 hour',
   now() - interval '75 days', null, null, gen_random_uuid());
insert into public.session_exercises (id, session_id, exercise_id, position)
select ('70000000-0000-4000-8000-00000000000' || n)::uuid,
       ('60000000-0000-4000-8000-00000000000' || n)::uuid,
       (select id from public.exercises where source_ref = 'Barbell_Squat'), 1
from generate_series(1, 2) n;
insert into public.set_logs (id, session_exercise_id, set_number, load_kg, reps, completed_at)
select ('80000000-0000-4000-8000-00000000000' || n)::uuid,
       ('70000000-0000-4000-8000-00000000000' || n)::uuid,
       1, 60, 10, now() - interval '90 minutes'
from generate_series(1, 2) n;

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('sessions', 'session_exercises', 'set_logs')
     and c.relrowsecurity and c.relforcerowsecurity),
  3, 'RLS ligada e forçada nas três tabelas');

-- TG-03: atividade técnica não muda a revisão; edição do usuário sim.
update public.sessions set last_activity_at = now(), clock_suspect = true
where id = '60000000-0000-4000-8000-000000000001';
select is((select revision from public.sessions where id = '60000000-0000-4000-8000-000000000001'),
  1, 'última série e marca de horário não incrementam a revisão');
update public.sessions set rpe = 8 where id = '60000000-0000-4000-8000-000000000001';
select is((select revision from public.sessions where id = '60000000-0000-4000-8000-000000000001'),
  2, 'edição do usuário incrementa a revisão');

-- TG-06: sessão com mais de 60 dias não é editada nem excluída; atividade técnica passa.
select throws_ok(
  $$ update public.sessions set rpe = 5 where id = '60000000-0000-4000-8000-000000000002' $$,
  'P0001', 'EDIT_WINDOW_EXPIRED', 'sessão antiga não é editada');
select throws_ok(
  $$ update public.set_logs set reps = 9 where id = '80000000-0000-4000-8000-000000000002' $$,
  'P0001', 'EDIT_WINDOW_EXPIRED', 'série de sessão antiga não é editada');
select throws_ok(
  $$ delete from public.sessions where id = '60000000-0000-4000-8000-000000000002' $$,
  'P0001', 'EDIT_WINDOW_EXPIRED', 'sessão antiga não é removida diretamente');
select lives_ok(
  $$ update public.sessions set clock_suspect = true where id = '60000000-0000-4000-8000-000000000002' $$,
  'marca técnica em sessão antiga é aceita');

-- TG-07: marca de exclusão apaga valores pessoais.
update public.set_logs set deleted_at = now() where id = '80000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select load_kg, reps from public.set_logs where id = '80000000-0000-4000-8000-000000000001' $$,
  $$ values (null::numeric(4,1), null::smallint) $$, 'série excluída perde carga e repetições');
update public.sessions set deleted_at = now() where id = '60000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select rpe, notes from public.sessions where id = '60000000-0000-4000-8000-000000000001' $$,
  $$ values (null::smallint, null::text) $$, 'sessão excluída perde PSE e observação');
select throws_ok(
  $$ insert into public.set_logs (id, session_exercise_id, set_number, load_kg, completed_at)
     values (gen_random_uuid(), '70000000-0000-4000-8000-000000000002', 2, 60, now()) $$,
  '23514', null, 'série sem repetições nem duração é recusada');

-- Isolamento pela API de dados (authenticated).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000c2", "role": "authenticated"}';
select is((select count(*)::int from public.sessions), 0, 'outro usuário não vê sessões');
select is((select count(*)::int from public.set_logs), 0, 'outro usuário não vê séries');
select is((select count(*)::int from public.last_executions), 0, 'nem a última execução');
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-0000000000c1", "role": "authenticated"}';
select is((select count(*)::int from public.sessions), 2,
  'o próprio aluno vê também a sessão excluída (reconciliação)');
select results_eq('select sets from public.last_executions',
  $$ values ('[{"reps": 10, "load_kg": 60.0, "set_number": 1, "duration_s": null}]'::jsonb) $$,
  'última execução ignora sessão excluída e traz as séries');
reset role;

-- Remoção do aluno (RN-020) leva sessões antigas em cascata, sem esbarrar na janela.
select lives_ok(
  $$ delete from public.students where id = '20000000-0000-4000-8000-0000000000c1' $$,
  'excluir o aluno remove sessões antigas em cascata');

select * from finish();
rollback;
