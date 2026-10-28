# DAD-02 — Dicionário de Dados

| Campo | Valor |
|---|---|
| Identificador | DAD-02 |
| Status | **Aprovado** (2026-10-26 — Etapa 4) |
| Etapa | 4 |
| Dono do assunto | Campos, tipos, obrigatoriedade, faixas, valores padrão e classificação de privacidade |
| Dependências | DAD-01, PRD-07 (RN-018), PRD-08 §6, TRN-01/TRN-03 (enumerações finais) |
| Referenciado por | DAD-03, DAD-04, DAD-07, SEG-02 |
| Última atualização | 2026-10-28 |

## 1. Convenções

- Tipos PostgreSQL. `uuid` = identificador; `timestamptz` em UTC; `numeric(p,s)` para medidas.
- **Obr.**: S = obrigatório (`not null`), N = opcional.
- **Priv.** (classificação preliminar de PRD-08 §6): `C` pessoal comum · `S` tratado como sensível · `T` técnico (sem dado pessoal) · `R` referência pública (catálogo).
- Todas as tabelas de dados do aluno têm, além dos campos listados: `created_at timestamptz not null default now()` e `updated_at timestamptz not null` (atualizado pelo servidor).
- Campos `revision` e `deleted_at` seguem a ADR-053 (DAD-01 §6).
- Faixas vêm de RN-018 e RN-035; a validação existe no app, na função de sincronização e como restrição no banco (DAD-03).

## 2. Pessoas e papéis

### ENT-001 `managers`

| Campo | Tipo | Obr. | Regra | Priv. |
|---|---|---|---|---|
| `id` | uuid | S | PK | T |
| `user_id` | uuid | S | Único; referência ao usuário do serviço de autenticação | T |

### ENT-002 `students`

| Campo | Tipo | Obr. | Regra | Priv. |
|---|---|---|---|---|
| `id` | uuid | S | PK | T |
| `manager_id` | uuid | S | FK `managers` | T |
| `user_id` | uuid | N | Usuário do aluno (nulo para aluno TER ainda não convidado); único | T |
| `is_self` | boolean | S | `true` quando o aluno é o próprio gestor (PES) | T |
| `full_name` | text | S | 1–120 caracteres | C |
| `email` | text | N | Formato de e-mail; na PES espelha o login | C |
| `birth_date` | date | S | Idade ≥ 18 na data do cadastro (RN-010) | C |
| `sex` | text | N | `female`, `male`, `undisclosed` | C |
| `height_cm` | numeric(5,1) | N | 120–230 | S |
| `timezone` | text | S | Padrão `America/Sao_Paulo` (RN-028) | C |
| `status` | text | S | `active`, `inactive`, `invited` (TER) | T |
| `onboarding_completed_at` | timestamptz | N | Preenchido ao concluir TELA-003 | T |

### ENT-003 `training_profiles` (1:1 com `students`)

| Campo | Tipo | Obr. | Regra | Priv. |
|---|---|---|---|---|
| `student_id` | uuid | S | PK e FK | T |
| `goal` | text | N | Código de objetivo (§7) | C |
| `goal_weight_kg` | numeric(4,1) | N | 30–300 | S |
| `experience_level` | text | N | Código (§7) | C |
| `activity_level` | text | N | Código (§7) | C |
| `days_per_week` | smallint | N | 1–7 | C |
| `minutes_per_session` | smallint | N | 15–180 | C |
| `preferred_weekdays` | smallint[] | N | Valores 1–7 (1 = segunda, ISO) | C |
| `training_location` | text | N | Código (§7) | C |
| `equipment_codes` | text[] | N | Códigos de `equipment` | C |
| `restrictions_declared` | text | N | `none` (declarou nenhuma) ou `listed`; nulo = não declarado (RN-006) | S |
| `restriction_codes` | text[] | N | Códigos de categoria de restrição (§7) | S |
| `restrictions_note` | text | N | Até 500 caracteres | S |
| `preferences_note` | text | N | Até 500 caracteres | C |
| `reassessment_interval_days` | smallint | S | Padrão 30 (fixo no MVP; RF-019 FUT) | T |
| `reassessment_snooze_until` | date | N | Data escolhida no último adiamento (RN-015) | T |
| `review_recommended_since` | timestamptz | N | Preenchido por RN-025 | T |
| `revision` | integer | S | ADR-053 | T |

