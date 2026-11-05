-- V12-04 (RF-113, ADR-095): modo Automático por padrão; Manual como opção.
alter table public.training_profiles
  add column app_mode text not null default 'automatic'
  check (app_mode in ('automatic', 'manual'));
