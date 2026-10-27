# PRD-06 — Requisitos Não Funcionais

| Campo | Valor |
|---|---|
| Identificador | PRD-06 |
| Status | **Aprovado** (2026-10-26 — Etapa 1, revisão 3) |
| Dono do assunto | Requisitos de qualidade (RNF-###) e suas metas mensuráveis |
| Dependências | PRD-01, PRD-02 |
| Referenciado por | UX-07, UX-08, ARQ-01, ARQ-02, SEG-*, IMP-*, PLN-03 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Definir os atributos de qualidade do sistema com metas verificáveis. As estratégias para atingi-los ficam nos documentos de arquitetura, segurança e implantação indicados em cada item.

## 2. Requisitos

### Usabilidade e experiência

| ID | Requisito | Meta / verificação | Detalhado em |
|---|---|---|---|
| RNF-001 | Interface mobile-first, funcional de 360 px a 1440 px de largura, sem rolagem horizontal. | Testes visuais nas larguras 360, 390, 768, 1280. | UX-07 |
| RNF-002 | Legibilidade em ambiente de academia: texto de corpo ≥ 16 px, valores de carga/repetições na execução ≥ 24 px, alvos de toque ≥ 44×44 px (48 px nos controles de registro de série). | Revisão de componentes; auditoria Lighthouse. | UX-06, UX-07 |
| RNF-003 | Acessibilidade conforme WCAG 2.1 nível AA (contraste, foco visível, rótulos, navegação por teclado no desktop, suporte a leitor de tela nas telas principais). | axe-core sem violações críticas/sérias; checagem manual. | UX-07 |
| RNF-004 | Idioma português brasileiro; formatos de data `dd/mm/aaaa`, decimal com vírgula; unidades métricas (kg, cm). | Revisão de telas. | ADR-013 |
| RNF-005 | Feedback explícito para toda ação: carregando, sucesso, erro (com orientação de recuperação) e estados vazios. | Toda tela especificada com os 4 estados. | UX-05, SEG-05 |

### Desempenho

| ID | Requisito | Meta / verificação | Detalhado em |
|---|---|---|---|
| RNF-006 | Carregamento inicial em rede 4G simulada: LCP ≤ 2,5 s; abertura do app instalado com cache: conteúdo útil ≤ 1,5 s. | Lighthouse (perfil mobile). | SEG-04 |
| RNF-007 | Registro de série reflete na interface em ≤ 100 ms, independentemente da rede (atualização local primeiro). | Teste automatizado com rede desligada/lenta. | ARQ-01, SEG-04 |
| RNF-008 | Respostas de API de leitura comuns ≤ 500 ms (p95) com até 50 alunos e 2 anos de histórico. | Teste de carga leve com dados sintéticos. | SEG-04 |

### Confiabilidade e resiliência

| ID | Requisito | Meta / verificação | Detalhado em |
|---|---|---|---|
| RNF-009 | Disponibilidade alvo de 99% mensal (melhor esforço; sem plantão). | Monitor de disponibilidade externo. | IMP-04 |
| RNF-010 | Nenhuma série registrada pode ser perdida por queda de conexão, recarregamento da página, fechamento do app, expiração da sessão de login ou logout. Sincronização idempotente (reenvio não duplica); conflitos preservam ambas as versões até decisão do usuário. | Testes E2E: registrar offline, fechar, reabrir, reconectar → dados no servidor sem duplicatas; simular conflito e duplicidade → nenhuma versão perdida. | ADR-005, ADR-022, RN-042..049, UX-08, SEG-05 |
| RNF-011 | Backup automático diário do banco, com retenção ≥ 30 dias. RPO ≤ 24 h; RTO ≤ 8 h. Restauração testada antes do go-live e trimestralmente. | Registro do teste de restauração. | IMP-03 |

### Segurança e privacidade

| ID | Requisito | Meta / verificação | Detalhado em |
|---|---|---|---|
| RNF-012 | Todo tráfego via HTTPS (HSTS em produção). | Verificação de cabeçalhos. | SEG-01 |
| RNF-013 | Senhas armazenadas com algoritmo de hash adaptativo e salt (Argon2id ou bcrypt). Nunca registradas em logs. | Revisão de código; teste. | SEG-01, DAD-05 |
| RNF-014 | Autorização verificada no servidor em toda operação (inclusive operações recebidas na sincronização); isolamento de dados por aluno coberto por testes automatizados que tentam acesso cruzado em todos os endpoints; operações TER recusadas enquanto o GATE-TER estiver fechado; dados locais separados por usuário no dispositivo. | 100% dos endpoints com teste de acesso cruzado; testes de troca de usuário no mesmo dispositivo. | DAD-05, SEG-03, RN-040, RN-047 |
| RNF-015 | Proteção de dados pessoais: coleta mínima; proteção reforçada para dados tratados como sensíveis (classificação preliminar em PRD-08 §6); exportação dos dados. Bases legais, documentos e direitos dos titulares para a modalidade TER definidos somente após a verificação jurídica do GATE-TER, sem afirmações jurídicas não verificadas na interface. | Checklist em SEG-02; itens REG-* do PRD-08. | PRD-08, SEG-02 |
| RNF-016 | Proteções contra OWASP Top 10 (injeção, XSS, CSRF, controle de acesso, configuração). Cabeçalhos de segurança (CSP, X-Content-Type-Options, Referrer-Policy). | Checklist e varredura automatizada. | SEG-01 |
| RNF-017 | Dados pessoais nunca em URLs/query strings nem em logs de aplicação. | Revisão de logs. | SEG-01, SEG-04 |

### Compatibilidade e PWA

| ID | Requisito | Meta / verificação | Detalhado em |
|---|---|---|---|
| RNF-018 | Navegadores suportados: Chrome Android (2 últimas versões principais), Safari iOS ≥ 16.4 (navegador e app na tela inicial), Chrome/Edge/Firefox/Safari desktop (2 últimas versões). Android e iPhone são plataformas prioritárias equivalentes. | Matriz de testes manuais. | UX-07, ADR-017 |
| RNF-019 | PWA instalável: manifest válido, service worker, HTTPS, ícones (incluindo maskable e apple-touch-icon). | Critérios de instalabilidade do Lighthouse; instalação manual testada em iPhone e Android. | UX-08 |
| RNF-028 | Comportamento correto diante das limitações de cada plataforma (ADR-017): sem depender de sincronização em segundo plano, de prompt de instalação no iPhone, de vibração ou de execução contínua em segundo plano; cronômetro baseado em horário de término. | Testes manuais em iPhone (Safari e app na tela inicial) e Android (Chrome). | ADR-017, UX-08 |

### Manutenibilidade e operação

| ID | Requisito | Meta / verificação | Detalhado em |
|---|---|---|---|
| RNF-020 | Código em linguagem tipada com verificação estrita; lint e formatação automáticos. | CI bloqueia em erro. | ARQ-04 |
| RNF-021 | Cobertura de testes automatizados: regras de negócio e motor de geração ≥ 90% de linhas; API ≥ 80%; fluxos E2E críticos (JOR-03, JOR-02, JOR-01) cobertos. | Relatório de cobertura no CI. | SEG-03 |
| RNF-022 | Migrações de banco versionadas, reversíveis quando possível e aplicadas automaticamente no deploy. | Pipeline. | DAD-07 |
| RNF-023 | Custo operacional gratuito ou de baixo custo; nenhum serviço pago obrigatório no fluxo principal sem justificativa e aprovação; caminho de evolução documentado (ADR-016). | Comparativo de custos na Etapa 3; fatura mensal. | ADR-016, ARQ-02, IMP-02 |
| RNF-024 | Escala: Lançamento 1 com 1 usuário (PES); arquitetura apta a 1 gestor e até 50 alunos (TER) sem mudança de arquitetura; modelo preparado para vários gestores sem migração destrutiva. | Revisão de modelo; teste de carga leve. | ADR-002, DAD-01 |
| RNF-025 | Logs estruturados de erros do servidor e captura de erros do cliente, sem dados pessoais. | Verificação em ambiente de homologação. | SEG-04 |
| RNF-026 | Rastreabilidade: cada tarefa de implementação referencia RF/RNF/RN; documentação mantida em sincronia com o código. | Auditoria por fase. | GOV-01, PLN-01 |
| RNF-027 | Conteúdo de terceiros (imagens, dados de exercícios) com licença compatível e atribuição registrada. | Inventário de licenças em DAD-06. | DAD-06 |

## Critérios de conclusão

- [x] Cada RNF possui meta mensurável e documento responsável pela estratégia.
- [x] Diretriz de custo (ADR-016) refletida em RNF-023.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação. |
| 2026-10-26 | Revisão 2: RNF-010, 014, 015, 018, 019, 023, 024 revisados; RNF-028 criado (limitações de plataforma). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 1, revisão 3). |
