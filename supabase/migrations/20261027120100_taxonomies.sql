-- TAR-004 — taxonomias de referência (TRN-01 §3, TRN-03 §2–§3; DAD-07 seed_taxonomies).
-- Somente migrações escrevem; todos os autenticados leem (DAD-03 §7.2).
-- O bloco de inserção é gerado por scripts/db/taxonomies.ts e conferido por teste.

create table public.goals (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  sort_order smallint not null unique check (sort_order > 0)
);
alter table public.goals enable row level security;
alter table public.goals force row level security;
revoke all on public.goals from anon, authenticated, sync_writer;
grant select on public.goals to authenticated;
create policy goals_read on public.goals for select to authenticated using (true);

create table public.experience_levels (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  sort_order smallint not null unique check (sort_order > 0)
);
alter table public.experience_levels enable row level security;
alter table public.experience_levels force row level security;
revoke all on public.experience_levels from anon, authenticated, sync_writer;
grant select on public.experience_levels to authenticated;
create policy experience_levels_read on public.experience_levels for select to authenticated using (true);

create table public.activity_levels (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  sort_order smallint not null unique check (sort_order > 0)
);
alter table public.activity_levels enable row level security;
alter table public.activity_levels force row level security;
revoke all on public.activity_levels from anon, authenticated, sync_writer;
grant select on public.activity_levels to authenticated;
create policy activity_levels_read on public.activity_levels for select to authenticated using (true);

create table public.training_locations (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  sort_order smallint not null unique check (sort_order > 0)
);
alter table public.training_locations enable row level security;
alter table public.training_locations force row level security;
revoke all on public.training_locations from anon, authenticated, sync_writer;
grant select on public.training_locations to authenticated;
create policy training_locations_read on public.training_locations for select to authenticated using (true);

create table public.restriction_categories (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  sort_order smallint not null unique check (sort_order > 0)
);
alter table public.restriction_categories enable row level security;
alter table public.restriction_categories force row level security;
revoke all on public.restriction_categories from anon, authenticated, sync_writer;
grant select on public.restriction_categories to authenticated;
create policy restriction_categories_read on public.restriction_categories for select to authenticated using (true);

create table public.muscle_groups (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  sort_order smallint not null unique check (sort_order > 0)
);
alter table public.muscle_groups enable row level security;
alter table public.muscle_groups force row level security;
revoke all on public.muscle_groups from anon, authenticated, sync_writer;
grant select on public.muscle_groups to authenticated;
create policy muscle_groups_read on public.muscle_groups for select to authenticated using (true);

create table public.equipment (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 80),
  sort_order smallint not null unique check (sort_order > 0)
);
alter table public.equipment enable row level security;
alter table public.equipment force row level security;
revoke all on public.equipment from anon, authenticated, sync_writer;
grant select on public.equipment to authenticated;
create policy equipment_read on public.equipment for select to authenticated using (true);

insert into public.goals (code, name, sort_order) values
  ('hypertrophy', 'Hipertrofia', 1),
  ('weight_loss', 'Emagrecimento', 2),
  ('strength', 'Força', 3),
  ('conditioning', 'Condicionamento', 4),
  ('maintenance', 'Manutenção', 5),
  ('quality_of_life', 'Qualidade de vida', 6);

insert into public.experience_levels (code, name, sort_order) values
  ('beginner', 'Iniciante', 1),
  ('intermediate', 'Intermediário', 2),
  ('advanced', 'Avançado', 3);

insert into public.activity_levels (code, name, sort_order) values
  ('sedentary', 'Pouco ativo', 1),
  ('light', 'Levemente ativo', 2),
  ('moderate', 'Moderadamente ativo', 3),
  ('high', 'Muito ativo', 4);

insert into public.training_locations (code, name, sort_order) values
  ('full_gym', 'Academia completa', 1),
  ('basic_gym', 'Academia básica', 2),
  ('home', 'Em casa', 3),
  ('outdoor', 'Ao ar livre', 4);

insert into public.restriction_categories (code, name, sort_order) values
  ('shoulder', 'Ombro', 1),
  ('elbow', 'Cotovelo', 2),
  ('wrist', 'Punho/mão', 3),
  ('neck', 'Pescoço/cervical', 4),
  ('thoracic', 'Parte alta das costas/torácica', 5),
  ('lower_back', 'Lombar', 6),
  ('hip', 'Quadril', 7),
  ('knee', 'Joelho', 8),
  ('ankle', 'Tornozelo/pé', 9),
  ('cardiovascular', 'Condição cardiovascular ou respiratória', 10),
  ('pregnancy', 'Gestação ou pós-parto recente', 11),
  ('other', 'Outra', 12);

insert into public.muscle_groups (code, name, sort_order) values
  ('chest', 'Peitoral', 1),
  ('upper_back', 'Costas — parte alta', 2),
  ('lats', 'Dorsais', 3),
  ('shoulders', 'Ombros', 4),
  ('biceps', 'Bíceps', 5),
  ('triceps', 'Tríceps', 6),
  ('forearms', 'Antebraços', 7),
  ('abs', 'Abdômen', 8),
  ('obliques', 'Oblíquos', 9),
  ('lower_back', 'Lombar', 10),
  ('glutes', 'Glúteos', 11),
  ('quadriceps', 'Quadríceps', 12),
  ('hamstrings', 'Posteriores de coxa', 13),
  ('adductors', 'Adutores', 14),
  ('abductors', 'Abdutores', 15),
  ('calves', 'Panturrilhas', 16);

insert into public.equipment (code, name, sort_order) values
  ('barbell', 'Barra', 1),
  ('ez_bar', 'Barra W', 2),
  ('dumbbell', 'Halteres', 3),
  ('kettlebell', 'Kettlebell', 4),
  ('machine', 'Máquina', 5),
  ('smith_machine', 'Smith', 6),
  ('cable', 'Polia/cabo', 7),
  ('band', 'Elástico', 8),
  ('bench', 'Banco', 9),
  ('pullup_bar', 'Barra fixa', 10),
  ('dip_bars', 'Paralelas', 11),
  ('medicine_ball', 'Bola de peso', 12),
  ('bodyweight', 'Peso corporal', 13);
