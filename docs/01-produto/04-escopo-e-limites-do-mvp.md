# PRD-04 — Escopo e Limites do MVP

| Campo | Valor |
|---|---|
| Identificador | PRD-04 |
| Status | **Aprovado** (2026-10-26 — Etapa 1, revisão 3) |
| Dono do assunto | Fronteira do MVP: Lançamento 1 (essencial), desejáveis, futuro e fora do escopo |
| Dependências | PRD-01, PRD-02, PRD-03, PRD-08 |
| Referenciado por | PRD-05, PLN-02, PLN-05 |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo

Delimitar o que o MVP entrega e em que ordem, priorizando que o usuário consiga **usar o app pessoalmente o mais rápido possível** (ADR-002, ADR-019), sem perder a preparação para vários alunos.

## 2. Lançamento 1 — Essencial (`ESS`, uso pessoal)

### 2.1 Resultado esperado

Ao final do Lançamento 1, o usuário consegue: entrar no app instalado no celular → configurar seu perfil → montar seu programa manualmente com exercícios de um catálogo curado → ver o treino recomendado → executar e registrar séries e cargas, **inclusive sem internet** → concluir a sessão → consultar agenda, histórico de sessões e evolução do peso.

### 2.2 Conteúdo (44 RF)

| Módulo | Requisitos `ESS` |
|---|---|
| Conta | RF-001, RF-002, RF-005, RF-007, RF-009 |
| Perfil e avaliação | RF-012, RF-016 |
| Programas (manual, versionado) | RF-020, RF-024, RF-025, RF-027, RF-028 |
| Catálogo (telas e conteúdo curado) | RF-030, RF-031, RF-032, RF-034, RF-038 |
| Área do aluno (inclui recomendação e configuração de descanso) | RF-050 a RF-055 |
| Sessões | RF-060 a RF-063, RF-065 a RF-067, RF-069 |
| Agenda e histórico | RF-070 a RF-072 |
| Evolução | RF-080, RF-081 |
| PWA e offline | RF-090 a RF-093 |
| Sincronização e dados locais | RF-100 a RF-103 |

### 2.3 Verificação de uso ponta a ponta

