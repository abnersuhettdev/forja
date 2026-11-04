# TRN-03 — Catálogo e Seleção de Exercícios

| Campo | Valor |
|---|---|
| Identificador | TRN-03 |
| Status | **Aprovado** (2026-10-26 — Etapa 5) |
| Etapa | 5 |
| Dono do assunto | Taxonomia (grupos musculares, padrões de movimento, equipamentos, marcadores de sobrecarga), mapa restrição → exclusão, critérios de seleção e de alternativas |
| Dependências | TRN-01, DAD-02, DAD-06, ADR-052 |
| Referenciado por | TRN-02, TRN-04 (descanso por grupo), DAD-07 (seeds), UX-06 |
| Decisões | ADR-060 (taxonomia e marcadores), ADR-063 (tratamento conservador de restrições) — aprovadas |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Classificar cada exercício de forma que o gerador (TRN-02), a recomendação por descanso (RN-050) e as alternativas (RF-036) funcionem de modo determinístico e verificável.

## 2. Grupos musculares (finais)

| Código | Nome | Região | Porte (curadoria/volume) |
|---|---|---|---|
| `chest` | Peitoral | Superior | Grande |
| `upper_back` | Costas — parte alta (trapézio, romboides) | Superior | Grande |
| `lats` | Dorsais | Superior | Grande |
| `shoulders` | Ombros (deltoides) | Superior | Grande |
| `biceps` | Bíceps | Superior | Pequeno |
| `triceps` | Tríceps | Superior | Pequeno |
| `forearms` | Antebraços | Superior | Pequeno |
| `abs` | Abdômen | Core | Pequeno |
| `obliques` | Oblíquos | Core | Pequeno |
| `lower_back` | Lombar | Core | Pequeno |
| `glutes` | Glúteos | Inferior | Grande |
| `quadriceps` | Quadríceps | Inferior | Grande |
| `hamstrings` | Posteriores de coxa | Inferior | Grande |
| `adductors` | Adutores | Inferior | Pequeno |
| `abductors` | Abdutores | Inferior | Pequeno |
| `calves` | Panturrilhas | Inferior | Pequeno |

São estes os grupos listados em TELA-006 (descanso por grupo).

## 3. Equipamentos (finais)

`barbell` (Barra) · `ez_bar` (Barra W) · `dumbbell` (Halteres) · `kettlebell` · `machine` (Máquina) · `smith_machine` (Smith) · `cable` (Polia/cabo) · `band` (Elástico) · `bench` (Banco) · `pullup_bar` (Barra fixa) · `dip_bars` (Paralelas) · `medicine_ball` (Bola de peso) · `bodyweight` (Peso corporal — sempre disponível).

Um exercício pode exigir vários equipamentos; ele só é elegível se **todos** estiverem disponíveis.

## 4. Padrões de movimento (finais)

| Código | Padrão | Tipo | Exemplos |
|---|---|---|---|
| `squat` | Agachar | Composto | Agachamento, leg press |
| `hinge` | Dobrar o quadril | Composto | Levantamento terra romeno, elevação pélvica |
| `lunge` | Unilateral de pernas | Composto | Afundo, búlgaro, subida no banco |
| `h_push` | Empurrar horizontal | Composto | Supino, flexão de braços |
| `v_push` | Empurrar vertical | Composto | Desenvolvimento |
| `h_pull` | Puxar horizontal | Composto | Remadas |
| `v_pull` | Puxar vertical | Composto | Puxada, barra fixa |
| `knee_ext` | Extensão de joelho | Isolado | Cadeira extensora |
| `knee_flex` | Flexão de joelho | Isolado | Mesa/cadeira flexora |
| `hip_abd_add` | Abdução/adução de quadril | Isolado | Abdutora, adutora |
| `calf` | Panturrilha | Isolado | Elevação de calcanhares |
| `elbow_flex` | Flexão de cotovelo | Isolado | Roscas |
| `elbow_ext` | Extensão de cotovelo | Isolado | Tríceps na polia |
| `shoulder_iso` | Ombro isolado | Isolado | Elevação lateral, crucifixo inverso |
| `chest_iso` | Peitoral isolado | Isolado | Crucifixo, voador |
| `core_stability` | Core — estabilidade | Core | Prancha, anti-rotação na polia |
| `core_flexion` | Core — flexão/rotação | Core | Abdominais, rotações |
| `carry_grip` | Carregar/pegada | Acessório | Caminhada do fazendeiro |

Cada exercício tem **um** padrão principal.

## 5. Marcadores de sobrecarga e mapa de restrições (ADR-060, ADR-063)

### 5.1 Marcadores atribuídos a cada exercício na curadoria

