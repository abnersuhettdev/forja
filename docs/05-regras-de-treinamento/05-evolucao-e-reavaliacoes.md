# TRN-05 — Evolução e Reavaliações

| Campo | Valor |
|---|---|
| Identificador | TRN-05 |
| Status | **Aprovado** (2026-10-26 — Etapa 5) |
| Etapa | 5 |
| Dono do assunto | Indicadores de evolução, ciclo de reavaliação e adiamento, detecção de dados desatualizados e revisão recomendada |
| Dependências | RN-014..017, RN-025, RN-038, ADR-008, ADR-020, TRN-01, TRN-04 |
| Referenciado por | UX-05 (TELA-010, 021, 050, 053), SEG-03 |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo

Especificar os cálculos de evolução e o comportamento da reavaliação de forma testável, cobrindo a seção 6.10 do prompt mestre.

## 2. Indicadores

| Indicador | Regra | Exibição |
|---|---|---|
| Peso inicial | Peso da avaliação `initial` | Linha tracejada no gráfico |
| Peso atual | Registro de peso mais recente não excluído (RN-017) | Hoje, Evolução |
| Variação | Peso atual − peso inicial, com sinal (ex.: "−3,2 kg desde 01/11") | Evolução |
| Progresso em direção à meta | (inicial − atual) / (inicial − meta) × 100, limitado a 0–100%; oculto sem meta ou com meta = inicial (RN-017) | Metas (D3) |
| Data de início | Data da avaliação inicial | Metas |
| Meta semanal | Dias por semana do perfil (RN-038) | Hoje (semana) |
| Frequência | Presenças por semana e por mês (TRN-04 §6) | Agenda, Hoje |
| Evolução por exercício (D3) | Carga máxima e volume por sessão (TRN-04 §5) | TELA-052 |

O gráfico de peso usa os registros não excluídos no período escolhido; vários registros no mesmo dia → usa o último do dia.

## 3. Reavaliação (ADR-008, ADR-020)

### 3.1 Data de vencimento

```
base = data da avaliação mais recente (inicial ou periódica)
vence_em = base + 30 dias            (intervalo fixo no MVP — RN-014)
lembrar_em = max(vence_em, reassessment_snooze_until)  (se houver adiamento)
lembrete visível quando hoje (fuso do aluno) >= lembrar_em
```

### 3.2 Comportamento

| Ação | Efeito |
|---|---|
| Fazer agora (TELA-050) | Registra avaliação periódica; atualiza o perfil com as respostas; limpa o adiamento; novo `vence_em` |
| Lembrar em… (data futura escolhida; sugestão +7 dias) | Registra adiamento (ENT-007) e grava `reassessment_snooze_until`; sem limite de adiamentos (RN-015) |
| Ignorar | Lembrete continua visível; o uso nunca é bloqueado |

### 3.3 Respostas "continua igual"

Cada etapa da reavaliação oferece "Continua igual"; a avaliação grava a fotografia do perfil mesmo sem mudanças, para registrar a confirmação.

## 4. Dados desatualizados (RN-016)

| Dado | Desatualizado quando | Sinal |
|---|---|---|
| Peso | Último registro há mais de 30 dias | Selo em Hoje e Perfil (D4) |
| Perfil | Reavaliação vencida (§3.1, ignorando adiamento para este selo) | Selo no Perfil (D4) |
| Programa | Versão ativa publicada há mais de 12 semanas **ou** com revisão recomendada | Selo em Gestão › Programa (D4) |

Nenhum sinal bloqueia funcionalidades (RF-086).

## 5. Revisão recomendada (RN-025)

- Gatilho: alteração, após a publicação da versão ativa, de `goal`, `days_per_week`, `minutes_per_session`, `equipment_codes`, `training_location`, `restrictions_declared` ou `restriction_codes` (TG-08 do DAD-03).
- Efeito: `review_recommended_since` preenchido, com a lista dos campos alterados no relatório da marca.
- Removida ao publicar nova versão ou por **Dispensar** (API-023).

## 5A. Acompanhamento por IA

**Versão 1.2 (planejada, ainda não implementada — [PLN-06](../08-planejamento/06-plano-versao-1-2.md)):** as regras calculam os fatos (indicadores de §2, frequência, tempo até a meta, reavaliação). A IA só escreve o resumo semanal e propõe ajustes (RF-115..117), sem inventar números. O resumo é gerado ao abrir o app, no máximo uma vez por semana; sem conexão, aparecem só os fatos. Ajuste proposto vira rascunho (RN-009). Dor ou condição de saúde leva ao texto de procurar um profissional (RN-030).

## 6. Casos de teste de referência

| Caso | Situação | Esperado |
|---|---|---|
| CT-EVO-01 | Inicial 90 kg, meta 80, atual 85 | Progresso 50% |
| CT-EVO-02 | Meta acima do inicial (ganho de peso): inicial 70, meta 75, atual 72 | Progresso 40% (a fórmula funciona nos dois sentidos) |
| CT-EVO-03 | Atual além da meta | 100% |
| CT-REA-01 | Avaliação em 01/10; hoje 31/10 | Lembrete visível |
| CT-REA-02 | Adiado para 07/11; hoje 05/11 | Lembrete oculto |
| CT-REA-03 | Três adiamentos seguidos | Todos aceitos (sem limite) |
| CT-DES-01 | Último peso há 31 dias | Peso desatualizado |

## Critérios de conclusão

- [x] Indicadores, reavaliação, desatualização e revisão recomendada especificados e testáveis.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 5). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 5). |
| 2026-11-04 | Versão 1.2: acompanhamento por IA. |