A tabela completa de cobertura (necessidade → requisitos) está na [ADR-019](../03-arquitetura/06-adrs.md#adr-019--recorte-do-lançamento-1). Resumo: perfil, treinos manuais, catálogo confiável, execução, offline, sincronização, recomendação/agenda, histórico e peso estão cobertos por requisitos `ESS`. Duas lacunas da revisão 2 foram corrigidas na revisão 3: conteúdo do catálogo (RF-038) e configuração do descanso usado pela recomendação (RF-055).

### 2.4 Restrições do Lançamento 1

- Modalidade **PES** apenas; GATE-TER fechado (ADR-018, RN-040).
- Usuário criado por procedimento de inicialização; sem envio de e-mails (ADR-004).
- Offline limitado à execução de treinos previamente carregados (ADR-005).
- Somente pt-BR e unidades métricas (ADR-013); somente adultos (ADR-009).
- Hospedagem gratuita ou de baixo custo (ADR-016).

## 3. Desejáveis (`DES`) — incrementos após o Lançamento 1

Ordem recomendada (a confirmar no plano de entrega, PLN-02):

| Ordem | Incremento | Requisitos | Motivo da posição |
|---|---|---|---|
| D1 | Reavaliação | RF-083, RF-084, RF-085 | Deve existir até 30 dias após o início do uso (ADR-008). |
| D2 | Geração automática de treino | RF-021, RF-022, RF-023, RF-035 | Núcleo diferencial do produto; depende de catálogo com contraindicações. |
| D3 | Evolução ampliada | RF-073, RF-082, RF-088, RF-017 | Gráfico por exercício, metas, medidas, histórico de avaliações. |
| D4 | Gestão e qualidade de dados | RF-015, RF-018, RF-026, RF-033, RF-036, RF-086, RF-087 | Consolidação, versões, alternativas, sinalizações. |
| D5 | Conveniências de sessão e dados | RF-064, RF-068, RF-095 | Substituição na sessão, registro manual, exportação. |

Total: 21 RF.

## 4. Funcionalidades futuras (`FUT`)

### 4.1 Modalidade TER (bloqueada pelo GATE-TER — PRD-08)

RF-003, RF-004, RF-006, RF-010, RF-011, RF-013, RF-014, RF-029, RF-037, RF-040, RF-041, RF-089, RF-096, RF-097, RF-098 (15 RF).

### 4.2 Outras funcionalidades futuras

| ID | Funcionalidade | Observação |
|---|---|---|
| RF-008 | Recuperação de senha por e-mail | Exige provedor de e-mail (ADR-016). |
| RF-019 | Intervalo de reavaliação configurável por aluno | No MVP o intervalo é fixo em 30 dias. |
| RF-094 | Notificações push | No iPhone, somente com o app instalado (ADR-017). |
| FUT-01 | Geração/ajuste assistido por IA | **Antecipado para a versão 1.2** (ADR-093, PLN-06). Sempre como rascunho com revisão humana (RN-009); só IDs do catálogo; respeita restrições. |
| FUT-03 | Progressão automática de carga sugerida | Hoje a prescrição não muda com os registros (RN-026). |
| FUT-05 | Fotos de progresso | Dado de alto risco; exige nova análise de privacidade. |
| FUT-06 | Periodização avançada | — |
| FUT-07 | Integração com wearables/balanças | — |
| FUT-08 | Vídeos demonstrativos | Depende de fonte licenciada. |
| FUT-09 | Relatórios em PDF | — |
| FUT-10 | Offline completo (gestão inclusive) | Exige resolução de conflitos com vários escritores. |
| FUT-11 | Internacionalização | — |
| FUT-12 | Comunicação gestor ↔ aluno no app | Depende da modalidade TER. |

(FUT-02 e FUT-04 da revisão 1 foram incorporados a RF-094 e à modalidade TER, respectivamente; os identificadores não são reutilizados.)

## 4A. Versão 1.2 (planejada, ainda não implementada)

Definida em [PLN-06](../08-planejamento/06-plano-versao-1-2.md): novo design com login na direção "Anilha", fotos nos exercícios, modos Automático e Manual, motor de regras com IA, acompanhamento por IA. Só para o próprio usuário (ADR-096). **Fora dela:** vários alunos e abertura a terceiros, sugestão de carga (FUT-03), notificações (RF-094), conversa livre com a IA, pagamentos.

## 5. Fora do escopo

- Planos alimentares, calorias, dietas ou suplementação.
- Diagnóstico, prescrição terapêutica ou reabilitação clínica.
- Pagamentos, assinaturas, cobrança de alunos.
- Gestão de academia (matrículas, catracas, aulas coletivas).
- Rede social, ranking, feed, compartilhamento público.
- Aplicativos nativos nas lojas — o produto é PWA.
- Atendimento a menores de 18 anos.
- Marketplace de profissionais.

## 6. Critérios de sucesso

### 6.1 Lançamento 1

1. Todos os RF `ESS` passam em seus critérios de aceite (PLN-03).
2. Jornadas JOR-08, JOR-02 (manual), JOR-03, JOR-04 (agenda) e JOR-09 executam de ponta a ponta em produção.
3. O usuário registra treinos reais por 2 semanas consecutivas sem perda de dados (RNF-010), incluindo ao menos uma sessão executada totalmente offline.
4. Testes de isolamento (RNF-014) e de dados locais por usuário (RF-102) passam.
5. Backup e restauração testados (RNF-011).

### 6.2 MVP pessoal completo

Lançamento 1 + incrementos D1 a D5 com critérios de aceite validados.

## 7. Matriz de cobertura: prompt mestre → requisitos

| Seção do prompt | Tema | Requisitos | Observação |
|---|---|---|---|
| 6.1 | Duas áreas, um profissional, vários alunos isolados | RF-005, RF-012, RF-050..054; TER: RF-010..014; RN-001, RN-002, RN-040; ADR-002, ADR-018 | Vários alunos: arquitetura pronta, liberação condicionada |
| 6.2 | Mobile-first | RNF-001..005; `02-experiencia/` | — |
| 6.3 | PWA instalável | RF-090..093, RNF-018, RNF-019, RNF-028 | Android e iPhone (ADR-017) |
| 6.4 | Área do profissional | ESS: RF-012, 016, 020, 024, 025, 027, 028, 030..032, 034; DES: RF-015, 017, 018, 021..023, 026, 033, 035, 036; TER: RF-010, 011, 013, 014, 040, 041 | — |
| 6.5 | Área do aluno | RF-050..054, RF-060..073, RF-080..089 | — |
| 6.6 | Perfil e avaliação inicial | RF-009, RF-012, RF-016, RF-088; campos em TRN-01/DAD-02 | — |
| 6.7 | Geração automática (10 passos) | RF-021..025 (geração `DES`), RN-006..009 | Algoritmo em TRN-02 |
| 6.8 | Catálogo e imagens | RF-030..037, RN-036, RN-037, RNF-027 | Fontes em DAD-06 |
| 6.9 | Agenda e sessões | RF-060..073, RN-011, RN-012, RN-027..029, RN-044, RN-049 | — |
| 6.10 | Evolução e reavaliação 30 dias | RF-080..088, RN-014..017 | Reavaliação = D1 |
| 6.11 | Autenticação e privacidade | RF-001..009, RF-095..102, RN-001, RN-024, RN-031, RN-032, RN-047, RNF-012..017; PRD-08 | — |

## Critérios de conclusão

- [x] Essencial, desejável, futuro e fora do escopo separados.
- [x] Lançamento 1 reduzido ao ciclo pessoal completo (44 RF), verificado de ponta a ponta.
- [x] Todas as seções funcionais do prompt mestre mapeadas.
- [x] ADR-019 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação. |
| 2026-10-26 | Revisão 2: Lançamento 1 essencial (41 RF), incrementos D1–D5, modalidade TER como futuro condicionado ao GATE-TER. |
| 2026-10-26 | Revisão 3: Lançamento 1 com 43 RF (+ RF-038, RF-055) e verificação de uso ponta a ponta. |
| 2026-10-26 | Aprovado pelo usuário (Etapa 1, revisão 3). |
| 2026-10-26 | Etapa 2: RF-103 incluído no Lançamento 1 (UXP-02 aprovada) → 44 RF. |
| 2026-11-04 | Versão 1.2: escopo e antecipação de FUT-01. |
