-- Catálogo (TAR-013): seed, integridade e visibilidade (DAD-03 §3 e §7.2, RN-036, RN-037).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select is(
  (select count(*)::int from public.exercises where origin = 'imported' and active),
  110, 'seed v1 com 110 exercícios importados ativos (RF-038)'
);
select is(
  (select count(*)::int from public.exercises e
   where not exists (select 1 from public.exercise_muscles m
                     where m.exercise_id = e.id and m.role = 'primary')),
  0, 'todo exercício tem ao menos um grupo primário'
);
select is(
  (select count(*)::int from public.exercises where text_reviewed_at is null),
  0, 'textos revisados (CA-038)'
);
select is((select count(*)::int from public.exercise_images), 0,
  'nenhuma imagem sem procedência comprovada (ADR-052)');

-- Fixtures fictícias: dois gestores, cada um com aluno próprio.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ficticio.a@exemplo.test'),
  ('00000000-0000-4000-8000-00000000000b', 'ficticio.b@exemplo.test');
insert into public.managers (id, user_id) values
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a'),
  ('10000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b');
insert into public.exercises
  (id, origin, manager_id, name, instructions, difficulty, measure_type, movement_pattern)
values
  ('40000000-0000-4000-8000-00000000000a', 'custom', '10000000-0000-4000-8000-00000000000a',
   'Exercício próprio de A', '["Passo"]', 'beginner', 'reps', 'squat');
insert into public.exercise_muscles values ('40000000-0000-4000-8000-00000000000a', 'quadriceps', 'primary');

select throws_ok(
  $$ insert into public.exercises (id, origin, source_id, name, instructions, difficulty, measure_type, movement_pattern)
     select gen_random_uuid(), 'imported', source_id, upper(name), '["x"]', 'beginner', 'reps', 'squat'
     from public.exercises where origin = 'imported' limit 1 $$,
  '23505', null, 'nome repetido entre importados ativos é recusado (sem diferenciar caixa)');
select throws_ok(
  $$ insert into public.exercises (id, origin, name, instructions, difficulty, measure_type, movement_pattern)
     values (gen_random_uuid(), 'imported', 'Sem fonte', '["x"]', 'beginner', 'reps', 'squat') $$,
  '23514', null, 'importado sem fonte é recusado (RN-037)');
select throws_ok(
  $$ update public.exercises set load_markers = array['marcador_inventado'] where id = '40000000-0000-4000-8000-00000000000a' $$,
  '23514', null, 'marcador fora de TRN-03 é recusado');

grant sync_writer to current_user;

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a"}';
select is((select count(*)::int from public.exercises), 111, 'A vê os importados e o próprio');
select is((select count(*)::int from public.exercise_muscles where exercise_id = '40000000-0000-4000-8000-00000000000a'), 1,
  'A vê a classificação do próprio exercício');
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000b"}';
select is((select count(*)::int from public.exercises where origin = 'custom'), 0,
  'B não vê o exercício personalizado de A');
select is((select count(*)::int from public.exercise_muscles where exercise_id = '40000000-0000-4000-8000-00000000000a'), 0,
  'nem a classificação dele');
select throws_ok(
  $$ insert into public.exercises (id, origin, manager_id, name, instructions, difficulty, measure_type, movement_pattern)
     values (gen_random_uuid(), 'custom', '10000000-0000-4000-8000-00000000000b', 'Direto', '["x"]', 'beginner', 'reps', 'squat') $$,
  '42501', null, 'escrita direta no catálogo pela API de dados é recusada');
reset role;

select * from finish();
rollback;
