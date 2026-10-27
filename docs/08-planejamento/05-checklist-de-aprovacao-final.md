# PLN-05 — Checklist de Aprovação Final

| Campo | Valor |
|---|---|
| Identificador | PLN-05 |
| Status | **Aprovado** (2026-10-26 — Etapa 8; Marco autorizado) |
| Etapa | 8 |
| Dono do assunto | Auditoria cruzada da documentação, matriz de rastreabilidade e pedido de aprovação formal da Fase 2 |
| Dependências | Todos os documentos |
| Referenciado por | GOV-02 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Registrar o resultado da auditoria cruzada exigida pela Etapa 8 e reunir o que é necessário para a decisão do **Marco de aprovação formal** (GOV-01 §3): resumo, decisões, limitações, plano e critérios de aceite.

## 2. Checklist da Etapa 8 (prompt mestre, seção 5)

| # | Verificação | Resultado | Evidência |
|---|---|---|---|
| 1 | Todos os requisitos possuem cobertura planejada | ✅ Todo RF `ESS`/`DES` tem tela, operação/leitura, entidade, tarefa e critério (exceções justificadas na matriz) | §4 |
| 2 | As telas correspondem aos requisitos | ✅ 38 telas; nenhum RF `ESS`/`DES` sem tela ou elemento | UX-03 §4.1, UX-05 |
| 3 | As APIs atendem aos fluxos documentados | ✅ após correção: faltavam a gravação de medidas (API-024) e leituras de D1/D3 (API-R09 ampliada, API-R11, API-R12) | DAD-04 |
| 4 | Os modelos de dados suportam as regras de negócio | ✅ RN com referência técnica, exceto RN-019 e RN-034 (exclusivas da modalidade TER, bloqueada) | DAD-01..03, TRN |
| 5 | Autenticação e permissões consistentes | ✅ RN-001/002/033/040 ↔ DAD-03 §7 ↔ DAD-04 §8 ↔ DAD-05 §5 ↔ ADR-028/050 | — |
| 6 | Critérios de aceite verificáveis | ✅ 100 critérios no formato Dado/Quando/Então com tipo de verificação | PLN-03 |
| 7 | Plano respeita as dependências | ✅ nenhuma tarefa depende de tarefa posterior; curadoria em paralelo declarada | PLN-01 §2 |
| 8 | Decisões técnicas registradas | ✅ 55 ADRs, todas aprovadas | ARQ-06 |
| 9 | Sem contradições ou requisitos sem solução | ✅ após correções de §3; um esclarecimento aguarda confirmação (§5) | — |
| 10 | Nenhuma decisão tratada como aprovada sem autorização | ✅ cada aprovação tem a frase do usuário registrada | GOV-02 §6 |
| 11 | Escopo compatível com MVP realista | ✅ Lançamento 1 com 44 RF essenciais em 7 incrementos; 21 desejáveis depois; terceiros bloqueados | PRD-04, PLN-02 |
| — | Links, âncoras, identificadores, status de ADRs, numeração de etapas | ✅ 0 problemas na verificação automática | GOV-02 §8 |

## 3. Correções feitas na auditoria

| Documento | Correção |
|---|---|
| DAD-04 | Acrescentadas API-024 (medidas corporais, RF-088), API-R11 (histórico por exercício, RF-073), API-R12 (medidas); API-R08/R09 com telas de D1/D3; RF completados em API-016, API-020 e autenticação |
| UX-03 | RF-093, RF-102 e RF-103 no inventário de telas |
| UX-05 | Fórmula de duração estimada alinhada a TRN-04 §5 (faltava a transição de 60 s) |
| ARQ-05, ADR-028 | Menções "a definir" atualizadas com o que já fora decidido (fonte do catálogo; 600 mil iterações) |
| DAD-01 | Cobertura das RF de conta explicitada |
| PLN-01 | TAR-030 e TAR-033 referenciam as novas leituras/operações |
| TRN-04 | Esclarecimento do caso-limite ciclo × janela local de 90 dias (confirmado) |

Nenhuma correção altera escopo, decisão aprovada ou regra de negócio; todas estão no histórico de cada documento e em GOV-04.

## 4. Matriz de rastreabilidade (RF `ESS`/`DES`)

Colunas: requisito · prioridade · telas · escritas (API-0nn) e leituras (API-Rnn) · entidades · tarefas · critérios de aceite.

