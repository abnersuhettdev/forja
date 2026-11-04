-- V12-07 (RF-021, RF-112, RN-064): ênfase em músculo ou área no perfil.
alter table public.training_profiles
  add column emphasis_groups text[] check (
    cardinality(emphasis_groups) <= 3
    and emphasis_groups <@ array[
      'chest', 'upper_back', 'lats', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs',
      'obliques', 'lower_back', 'glutes', 'quadriceps', 'hamstrings', 'adductors', 'abductors',
      'calves'
    ]::text[]
  );
