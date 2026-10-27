# SEG-04 — Desempenho e Observabilidade

| Campo | Valor |
|---|---|
| Identificador | SEG-04 |
| Status | **Aprovado** (2026-10-26 — Etapa 6) |
| Etapa | 6 |
| Dono do assunto | Orçamento de desempenho, técnicas para atingi-lo, registros, relatos de erro, verificação de disponibilidade e alertas |
| Dependências | RNF-006..009, RNF-025, ADR-038, DAD-04 (API-030), ARQ-02 §7 |
| Referenciado por | SEG-03, IMP-04 |
| Última atualização | 2026-10-26 |

## 1. Orçamento de desempenho

| Métrica | Meta | Origem |
|---|---|---|
| LCP (4G simulado, perfil móvel) | ≤ 2,5 s | RNF-006 |
| Abertura do app instalado com cache até conteúdo útil | ≤ 1,5 s | RNF-006 |
| Confirmação visual de série registrada | ≤ 100 ms | RNF-007 |
| Leituras comuns (p95) | ≤ 500 ms | RNF-008 |
| JavaScript inicial (comprimido) | ≤ 200 KB | Este documento |
| Imagem de exercício | ≤ 80 KB (WebP), miniatura ≤ 10 KB | Este documento |

## 2. Técnicas

- Divisão de código por área (Gestão carregada sob demanda); a execução não depende de módulos de Gestão.
- Registro de série grava localmente e atualiza a tela antes de qualquer rede (RN-043).
- Imagens em tamanhos fixos gerados no build, com miniaturas; pré-download das imagens do programa ativo (UX-08 §6.1).
- Índices do banco para as consultas das telas (DAD-03 §6); leituras por período.
- Fontes próprias com subconjunto de caracteres latinos.

## 3. Observabilidade

| Fonte | Conteúdo | Retenção | Dados pessoais |
|---|---|---|---|
| Relatos de erro do app (API-030) | Versão do app, código de erro (SEG-05), rota lógica, plataforma, momento | 30 dias | Nunca (sem identificadores de registros, sem textos digitados) |
| Eventos de auditoria | `OWNER_MISMATCH`, exclusões definitivas, falhas repetidas de autorização | 2 anos | Apenas hash |
| Logs do provedor | Requisições e erros da API/função | Política do provedor | A função não registra corpos de requisição |
| Resultados do CI | Testes, deploy, backup | Política do GitHub | Nenhum |

## 4. Verificação de disponibilidade e alertas

| Verificação | Como | Frequência | Alerta |
|---|---|---|---|
| App estático no ar | Tarefa agendada no CI requisita a página inicial | A cada hora | Notificação do GitHub ao falhar |
| Serviço de autenticação/API do provedor | Endpoint público de saúde do provedor, **sem consultar o banco** | A cada hora | Idem |
| Backup diário | Workflow de backup (IMP-03) | Diária | Idem |
| Limpeza de retenção | Tarefa diária (SEG-02 §3) | Diária | Idem |

A verificação de disponibilidade **não** consulta o banco, para não gerar atividade artificial. O backup diário consulta o banco por necessidade legítima; o efeito sobre a regra de pausa do provedor está registrado na ADR-073.

## Critérios de conclusão

- [x] Metas, técnicas, fontes de observabilidade e alertas definidos sem dados pessoais.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 6). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 6). |