| RF | Prior. | Telas | API | Entidades | Tarefas | CA |
|---|---|---|---|---|---|---|
| RF-001 | ESS | TELA-001 | API-A01..A04 | Autenticação | TAR-008 | CA-001 |
| RF-002 | ESS | TELA-004 | API-A01..A04 | Autenticação | TAR-008, TAR-021 | CA-002 |
| RF-005 | ESS | TELA-004 | API-R01 | ENT-001, ENT-002 | TAR-011 | CA-005 |
| RF-007 | ESS | TELA-004, TELA-005 | API-A01..A04 | Autenticação | TAR-008 | CA-007 |
| RF-009 | ESS | TELA-003 | API-002 | ENT-002, ENT-003 | TAR-011 | CA-009 |
| RF-012 | ESS | TELA-037 | API-003, API-R09 | ENT-002..007 | TAR-016 | CA-012 |
| RF-015 | DES | TELA-037 | API-R09 | ENT-002..007 | TAR-034 | CA-015 |
| RF-016 | ESS | TELA-003, TELA-038 | API-004 | ENT-002..007 | TAR-016 | CA-016 |
| RF-017 | DES | TELA-055 | API-R09 | ENT-002..007 | TAR-033 | CA-017 |
| RF-018 | DES | TELA-010, TELA-037 | API-R02, API-R08, API-R09 | ENT-002..007 | TAR-034 | CA-018 |
| RF-020 | ESS | TELA-031, TELA-032 | API-016, API-R03 | ENT-018..021 | TAR-015 | CA-020 |
| RF-021 | DES | TELA-051 | API-016 | ENT-018..021 | TAR-032 | CA-021 |
| RF-022 | DES | TELA-051 | API-016 | ENT-018..021 | TAR-032 | CA-022 |
| RF-023 | DES | TELA-051 | API-016 | ENT-018..021 | TAR-032 | CA-023 |
| RF-024 | ESS | TELA-031, TELA-032 | API-017, API-R03 | ENT-018..021 | TAR-016 | CA-024 |
| RF-025 | ESS | TELA-030, TELA-031 | API-018, API-R03 | ENT-018..021 | TAR-015 | CA-025 |
| RF-026 | DES | TELA-056 | API-R03 | ENT-018..021 | TAR-034 | CA-026 |
| RF-027 | ESS | TELA-030 | API-016, API-R03 | ENT-018..021 | TAR-015 | CA-027 |
| RF-028 | ESS | TELA-030 | API-019, API-R03 | ENT-018..021 | TAR-015 | CA-028 |
| RF-030 | ESS | TELA-033, TELA-034 | API-R04 | ENT-010..017 | TAR-013 | CA-030 |
| RF-031 | ESS | TELA-014, TELA-034 | API-R02, API-R04, API-R05, API-R07 | ENT-010..017 | TAR-013 | CA-031 |
| RF-032 | ESS | TELA-036 | API-020 | ENT-010..017 | TAR-014 | CA-032 |
| RF-033 | DES | TELA-036 | API-021 | ENT-010..017 | TAR-034 | CA-033 |
| RF-034 | ESS | TELA-014, TELA-033 | API-R02, API-R04, API-R05, API-R07 | ENT-010..017 | TAR-013 | CA-034 |
| RF-035 | DES | TELA-036 | API-020 | ENT-010..017 | TAR-031 | CA-035 |
| RF-036 | DES | TELA-014, TELA-036 | API-020, API-R02, API-R05, API-R07 | ENT-010..017 | TAR-034 | CA-036 |
| RF-038 | ESS | TELA-034 | API-R04 | ENT-010..017 | TAR-012 | CA-038 |
| RF-050 | ESS | TELA-010 | API-R02, API-R08, API-R09 | ENT-008, ENT-009, ENT-019..024 | TAR-018 | CA-050 |
| RF-051 | ESS | TELA-010, TELA-011 | API-R02, API-R08, API-R09 | ENT-008, ENT-009, ENT-019..024 | TAR-018 | CA-051 |
| RF-052 | ESS | TELA-012 | API-R02 | ENT-008, ENT-009, ENT-019..024 | TAR-018 | CA-052 |
| RF-053 | ESS | TELA-013 | API-R02 | ENT-008, ENT-009, ENT-019..024 | TAR-018 | CA-053 |
| RF-054 | ESS | TELA-014 | API-R02, API-R05, API-R07 | ENT-008, ENT-009, ENT-019..024 | TAR-018 | CA-054 |
| RF-055 | ESS | TELA-006 | API-007 | ENT-008, ENT-009, ENT-019..024 | TAR-018 | CA-055 |
| RF-060 | ESS | TELA-013, TELA-015 | API-008, API-R02, API-R07 | ENT-022..024 | TAR-019 | CA-060 |
| RF-061 | ESS | TELA-015 | API-009, API-010, API-R02, API-R07 | ENT-022..024 | TAR-019 | CA-061 |
| RF-062 | ESS | TELA-015 | API-R02, API-R07 | ENT-022..024 | TAR-019 | CA-062 |
| RF-063 | ESS | TELA-015, TELA-016 | API-011, API-R02, API-R07 | ENT-022..024 | TAR-019 | CA-063 |
| RF-064 | DES | TELA-058 | API-011 | ENT-017, ENT-022..024 | TAR-035 | CA-064 |
| RF-065 | ESS | TELA-017 | API-012 | ENT-022..024 | TAR-019 | CA-065 |
| RF-066 | ESS | TELA-015, TELA-016 | API-R02, API-R07 | ENT-022..024 | TAR-019 | CA-066 |
| RF-067 | ESS | TELA-015 | API-014, API-R02, API-R07 | ENT-022..024 | TAR-019 | CA-067 |
| RF-068 | DES | TELA-057 | API-015 | ENT-022..024 | TAR-035 | CA-068 |
| RF-069 | ESS | TELA-019, TELA-020 | API-010, API-013, API-014, API-R06 | ENT-022..024 | TAR-022 | CA-069 |
| RF-070 | ESS | TELA-018 | API-R06 | ENT-022..024 | TAR-022 | CA-070 |
| RF-071 | ESS | TELA-018 | API-R06 | ENT-022..024 | TAR-022 | CA-071 |
| RF-072 | ESS | TELA-019 | API-R06 | ENT-022..024 | TAR-022 | CA-072 |
| RF-073 | DES | TELA-052 | API-R11 | ENT-022..024 | TAR-033 | CA-073 |
| RF-080 | ESS | TELA-021, TELA-022 | API-005, API-006, API-R08 | ENT-004..007 | TAR-023 | CA-080 |
| RF-081 | ESS | TELA-021 | API-R08 | ENT-004..007 | TAR-023 | CA-081 |
| RF-082 | DES | TELA-053 | API-R08 | ENT-004..007 | TAR-033 | CA-082 |
| RF-083 | DES | TELA-050 | API-R09 | ENT-004..007 | TAR-030 | CA-083 |
| RF-084 | DES | TELA-050 | API-004, API-R09 | ENT-004..007 | TAR-030 | CA-084 |
| RF-085 | DES | TELA-050 | API-022, API-R09 | ENT-004..007 | TAR-030 | CA-085 |
| RF-086 | DES | TELA-010, TELA-037 | API-R02, API-R08, API-R09 | ENT-004..007 | TAR-034 | CA-086 |
| RF-087 | DES | TELA-030 | API-023, API-R03 | ENT-004..007 | TAR-034 | CA-087 |
| RF-088 | DES | TELA-054 | API-024, API-R12 | ENT-004..007 | TAR-033 | CA-088 |
| RF-090 | ESS | TELA-002 | — (arquivos estáticos) | ENT-025 | TAR-006 | CA-090 |
| RF-091 | ESS | TELA-015 | API-R02, API-R07 | ENT-025 | TAR-017 | CA-091 |
| RF-092 | ESS | TELA-007 | API-001 | ENT-025 | TAR-017, TAR-020 | CA-092 |
| RF-093 | ESS | TELA-030 | API-R03 | ENT-025 | TAR-017 | CA-093 |
| RF-095 | DES | TELA-059 | API-031 | Todas as do aluno | TAR-035 | CA-095 |
| RF-100 | ESS | TELA-007 | API-001 | ENT-025 | TAR-020 | CA-100 |
| RF-101 | ESS | TELA-004 | API-001 | ENT-025 | TAR-021 | CA-101 |
| RF-102 | ESS | TELA-004 | API-001 | ENT-025 | TAR-021 | CA-102 |
| RF-103 | ESS | TELA-004 | — (somente no aparelho) | ENT-025 | TAR-021 | CA-103 |

