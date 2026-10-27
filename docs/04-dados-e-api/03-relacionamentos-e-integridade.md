# DAD-03 — Relacionamentos e Integridade

| Campo | Valor |
|---|---|
| Identificador | DAD-03 |
| Status | **Aprovado** (2026-10-26 — Etapa 4) |
| Etapa | 4 |
| Dono do assunto | Chaves, cardinalidades, restrições, gatilhos, índices, políticas por linha e política de exclusão |
| Dependências | DAD-01, DAD-02, DAD-05, ADR-028, ADR-034, ADR-050 |
| Referenciado por | DAD-04, DAD-07, SEG-01, SEG-03 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Garantir **no banco** — e não só no app ou na função de sincronização — as regras críticas de integridade, isolamento e imutabilidade, de modo que continuem valendo mesmo diante de defeitos ou tentativas de contorno.

## 2. Cardinalidades e chaves estrangeiras

| Relação | Cardinalidade | Ao excluir o pai |
|---|---|---|
| `managers` → `students` | 1:N | Restringe (gestor não é excluído no MVP) |
| `students` → `training_profiles`, `rest_settings` | 1:1 | Cascata |
| `students` → `assessments`, `weight_entries`, `body_measurements`, `reassessment_postponements`, `rest_overrides`, `programs`, `sessions` | 1:N | Cascata (exclusão definitiva — RN-020) |
| `programs` → `program_versions` → `workouts` → `workout_items` | 1:N | Cascata |
| `sessions` → `session_exercises` → `set_logs` | 1:N | Cascata |
| `program_versions`/`workouts` → `sessions` | 1:N | **Restringe** (versões com sessões nunca são apagadas, exceto na exclusão do aluno) |
| `exercises` → `workout_items`, `session_exercises` | 1:N | **Restringe** — exercícios não são excluídos, apenas desativados (RN-021) |
| `content_sources` → `exercises`, `exercise_images` | 1:N | Restringe |

## 3. Restrições de unicidade

| Regra | Implementação |
|---|---|
| Um gestor por usuário | `unique(managers.user_id)` |
| Um aluno por usuário | `unique(students.user_id)` (quando não nulo) |
| Um programa por aluno (MVP) | `unique(programs.student_id)` |
| No máximo uma versão ativa por aluno (RN-003) | Índice único parcial em `program_versions(student_id) where status = 'active'` |
| No máximo um rascunho por aluno (RN-003) | Índice único parcial `where status = 'draft'` |
| Número de versão único por aluno | `unique(student_id, version_number)` |
| Posições únicas | `unique(program_version_id, position)` em `workouts`; `unique(workout_id, position)` em `workout_items`; `unique(session_exercise_id, set_number)` em `set_logs` (somente não excluídos) |
| Nome de exercício | Único entre exercícios ativos do mesmo escopo (global importado ou do gestor) |

## 4. Restrições de domínio (faixas — RN-018, RN-035)

Implementadas como `check` em todas as colunas listadas em DAD-02 (ex.: `weight_kg between 30 and 300`, `load_kg between 0 and 500 and load_kg * 2 = trunc(load_kg * 2)`, `reps_min <= reps_max`, `rest_s between 0 and 600`, `sets between 1 and 10`, `default_hours between 0 and 168`). Datas de peso e avaliação não futuras são verificadas pela função de sincronização com o relógio do servidor (tolerância de RN-048), porque `check` não pode depender do horário atual de forma confiável.

## 5. Gatilhos (regras que as restrições simples não cobrem)

| ID | Gatilho | Regra |
|---|---|---|
| TG-01 | Imutabilidade de versões | Bloqueia `update`/`delete` em `program_versions` (exceto transição `active → archived`), `workouts` e `workout_items` quando a versão não for `draft` (RN-004) |
| TG-02 | Publicação | Ao mudar `draft → active`: exige 1–7 treinos, cada um com ≥ 1 item, e todos os exercícios ativos (RN-035, RN-021); arquiva a versão ativa anterior na mesma transação; atribui `version_number` |
| TG-03 | Revisão | Incrementa `revision` e atualiza `updated_at` em toda alteração das tabelas sincronizáveis (ADR-053) |
| TG-04 | GATE-TER | Recusa inserir aluno se `system_settings.ter_enabled` for falso e o gestor já tiver um aluno (RN-040) |
| TG-05 | Idade | Recusa aluno com idade < 18 na data de inserção (RN-010) |
| TG-06 | Janela de edição | Recusa alteração/exclusão de sessão com `started_at` há mais de 60 dias, **exceto** inserção de sessão nova vinda da sincronização (RN-027) |
| TG-07 | Marca de exclusão | Ao marcar `deleted_at`, apaga valores pessoais do registro (peso, cargas, observações) (ADR-053) |
| TG-08 | Revisão recomendada | Alteração em objetivo, disponibilidade, equipamentos ou restrições com versão ativa existente preenche `review_recommended_since` (RN-025) |
| TG-09 | Coerência de dono | `program_versions.student_id` igual ao de `programs`; `sessions.student_id` igual ao da versão referenciada |

