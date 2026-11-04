# GOV-00 — Índice da Documentação

| Campo | Valor |
|---|---|
| Identificador | GOV-00 |
| Status | Vivo |
| Dono do assunto | Lista oficial de documentos, responsabilidades, dependências e status |
| Última atualização | 2026-10-26 (Marco autorizado — Fase 2 iniciada) |

Status: ver definições em [GOV-01 §4](01-metodologia-cascata.md#4-status-de-documentos). "Dependências" indica os documentos que precisam estar concluídos antes e que devem ser revisados quando este mudar.

## 00 — Governança

| ID | Documento | Responsabilidade (fonte de verdade) | Dependências | Status |
|---|---|---|---|---|
| — | [README](../README.md) | Ponto de entrada e convenções | — | **Aprovado** |
| GOV-00 | [Índice](00-indice-documentacao.md) | Lista de documentos e status | — | Vivo |
| GOV-01 | [Metodologia cascata](01-metodologia-cascata.md) | Processo, sequência oficial de etapas, critérios, aprovações | ADR-001 | **Aprovado** |
| GOV-02 | [Controle de progresso](02-controle-de-progresso.md) | Andamento, decisões abertas, perguntas, aprovações | — | Vivo |
| GOV-03 | [Glossário](03-glossario.md) | Vocabulário do domínio | PRD-05, PRD-07, PRD-08 | **Aprovado** |
| GOV-04 | [Histórico de alterações](04-historico-de-alteracoes.md) | Registro cronológico de mudanças | — | Vivo |

## 01 — Produto (Etapa 1)

| ID | Documento | Responsabilidade | Dependências | Status |
|---|---|---|---|---|
| PRD-01 | [Visão do produto](../01-produto/01-visao-do-produto.md) | Propósito, valor, objetivos, princípios | GOV-03 | **Aprovado** |
| PRD-02 | [Problema e público-alvo](../01-produto/02-problema-e-publico-alvo.md) | Problemas, público, contexto de uso | PRD-01 | **Aprovado** |
| PRD-03 | [Personas e jornadas](../01-produto/03-personas-e-jornadas.md) | Personas PER-###, jornadas JOR-### | PRD-01, PRD-02 | **Aprovado** |
| PRD-04 | [Escopo e limites do MVP](../01-produto/04-escopo-e-limites-do-mvp.md) | Fronteira MVP / DES / FUT / fora | PRD-01..03 | **Aprovado** |
| PRD-05 | [Requisitos funcionais](../01-produto/05-requisitos-funcionais.md) | RF-### | PRD-01..04, PRD-07 | **Aprovado** |
| PRD-06 | [Requisitos não funcionais](../01-produto/06-requisitos-nao-funcionais.md) | RNF-### | PRD-01, PRD-02 | **Aprovado** |
| PRD-07 | [Regras de negócio](../01-produto/07-regras-de-negocio.md) | RN-### e parâmetros | PRD-05, ADRs | **Aprovado** |
| PRD-08 | [Modalidades de uso e limites profissionais](../01-produto/08-modalidades-de-uso-e-limites-profissionais.md) | Modalidades PES/TER, GATE-TER, itens regulatórios REG-###, classificação preliminar de dados | PRD-01, PRD-04, PRD-05, ADR-018 | **Aprovado** |
| PRD-09 | [Proposta: gestor automático](../01-produto/09-proposta-gestor-automatico.md) | Motor com IA e uso por outras pessoas | PRD-08, TRN-02 | Proposta (não aprovada) |

## 02 — Experiência (Etapa 2)

| ID | Documento | Responsabilidade | Dependências | Status |
|---|---|---|---|---|
| UX-01 | [Princípios de UX/UI](../02-experiencia/01-principios-de-ux-ui.md) | Princípios e heurísticas | PRD-01, PRD-02, PRD-06 | **Aprovado** |
| UX-02 | [Identidade visual](../02-experiencia/02-identidade-visual.md) | Marca, cores, tipografia, tokens | UX-01, Q-005 | **Aprovado** |
| UX-03 | [Arquitetura de informação](../02-experiencia/03-arquitetura-de-informacao.md) | Mapa de telas e navegação | PRD-03, PRD-05 | **Aprovado** |
| UX-04 | [Fluxos de navegação](../02-experiencia/04-fluxos-de-navegacao.md) | Fluxos das jornadas | PRD-03, UX-03 | **Aprovado** |
| UX-05 | [Especificação das telas](../02-experiencia/05-especificacao-das-telas.md) | TELA-### | PRD-05, PRD-07, UX-03, UX-04 | **Aprovado** |
| UX-06 | [Componentes e padrões visuais](../02-experiencia/06-componentes-e-padroes-visuais.md) | Componentes | UX-02, UX-05 | **Aprovado** |
| UX-07 | [Responsividade e acessibilidade](../02-experiencia/07-responsividade-e-acessibilidade.md) | Breakpoints, WCAG | PRD-06 | **Aprovado** |
| UX-08 | [Especificação PWA](../02-experiencia/08-especificacao-pwa.md) | Manifest, SW, cache, offline, limitações Android/iPhone | ADR-005, ADR-017, ADR-022, PRD-05, PRD-06 | **Aprovado** |

## 03 — Arquitetura (Etapa 3)

| ID | Documento | Responsabilidade | Dependências | Status |
|---|---|---|---|---|
| ARQ-01 | [Arquitetura geral](../03-arquitetura/01-arquitetura-geral.md) | Componentes e camadas | PRD-05, PRD-06, UX-08 | **Aprovado** |
| ARQ-02 | [Stack tecnológica](../03-arquitetura/02-stack-tecnologica.md) | Escolha de tecnologias | ARQ-01, ADR-016, Q-006 | **Aprovado** |
| ARQ-03 | [Organização do repositório](../03-arquitetura/03-organizacao-do-repositorio.md) | Pastas, git | ARQ-02 | **Aprovado** |
| ARQ-04 | [Padrões de código](../03-arquitetura/04-padroes-de-codigo.md) | Convenções | ARQ-02, GOV-03 | **Aprovado** |
| ARQ-05 | [Integrações externas](../03-arquitetura/05-integracoes-externas.md) | Serviços externos | ARQ-02, DAD-06 | **Aprovado** |
| ARQ-06 | [ADRs](../03-arquitetura/06-adrs.md) | Todas as decisões | — | Vivo (55 ADRs aprovadas: 001..039, 050..053, 060..065, 070..075, 080) |

## 04 — Dados e API (Etapa 4)

| ID | Documento | Responsabilidade | Dependências | Status |
|---|---|---|---|---|
| DAD-01 | [Modelagem de dados](../04-dados-e-api/01-modelagem-de-dados.md) | ENT-###, ER | PRD-05, PRD-07, ARQ-02 | **Aprovado** |
| DAD-02 | [Dicionário de dados](../04-dados-e-api/02-dicionario-de-dados.md) | Campos e tipos | DAD-01, TRN-01 | **Aprovado** |
| DAD-03 | [Relacionamentos e integridade](../04-dados-e-api/03-relacionamentos-e-integridade.md) | Chaves, restrições, índices | DAD-01, DAD-02 | **Aprovado** |
| DAD-04 | [Contratos de API](../04-dados-e-api/04-contratos-de-api.md) | API-### | DAD-01..03, UX-05, DAD-05 | **Aprovado** |
| DAD-05 | [Autenticação e autorização](../04-dados-e-api/05-autenticacao-e-autorizacao.md) | Sessão, papéis, permissões | ADR-003, ADR-004 | **Aprovado** |
| DAD-06 | [Catálogo de exercícios e fontes](../04-dados-e-api/06-catalogo-de-exercicios-e-fontes.md) | Fontes, licenças, importação | ADR-012 | **Aprovado** |
| DAD-07 | [Estratégia de migrações](../04-dados-e-api/07-estrategia-de-migracoes.md) | Migrações e seeds | DAD-01, ARQ-02 | **Aprovado** |

## 05 — Regras de treinamento (Etapa 5)

| ID | Documento | Responsabilidade | Dependências | Status |
|---|---|---|---|---|
| TRN-01 | [Perfil e avaliação do aluno](../05-regras-de-treinamento/01-perfil-e-avaliacao-do-aluno.md) | Campos e enumerações do perfil | PRD-07, ADR-010, ADR-011 | **Aprovado** |
| TRN-02 | [Motor de geração de treinos](../05-regras-de-treinamento/02-motor-de-geracao-de-treinos.md) | Algoritmo de geração | TRN-01, TRN-03, ADR-006 | **Aprovado** |
| TRN-03 | [Catálogo e seleção de exercícios](../05-regras-de-treinamento/03-catalogo-e-selecao-de-exercicios.md) | Taxonomia, contraindicações | DAD-06, TRN-01 | **Aprovado** |
| TRN-04 | [Execução e registro de sessões](../05-regras-de-treinamento/04-execucao-e-registro-de-sessoes.md) | Ciclo da sessão, presença | PRD-07 | **Aprovado** |
| TRN-05 | [Evolução e reavaliações](../05-regras-de-treinamento/05-evolucao-e-reavaliacoes.md) | Indicadores, reavaliação | PRD-07 | **Aprovado** |

## 06 — Segurança e qualidade (Etapa 6)

| ID | Documento | Responsabilidade | Dependências | Status |
|---|---|---|---|---|
| SEG-01 | [Segurança e privacidade](../06-seguranca-e-qualidade/01-seguranca-e-privacidade.md) | Ameaças e controles | DAD-05, PRD-06 | **Aprovado** |
| SEG-02 | [LGPD e retenção](../06-seguranca-e-qualidade/02-lgpd-e-retencao-de-dados.md) | Bases legais, consentimento, retenção | PRD-07, PRD-08 | **Aprovado** |
| SEG-03 | [Estratégia de testes](../06-seguranca-e-qualidade/03-estrategia-de-testes.md) | Testes e cobertura | PRD-06, PLN-03 | **Aprovado** |
| SEG-04 | [Desempenho e observabilidade](../06-seguranca-e-qualidade/04-desempenho-e-observabilidade.md) | Metas, logs, alertas | PRD-06 | **Aprovado** |
| SEG-05 | [Tratamento de erros](../06-seguranca-e-qualidade/05-tratamento-de-erros.md) | Erros e recuperação | DAD-04, UX-05 | **Aprovado** |

## 07 — Implantação (Etapa 6)

| ID | Documento | Responsabilidade | Dependências | Status |
|---|---|---|---|---|
| IMP-01 | [Ambientes e configuração](../07-implantacao/01-ambientes-e-configuracao.md) | Ambientes, variáveis, bootstrap | ARQ-02 | **Aprovado** |
| IMP-02 | [Estratégia de deploy](../07-implantacao/02-estrategia-de-deploy.md) | CI/CD, domínio | IMP-01, Q-006 | **Aprovado** |
| IMP-03 | [Backup e recuperação](../07-implantacao/03-backup-e-recuperacao.md) | Backups, RPO/RTO | PRD-06 | **Aprovado** |
| IMP-04 | [Operação e manutenção](../07-implantacao/04-operacao-e-manutencao.md) | Rotinas operacionais | IMP-01..03 | **Aprovado** |

## 08 — Planejamento (Etapas 7 e 8)

| ID | Documento | Responsabilidade | Dependências | Status |
|---|---|---|---|---|
| PLN-01 | [Dependências e ordem de implementação](../08-planejamento/01-dependencias-e-ordem-de-implementacao.md) | TAR-### | Etapas 1–6 | **Aprovado** |
| PLN-02 | [Plano de entrega por fases](../08-planejamento/02-plano-de-entrega-por-fases.md) | Incrementos | PLN-01, PRD-04 | **Aprovado** |
| PLN-03 | [Critérios de aceite](../08-planejamento/03-criterios-de-aceite.md) | CA-### | PRD-05..07, UX-05 | **Aprovado** |
| PLN-04 | [Riscos e mitigações](../08-planejamento/04-riscos-e-mitigacoes.md) | RSK-### | Todos | **Aprovado** |
| PLN-05 | [Checklist de aprovação final](../08-planejamento/05-checklist-de-aprovacao-final.md) | Auditoria e marco | Todos | **Aprovado** |
| PLN-06 | [Plano da versão 1.2](../08-planejamento/06-plano-versao-1-2.md) | Design, imagens, IA, modos e vários alunos | PRD-09, TRN-02 | Proposta (não aprovada) |

## Ordem de dependência entre pastas

```mermaid
flowchart LR
    GOV[00 Governança] --> PRD[01 Produto]
    PRD --> UX[02 Experiência]
    UX --> ARQ[03 Arquitetura]
    ARQ --> DAD[04 Dados e API]
    DAD --> TRN[05 Regras de treinamento]
    TRN --> SEG[06 Segurança e qualidade]
    SEG --> IMP[07 Implantação]
    IMP --> PLN[08 Planejamento]
```
