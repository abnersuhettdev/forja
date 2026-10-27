# SEG-03 — Estratégia de Testes

| Campo | Valor |
|---|---|
| Identificador | SEG-03 |
| Status | **Aprovado** (2026-10-26 — Etapa 6) |
| Etapa | 6 |
| Dono do assunto | Níveis de teste, ferramentas, catálogos de casos, metas de cobertura, testes em aparelhos reais e dados de teste |
| Dependências | RNF-021, UX-07 §5, UX-08 §5.1 e §10, DAD-03, DAD-04, TRN-02..05, SEG-01 |
| Referenciado por | PLN-01, PLN-03, PLN-05 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Definir como cada requisito e regra será verificado, o que roda automaticamente no CI e o que exige verificação manual em aparelhos reais.

## 2. Níveis e ferramentas

| Nível | Escopo | Ferramenta | Onde roda |
|---|---|---|---|
| Unidade | Pacote de domínio (regras puras), componentes de interface isolados | Vitest | CI em todo PR |
| Integração do banco | Restrições, gatilhos (TG-01..09), políticas por linha, papéis | Testes SQL contra banco local do provedor | CI em todo PR |
| Contrato da sincronização | API-001..031: idempotência, conflitos, erros, dono | Vitest + banco local | CI em todo PR |
| Ponta a ponta | Jornadas e cenários offline em navegador | Playwright (Chromium e WebKit; emulação de modo offline) | CI em PR para `main` |
| Acessibilidade | Telas `ESS` | axe-core via Playwright | CI |
| Desempenho | Metas de SEG-04 | Lighthouse (perfil móvel) | CI semanal e antes de cada lançamento |
| Aparelhos reais | VP-01..VP-11 e cenários T-PWA que dependem do sistema | Manual (Android/Chrome; iPhone/Safari e app na Tela de Início) | Antes de cada lançamento |
| Restauração de backup | IMP-03 | Manual com roteiro | Antes do uso real e trimestral |

## 3. Metas de cobertura (RNF-021)

| Alvo | Meta | Bloqueia o CI |
|---|---|---|
| Pacote de domínio | ≥ 90% de linhas | Sim |
| Função de sincronização | ≥ 80% de linhas | Sim |
| Políticas por linha | 100% das tabelas com teste de acesso cruzado | Sim |
| Jornadas `ESS` | JOR-08, 02 (manual), 03, 04 (agenda), 09 automatizadas | Sim |

## 4. Catálogos de casos

| Catálogo | Origem | Nível |
|---|---|---|
| CT-GER-01..08 (gerador) | TRN-02 §6 | Unidade |
| CT-REC-01..07, CT-PRE-01 (recomendação, pré-preenchimento) | TRN-04 §7 | Unidade |
| CT-EVO-01..03, CT-REA-01..03, CT-DES-01 (evolução) | TRN-05 §6 | Unidade |
| Faixas e validações (RN-018, RN-035, RN-031 no app) | PRD-07 | Unidade |
| Classificação de resultados (RN-051) | UX-08 §6.3 | Unidade |
| Gatilhos TG-01..TG-09 | DAD-03 §5 | Integração do banco |
| Acesso cruzado: para **cada** tabela e **cada** operação, um usuário B tenta ler/escrever dados de A → nada retornado / `NOT_FOUND` | DAD-03 §7, RNF-014 | Integração + contrato |
| Escrita direta pelo papel `authenticated` recusada | ADR-050 | Integração do banco |
| Idempotência: reenviar a mesma operação 3 vezes → um registro | RN-042 | Contrato |
| Conflito: editar com revisão antiga → `conflict` com `server_record` | RN-046 | Contrato |
| Dono divergente → `OWNER_MISMATCH` + evento de auditoria | ADR-028 L4 | Contrato |
| GATE-TER: criar segundo aluno → recusado | RN-040 | Integração |
| T-PWA-01..17 | UX-08 §10 | E2E (automatizável) ou manual (instalação, segundo plano, armazenamento real) |
| Migração do banco local com fila e sessão em andamento | DAD-07 §4 | E2E |
| Cabeçalhos de segurança e `no-store` | SEG-01 §5 | E2E |
| Critérios de aceite CA-### | PLN-03 (Etapa 7) | Conforme o critério |

## 5. Verificação em aparelhos reais (antes de cada lançamento)

Roteiro com: instalação, execução completa em modo avião, fechamento forçado no meio da sessão, cronômetro após minimizar 2 min, conflito e duplicidade com dois aparelhos, saída com pendências, troca de usuário, atualização de versão com sessão em andamento, e os pontos VP-01..VP-11 — registrando resultado em UX-08 §5.1.

## 6. Dados de teste

- Somente dados **fictícios**, gerados por fábricas de teste em `fixtures/`, marcados como fictícios (RN-037).
- Testes nunca apontam para o projeto de produção; o CI usa banco local efêmero.
- O catálogo real (seed) é usado nos testes do gerador para detectar regressões de curadoria.

## Critérios de conclusão

- [x] Níveis, ferramentas, metas e catálogos definidos e ligados aos documentos de origem.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 6). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 6). |