Linhas sem algum elo: nenhuma. RNF: cada RNF-0nn tem CA-2nn (PLN-03 §4) e estratégia nos documentos indicados em PRD-06.

## 5. Para a decisão do Marco

### 5.1 Resumo da documentação

| Pasta | Documentos | Situação |
|---|---|---|
| 00 Governança | GOV-00..04 | Vivos/aprovados |
| 01 Produto | PRD-01..08 | Aprovados |
| 02 Experiência | UX-01..08 | Aprovados |
| 03 Arquitetura | ARQ-01..06 | Aprovados (ADRs vivas) |
| 04 Dados e API | DAD-01..07 | Aprovados (com correções da auditoria) |
| 05 Regras de treinamento | TRN-01..05 | Aprovados |
| 06 Segurança e qualidade | SEG-01..05 | Aprovados |
| 07 Implantação | IMP-01..04 | Aprovados |
| 08 Planejamento | PLN-01..04 aprovados; PLN-05 (este) aguardando o Marco | — |

### 5.2 Decisões aprovadas

55 ADRs (001–028, 030–039, 050–053, 060–065, 070–075, 080) — índice em [ARQ-06](../03-arquitetura/06-adrs.md). Principais: uso pessoal primeiro com terceiros bloqueado (018); offline com fila própria e conflitos explícitos (005, 022, 027, 028); recomendação por sequência e descanso configurável (007, 021); Supabase gratuito + Cloudflare Pages com riscos aceitos (032, 033); escrita única por função de sincronização com papel mínimo (034, 050); backup próprio cifrado com chave sob sua custódia (036, 073); gerador determinístico sem sugestão de carga (006, 061–064); plano em 7 incrementos (080).