| Marcador | Significado |
|---|---|
| `overhead` | Braços acima da cabeça com carga |
| `shoulder_end_range` | Ombro em amplitude extrema com carga (ex.: paralelas, movimentos atrás da nuca) |
| `axial_spine_load` | Carga sobre a coluna em pé (barra nas costas, carga acima da cabeça, terra) |
| `spine_flexion_loaded` | Flexão de coluna com carga |
| `spine_rotation_loaded` | Rotação de coluna com carga |
| `deep_knee_flexion_loaded` | Flexão profunda de joelho com carga |
| `knee_impact` | Saltos ou impacto |
| `hip_deep_flexion_loaded` | Flexão profunda de quadril com carga |
| `wrist_loaded_extension` | Punho estendido sustentando carga (ex.: flexões, front squat) |
| `elbow_loaded_extension` | Extensão de cotovelo com carga alta (ex.: tríceps testa) |
| `neck_load` | Carga direta sobre o pescoço/trapézio superior |
| `ankle_loaded` | Tornozelo sob carga em amplitude ou impacto |
| `technical_high` | Alta complexidade técnica |

### 5.2 Restrição → marcadores excluídos (conservador)

| Restrição | Marcadores excluídos |
|---|---|
| `shoulder` | `overhead`, `shoulder_end_range` |
| `elbow` | `elbow_loaded_extension` |
| `wrist` | `wrist_loaded_extension` |
| `neck` | `neck_load`, `overhead`, `axial_spine_load` |
| `thoracic` | `spine_rotation_loaded`, `axial_spine_load` |
| `lower_back` | `axial_spine_load`, `spine_flexion_loaded`, `spine_rotation_loaded`, `hip_deep_flexion_loaded` |
| `hip` | `hip_deep_flexion_loaded`, `knee_impact` |
| `knee` | `deep_knee_flexion_loaded`, `knee_impact` |
| `ankle` | `ankle_loaded`, `knee_impact` |
| `cardiovascular`, `pregnancy`, `other` | Nenhum automático — aviso obrigatório e revisão manual (TRN-01 §3.5) |

Além do mapa, a contraindicação explícita por exercício (RF-035, `exercise_contraindications`) **também** exclui. As duas fontes se somam; nunca se compensam.

**Curadoria (V12-06, 2026-11-04, feita por Claude, a confirmar pelo usuário):** `catalog/exercicios.json` traz os campos `load_markers_v12` (15 exercícios com marcadores acrescentados, como `ankle_loaded`, que nenhum exercício tinha, e `axial_spine_load` em máquinas com apoio nos ombros) e `contraindications` (53 associações em 37 exercícios, por exemplo barra fixa para ombro, cadeira extensora para joelho e abdominais em flexão para lombar). O critério é conservador: na dúvida, o exercício sai para quem declarou a restrição. Em exercícios personalizados, a pessoa marca as contraindicações em TELA-036.

> **Natureza deste mapa:** é uma heurística conservadora de organização de treino, não orientação clínica (RN-030). Será revisado na curadoria e precisa de revisão por profissional habilitado antes de qualquer uso com terceiros (GATE-TER, REG-01/REG-11).

## 6. Elegibilidade e ordenação para seleção

Um exercício é **elegível** para o gerador quando: está ativo (RN-007); todos os equipamentos estão disponíveis (RN-008); não tem marcador excluído nem contraindicação explícita para as restrições do aluno (RN-008); sua dificuldade é permitida (iniciante: `beginner`; intermediário: até `intermediate`; avançado: todas); e, se o aluno tiver 60 anos ou mais, não tem `technical_high` nem `knee_impact` (ADR-064).

Entre elegíveis para um mesmo padrão, a **ordenação determinística** é:

1. Prioridade por experiência — iniciante: máquina/guiado → peso corporal → halteres → cabo → barra; intermediário e avançado: barra → halteres → cabo → máquina → peso corporal.
2. Exercício já usado no programa atual do aluno (continuidade), quando o gerador parte de uma versão anterior.
3. Menor dificuldade permitida antes da maior (iniciante e intermediário); maior antes da menor (avançado).
4. Desempate final pelo código estável do exercício (`source_ref` ou identificador), em ordem alfabética.

## 7. Alternativas (RF-036, RF-064)

- Alternativa cadastrada manualmente tem prioridade.
- Sugestão automática no editor (RF-024): exercícios elegíveis do **mesmo padrão** com ao menos um grupo primário em comum, ordenados por §6.
- Na sessão (D5), só alternativas cadastradas e elegíveis para as restrições do aluno.

## Critérios de conclusão

- [x] Taxonomias finais (grupos, equipamentos, padrões, marcadores).
- [x] Mapa restrição → exclusão conservador e explícito sobre seus limites.
- [x] Elegibilidade e ordenação determinísticas.
- [x] ADR-060 e ADR-063 aprovadas.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 5). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 5). |
