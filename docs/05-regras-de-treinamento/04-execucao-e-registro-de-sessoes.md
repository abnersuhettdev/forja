# TRN-04 — Execução e Registro de Sessões

| Campo | Valor |
|---|---|
| Identificador | TRN-04 |
| Status | **Aprovado** (2026-10-26 — Etapa 5) |
| Etapa | 5 |
| Dono do assunto | Ciclo de vida da sessão, pré-preenchimento, recomendação do treino (algoritmo), presença, fórmulas de duração, volume e melhor série |
| Dependências | RN-011..013, RN-026..029, RN-038, RN-044..050, ADR-007, ADR-021, TRN-03, DAD-01, DAD-04 |
| Referenciado por | UX-05 (TELA-010, 011, 015, 017..020), TRN-02 (orçamento de tempo), SEG-03 |
| Decisões | ADR-065 (fórmulas de exibição) — aprovada |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Tornar exatas, para implementação e testes, as regras de execução, recomendação e presença já aprovadas em PRD-07, sem criar regras novas além das fórmulas de exibição (ADR-065).

## 2. Ciclo de vida da sessão

| De | Evento | Para | Regra |
|---|---|---|---|
| — | Iniciar treino | `in_progress` | No máximo uma por aparelho (RN-012); vínculo à versão (RN-044) |
| `in_progress` | Concluir | `completed` | `ended_at` = horário da conclusão; duração calculada |
| `in_progress` | Descartar (confirmação) | — (removida) | API-014 |
| `in_progress` | 6 h sem nova série | `abandoned` (calculado) | RN-012; base: `last_activity_at` |
| `abandoned` | Concluir informando término | `completed` | `ended_at` informado ≥ última série |
| `abandoned` | Excluir | marca de exclusão | ADR-053 |
| — | Registrar treino realizado (D5) | `manual` | RN-027 |
| `completed`/`manual` | Editar/Excluir | mesmo / marca de exclusão | Janela de 60 dias (RN-027) |

## 3. Pré-preenchimento (RF-061)

Para a série *n* do exercício *E* na sessão atual:

1. Se existir **última execução** de *E* (sessão `completed`/`manual` mais recente, não excluída, com série registrada de *E*): carga e repetições da série *n* daquela execução; se ela tiver menos séries, usar a última série registrada.
2. Senão, se houver carga sugerida na prescrição: essa carga e o **mínimo** da faixa de repetições.
3. Senão: carga vazia (exigida antes de confirmar), repetições = mínimo da faixa. Exercício de peso corporal: carga 0.
4. Exercício por duração: segundos prescritos (mínimo da faixa) no lugar de repetições.

"Última execução" considera o mesmo exercício em **qualquer** versão de programa (o exercício é a chave, não o item prescrito).

## 4. Recomendação do treino (RN-013, RN-050, ADR-007, ADR-021)

Função pura, com entradas explícitas: programa ativo (treinos em ordem), sessões não excluídas do aluno (inclusive pendentes de envio — RN-049), configuração de descanso, perfil (dias por semana, dias preferidos, fuso), agora.

```
1. Se há sessão in_progress não abandonada → recomendar "continuar" essa sessão.
2. ciclo_inicio = momento da publicação da versão ativa; feitos = treinos com sessão
   completed/manual iniciada após o início do ciclo atual.
   O ciclo atual recomeça quando todos os treinos do programa foram feitos (reinicia a contagem).
3. Se há sessão completed/manual hoje (fuso do aluno) → estado "concluído hoje";
   continuar para calcular o "próximo" exibido.
4. meta = dias_por_semana; presencas_semana = dias distintos com presença na semana seg–dom atual.
   Se presencas_semana >= meta → estado "descanso sugerido (meta da semana atingida)".
5. pendentes = treinos ainda não feitos no ciclo, na ordem da sequência planejada.
6. Para cada candidato em pendentes (em ordem):
     grupos = união dos grupos primários dos exercícios do treino (RN-050)
     compatível se, para cada grupo g em grupos, não existe sessão completed/manual que tenha
     trabalhado g e cujo término tenha ocorrido há menos de descanso(g) horas
     (grupos de uma sessão passada = grupos primários dos exercícios com ao menos uma série
     registrada; sessão manual sem séries usa os grupos do treino referenciado)
     (descanso(g) = ajuste do grupo, ou valor padrão; 0 = ignora g)
   O primeiro compatível é o recomendado; motivo = "próximo da sequência" (+ grupo mais
   recentemente treinado e há quanto tempo).
7. Se nenhum compatível → "descanso sugerido"; informar o menor horário em que algum
   pendente fica compatível.
8. Se hoje não está em dias_preferidos (quando informados) → acrescentar a observação
   "hoje não é um dia planejado" (não altera a recomendação).
```

