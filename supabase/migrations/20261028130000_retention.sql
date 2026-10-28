-- TAR-007 — limpeza diária de retenção (SEG-02 §3, ADR-072; IMP-04 "Diária (automática)").
-- Prazos: marcas de exclusão 90 dias; operações de sincronização 90 dias; relatos de erro 30
-- dias; auditoria 2 anos. Executada pela tarefa agendada (CI) com a conexão administrativa.

-- A janela de edição (RN-027) protege os dados do usuário; remover fisicamente uma marca de
-- exclusão vencida não é edição. Somente nesse caso o DELETE direto passa.
create or replace function app.sessions_edit_window()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Exclusão em cascata (aluno removido — RN-020) não é edição do usuário.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  -- Retenção: marca de exclusão com mais de 90 dias (SEG-02 §3).
  if tg_op = 'DELETE' and old.deleted_at is not null
     and old.deleted_at < now() - interval '90 days' then
    return old;
  end if;
  if old.status = 'in_progress' or old.started_at >= now() - interval '60 days' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'UPDATE'
     and (new.status, new.started_at, new.ended_at, new.duration_min, new.rpe, new.notes,
          new.deleted_at)
         is not distinct from
         (old.status, old.started_at, old.ended_at, old.duration_min, old.rpe, old.notes,
          old.deleted_at) then
    return new;
  end if;
  raise exception 'EDIT_WINDOW_EXPIRED' using errcode = 'P0001', hint = 'RN-027';
end
$$;

create or replace function app.session_children_edit_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session uuid;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  -- Retenção: marca de exclusão com mais de 90 dias (SEG-02 §3).
  if tg_op = 'DELETE' and old.deleted_at is not null
     and old.deleted_at < now() - interval '90 days' then
    return old;
  end if;
  if tg_table_name = 'set_logs' then
    select se.session_id into v_session
    from public.session_exercises se where se.id = old.session_exercise_id;
  else
    v_session := old.session_id;
  end if;
  if not app.session_in_edit_window(v_session) then
    raise exception 'EDIT_WINDOW_EXPIRED' using errcode = 'P0001', hint = 'RN-027';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

-- Uma execução por dia; devolve só contagens (sem dados pessoais) para o registro do CI.
create or replace function app.run_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sessions int;
  v_exercises int;
  v_sets int;
  v_weights int;
  v_operations int;
  v_reports int;
  v_audit int;
  v_limit constant timestamptz := now() - interval '90 days';
begin
  -- Sessões primeiro: exercícios e séries delas saem em cascata.
  delete from public.sessions where deleted_at < v_limit;
  get diagnostics v_sessions = row_count;
  delete from public.session_exercises where deleted_at < v_limit;
  get diagnostics v_exercises = row_count;
  delete from public.set_logs where deleted_at < v_limit;
  get diagnostics v_sets = row_count;
  delete from public.weight_entries where deleted_at < v_limit;
  get diagnostics v_weights = row_count;
  delete from public.sync_operations where received_at < v_limit;
  get diagnostics v_operations = row_count;
  v_reports := app.purge_client_error_reports();
  delete from public.audit_events where occurred_at < now() - interval '2 years';
  get diagnostics v_audit = row_count;
  return jsonb_build_object(
    'sessions', v_sessions,
    'session_exercises', v_exercises,
    'set_logs', v_sets,
    'weight_entries', v_weights,
    'sync_operations', v_operations,
    'client_error_reports', v_reports,
    'audit_events', v_audit
  );
end
$$;
revoke all on function app.run_retention() from public;
