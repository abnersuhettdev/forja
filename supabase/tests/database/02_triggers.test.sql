-- Gatilhos e restrições de TAR-004 (DAD-03 §4–§5: TG-03, TG-04, TG-05, TG-08).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'ficticio.a@exemplo.test');
insert into public.managers (id, user_id) values
  ('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a');

-- TG-05 — idade mínima de 18 anos no fuso do aluno.
select throws_ok(
  $$ insert into public.students (id, manager_id, user_id, is_self, full_name, birth_date)
     values (gen_random_uuid(), '10000000-0000-4000-8000-00000000000a',
             '00000000-0000-4000-8000-00000000000a', true, 'Menor Fictícia',
             (now() at time zone 'America/Sao_Paulo')::date - interval '18 years' + interval '1 day') $$,
  'P0001', 'AGE_UNDER_18', 'aluno com menos de 18 anos é recusado');
select throws_ok(
  $$ insert into public.students (id, manager_id, full_name, birth_date, timezone)
     values (gen_random_uuid(), '10000000-0000-4000-8000-00000000000a', 'Fictícia', '1990-01-01', 'Lua/Base') $$,
  'P0001', 'VALIDATION_FAILED', 'fuso inexistente é recusado');
select lives_ok(
  $$ insert into public.students (id, manager_id, user_id, is_self, full_name, birth_date)
     values ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a',
             '00000000-0000-4000-8000-00000000000a', true, 'Pessoa Fictícia A',
             (now() at time zone 'America/Sao_Paulo')::date - interval '18 years') $$,
  'aluno que completa 18 anos hoje é aceito');

-- TG-04 — GATE-TER fechado: um segundo aluno do mesmo gestor é recusado.
select throws_ok(
  $$ insert into public.students (id, manager_id, full_name, birth_date)
     values (gen_random_uuid(), '10000000-0000-4000-8000-00000000000a', 'Terceira Fictícia', '1990-01-01') $$,
  'P0001', 'TER_DISABLED', 'segundo aluno recusado com ter_enabled = false (RN-040)');

-- Dono imutável.
select throws_ok(
  $$ update public.students set is_self = false where id = '20000000-0000-4000-8000-00000000000a' $$,
  'P0001', 'OWNER_MISMATCH', 'vínculo do aluno não muda por atualização');
select throws_ok(
  $$ update public.students set timezone = 'Fuso/Inexistente' where id = '20000000-0000-4000-8000-00000000000a' $$,
  'P0001', 'VALIDATION_FAILED', 'fuso inválido recusado também na atualização');

-- TG-03 — revisão e updated_at mantidos pelo servidor.
insert into public.training_profiles (student_id, goal, revision)
  values ('20000000-0000-4000-8000-00000000000a', 'strength', 99);
select is((select revision from public.training_profiles where student_id = '20000000-0000-4000-8000-00000000000a'), 1, 'revisão começa em 1, ignorando o cliente');
update public.training_profiles set goal = 'hypertrophy', revision = 50 where student_id = '20000000-0000-4000-8000-00000000000a';
select is((select revision from public.training_profiles where student_id = '20000000-0000-4000-8000-00000000000a'), 2, 'revisão incrementa a cada alteração');

insert into public.rest_settings (student_id) values ('20000000-0000-4000-8000-00000000000a');
select is((select default_hours from public.rest_settings where student_id = '20000000-0000-4000-8000-00000000000a'), 48::smallint, 'descanso padrão de 48 h (ADR-021)');
insert into public.rest_overrides (student_id, muscle_group_code, hours)
  values ('20000000-0000-4000-8000-00000000000a', 'quadriceps', 72);
update public.rest_overrides set hours = 60 where student_id = '20000000-0000-4000-8000-00000000000a';
select is((select revision from public.rest_overrides where student_id = '20000000-0000-4000-8000-00000000000a'), 2, 'ajuste de descanso também tem revisão');

-- Restrições de domínio e códigos.
select throws_ok(
  $$ update public.training_profiles set equipment_codes = array['barbell', 'trampolim'] where student_id = '20000000-0000-4000-8000-00000000000a' $$,
  'P0001', 'VALIDATION_FAILED', 'equipamento fora da taxonomia é recusado');
select throws_ok(
  $$ update public.training_profiles set restrictions_declared = 'none', restriction_codes = array['knee'] where student_id = '20000000-0000-4000-8000-00000000000a' $$,
  '23514', null, '"nenhuma restrição" não convive com restrições listadas (RN-006)');
select throws_ok(
  $$ insert into public.weight_entries (id, student_id, measured_on, weight_kg, source)
     values (gen_random_uuid(), '20000000-0000-4000-8000-00000000000a', '2026-10-01', 29.9, 'manual') $$,
  '23514', null, 'peso abaixo da faixa é recusado (RN-018)');
select throws_ok(
  $$ insert into public.weight_entries (id, student_id, measured_on, source)
     values (gen_random_uuid(), '20000000-0000-4000-8000-00000000000a', '2026-10-01', 'manual') $$,
  '23514', null, 'peso nulo só em registro excluído (ADR-053)');

-- TG-08 — sem programa ativo, nada é marcado.
update public.training_profiles set days_per_week = 4 where student_id = '20000000-0000-4000-8000-00000000000a';
select is((select review_recommended_since from public.training_profiles where student_id = '20000000-0000-4000-8000-00000000000a'), null,
  'sem versão ativa, revisão recomendada não é marcada');

-- Com versão ativa (simulada até a TAR-015), mudança relevante marca a revisão.
create or replace function app.has_active_program(p_student_id uuid)
returns boolean language sql stable as $$ select true $$;
update public.training_profiles set preferences_note = 'Prefere treinar cedo' where student_id = '20000000-0000-4000-8000-00000000000a';
select is((select review_recommended_since from public.training_profiles where student_id = '20000000-0000-4000-8000-00000000000a'), null,
  'mudança fora de RN-025 não marca revisão');
update public.training_profiles set equipment_codes = array['dumbbell'] where student_id = '20000000-0000-4000-8000-00000000000a';
select isnt((select review_recommended_since from public.training_profiles where student_id = '20000000-0000-4000-8000-00000000000a'), null,
  'mudança de equipamentos com versão ativa marca revisão recomendada (RN-025)');

select * from finish();
rollback;