## 3. Avaliação e evolução

### ENT-004 `assessments`

| Campo | Tipo | Obr. | Regra | Priv. |
|---|---|---|---|---|
| `id` | uuid | S | PK (gerado no aparelho) | T |
| `student_id` | uuid | S | FK | T |
| `assessed_on` | date | S | Não futura | C |
| `kind` | text | S | `initial`, `periodic` | T |
| `weight_kg` | numeric(4,1) | S | 30–300 (ADR-010) | S |
| `profile_snapshot` | jsonb | S | Cópia dos campos de `training_profiles` na data | S |
| `notes` | text | N | Até 500 caracteres | S |

### ENT-005 `weight_entries`

| Campo | Tipo | Obr. | Regra | Priv. |
|---|---|---|---|---|
| `id` | uuid | S | PK (gerado no aparelho) | T |
| `student_id` | uuid | S | FK | T |
| `measured_on` | date | S | Não futura | C |
| `weight_kg` | numeric(4,1) | N* | 30–300; *nulo somente quando excluído | S |
| `source` | text | S | `manual`, `assessment` | T |
| `assessment_id` | uuid | N | Preenchido quando `source = assessment` | T |
| `revision`, `deleted_at` | | | ADR-053; exclusão por UXP-01 (RF-080) | T |

### ENT-006 `body_measurements` (D3)

`id`, `student_id`, `measured_on` (date, S), `assessment_id` (N) e, todos opcionais em `numeric(4,1)` com faixa 10–250 cm: `neck_cm`, `shoulders_cm`, `chest_cm`, `waist_cm`, `abdomen_cm`, `hips_cm`, `arm_left_cm`, `arm_right_cm`, `forearm_left_cm`, `forearm_right_cm`, `thigh_left_cm`, `thigh_right_cm`, `calf_left_cm`, `calf_right_cm`; `body_fat_pct` numeric(3,1) 2–70. Priv.: S. `revision`, `deleted_at`.

### ENT-007 `reassessment_postponements` (D1)

`id` uuid S · `student_id` uuid S · `postponed_from` date S · `postponed_to` date S (> `postponed_from`) · Priv.: T.

### ENT-008 `rest_settings` e ENT-009 `rest_overrides`

| Tabela | Campo | Tipo | Obr. | Regra |
|---|---|---|---|---|
| `rest_settings` | `student_id` | uuid | S | PK/FK |
| | `default_hours` | smallint | S | 0–168; padrão **48** (ADR-021) |
| | `revision` | integer | S | ADR-053 |
| `rest_overrides` | `student_id`, `muscle_group_code` | uuid, text | S | PK composta |
| | `hours` | smallint | S | 0–168 |
| | `revision` | integer | S | ADR-053 |

Priv.: C (preferência pessoal).

## 4. Catálogo (Priv.: R, exceto personalizados — C)

### ENT-010 `content_sources`

`id` uuid · `name` text S · `url` text N · `license_name` text S (ex.: "Unlicense", "CC BY-SA 3.0", "Própria") · `license_url` text N · `attribution_text` text N · `retrieved_on` date N · `notes` text N.

### ENT-011 `exercises`

| Campo | Tipo | Obr. | Regra |
|---|---|---|---|
| `id` | uuid | S | PK |
| `origin` | text | S | `imported`, `custom` (RN-037) |
| `manager_id` | uuid | N | Obrigatório se `custom`; nulo se `imported` (catálogo global) |
| `source_id` | uuid | N | Obrigatório se `imported` |
| `source_ref` | text | N | Identificador na fonte original |
| `name` | text | S | pt-BR, 2–120; único entre exercícios ativos visíveis ao gestor |
| `instructions` | jsonb | S | Lista ordenada de passos em pt-BR (1–15 itens) |
| `safety_tips` | jsonb | N | Lista de dicas em pt-BR |
| `difficulty` | text | S | `beginner`, `intermediate`, `advanced` |
| `measure_type` | text | S | `reps`, `duration` |
| `is_bodyweight` | boolean | S | Padrão de carga 0 (UX-05 TELA-015) |
| `active` | boolean | S | RN-021 |
| `text_reviewed_at` | timestamptz | N | Revisão da tradução (RF-038) |
| `edited_by_manager_at` | timestamptz | N | Correção de importado (RF-032) |
| `original_text` | jsonb | N | Texto da fonte antes da correção, preservado (RF-032) |

