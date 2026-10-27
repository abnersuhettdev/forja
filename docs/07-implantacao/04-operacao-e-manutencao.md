# IMP-04 — Operação e Manutenção

| Campo | Valor |
|---|---|
| Identificador | IMP-04 |
| Status | **Aprovado** (2026-10-26 — Etapa 6) |
| Etapa | 6 |
| Dono do assunto | Rotinas periódicas e procedimentos operacionais |
| Dependências | IMP-01..03, SEG-01, SEG-02, ARQ-02 §7, ADR-004, ADR-016 |
| Referenciado por | PLN-01, PLN-05 |
| Última atualização | 2026-10-26 |

## 1. Rotinas

| Frequência | Rotina | Responsável |
|---|---|---|
| Diária (automática) | Backup; limpeza de retenção; verificação de disponibilidade | CI |
| Semanal | Ler notificações do GitHub (falhas de backup, disponibilidade, CI) | Usuário |
| Mensal | Baixar uma cópia do backup para armazenamento pessoal (IMP-03); atualização revisada de dependências (PR próprio com CI completo); conferir uso das cotas gratuitas | Usuário + Claude (sob pedido) |
| Trimestral | Teste de restauração (IMP-03); revisão das condições e termos dos planos gratuitos (ADR-016); revisão dos pontos VP de plataforma com versões novas de Android/iPhone | Usuário + Claude |
| Anual | Rotação de segredos (SEG-01 §7); revisão da documentação | Usuário + Claude |

## 2. Procedimentos

| ID | Procedimento | Passos |
|---|---|---|
| OP-01 | Recuperação de senha (ADR-004) | Script operacional local com credencial administrativa define nova senha para o usuário; credencial não é versionada nem usada no app; revogação das sessões existentes a confirmar na fundação (VH-11) |
| OP-02 | Aparelho perdido ou roubado | No painel do provedor, encerrar as sessões do usuário (VH-11); trocar a senha (OP-01); pendências não enviadas naquele aparelho ficam perdidas (consequência do offline) |
| OP-03 | Projeto pausado pelo provedor | Restaurar pelo painel do provedor; o app continua offline e envia a fila ao reconectar; registrar a ocorrência |
| OP-04 | Exportação de dados antes do D5 | Script operacional gera JSON dos dados do usuário (mesmo formato de API-031) |
| OP-05 | Exclusão completa da conta (PES) | Exportar (OP-04) → excluir aluno, gestor e usuário (cascata — RN-020) → registrar `audit_events` → dados somem dos backups em até 35 dias |
| OP-06 | Incidente de segurança | SEG-01 §8 |
| OP-07 | Restauração de backup | IMP-03 §3 |
| OP-08 | Migração de origem (domínio) | IMP-02 §4 |
| OP-09 | Ultrapassagem de cota gratuita | Avaliar causa; reduzir uso; plano pago **somente** com aprovação (ADR-016) |
| OP-10 | Liberar a modalidade TER | **Proibido** sem GATE-TER concluído e nova ADR aprovada (ADR-018) |

## 3. Registro operacional

Ocorrências relevantes (incidentes, restaurações, pausas, rotações) são registradas no histórico da documentação (GOV-04), sem dados pessoais.

## Critérios de conclusão

- [x] Rotinas e procedimentos definidos, coerentes com ADR-004, ADR-016, ADR-018 e IMP-01..03.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 6). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 6). |
