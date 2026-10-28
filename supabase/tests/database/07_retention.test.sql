-- Limpeza diária de retenção (TAR-007; SEG-02 §3, ADR-072): marcas de exclusão e operações de
-- sincronização com mais de 90 dias, relatos de erro com mais de 30 dias e auditoria com mais
-- de 2 anos saem; o resto fica. A janela de edição continua protegendo os dados. Dados fictícios.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000d1', 'ficticio.d1@exemplo.test');
insert into public.managers (id, user_id) values
  ('10000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d1');
insert into public.students (id, manager_id, user_id, is_self, full_name, birth_date) values
  ('20000000-0000-4000-8000-0000000000d1', '10000000-0000-4000-8000-0000000000d1',
   '00000000-0000-4000-8000-0000000000d1', true, 'Pessoa Fictícia D1', '1990-01-01');
insert into public.programs (id, student_id) values
  ('30000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1');
insert into public.program_versions (id, program_id, student_id, name) values
  ('40000000-0000-4000-8000-0000000000d1', '30000000-0000-4000-8000-0000000000d1',
   '20000000-0000-4000-8000-0000000000d1', 'Programa fictício');
insert into public.workouts (id, program_version_id, position, name) values
  ('50000000-0000-4000-8000-0000000000d1', '40000000-0000-4000-8000-0000000000d1', 1, 'Treino A');