### ENT-012..ENT-017

| Tabela | Campos |
|---|---|
| `muscle_groups` | `code` text PK · `name` text (pt-BR) · `sort_order` smallint |
| `exercise_muscles` | `exercise_id` · `muscle_group_code` · `role` (`primary`/`secondary`) — PK (exercise_id, muscle_group_code) |
| `equipment` | `code` text PK · `name` text |
| `exercise_equipment` | `exercise_id` · `equipment_code` — PK composta |
| `exercise_images` | `id` · `exercise_id` · `path` (arquivo estático, sem dado pessoal) · `position` · `source_id` (S) · `license_name` (S) · `attribution_text` · `width`, `height` · `alt_text` (pt-BR) |
| `exercise_contraindications` | `exercise_id` · `restriction_code` — PK composta (D2) |
| `exercise_alternatives` | `exercise_id` · `alternative_exercise_id` — PK composta; simétrica por regra de aplicação (D4) |

## 5. Programas

### ENT-018 `programs`

`id` uuid S · `student_id` uuid S (único por aluno no MVP) · Priv.: T.

### ENT-019 `program_versions`

| Campo | Tipo | Obr. | Regra | Priv. |
|---|---|---|---|---|
| `id` | uuid | S | PK | T |
| `program_id`, `student_id` | uuid | S | FK (aluno desnormalizado para políticas e unicidade) | T |
| `status` | text | S | `draft`, `active`, `archived` | T |
| `version_number` | integer | N | Atribuído na publicação; sequencial por aluno | T |
| `name` | text | S | 1–80 | C |
| `split_type` | text | N | `full_body`, `ab`, `abc`, `abcd`, `upper_lower`, `other` | C |
| `origin` | text | S | `manual`, `generated` (RN-009) | T |
| `generator_report` | jsonb | N | Premissas e exclusões (RF-023, D2) | S |
| `created_from_version_id` | uuid | N | Versão de origem (RF-027) | T |
| `published_at`, `archived_at` | timestamptz | N | — | T |
| `revision` | integer | S | Rascunho editável (ADR-053) | T |

### ENT-020 `workouts`

`id` uuid S · `program_version_id` uuid S · `position` smallint S (1–7, sequência planejada) · `name` text S (1–60) · Priv.: C.

### ENT-021 `workout_items`

| Campo | Tipo | Obr. | Regra |
|---|---|---|---|
| `id` | uuid | S | PK |
| `workout_id` | uuid | S | FK |
| `position` | smallint | S | Ordem no treino |
| `exercise_id` | uuid | S | FK; exercício ativo no momento da publicação (RN-021) |
| `measure_type` | text | S | `reps` ou `duration` |
| `sets` | smallint | S | 1–10 |
| `reps_min`, `reps_max` | smallint | N* | 1–100, mín ≤ máx; *obrigatórios se `reps` |
| `duration_s` | smallint | N* | 1–3600; *obrigatório se `duration` |
| `rest_s` | smallint | S | 0–600 |
| `suggested_load_kg` | numeric(5,1) | N | 0–500, passo 0,5 |
| `notes` | text | N | Até 500 |

## 6. Execução

### ENT-022 `sessions`

| Campo | Tipo | Obr. | Regra | Priv. |
|---|---|---|---|---|
| `id` | uuid | S | PK (gerado no aparelho) | T |
| `student_id` | uuid | S | FK | T |
| `program_version_id`, `workout_id` | uuid | S | Versão e treino de início (RN-044) | T |
| `status` | text | S | `in_progress`, `completed`, `manual`, `abandoned` | C |
| `started_at` | timestamptz | S | Horário do aparelho (RN-048) | C |
| `ended_at` | timestamptz | N | Obrigatório se `completed`/`manual`; ≥ `started_at` | C |
| `duration_min` | smallint | N | 1–300 | C |
| `last_activity_at` | timestamptz | S | Última série registrada (RN-012) | T |
| `rpe` | smallint | N | 0–10 | C |
| `notes` | text | N | Até 500 (tratado como sensível — PRD-08 §6) | S |
| `device_id` | uuid | S | Identificador aleatório do aparelho (não é identificador de hardware) | T |
| `possible_duplicate_of` | uuid | N | RN-045 | T |
| `clock_suspect` | boolean | S | RN-048 | T |
| `revision`, `deleted_at` | | | ADR-053 | T |

