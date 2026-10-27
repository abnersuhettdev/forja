-- TAR-013 — catálogo de exercícios.
-- Referências: DAD-01 §4.3, DAD-02 §4, DAD-03 §2–§3 e §7.2, TRN-03 §4–§5, RN-021, RN-036, RN-037.
-- Leitura: importados por todos os autenticados; personalizados pelo gestor dono e seus
-- alunos. Escrita: importados só por migrações (seed versionado); personalizados pela
-- sincronização (TAR-014).

-- ENT-010 — fonte de conteúdo (origem, licença e atribuição).
create table public.content_sources (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 120),
  url text check (url ~ '^https://'),
  license_name text not null check (char_length(license_name) between 1 and 80),
  license_url text check (license_url ~ '^https://'),
  attribution_text text check (char_length(attribution_text) <= 500),
  retrieved_on date,
  notes text check (char_length(notes) <= 1000)
);

-- ENT-011 — exercício. Listas de padrões e marcadores = TRN-03 §4–§5 (conferidas por teste
-- contra o pacote de domínio).
create table public.exercises (
  id uuid primary key,
  origin text not null check (origin in ('imported', 'custom')),
  manager_id uuid references public.managers (id) on delete restrict,
  source_id uuid references public.content_sources (id) on delete restrict,
  source_ref text check (char_length(source_ref) <= 200),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  instructions jsonb not null check (
    jsonb_typeof(instructions) = 'array' and jsonb_array_length(instructions) between 1 and 15
  ),
  safety_tips jsonb check (jsonb_typeof(safety_tips) = 'array'),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  measure_type text not null check (measure_type in ('reps', 'duration')),
  is_bodyweight boolean not null default false,
  movement_pattern text not null check (movement_pattern in (
    'squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull', 'knee_ext', 'knee_flex',
    'hip_abd_add', 'calf', 'elbow_flex', 'elbow_ext', 'shoulder_iso', 'chest_iso',
    'core_stability', 'core_flexion', 'carry_grip'
  )),
  load_markers text[] not null default '{}' check (load_markers <@ array[
    'overhead', 'shoulder_end_range', 'axial_spine_load', 'spine_flexion_loaded',
    'spine_rotation_loaded', 'deep_knee_flexion_loaded', 'knee_impact',
    'hip_deep_flexion_loaded', 'wrist_loaded_extension', 'elbow_loaded_extension',
    'neck_load', 'ankle_loaded', 'technical_high'
  ]::text[]),
  active boolean not null default true,
  text_reviewed_at timestamptz,
  edited_by_manager_at timestamptz,
  original_text jsonb check (jsonb_typeof(original_text) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- RN-037: importado tem fonte e é global; personalizado tem gestor.
  constraint exercises_origin_owner check (
    (origin = 'imported' and source_id is not null and manager_id is null)
    or (origin = 'custom' and manager_id is not null)
  )
);
-- Nome único entre exercícios ativos do mesmo escopo (DAD-03 §3).
create unique index exercises_imported_name_uq on public.exercises (lower(name))
  where active and origin = 'imported';
create unique index exercises_custom_name_uq on public.exercises (manager_id, lower(name))
  where active and origin = 'custom';
create index exercises_active_origin_idx on public.exercises (active, origin);
create trigger exercises_touch before update on public.exercises
  for each row execute function app.touch_updated_at();

-- ENT-012..017 — classificação, imagens, contraindicações e alternativas.
create table public.exercise_muscles (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle_group_code text not null references public.muscle_groups (code),
  role text not null check (role in ('primary', 'secondary')),
  primary key (exercise_id, muscle_group_code)
);
create table public.exercise_equipment (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  equipment_code text not null references public.equipment (code),
  primary key (exercise_id, equipment_code)
);
create table public.exercise_images (
  id uuid primary key,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  path text not null check (path ~ '^/[A-Za-z0-9/_.-]+$'),
  position smallint not null check (position >= 1),
  -- RN-036: toda imagem com fonte e licença comprovadas.
  source_id uuid not null references public.content_sources (id) on delete restrict,
  license_name text not null check (char_length(license_name) between 1 and 80),
  attribution_text text check (char_length(attribution_text) <= 500),
  width smallint check (width > 0),
  height smallint check (height > 0),
  alt_text text not null check (char_length(alt_text) between 1 and 200),
  unique (exercise_id, position)
);
create table public.exercise_contraindications (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  restriction_code text not null references public.restriction_categories (code),
  primary key (exercise_id, restriction_code)
);
create table public.exercise_alternatives (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises (id) on delete cascade,
  primary key (exercise_id, alternative_exercise_id),
  check (exercise_id <> alternative_exercise_id)
);
create index exercise_muscles_group_idx on public.exercise_muscles (muscle_group_code);

-- Visibilidade de um exercício para o ator (DAD-03 §7.2).
create or replace function app.can_see_exercise(p_origin text, p_manager_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_origin = 'imported' then app.current_actor() is not null
    else app.is_manager_of(p_manager_id, app.current_actor()) or exists (
      select 1 from public.students s
      where s.manager_id = p_manager_id and s.user_id = app.current_actor()
    )
  end
$$;
revoke all on function app.can_see_exercise(text, uuid) from public;
grant execute on function app.can_see_exercise(text, uuid) to authenticated, sync_writer;

alter table public.content_sources enable row level security;
alter table public.content_sources force row level security;
revoke all on public.content_sources from anon, authenticated, sync_writer;
grant select on public.content_sources to authenticated, sync_writer;
create policy content_sources_read on public.content_sources
  for select to authenticated, sync_writer using (true);

alter table public.exercises enable row level security;
alter table public.exercises force row level security;
revoke all on public.exercises from anon, authenticated, sync_writer;
grant select on public.exercises to authenticated, sync_writer;
create policy exercises_read on public.exercises
  for select to authenticated, sync_writer using (app.can_see_exercise(origin, manager_id));

-- Tabelas filhas: visíveis quando o exercício é visível (a política de exercises vale na
-- subconsulta, avaliada como quem consulta).
do $$
declare
  t text;
begin
  foreach t in array array['exercise_muscles', 'exercise_equipment', 'exercise_images',
                           'exercise_contraindications', 'exercise_alternatives'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated, sync_writer', t);
    execute format('grant select on public.%I to authenticated, sync_writer', t);
    execute format(
      'create policy %I on public.%I for select to authenticated, sync_writer
         using (exists (select 1 from public.exercises e where e.id = exercise_id))',
      t || '_read', t);
  end loop;
end
$$;
