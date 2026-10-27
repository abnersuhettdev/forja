-- Programas (TAR-015): imutabilidade (TG-01), publicação atômica (TG-02), dono (TG-09),
-- RN-003, RN-005, RN-021, RN-025 com versão ativa real. Dados fictícios (RN-037).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Fixtures: gestor A com aluno próprio A; com o GATE-TER aberto só neste teste, um aluno B
-- (usuário B) acompanhado por A, para conferir que alunos não veem rascunhos (RN-005).
update public.system_settings set value = 'true'::jsonb where key = 'ter_enabled';
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ficticio.a@exemplo.test'),
  ('00000000-0000-4000-8000-00000000000b', 'ficticio.b@exemplo.test');
insert into public.managers (id, user_id) values
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a');
insert into public.students (id, manager_id, user_id, is_self, full_name, birth_date) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000000a', true, 'Pessoa Fictícia A', '1990-01-01'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000000b', false, 'Pessoa Fictícia B', '1990-01-01');
insert into public.training_profiles (student_id, goal) values ('20000000-0000-4000-8000-00000000000b', 'strength');
insert into public.programs (id, student_id) values
  ('50000000-0000-4000-8000-00000000000b', '20000000-0000-4000-8000-00000000000b');

-- Rascunho v1 com um treino e um item.
insert into public.program_versions (id, program_id, student_id, name)
  values ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-00000000000b',
          '20000000-0000-4000-8000-00000000000b', 'Programa fictício');
insert into public.workouts (id, program_version_id, position, name)
  values ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 1, 'Treino A');

select throws_ok(
  $$ update public.program_versions set status = 'active' where id = '60000000-0000-4000-8000-000000000001' $$,
  'P0001', 'DRAFT_INVALID', 'treino sem exercício impede publicar (RN-035)');

insert into public.workout_items (id, workout_id, position, exercise_id, measure_type, sets, reps_min, reps_max, rest_s)
  select '80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 1, id, 'reps', 3, 8, 12, 90
  from public.exercises where source_ref = 'Barbell_Squat';

select lives_ok(
  $$ update public.program_versions set status = 'active' where id = '60000000-0000-4000-8000-000000000001' $$,
  'rascunho válido é publicado');
select results_eq(
  $$ select status, version_number, published_at is not null from public.program_versions
     where id = '60000000-0000-4000-8000-000000000001' $$,
  $$ values ('active', 1, true) $$, 'publicação numera a versão e registra a data');

-- TG-01 — versão publicada é imutável.
select throws_ok(
  $$ update public.program_versions set name = 'Outro' where id = '60000000-0000-4000-8000-000000000001' $$,
  'P0001', 'VERSION_NOT_AVAILABLE', 'versão publicada não muda (RN-004)');
select throws_ok(
  $$ update public.workout_items set sets = 4 where id = '80000000-0000-4000-8000-000000000001' $$,
  'P0001', 'VERSION_NOT_AVAILABLE', 'exercício prescrito de versão publicada não muda');
select throws_ok(
  $$ insert into public.workouts (id, program_version_id, position, name)
     values (gen_random_uuid(), '60000000-0000-4000-8000-000000000001', 2, 'Treino B') $$,
  'P0001', 'VERSION_NOT_AVAILABLE', 'não se acrescenta treino a versão publicada');
select throws_ok(
  $$ delete from public.program_versions where id = '60000000-0000-4000-8000-000000000001' $$,
  'P0001', 'VERSION_NOT_AVAILABLE', 'versão publicada não é excluída');
select throws_ok(
  $$ insert into public.program_versions (id, program_id, student_id, status, name)
     values (gen_random_uuid(), '50000000-0000-4000-8000-00000000000b',
             '20000000-0000-4000-8000-00000000000b', 'active', 'Direto') $$,
  'P0001', 'VERSION_NOT_AVAILABLE', 'nada nasce publicado (RN-009)');

-- Segundo rascunho: RN-003 e publicação que arquiva a anterior (TG-02).
insert into public.program_versions (id, program_id, student_id, name)
  values ('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-00000000000b',
          '20000000-0000-4000-8000-00000000000b', 'Programa fictício v2');