### 5.3 Limitações conhecidas

| Limitação | Referência |
|---|---|
| Recomendação offline não vê sessões de outro aparelho ainda não enviadas | C-04 |
| No iPhone, o sistema pode remover dados locais antes do envio (mitigado, não eliminado) | C-11, RSK-001 |
| Sessão sem expiração no plano gratuito; aparelho perdido depende do bloqueio de tela e da revogação pelo painel | DAD-05 §3 |
| Projeto gratuito pausa após 1 semana sem uso; sem backup gerenciado; termos com ressalvas | ARQ-02 §7 |
| Limite de login por IP (não por e-mail); senhas comuns verificadas só no app | ADR-051 |
| Parte do catálogo pode começar sem imagem | ADR-052 |
| Valores de treino e mapa de restrições sem revisão profissional — só uso pessoal | ADR-062, ADR-063 |
| Afirmações sobre navegadores são hipóteses a validar em aparelhos reais | UX-08 §5.1 |
| Troca de endereço após o uso real não é transparente | ADR-035 |

### 5.4 Verificações e condições que ocorrem na Fase 2

VH-03 (região), VH-06/09 (cotas), VH-10 (licenças), VH-11 (revogação de sessão), VH-12 (papel `sync_writer`), HSTS; CP-01..CP-05; VP-01..VP-11; verificação de marca/domínio (ADR-023); Q-006 antes do uso real. Se alguma falhar de modo que afete decisão aprovada, a parte afetada para e uma alteração é proposta (GOV-01 §6).

### 5.5 Plano e critérios

Plano: [PLN-01](01-dependencias-e-ordem-de-implementacao.md) (32 tarefas) e [PLN-02](02-plano-de-entrega-por-fases.md) (I-1..I-7, D1..D5). Critérios: [PLN-03](03-criterios-de-aceite.md) (100 CA). Riscos: [PLN-04](04-riscos-e-mitigacoes.md).

### 5.6 Itens que aguardam sua decisão para o Marco

1. Confirmar o esclarecimento de TRN-04 §4 (ciclo × janela de 90 dias).
2. Aprovar esta auditoria (PLN-05) e a Etapa 8.
3. **Autorizar explicitamente o início da Fase 2** (Etapa 9 — Implementação incremental, começando por TAR-001).

## Critérios de conclusão

- [x] Checklist da Etapa 8 executado; inconsistências corrigidas e registradas.
- [x] Matriz de rastreabilidade completa.
- [x] Esclarecimento de TRN-04 §4 confirmado.
- [x] Aprovação do usuário e autorização do Marco.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 8 — Auditoria final). |
| 2026-10-26 | Aprovado pelo usuário; Marco de aprovação formal autorizado. |
