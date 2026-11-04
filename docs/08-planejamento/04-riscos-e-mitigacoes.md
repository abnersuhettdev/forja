# PLN-04 — Riscos e Mitigações

| Campo | Valor |
|---|---|
| Identificador | PLN-04 |
| Status | **Aprovado** (2026-10-26 — Etapa 7) |
| Etapa | 7 |
| Dono do assunto | Registro de riscos (RSK-###): probabilidade, impacto, mitigação, gatilho e tarefa relacionada |
| Dependências | Todos os documentos; GOV-02 §9 |
| Referenciado por | PLN-05, IMP-04 |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Escala

Probabilidade e impacto: Baixa/Média/Alta. Revisão do registro ao final de cada incremento (PLN-02).

## 2. Registro

| ID | Risco | Prob. | Impacto | Mitigação | Gatilho de ação | TAR |
|---|---|---|---|---|---|---|
| RSK-001 | iPhone remove dados locais antes da sincronização (C-11) | Média | Alto | Envio a cada oportunidade; armazenamento persistente; uso pelo ícone; aviso de pendências > 24 h | VP-03/04/10 falham | 009, 020, 025 |
| RSK-002 | Defeito na fila de saída causa perda ou duplicidade | Média | Alto | Idempotência; testes T-PWA; nada removido sem confirmação; cobertura alta | Qualquer falha de CA-210 | 009, 010, 019 |
| RSK-003 | Função de sincronização não consegue usar papel próprio no banco (VH-12) | Baixa | Alto | Verificar no início (TAR-004); alternativa (a) da ADR-050 só com aprovação | VH-12 negativa | 004 |
| RSK-004 | Pausa do backend gratuito por inatividade | Baixa | Médio | Uso diário; backup diário; app segue offline; OP-03 | Projeto pausado | 007 |
| RSK-005 | Mudança nas condições ou termos do plano gratuito (VH-07) | Média | Médio | Revisão trimestral; dados em PostgreSQL padrão; upgrade só com aprovação | Aviso do provedor | — |
| RSK-006 | Procedência das imagens do catálogo não comprovada (ADR-052) | Alta | Médio | Placeholder; Wikimedia Commons; imagens próprias | Sem resposta dos mantenedores | 012 |
| RSK-007 | Curadoria mais demorada que o previsto | Alta | Médio | Começar em paralelo; priorizar exercícios do seu programa | Atraso em I-3 | 012 |
| RSK-008 | Derivação de chave lenta em aparelho modesto | Média | Baixo | Medir; reduzir iterações com aprovação | > ~3 s | 021 |
| RSK-009 | Perda da chave privada de backup | Baixa | Alto | Gerenciador de senhas + cópia offline; lembrete trimestral | — | 007 |
| RSK-010 | Troca de endereço após o uso real | Média | Médio | Decidir Q-006 antes do uso real; procedimento IMP-02 §4.2 | Uso real iniciado sem domínio definido | 026 |
| RSK-011 | Crescimento de escopo durante a implementação | Média | Médio | Gestão de mudanças (GOV-01 §6); D1–D5 após L1 | Pedido fora do PRD-04 | — |
| RSK-012 | Parâmetros de treino e mapa de restrições sem revisão profissional | Média | Alto (para terceiros) | Uso apenas pessoal; avisos (RN-030); revisão obrigatória no GATE-TER | Pedido de uso com terceiros | 032 |
| RSK-013 | Vulnerabilidade em dependência | Média | Médio | Auditoria no CI; atualização mensal | Alerta alto | 001 |
| RSK-014 | Regressão de acessibilidade | Média | Baixo | axe no CI; revisão manual por incremento | Violação séria | 005, 024 |
| RSK-015 | Cotas gratuitas do GitHub insuficientes (VH-09) | Baixa | Médio | Reduzir execuções; compactar backups | Aviso de cota | 007 |
| RSK-016 | Relógio incorreto do aparelho afeta presença ou abandono | Baixa | Baixo | RN-048 (sinalização); horário do servidor como referência de tolerância | Registros marcados | 019 |
| RSK-017 | Falta de continuidade entre sessões de desenvolvimento | Média | Médio | Documentação como fonte principal; GOV-02 atualizado a cada tarefa | — | Todas |
| RSK-018 | Domínio ou marca "Forja" indisponível (ADR-023) | Média | Baixo | Alternativas Ritmo/Carga; troca antes do uso real | Verificação negativa | 026 |

## Riscos da versão 1.2

Ver [PLN-06 §5](06-plano-versao-1-2.md#5-riscos): rotina errada para quem tem lesão, qualidade do modelo gratuito, cota, reclamação de direitos sobre as fotos (ADR-094), observações enviadas à IA (ADR-093) e atraso do uso real (ADR-096).

## Critérios de conclusão

- [x] Riscos identificados nas etapas 1–6 consolidados, com mitigação e gatilho.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 7). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 7). |
| 2026-11-04 | Versão 1.2: riscos. |
