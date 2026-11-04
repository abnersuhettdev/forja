# SEG-02 — LGPD e Retenção de Dados

| Campo | Valor |
|---|---|
| Identificador | SEG-02 |
| Status | **Aprovado** (2026-10-26 — Etapa 6) |
| Etapa | 6 |
| Dono do assunto | Inventário de dados, finalidades, minimização, retenção, direitos do titular e transparência, na modalidade PES; ponte para o GATE-TER |
| Dependências | PRD-08 (§5, §6), RN-020, RN-024, RN-052, RNF-015, DAD-02, ADR-072, ADR-073 |
| Referenciado por | IMP-03, IMP-04, PLN-05 |
| Decisões | ADR-072 (prazos de retenção) — aprovada |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo e premissas

Aplicar boas práticas de proteção de dados no uso pessoal e preparar o terreno para a modalidade TER, **sem afirmar enquadramentos jurídicos não verificados** (RN-024).

- Na PES, a aplicação da LGPD ao uso exclusivamente particular é **hipótese a verificar** (PRD-08 §6.1); as práticas abaixo valem de qualquer forma.
- Bases legais, documentos e obrigações da TER dependem dos itens REG-03..REG-10 do GATE-TER.

## 2. Inventário e finalidades

| Dados | Finalidade | Classificação | Minimização |
|---|---|---|---|
| Nome, e-mail, data de nascimento | Identificação, login, idade mínima | Comum | Sem CPF, telefone, endereço |
| Sexo, altura | Informativos | Comum / sensível por cautela | Opcionais |
| Perfil de treinamento | Planejar e recomendar treinos | Comum | Só o necessário para RN-006 |
| Restrições, observações livres | Evitar exercícios inadequados | Sensível | Categorias + nota curta; sem diagnóstico |
| Peso, medidas | Acompanhar evolução | Sensível por cautela | Medidas opcionais; sem fotos (ADR-010) |
| Sessões e séries | Histórico e recomendação | Comum (observações: sensível) | — |
| Identificador aleatório do aparelho | Detectar duplicidade (RN-045) | Técnico | Não é identificador de hardware |
| Registros técnicos | Diagnóstico | Técnico | Sem dados pessoais |

## 3. Retenção (ADR-072)

| Dado | Prazo |
|---|---|
| Dados do aluno no servidor | Enquanto a conta existir |
| Marcas de exclusão | 90 dias |
| `sync_operations` | 90 dias |
| `client_error_reports` | 30 dias |
| `ai_usage` (versão 1.2) | 30 dias, sem conteúdo |
| `audit_events` | 2 anos, sem dados pessoais |
| Backups | 35 dias (ADR-073); dados excluídos podem permanecer nos backups até expirarem — informado ao usuário |
| Cópias mensais baixadas pelo usuário (ADR-073) | Sob responsabilidade do usuário; recomendação de manter as 3 últimas |
| Dados no aparelho | Janelas de UX-08 §6.2; removidos ao sair (RN-052) |
| Logs do provedor | Conforme política do provedor (fora do controle do projeto) |

A limpeza automática (marcas, operações, relatos) roda diariamente por tarefa agendada no banco ou no CI (IMP-04).

## 4. Direitos e transparência (PES)

| Necessidade | Como é atendida |
|---|---|
| Acesso e portabilidade | Exportação JSON (RF-095, D5); antes disso, exportação pelo procedimento operacional (IMP-04) |
| Correção | Edição do perfil, sessões e pesos (RF-012, RF-069, RF-080) |
| Eliminação | Exclusão de registros pelo app; exclusão da conta inteira por procedimento operacional (IMP-04), com remoção em backups ao expirarem (35 dias) |
| Transparência | Seção "Sobre e privacidade" em Conta: o que é guardado, onde (servidores do provedor na região de São Paulo; backups no GitHub), por quanto tempo e como excluir |

## 5. Transferências e terceiros

| Terceiro | Dados | Observação |
|---|---|---|
| Supabase (região São Paulo — VH-03) | Todos os dados do aluno | Empresa estrangeira; termos com ressalvas (ARQ-02 §7) |
| GitHub (backups) | Backups **criptografados** | Armazenamento fora do Brasil; sem acesso ao conteúdo (chave privada só com o usuário) |
| Cloudflare | Metadados de requisição do app estático | Sem dados do app |
| Cloudflare Workers AI (versão 1.2, planejada) | Dados de ADR-093, incluindo peso, restrições e observações, sem identificação | Só o próprio usuário na 1.2; região não informada pelo provedor; na TER, REG-06 e REG-15 |

Para a TER, transferência internacional e papéis de tratamento entram na verificação REG-04/REG-06.

## 6. Checklist antes de liberar a TER (ponte com PRD-08)

- [ ] REG-01..REG-13 verificados e documentados.
- [ ] Base legal por finalidade definida; se consentimento, implementar RF-006/RF-097 com versionamento.
- [ ] Aviso de privacidade e termos de uso revisados.
- [ ] Procedimentos de atendimento a titulares e de incidentes revisados (prazos).
- [ ] Avaliação da cláusula HIPAA/termos do provedor para dados de saúde de terceiros (ARQ-02 §7).

## Critérios de conclusão

- [x] Inventário, finalidades, minimização e retenção definidos.
- [x] Direitos e transparência atendidos na PES; ponte para a TER sem afirmações jurídicas não verificadas.
- [x] ADR-072 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 6). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 6). |
| 2026-11-04 | Versão 1.2: Workers AI como terceiro e retenção de `ai_usage`. |
