# SEG-05 — Tratamento de Erros

| Campo | Valor |
|---|---|
| Identificador | SEG-05 |
| Status | **Aprovado** (2026-10-26 — Etapa 6) |
| Etapa | 6 |
| Dono do assunto | Taxonomia de erros, comportamento do app por código, mensagens, recuperação e relato |
| Dependências | DAD-04 §7, UX-01 §4, UX-02 §8.3, UX-08 §6–9, RN-051, ADR-022 |
| Referenciado por | SEG-03, SEG-04, PLN-01 |
| Última atualização | 2026-10-26 |

## 1. Princípios

1. Toda mensagem diz **o que aconteceu**, **se os dados estão seguros** e **o que fazer** (UX-01 P9).
2. Nenhum caminho de erro descarta dados registrados (RN-051).
3. Erros de rede nunca são apresentados como recusa (RN-051).
4. Cada erro tem código estável; o texto vem do módulo de mensagens (ARQ-04 §6).

## 2. Taxonomia

| Categoria | Códigos | Origem |
|---|---|---|
| Validação | `VALIDATION_FAILED`, `AGE_UNDER_18`, `DATE_OUT_OF_WINDOW`, `EDIT_WINDOW_EXPIRED`, `DRAFT_INVALID`, `EXERCISE_INACTIVE`, `NAME_TAKEN`, `NOT_AN_ALTERNATIVE`, `NOT_DELETABLE`, `VERSION_NOT_AVAILABLE`, `DRAFT_ALREADY_EXISTS` | Servidor (DAD-04 §7) e app |
| Acesso | `AUTH_REQUIRED`, `OWNER_MISMATCH`, `NOT_FOUND`, `FORBIDDEN_ROLE`, `TER_DISABLED` | Servidor |
| Sincronização | `REVISION_CONFLICT`, `ENTITY_DELETED`, `DEPENDENCY_PENDING` | Servidor |
| Transporte | `NETWORK_UNAVAILABLE`, `TIMEOUT`, `RATE_LIMITED`, `INTERNAL` | App/servidor |
| Aparelho | `LOCAL_WRITE_FAILED`, `LOCAL_QUOTA_EXCEEDED`, `LOCAL_MIGRATION_FAILED`, `DECRYPT_FAILED`, `SW_UPDATE_FAILED` | App |
| Requisito de conexão | `OFFLINE_REQUIRED` | App (RF-093) |
| Inesperado | `UNEXPECTED` | App |

## 3. Comportamento por código

| Código | Estado (RN-051) | Onde aparece | Recuperação |
|---|---|---|---|
| `VALIDATION_FAILED` e demais de validação | Recusado (se veio do servidor) ou bloqueio no formulário (se detectado no app) | Junto ao campo; na tela de sincronização | Corrigir e reenviar; descartar só com confirmação |
| `AUTH_REQUIRED` | Aguardando envio | `SyncIndicator`: "Entre novamente para enviar" | Login do mesmo usuário (RN-047) |
| `OWNER_MISMATCH` | Recusado | Sincronização | Não reenviável; registro preservado; relato técnico automático |
| `NOT_FOUND`, `FORBIDDEN_ROLE`, `TER_DISABLED` | Recusado | Sincronização / ação | Mensagem; registro preservado |
| `REVISION_CONFLICT`, `ENTITY_DELETED` | Conflito | Sincronização (`ConflictCompare`) | Escolha do usuário (ADR-022) |
| `DEPENDENCY_PENDING` | Aguardando envio | — | Automática após a operação anterior |
| `NETWORK_UNAVAILABLE`, `TIMEOUT`, `INTERNAL` | Nova tentativa automática | `SyncIndicator` | Intervalos de UX-08 §6.3 |
| `RATE_LIMITED` | Nova tentativa automática | — | Respeitar intervalo indicado |
| `LOCAL_WRITE_FAILED` | — | `Banner` de perigo na tela atual | Tentar de novo; orientar a não fechar o app (UX-08 §7) |
| `LOCAL_QUOTA_EXCEEDED` | — | `Banner` + tela de sincronização | Liberar caches descartáveis (imagens não essenciais, histórico além da janela); nunca a fila |
| `LOCAL_MIGRATION_FAILED` | — | `Banner` | Manter dados anteriores; relato técnico; próxima versão corrige |
| `DECRYPT_FAILED` | — | Diálogo no login | Pedir senha anterior; manter cifrado; descartar só explicitamente (ADR-028) |
| `SW_UPDATE_FAILED` | — | Silencioso; nova tentativa na próxima abertura | — |
| `OFFLINE_REQUIRED` | — | `OfflineNotice` junto à ação | Conectar-se |
| `UNEXPECTED` | — | `ErrorState` da tela com "Tentar de novo" | Relato técnico; dados locais preservados |

## 4. Barreiras de erro na interface

- Cada área (Meu treino, Execução, Gestão) tem uma barreira que captura falhas inesperadas sem derrubar o app inteiro.
- A Execução tem barreira própria: em falha inesperada, mantém a sessão salva e oferece "Recarregar a tela" (que retoma no mesmo ponto — RF-066).

## 5. Relato técnico

Erros das categorias Aparelho, Inesperado e `OWNER_MISMATCH` geram relato (API-030) com código e contexto lógico, sem dados pessoais, com limite de 20 por hora (SEG-04).

## Critérios de conclusão

- [x] Todos os códigos de DAD-04 e os do aparelho com estado, exibição e recuperação.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 6). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 6). |
