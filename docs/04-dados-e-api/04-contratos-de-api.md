# DAD-04 — Contratos de API

| Campo | Valor |
|---|---|
| Identificador | DAD-04 |
| Status | **Aprovado** (2026-10-26 — Etapa 4) |
| Etapa | 4 |
| Dono do assunto | Contratos de leitura e de escrita (API-###), formato da sincronização, idempotência, conflitos e códigos de erro |
| Dependências | DAD-01..03, DAD-05, UX-05, UX-08 §6, ADR-022, ADR-034, ADR-050 |
| Referenciado por | SEG-05, SEG-03, PLN-01, PLN-03 |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo e escopo

Definir todas as interações entre o app e o backend: **leituras** pela API de dados (sujeitas às políticas por linha) e **escritas** exclusivamente pela função de sincronização (ADR-034, ADR-050). Exemplos em JSON são ilustrativos de contrato, não código.

## 2. Convenções

| Item | Regra |
|---|---|
| Transporte | HTTPS; JSON UTF-8 |
| Autenticação | Cabeçalho `Authorization: Bearer <token de acesso>` em todas as chamadas, exceto login (DAD-05) |
| Datas | ISO 8601 em UTC (`2026-10-26T14:32:05Z`); datas de calendário `AAAA-MM-DD` |
| Números | Ponto decimal no JSON (`82.5`); formatação pt-BR só na interface |
| Identificadores | UUID; os de registros criáveis offline são gerados no aparelho |
| Cache | Respostas com dados pessoais: `Cache-Control: no-store` |
| Paginação (leituras) | Por intervalo de datas ou cursor (`started_at < X`, limite 50) |
| Dados pessoais em URL | Proibidos; filtros por identificador opaco ou data |
| Versão do contrato | Campo `contract_version` em toda requisição de sincronização (inicial: `1`) |

### 2.1 Formato de erro (todas as respostas de erro e resultados recusados)

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Carga fora da faixa permitida (0 a 500 kg).",
  "details": { "field": "load_kg", "rule": "RN-018" }
}
```

`message` é em português e pode ser exibida; o app usa `code` para decidir o comportamento.

## 3. Leituras (API de dados, papel `authenticated`)

| ID | Leitura | Filtro / conteúdo | Telas | Disponível offline (cache local) |
|---|---|---|---|---|
| API-R01 | Meu contexto | Usuário → gestor (se houver), aluno, perfil, configuração de descanso, `ter_enabled` | Todas | Sim |
| API-R02 | Programa ativo completo | Versão `active` + treinos + itens + exercícios referenciados (com músculos, equipamentos, metadados de imagem) | TELA-010..015 | Sim |
| API-R03 | Rascunho e versões (gestão) | Versão `draft` completa; lista de versões (D4) | TELA-030..032, TELA-056 | Leitura apenas |
| API-R04 | Catálogo | Exercícios ativos visíveis + taxonomias; busca por nome, filtros por grupo, equipamento, dificuldade, origem | TELA-033, TELA-034 | Itens já vistos |
| API-R05 | Detalhe do exercício | Exercício, imagens, fonte/licença, alternativas | TELA-014 | Programa ativo |
| API-R06 | Sessões por período | `started_at` entre datas; inclui séries; inclui marcas de exclusão desde `since` para reconciliação | TELA-018..020, recomendação | Últimos 90 dias |
| API-R07 | Última execução por exercício | Para cada exercício do programa ativo, a sessão concluída mais recente | TELA-014, TELA-015 | Sim |
| API-R08 | Pesos | Registros por período; inclui marcas de exclusão desde `since` | TELA-010, TELA-021, TELA-053 | 12 meses |
| API-R09 | Avaliações e adiamentos | Lista e detalhe; data do último adiamento | TELA-010, TELA-037, TELA-050, TELA-055 | Última |
| API-R11 | Histórico por exercício (D3) | Por exercício: sessões com carga máxima, melhor série e volume | TELA-052 | Não |
| API-R12 | Medidas corporais (D3) | Registros por período | TELA-054 | Não |
| API-R10 | Alterações desde | Para cada conjunto sincronizável, registros com `updated_at > since` (inclusive excluídos) — usada no "atualizar ao abrir" | Todas | — |

Toda leitura respeita DAD-03 §7: o aluno nunca recebe rascunhos; ninguém recebe dados de outro aluno.

## 4. Escrita: função de sincronização (API-001)

### 4.1 Requisição

`POST /sync` (rota da função; endereço definido na implantação)

```json
{
  "contract_version": 1,
  "device_id": "5b0c8a8e-4d1e-4c4f-9a6b-2a0f2d8f1c11",
  "client_time": "2026-10-26T14:32:05Z",
  "operations": [
    {
      "op_id": "0f5d7c3e-1e2a-4b8a-9f61-6c1d2e3f4a5b",
      "owner_user_id": "8d2f…",
      "type": "set.upsert",
      "entity_id": "a1b2…",
      "base_revision": null,
      "created_at": "2026-10-26T14:31:58Z",
      "payload": { "session_exercise_id": "c3d4…", "set_number": 2, "load_kg": 60.0, "reps": 10, "completed_at": "2026-10-26T14:31:58Z" }
    }
  ]
}
```

- Atende RF-091, RF-092, RF-100, RF-101 e RF-102 (envio da fila de saída).
- Até 100 operações por requisição, na ordem de criação (UX-08 §6.3).
- `owner_user_id`: verificado contra o usuário do token (ADR-028 L4); divergência → `OWNER_MISMATCH`.
- `base_revision`: revisão em que a alteração se baseia (nula em criações).

### 4.2 Resposta

```json
{
  "server_time": "2026-10-26T14:32:06Z",
  "results": [
    { "op_id": "0f5d…", "status": "accepted", "entity_id": "a1b2…", "revision": 1 },
    { "op_id": "1a2b…", "status": "conflict", "error": { "code": "REVISION_CONFLICT", "message": "Este registro foi alterado em outro aparelho." }, "server_record": { "revision": 4, "…": "…" } },
    { "op_id": "2b3c…", "status": "rejected", "error": { "code": "VALIDATION_FAILED", "message": "…", "details": { "field": "reps" } } }
  ]
}
```

| `status` | Significado | Estado no app (RN-051) |
|---|---|---|
| `accepted` | Aplicada agora | Sincronizado |
| `duplicate` | Mesmo `op_id` já aplicado antes; devolve o resultado original | Sincronizado |
| `rejected` | Recusa definitiva (validação, permissão, regra) | Recusado |
| `conflict` | Revisão desatualizada ou registro excluído; traz `server_record` | Conflito |
| `deferred` | Depende de operação anterior que não foi aceita nesta requisição | Mantém aguardando envio |

Falhas de transporte (sem resposta, tempo esgotado, 5xx) não geram resultado por operação → **nova tentativa automática**. HTTP 401 → "aguardando login". A requisição só retorna 200 quando todas as operações foram avaliadas.

### 4.3 Processamento no servidor (por operação, em ordem)

1. Usuário = o do token verificado; fixado na transação como `current_actor()` (ADR-050).
2. `owner_user_id` ≠ usuário → `rejected/OWNER_MISMATCH` + evento de auditoria.
3. `op_id` já registrado → resposta guardada (`duplicate`).
4. Entidade inexistente para edição, ou pertencente a outro aluno → `rejected/NOT_FOUND` (sem revelar a existência — RN-001).
5. `base_revision` < revisão atual → `conflict/REVISION_CONFLICT`; entidade com marca de exclusão → `conflict/ENTITY_DELETED`.
6. Validação com os esquemas do pacote de domínio + regras específicas do tipo.
7. Aplicação (as restrições e gatilhos do banco valem como segunda barreira — DAD-03).
8. Registro em `sync_operations`; cada operação é uma transação própria.

## 5. Tipos de operação

| ID | `type` | Payload (campos principais) | Regras / validações | Erros específicos | RF |
|---|---|---|---|---|---|
| API-002 | `onboarding.complete` | Dados de `students` (nome, nascimento, sexo, altura, fuso), perfil completo, `weight_kg`, `goal_weight_kg` | RN-010, RN-018; cria `training_profiles`, `assessments(initial)`, `weight_entries(assessment)`, `rest_settings(48)` | `AGE_UNDER_18` | RF-009 |
| API-003 | `profile.update` | Campos alterados de `students`/`training_profiles` + `base_revision` | RN-018; aciona TG-08 (RN-025) | — | RF-012, RF-089 |
| API-004 | `assessment.create` | `assessed_on`, `weight_kg`, `notes`, `profile_snapshot` | Data não futura; cria `weight_entries(assessment)` | — | RF-016, RF-084 |
| API-005 | `weight.create` | `measured_on`, `weight_kg` | RN-018; data não futura | — | RF-080 |
| API-006 | `weight.delete` | — (`entity_id`, `base_revision`) | Somente `source = manual` (pesos de avaliação são corrigidos pela avaliação) | `NOT_DELETABLE` | RF-080 (UXP-01) |
| API-007 | `rest.update` | `default_hours`, lista de ajustes por grupo | 0–168 | — | RF-055 |
| API-008 | `session.start` | `program_version_id`, `workout_id`, `started_at`, exercícios iniciais (`session_exercises`) | Versão do próprio aluno, `active` ou `archived`; RN-044; detecção de sobreposição com outra sessão → marca `possible_duplicate_of` (aceita) | `VERSION_NOT_AVAILABLE` | RF-060 |
| API-009 | `set.upsert` | `session_exercise_id`, `set_number`, `load_kg`, `reps` ou `duration_s`, `completed_at` | RN-018; atualiza `last_activity_at` da sessão; RN-048 (marca `clock_suspect`) | — | RF-061 |
| API-010 | `set.delete` | — | Janela RN-027 (exceto sessão em andamento) | `EDIT_WINDOW_EXPIRED` | RF-061, RF-069 |
| API-011 | `session_exercise.update` | `status` (`done`/`skipped`), `position`, novo exercício (D5) | Substituição só por alternativa cadastrada (D5) | `NOT_AN_ALTERNATIVE` | RF-063, RF-064 |
| API-012 | `session.complete` | `ended_at`, `duration_min`, `rpe`, `notes` | `ended_at ≥ started_at`; 1–300 min | — | RF-065 |
| API-013 | `session.update` | Horários, PSE, observação; concluir abandonada; `possible_duplicate_of: null` ("Manter ambas" — só limpa a marca, sem mudar a revisão; TAR-020) | RN-027 (janela), RN-012, RN-045 | `EDIT_WINDOW_EXPIRED` | RF-069, RF-100 |
| API-014 | `session.delete` | — | Concluída/manual: marca de exclusão (janela RN-027); em andamento: descarte físico | `EDIT_WINDOW_EXPIRED` | RF-067, RF-069 |
| API-015 | `session.manual_create` | Treino, versão, data/hora, duração, séries opcionais | Data entre hoje e 60 dias atrás (RN-027) | `DATE_OUT_OF_WINDOW` | RF-068 (D5) |
| API-016 | `draft.create` | `source`: `empty` \| `from_version` (`version_id`) \| `generated` (rascunho completo + `generator_report`) | RN-003 (um rascunho); papel de gestão do aluno | `DRAFT_ALREADY_EXISTS`, `FORBIDDEN_ROLE` | RF-020, RF-021, RF-022, RF-023, RF-027 |
| API-017 | `draft.save` | Documento completo do rascunho (nome, divisão, treinos, itens) + `base_revision` | Esquema do domínio; exercícios ativos; substituição integral (simplifica conflitos — editor é online) | `EXERCISE_INACTIVE` | RF-024 |
| API-018 | `draft.publish` | `base_revision` | TG-02 (RN-035, RN-021); retorna lista de pendências quando inválido | `DRAFT_INVALID` (com `details.issues[]`) | RF-025 |
| API-019 | `draft.discard` | `base_revision` | — | — | RF-028 |
| API-020 | `exercise.create` / `exercise.update` | Campos de `exercises` (personalizado: todos; importado: nome, instruções, dicas — preservando `original_text`) | RN-036, RN-037; unicidade do nome | `NAME_TAKEN` | RF-032, RF-035, RF-036 |
| API-021 | `exercise.set_active` | `active` | RN-021 | — | RF-033 (D4) |
| API-022 | `reassessment.postpone` | `postpone_to` (data futura) | RN-015 | — | RF-085 (D1) |
| API-024 | `measurement.create` / `measurement.delete` | `measured_on`, circunferências e % de gordura (DAD-02 ENT-006) | Faixas RN-018; data não futura | — | RF-088 (D3) |
| API-023 | `review.dismiss` | — | Limpa `review_recommended_since` | — | RF-087 (D4) |

Operações de gestão (API-016..021, 023) exigem conexão no app (RF-093), mas passam pelo mesmo canal para manter um único caminho de escrita.

## 6. Outras chamadas

| ID | Chamada | Descrição |
|---|---|---|
| API-030 | `POST /diagnostics` | Relato de erro técnico sem dados pessoais (`app_version`, `error_code`, `context`, `platform`); limitado a 20 por hora por usuário (ADR-038) |
| API-032 (versão 1.2) | `POST /ai/routine` | Gera rascunho pelo motor com IA (ADR-093), com o usuário do token. Resposta: rascunho, motivos, `source` (`motor+ia` ou `motor`). Limite de RN-063; nunca publica |
| API-033 (versão 1.2) | `POST /ai/summary` | Gera o resumo semanal (RF-115), no máximo um por semana. Sem IA, devolve só os fatos |
| API-031 | `POST /export` | Gera o JSON com todos os dados do aluno (RF-095, D5); entrega direta ao aparelho, sem armazenamento intermediário |
| API-A01..A04 | Autenticação | Login, renovação de sessão, saída, troca de senha — serviço de autenticação (DAD-05); atende RF-001, RF-002, RF-007 |

## 7. Códigos de erro

| Código | Status de operação | Mensagem-base (pt-BR) |
|---|---|---|
| `AUTH_REQUIRED` | (HTTP 401) | Entre novamente para enviar seus registros. |
| `OWNER_MISMATCH` | rejected | Este registro não pertence à conta conectada. |
| `NOT_FOUND` | rejected | Registro não encontrado. |
| `FORBIDDEN_ROLE` | rejected | Esta ação é exclusiva da área de gestão. |
| `TER_DISABLED` | rejected | Acompanhamento de outros alunos não está disponível. |
| `VALIDATION_FAILED` | rejected | (mensagem do campo) |
| `AGE_UNDER_18` | rejected | O app é destinado a maiores de 18 anos. |
| `EDIT_WINDOW_EXPIRED` | rejected | Registros com mais de 60 dias não podem ser alterados. |
| `DATE_OUT_OF_WINDOW` | rejected | Escolha uma data entre hoje e 60 dias atrás. |
| `NOT_DELETABLE` | rejected | Este peso faz parte de uma avaliação. |
| `VERSION_NOT_AVAILABLE` | rejected | Este treino não pertence aos seus programas. |
| `DRAFT_ALREADY_EXISTS` | rejected | Já existe um rascunho em edição. |
| `DRAFT_INVALID` | rejected | O programa tem pendências: (lista). |
| `EXERCISE_INACTIVE` | rejected | Um exercício do programa está desativado. |
| `NAME_TAKEN` | rejected | Já existe um exercício com esse nome. |
| `NOT_AN_ALTERNATIVE` | rejected | Escolha uma das alternativas cadastradas. |
| `REVISION_CONFLICT` | conflict | Este registro foi alterado em outro aparelho. |
| `ENTITY_DELETED` | conflict | Este registro foi excluído em outro aparelho. |
| `DEPENDENCY_PENDING` | deferred | Aguardando o envio de um registro anterior. |
| `RATE_LIMITED` | (HTTP 429) | Muitas tentativas; tentaremos de novo em instantes. |
| `INTERNAL` | (HTTP 5xx) | Não foi possível enviar agora. Tentaremos de novo. |

A taxonomia completa e o tratamento de cada código no app são de SEG-05.

## 8. Matriz operação × papel

| Operações | Aluno (próprio) | Gestor do aluno | Outro usuário |
|---|---|---|---|
| API-002..015, 022, 024 | ✓ | ✓ (na PES é o mesmo usuário; na TER, conforme GATE-TER) | ✗ (`NOT_FOUND`) |
| API-016..021, 023 | ✗ (`FORBIDDEN_ROLE`) | ✓ | ✗ |
| Leituras API-R01..R12 | Próprios dados (sem rascunhos) | Dados dos seus alunos | ✗ |

## Critérios de conclusão

- [x] Todas as telas `ESS` têm leituras e escritas correspondentes.
- [x] Idempotência, conflitos, dependências e erros especificados e alinhados a RN-042..053.
- [x] ADR-050 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 4). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 4). |
| 2026-10-26 | Correção da auditoria final (Etapa 8): API-024 (medidas, RF-088) e leituras API-R11/R12 (D3) acrescentadas; RF de API-016/020/A01..A04 e telas de API-R08/R09 completados. |
| 2026-10-27 | API-013: "Manter ambas" (`possible_duplicate_of: null`) — interpretação da TAR-020 confirmada pelo usuário. |
| 2026-11-04 | Versão 1.2: API-032 e API-033. |