- Escolha manual de treino incompatível: permitida, com aviso não bloqueante que cita o grupo, as horas decorridas e o descanso configurado (UX-02 §8.3).
- Resultado idêntico online e offline, pois usa só dados locais e o pacote de domínio (ARQ-01 §5).
- **Esclarecimento (auditoria final — confirmado pelo usuário em 2026-10-26):** o aparelho mantém 90 dias de sessões (UX-08 §6.2). Se o início do ciclo atual for anterior a essa janela (ex.: muito tempo sem treinar), considera-se que um novo ciclo começou no início da janela. O mesmo cálculo é usado online, para que online e offline não divirjam.

## 5. Fórmulas de exibição (ADR-065)

| Grandeza | Fórmula | Uso |
|---|---|---|
| Duração estimada do treino | Σ itens [séries × (45 s + descanso) + 60 s], arredondada para múltiplos de 5 min; itens por duração usam a duração prescrita no lugar de 45 s | TELA-010, 012, 013; TRN-02 Passo 4 |
| Duração da sessão | `ended_at − started_at`, em minutos inteiros (mínimo 1) | TELA-017, 019 |
| Volume da sessão | Σ séries registradas (carga × repetições); exercícios de peso corporal com carga 0 entram no total de séries e repetições, não no volume em kg | TELA-017, RF-073 |
| Melhor série de um exercício na sessão | Maior carga; empate → mais repetições | RF-073 (D3) |
| Carga máxima por sessão (gráfico) | Maior carga registrada do exercício na sessão | RF-073 (D3) |

Não se calcula estimativa de carga máxima teórica (1RM) no MVP.

## 6. Presença e agenda

- Presença (RN-011): dia, no fuso do aluno (RN-028), com ≥ 1 sessão `completed` ou `manual` não excluída; o dia é o do `started_at`.
- Semana para a meta: segunda a domingo (ADR-021).
- Planejado (RN-029): dias futuros e o dia atual sem presença cujo dia da semana está em `preferred_weekdays`.
- Marcador "pendente de envio": sessão com operação na fila de saída (RN-049).

## 7. Casos de teste de referência

| Caso | Situação | Esperado |
|---|---|---|
| CT-REC-01 | Programa A/B/C, nada feito | Recomenda A |
| CT-REC-02 | A feito ontem às 19 h (peitoral), agora 10 h; B usa costas; descanso 48 h | Recomenda B |
| CT-REC-03 | Corpo inteiro A/B, A feito há 20 h, descanso 48 h | Descanso sugerido; informa horário de liberação |
| CT-REC-04 | Meta 3/semana já atingida | Descanso sugerido (meta) |
| CT-REC-05 | Ajuste abdômen = 0 h, ambos os treinos com abdômen | Abdômen ignorado na compatibilidade |
| CT-REC-06 | Sessão pendente de envio ontem | Considerada (RN-049) |
| CT-REC-07 | Nova versão publicada hoje | Ciclo recomeça; recomenda o primeiro treino |
| CT-PRE-01 | Última execução 3 séries, hoje 4 prescritas | Série 4 recebe valores da série 3 |

## Critérios de conclusão

- [x] Ciclo de vida, pré-preenchimento, recomendação e presença especificados como regras verificáveis.
- [x] Fórmulas de exibição definidas.
- [x] ADR-065 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 5). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 5). |
| 2026-10-26 | Correção da auditoria final (Etapa 8): caso-limite do ciclo × janela local de 90 dias (aguardando confirmação). |
| 2026-10-26 | Esclarecimento do ciclo × janela de 90 dias confirmado pelo usuário. |