## 6. Índices relevantes

| Tabela | Índice | Uso |
|---|---|---|
| `sessions` | `(student_id, started_at desc) where deleted_at is null` | Agenda, recomendação, Hoje |
| `set_logs` | `(session_exercise_id, set_number)` | Detalhe da sessão |
| `session_exercises` | `(exercise_id, session_id)` | Última execução e histórico por exercício (RF-054, RF-073) |
| `weight_entries` | `(student_id, measured_on desc) where deleted_at is null` | Peso atual, gráfico |
| `assessments` | `(student_id, assessed_on desc)` | Reavaliação (RN-014) |
| `program_versions` | Índices parciais de §3 + `(student_id, status)` | Programa ativo |
| `exercises` | `(active, origin)`; busca por nome sem acentos | Catálogo |
| `sync_operations` | PK `op_id`; `(received_at)` | Idempotência; limpeza após 90 dias |

## 7. Políticas por linha (isolamento — RN-001, ADR-028 L4)

### 7.1 Funções auxiliares (no banco)

| Função | Retorna verdadeiro quando |
|---|---|
| `is_own_student(student_id)` | O aluno pertence ao usuário identificado (`students.user_id`) |
| `manages_student(student_id)` | O usuário identificado é o gestor do aluno |
| `current_actor()` | Usuário identificado: para leituras, o da sessão de acesso; para escritas, o fixado pela função de sincronização na transação (ADR-050) |

### 7.2 Matriz de acesso

| Tabelas | Leitura (papel `authenticated`) | Escrita |
|---|---|---|
| `students`, `training_profiles`, `assessments`, `weight_entries`, `body_measurements`, `reassessment_postponements`, `rest_settings`, `rest_overrides`, `sessions`, `session_exercises`, `set_logs` | `is_own_student` **ou** `manages_student`; registros com `deleted_at` só pelo próprio aluno (para reconciliação) | **Somente** papel de sincronização (ADR-050), com a mesma condição aplicada a `current_actor()`; gestão de programas só por `manages_student` |
| `programs`, `program_versions`, `workouts`, `workout_items` | Aluno: apenas versões `active`/`archived` (RN-005, rascunho invisível); gestor: todas | Somente papel de sincronização; apenas o gestor do aluno |
| `exercises` e tabelas do catálogo | Importados: todos os autenticados; personalizados: o gestor dono e seus alunos | Importados: somente migrações; personalizados: papel de sincronização, gestor dono |
| `content_sources`, `muscle_groups`, `equipment` | Todos os autenticados | Somente migrações |
| `sync_operations`, `audit_events`, `client_error_reports`, `system_settings` | Nenhuma leitura pelo app (exceto `system_settings.ter_enabled`) | Somente papel de sincronização / migrações |

- Toda tabela com dados de aluno tem políticas habilitadas e **forçadas**; uma migração sem política correspondente falha no CI (teste automático que lista tabelas sem política).
- O papel `anon` (não autenticado) não tem acesso a nenhuma tabela de dados.
- Respostas da API de dados com dados pessoais saem com `Cache-Control: no-store` (ADR-028 L5; detalhe em DAD-05).

## 8. Política de exclusão

| Ação | Comportamento |
|---|---|
| Excluir sessão, série ou peso pelo usuário | Marca de exclusão (TG-07); remoção física após 90 dias |
| Descartar sessão em andamento | Remoção física da sessão e de suas séries (nunca sincronizada como concluída) |
| Descartar rascunho | Remoção física da versão `draft` e filhos |
| Desativar exercício | `active = false`; nunca remoção (RN-021) |
| Exclusão definitiva de aluno (TER, RN-020) | Cascata total + `audit_events` com hash, sem dados pessoais |
| Exportação (RF-095, D5) | Leitura de todas as tabelas do aluno via função própria, sem incluir marcas de exclusão |

## Critérios de conclusão

- [x] Regras críticas (isolamento, imutabilidade, unicidade, faixas, GATE-TER, idade, janela) garantidas no banco.
- [x] Índices para as consultas das telas.
- [x] ADR-050 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 4). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 4). |