insert into public.workout_items
  (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
select '90000000-0000-4000-8000-0000000000d1', '50000000-0000-4000-8000-0000000000d1', 1, id,
       'reps', 3, 8, 12, 90
from public.exercises where source_ref = 'Barbell_Squat';
update public.program_versions set status = 'active' where id = '40000000-0000-4000-8000-0000000000d1';

-- Três sessões antigas (fora da janela de 60 dias): marca vencida (d1), marca recente (d2) e
-- sem marca (d3), cada uma com um exercício e uma série.
insert into public.sessions
  (id, student_id, program_version_id, workout_id, status, started_at, ended_at,
   last_activity_at, device_id, deleted_at)
select ('60000000-0000-4000-8000-0000000000d' || n)::uuid, '20000000-0000-4000-8000-0000000000d1',
       '40000000-0000-4000-8000-0000000000d1', '50000000-0000-4000-8000-0000000000d1', 'completed',
       now() - interval '200 days', now() - interval '200 days' + interval '1 hour',
       now() - interval '200 days', gen_random_uuid(),
       case n when 1 then now() - interval '100 days' when 2 then now() - interval '30 days' end
from generate_series(1, 3) n;
insert into public.session_exercises (id, session_id, exercise_id, position)
select ('70000000-0000-4000-8000-0000000000d' || n)::uuid,
       ('60000000-0000-4000-8000-0000000000d' || n)::uuid,
       (select id from public.exercises where source_ref = 'Barbell_Squat'), 1
from generate_series(1, 3) n;
insert into public.set_logs (id, session_exercise_id, set_number, load_kg, reps, completed_at)
select ('80000000-0000-4000-8000-0000000000d' || n)::uuid,
       ('70000000-0000-4000-8000-0000000000d' || n)::uuid,
       1, 60, 10, now() - interval '200 days'
from generate_series(1, 3) n;
-- Na sessão sem marca, uma segunda série excluída há 100 dias.
insert into public.set_logs
  (id, session_exercise_id, set_number, load_kg, reps, completed_at, deleted_at)
values ('80000000-0000-4000-8000-0000000000e3', '70000000-0000-4000-8000-0000000000d3',
        2, null, null, now() - interval '200 days', now() - interval '100 days');

insert into public.weight_entries (id, student_id, measured_on, weight_kg, source, deleted_at)
values
  ('a0000000-0000-4000-8000-0000000000d1', '20000000-0000-4000-8000-0000000000d1',
   current_date - 120, null, 'manual', now() - interval '100 days'),
  ('a0000000-0000-4000-8000-0000000000d2', '20000000-0000-4000-8000-0000000000d1',
   current_date - 20, null, 'manual', now() - interval '10 days'),
  ('a0000000-0000-4000-8000-0000000000d3', '20000000-0000-4000-8000-0000000000d1',
   current_date - 5, 80, 'manual', null);

insert into public.sync_operations (op_id, user_id, op_type, entity_id, result, response, received_at)
values
  ('b0000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d1',
   'weight.create', null, 'accepted', '{}', now() - interval '100 days'),
  ('b0000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000d1',
   'weight.create', null, 'accepted', '{}', now() - interval '1 day');

insert into public.client_error_reports
  (id, subject_hash, app_version, error_code, context, platform, occurred_at)
values
  ('c0000000-0000-4000-8000-0000000000d1', repeat('d', 64), '0.0.0', 'UNEXPECTED', '/hoje',
   'android', now() - interval '40 days'),
  ('c0000000-0000-4000-8000-0000000000d2', repeat('d', 64), '0.0.0', 'UNEXPECTED', '/hoje',
   'android', now() - interval '1 day');

insert into public.audit_events (id, event_type, subject_hash, occurred_at)
values
  ('d0000000-0000-4000-8000-0000000000d1', 'ficticio.antigo', repeat('d', 64),
   now() - interval '3 years'),
  ('d0000000-0000-4000-8000-0000000000d2', 'ficticio.recente', repeat('d', 64),
   now() - interval '1 day');

-- Antes da limpeza, a janela de edição recusa apagar sessão antiga sem marca vencida.
select throws_ok(
  $$delete from public.sessions where id = '60000000-0000-4000-8000-0000000000d3'$$,
  'P0001', 'EDIT_WINDOW_EXPIRED', 'sessão antiga sem marca não é apagada direto (RN-027)');
select throws_ok(
  $$delete from public.sessions where id = '60000000-0000-4000-8000-0000000000d2'$$,
  'P0001', 'EDIT_WINDOW_EXPIRED', 'marca com menos de 90 dias também não');

select ok((app.run_retention() ->> 'sessions')::int >= 1, 'a limpeza informa as contagens');

select is(
  (select count(*)::int from public.sessions where id = '60000000-0000-4000-8000-0000000000d1')
  + (select count(*)::int from public.session_exercises
     where id = '70000000-0000-4000-8000-0000000000d1')
  + (select count(*)::int from public.set_logs where id = '80000000-0000-4000-8000-0000000000d1'),
  0, 'sessão com marca vencida sai, com exercícios e séries');
select is(
  (select array_agg(id::text order by id) from public.sessions
   where student_id = '20000000-0000-4000-8000-0000000000d1'),
  array['60000000-0000-4000-8000-0000000000d2', '60000000-0000-4000-8000-0000000000d3'],
  'marca recente e sessão ativa ficam');
select is(
  (select array_agg(id::text order by id) from public.set_logs
   where session_exercise_id = '70000000-0000-4000-8000-0000000000d3'),
  array['80000000-0000-4000-8000-0000000000d3'],
  'série excluída há 100 dias sai; a série ativa fica');
select is(
  (select array_agg(id::text order by id) from public.weight_entries
   where student_id = '20000000-0000-4000-8000-0000000000d1'),
  array['a0000000-0000-4000-8000-0000000000d2', 'a0000000-0000-4000-8000-0000000000d3'],
  'peso com marca vencida sai; marca recente e ativo ficam');
select is(
  (select array_agg(op_id::text) from public.sync_operations
   where user_id = '00000000-0000-4000-8000-0000000000d1'),
  array['b0000000-0000-4000-8000-0000000000d2'],
  'operações de sincronização com mais de 90 dias saem');
select is(
  (select array_agg(id::text) from public.client_error_reports
   where subject_hash = repeat('d', 64)),
  array['c0000000-0000-4000-8000-0000000000d2'],
  'relatos de erro com mais de 30 dias saem');
select is(
  (select array_agg(id::text) from public.audit_events where subject_hash = repeat('d', 64)),
  array['d0000000-0000-4000-8000-0000000000d2'],
  'auditoria com mais de 2 anos sai');
select is((app.run_retention() ->> 'sessions')::int, 0, 'a segunda execução não remove mais nada');

select is(
  (select array_agg(r order by r) from unnest(array['anon', 'authenticated', 'sync_writer']) r
   where has_function_privilege(r, 'app.run_retention()', 'EXECUTE')),
  null::text[], 'só a conexão administrativa executa a limpeza');

select * from finish();
rollback;