select throws_ok(
  $$ insert into public.program_versions (id, program_id, student_id, name)
     values (gen_random_uuid(), '50000000-0000-4000-8000-00000000000b',
             '20000000-0000-4000-8000-00000000000b', 'Terceiro') $$,
  '23505', null, 'no máximo um rascunho por aluno (RN-003)');
select throws_ok(
  $$ insert into public.program_versions (id, program_id, student_id, name)
     values (gen_random_uuid(), '50000000-0000-4000-8000-00000000000b',
             '20000000-0000-4000-8000-00000000000a', 'Dono errado') $$,
  'P0001', 'OWNER_MISMATCH', 'versão pertence ao aluno do programa (TG-09)');
insert into public.workouts (id, program_version_id, position, name)
  values ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 1, 'Treino A');
insert into public.workout_items (id, workout_id, position, exercise_id, measure_type, sets, duration_s, rest_s)
  select gen_random_uuid(), '70000000-0000-4000-8000-000000000002', 1, id, 'duration', 3, 30, 60
  from public.exercises where source_ref = 'Plank';

-- RN-021: exercício desativado não entra e impede publicar.
update public.exercises set active = false where source_ref = 'Plank';
select throws_ok(
  $$ insert into public.workout_items (id, workout_id, position, exercise_id, measure_type, sets, duration_s, rest_s)
     select gen_random_uuid(), '70000000-0000-4000-8000-000000000002', 2, id, 'duration', 3, 30, 60
     from public.exercises where source_ref = 'Plank' $$,
  'P0001', 'EXERCISE_INACTIVE', 'exercício desativado não entra no rascunho (RN-021)');
select throws_ok(
  $$ update public.program_versions set status = 'active' where id = '60000000-0000-4000-8000-000000000002' $$,
  'P0001', 'DRAFT_INVALID', 'rascunho com exercício desativado não publica (RN-021)');
update public.exercises set active = true where source_ref = 'Plank';

update public.program_versions set status = 'active' where id = '60000000-0000-4000-8000-000000000002';
select results_eq(
  $$ select id::text, status, version_number from public.program_versions
     where student_id = '20000000-0000-4000-8000-00000000000b' order by version_number $$,
  $$ values ('60000000-0000-4000-8000-000000000001', 'archived', 1),
            ('60000000-0000-4000-8000-000000000002', 'active', 2) $$,
  'publicar arquiva a versão ativa anterior na mesma transação (TG-02)');

-- RN-025: com versão ativa real, mudança relevante marca a revisão recomendada.
update public.training_profiles set days_per_week = 3 where student_id = '20000000-0000-4000-8000-00000000000b';
select isnt(
  (select review_recommended_since from public.training_profiles where student_id = '20000000-0000-4000-8000-00000000000b'),
  null, 'revisão recomendada marcada com versão ativa (TG-08)');

-- RN-005: o aluno B não vê rascunhos; o gestor A vê.
insert into public.program_versions (id, program_id, student_id, name)
  values ('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-00000000000b',
          '20000000-0000-4000-8000-00000000000b', 'Rascunho novo');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000b"}';
select results_eq(
  $$ select status from public.program_versions order by status $$,
  $$ values ('active'), ('archived') $$, 'aluno vê só versões publicadas (RN-005)');
select is((select count(*)::int from public.workouts), 2, 'e os treinos delas');
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-00000000000a"}';
select is((select count(*)::int from public.program_versions where status = 'draft'), 1,
  'gestor vê o rascunho');
select throws_ok(
  $$ update public.program_versions set name = 'Direto' where status = 'draft' $$,
  '42501', null, 'escrita direta pela API de dados é recusada');
reset role;

-- Exclusão do aluno remove o histórico em cascata (RN-020), sem esbarrar na imutabilidade.
delete from public.students where id = '20000000-0000-4000-8000-00000000000b';
select is((select count(*)::int from public.program_versions
           where student_id = '20000000-0000-4000-8000-00000000000b'), 0,
  'exclusão do aluno leva versões em cascata');

select * from finish();
rollback;