O estado "abandonada" é calculado na leitura quando `in_progress` e `last_activity_at` < agora − 6 h, e gravado na próxima alteração (RN-012).

### ENT-023 `session_exercises`

`id` uuid S · `session_id` S · `workout_item_id` N (nulo se adicionado ou substituído) · `exercise_id` S · `position` S · `status` S (`pending`, `done`, `skipped`) · `substituted_for_item_id` N (D5) · `revision`, `deleted_at`.

### ENT-024 `set_logs`

| Campo | Tipo | Obr. | Regra |
|---|---|---|---|
| `id` | uuid | S | PK (gerado no aparelho) |
| `session_exercise_id` | uuid | S | FK |
| `set_number` | smallint | S | 1–20 |
| `load_kg` | numeric(5,1) | S* | 0–500, passo 0,5; *nulo só se excluído |
| `reps` | smallint | N | 0–100 (obrigatório se medida `reps`) |
| `duration_s` | smallint | N | 0–3600 (obrigatório se medida `duration`) |
| `completed_at` | timestamptz | S | Horário do aparelho |
| `revision`, `deleted_at` | | | ADR-053 |

## 7. Enumerações (finais em TRN-01 e TRN-03)

A fonte única das enumerações é [TRN-01 §3](../05-regras-de-treinamento/01-perfil-e-avaliacao-do-aluno.md#3-enumerações-finais) (objetivo, experiência, atividade, local, categorias de restrição) e [TRN-03 §2–§5](../05-regras-de-treinamento/03-catalogo-e-selecao-de-exercicios.md) (grupos musculares, equipamentos, padrões de movimento, marcadores de sobrecarga). Em relação à lista provisória desta etapa, as categorias de restrição ganharam `thoracic`, `cardiovascular` e `pregnancy`, e os equipamentos ganharam `ez_bar`, `smith_machine`, `dip_bars` e `medicine_ball`. Como consequência, `exercises` recebe os campos `movement_pattern` (texto, obrigatório) e `load_markers` (lista de textos), e `exercise_muscles` mantém o papel primário/secundário.

## 8. Infraestrutura

| Tabela | Campos | Retenção | Priv. |
|---|---|---|---|
| `sync_operations` | `op_id` uuid PK · `user_id` uuid · `op_type` text · `entity_id` uuid · `result` text · `response` jsonb · `received_at` timestamptz | 90 dias | T (a resposta não contém dados pessoais além de identificadores e revisões) |
| `audit_events` | `id` · `event_type` · `subject_hash` (hash, nunca e-mail) · `occurred_at` · `details` jsonb sem dados pessoais | 2 anos | T |
| `client_error_reports` | `id` · `subject_hash` (resumo SHA-256 do identificador do usuário, nunca e-mail — só para o limite de 20 por hora da API-030) · `app_version` · `error_code` · `context` (rota lógica, sem identificadores) · `platform` (`android`, `ios`, `desktop`, `other`) · `occurred_at` | 30 dias | T |
| `system_settings` | `key` text PK · `value` jsonb | — | T |

## Critérios de conclusão

- [x] Todos os campos com tipo, obrigatoriedade, faixa e classificação de privacidade.
- [x] Faixas coerentes com RN-018/RN-035.
- [x] Enumerações finalizadas em TRN-01/TRN-03 (Etapa 5, aprovada).
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 4). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 4). |
| 2026-10-26 | §7 aponta para as enumerações finais de TRN-01/TRN-03 (Etapa 5, aguardando aprovação); novos campos `movement_pattern` e `load_markers` em `exercises`. |
| 2026-10-26 | Enumerações finais aprovadas com a Etapa 5. |
| 2026-10-28 | TAR-024 (confirmado pelo usuário): `client_error_reports` recebe `subject_hash` para o limite por usuário da API-030; valores de `platform` explicitados. |
