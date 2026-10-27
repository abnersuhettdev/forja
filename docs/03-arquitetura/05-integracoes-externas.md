# ARQ-05 — Integrações Externas

| Campo | Valor |
|---|---|
| Identificador | ARQ-05 |
| Status | **Aprovado** (2026-10-26 — Etapa 3) |
| Etapa | 3 |
| Dono do assunto | Serviços externos, dados compartilhados, falhas, custos e saída |
| Dependências | ARQ-01, ARQ-02, DAD-06 (Etapa 4) |
| Referenciado por | SEG-01, SEG-02, IMP-01..04, PRD-08 (REG-04, REG-06) |
| Decisões | ADR-038 (monitoramento mínimo) — aprovada |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Listar cada serviço externo, o que ele recebe, o que acontece se falhar e como sair dele. Toda nova integração exige atualização deste documento e ADR.

## 2. Inventário

| Integração | Finalidade | Dados que recebe | Se falhar | Custo | Saída |
|---|---|---|---|---|---|
| **Supabase** (Auth, PostgreSQL, API de dados, Edge Functions) | Autenticação, armazenamento e sincronização | Todos os dados do usuário (inclusive tratados como sensíveis) | App segue offline com fila; login novo indisponível; pausa por inatividade (ARQ-02 §7) | Gratuito (pausa após 1 semana sem uso; sem backup automático; termos com ressalvas — ARQ-02 §7) | `pg_dump` padrão; Auth substituível; políticas e funções em migrações versionadas |
| **Cloudflare Pages** (hospedagem estática) | Entregar o app e as imagens do catálogo | Endereço IP e metadados de requisição (sem dados do app) | App instalado continua abrindo pelo cache; novos acessos/atualizações indisponíveis | Gratuito | Arquivos estáticos portáveis para qualquer hospedagem (cuidado com a origem — ARQ-02 §8) |
| **GitHub** (repositório, Actions) | Código, CI, deploy, backup agendado | Código; durante o backup, o conteúdo do banco transita **criptografado** antes de sair do runner | Deploys e backups param; app não é afetado | Gratuito (VH-09) | Git é portável |
| **Armazenamento de backups** | Guardar cópias diárias criptografadas | Arquivos criptografados (chave fora do provedor) | Backup do dia falha → alerta | Gratuito (provedor definido em IMP-03) | Arquivos padrão |
| **Fonte do catálogo** (free-exercise-db para dados e textos; imagens só com procedência comprovada — DAD-06, ADR-052) | Dados e imagens de exercícios | Nada (importação única) | Sem efeito em produção (snapshot local) | Gratuito | Snapshot já está no repositório |
| Fontes e ícones (Barlow, Lucide) | Interface | Nada (servidos pelo próprio app) | — | Gratuito | — |

**Não há** no Lançamento 1: e-mail transacional, push, analytics de terceiros, IA, pagamentos.

## 3. Monitoramento mínimo (ADR-038)

| Necessidade | Solução no Lançamento 1 |
|---|---|
| Erros do app | Registro de erros técnicos sem dados pessoais enviado pela própria função de sincronização para uma tabela de diagnóstico, com retenção curta (detalhe em SEG-04) |
| Erros do backend | Logs do provedor (painel) |
| Disponibilidade | Verificação agendada no CI (ex.: a cada hora) que testa o endereço do app e a saúde do backend e avisa por e-mail do próprio GitHub em caso de falha |
| Backup | Falha do workflow de backup gera notificação do GitHub |

Ferramentas externas de monitoramento (ex.: serviços de rastreamento de erros) ficam para avaliação futura, por adicionarem mais um destinatário de dados.

## 4. Futuras (não incluídas)

| Integração | Quando | Pré-requisitos |
|---|---|---|
| E-mail transacional | RF-008 (FUT) | Domínio próprio (Q-006), provedor gratuito/baixo custo, ADR |
| Notificações push | RF-094 (FUT) | ADR-017 (só app instalado no iPhone) |
| IA para geração | FUT-01 | Revisão humana obrigatória (RN-009); análise de privacidade |

## Critérios de conclusão

- [x] Todas as integrações do Lançamento 1 listadas com dados, falha, custo e saída.
- [x] ADR-038 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 3). |
| 2026-10-26 | Referências ajustadas às verificações oficiais (Cloudflare Pages; condições do Supabase). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 3). |
| 2026-10-26 | Correção da auditoria final (Etapa 8): fonte do catálogo atualizada (já definida em DAD-06). |
