# TRN-02 — Motor de Geração de Treinos

| Campo | Valor |
|---|---|
| Identificador | TRN-02 |
| Status | **Aprovado** (2026-10-26 — Etapa 5) |
| Etapa | 5 |
| Dono do assunto | Algoritmo determinístico de geração de rascunhos (10 passos da seção 6.7 do prompt), parâmetros de prescrição, relatório e casos de teste |
| Dependências | TRN-01, TRN-03, ADR-006, ADR-018, RN-006..009, RN-022, RN-023, RN-030, RN-035, DAD-04 (API-016) |
| Referenciado por | UX-05 (TELA-051), SEG-03, PLN-01 |
| Decisões | ADR-061 (algoritmo), ADR-062 (parâmetros de prescrição), ADR-064 (ajustes por idade) — aprovadas |
| Prioridade | `DES` → versão 1.2 (PLN-06, ADR-093) |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo e limites

Gerar um **rascunho** de programa a partir dos dados reais do aluno, de forma determinística, explicável e testável (ADR-006).

O motor:

- nunca publica (RN-009); nunca cria exercícios nem referências inexistentes (RN-007);
- nunca inclui exercício excluído por restrição ou equipamento (RN-008);
- **não sugere cargas** (não há dado confiável para isso; a carga é registrada pelo usuário — RN-026);
- na modalidade PES, apresenta o resultado como **sugestão de organização para uso próprio**, não como prescrição (ADR-018, RN-030).

Os parâmetros numéricos (§5) são valores de referência gerais, configuráveis e versionados no código; **não** constituem prescrição individual e precisam de revisão por profissional habilitado antes de qualquer uso com terceiros (GATE-TER).

## 2. Entrada e saída

| Entrada | Origem |
|---|---|
| Perfil de treinamento (TRN-01 §4) e data de nascimento | `students`, `training_profiles` |
| Ênfase em músculo ou área (versão 1.2) | `training_profiles.emphasis_groups` (RN-064) |
| Catálogo elegível | TRN-03 §6 |
| Data de referência (para idade) | Passada como parâmetro (o motor não lê o relógio) |
| Versão anterior do programa (opcional) | Para continuidade (TRN-03 §6, critério 2) |
| Versão dos parâmetros e do motor | Constantes versionadas |

| Saída | Destino |
|---|---|
| Rascunho completo (treinos, itens, prescrição) | `draft.create` com `source = generated` (API-016) |
| Relatório (`generator_report`) | Premissas, parâmetros, exclusões, vagas não preenchidas, avisos, versões |

**Determinismo:** mesmas entradas + mesmas versões ⇒ mesma saída, byte a byte. Não há aleatoriedade.

## 3. Algoritmo (os 10 passos)

### Passo 1 — Validar dados

Verificar RN-006 (TRN-01 §4). Faltando qualquer item: **parar** e devolver a lista de pendências (RF-022).

### Passo 2 — Identificar informações faltantes ou desatualizadas

Sem bloquear, registrar avisos: dados desatualizados (RN-016), restrição `other`/`cardiovascular`/`pregnancy` (TRN-01 §3.5), objetivo e disponibilidade incoerentes (ex.: 1 dia/semana com objetivo hipertrofia → "volume semanal baixo para o objetivo").

### Passo 3 — Determinar a divisão

| Dias/semana | Iniciante | Intermediário | Avançado |
|---|---|---|---|
| 1 | Corpo inteiro (A) | Corpo inteiro (A) | Corpo inteiro (A) |
| 2 | Corpo inteiro (A, B) | Corpo inteiro (A, B) | Corpo inteiro (A, B) |
| 3 | Corpo inteiro (A, B, C) | Empurrar/Puxar/Pernas (A, B, C) | Empurrar/Puxar/Pernas (A, B, C) |
| 4 | Superior/Inferior (A, B) | Superior/Inferior (A, B, C, D) | Superior/Inferior (A, B, C, D) |
| 5 | Superior/Inferior (A, B) | Empurrar/Puxar/Pernas + Superior/Inferior (A–E) | Empurrar/Puxar/Pernas + Superior/Inferior (A–E) |
| 6–7 | Superior/Inferior (A, B) | Empurrar/Puxar/Pernas ×2 (A–F) | Empurrar/Puxar/Pernas ×2 (A–F) |

- Os treinos se repetem pela sequência planejada (RN-013); por isso iniciantes com muitos dias recebem poucos treinos distintos, alternados.
- Com 7 dias, o relatório avisa que a recomendação considerará o descanso configurado (RN-050) e a meta semanal.
- Treinos repetidos de mesmo tipo (ex.: Superior 1 e Superior 2) usam variações (Passo 6).

### Passo 4 — Calcular o orçamento de tempo

- Tempo útil = tempo por sessão − 5 min (aquecimento).
- Tempo estimado de um item = séries × (45 s + descanso prescrito) + 60 s de transição (mesma fórmula de TRN-04 §5).
- Itens são adicionados na ordem das vagas (Passo 5) enquanto couberem no tempo útil; mínimo de 3 e máximo de 9 itens por treino.

### Passo 5 — Montar as vagas (modelos por tipo de treino)

Ordem = prioridade. Vagas marcadas com * são opcionais (entram se houver tempo).

| Tipo | Vagas em ordem |
|---|---|
| Corpo inteiro | `squat` · `h_push` · `h_pull` · `hinge` · `v_pull` · `v_push`* · `core_stability`* · `lunge`* · `elbow_flex`* · `elbow_ext`* · `calf`* |
| Empurrar | `h_push` · `v_push` · `h_push` (variação) · `shoulder_iso` · `elbow_ext` · `chest_iso`* · `elbow_ext` (variação)* |
| Puxar | `v_pull` · `h_pull` · `h_pull` (variação) · `shoulder_iso` (posterior)* · `elbow_flex` · `elbow_flex` (variação)* · `carry_grip`* |
| Pernas | `squat` · `hinge` · `lunge` · `knee_flex` · `knee_ext`* · `calf` · `core_stability`* · `hip_abd_add`* |
| Superior | `h_push` · `h_pull` · `v_push` · `v_pull` · `elbow_flex`* · `elbow_ext`* · `shoulder_iso`* |
| Inferior | `squat` · `hinge` · `lunge` · `knee_flex`* · `knee_ext`* · `calf`* · `core_stability`* |

Nos dois primeiros dias de corpo inteiro (A e B), as vagas alternam ênfase: B troca `squat`→`lunge`/`hinge` principal e `h_push`→`v_push`, para variar estímulos.

### Passo 6 — Selecionar exercícios do catálogo

Para cada vaga, escolher o primeiro exercício elegível do padrão segundo a ordenação de TRN-03 §6, com as regras:

1. Não repetir o mesmo exercício dentro do programa enquanto houver outro elegível no padrão; vagas "variação" e treinos repetidos (Superior 2, Empurrar 2…) usam o próximo da ordenação.
2. Vaga sem candidato elegível fica **vazia** e é registrada no relatório com o motivo (equipamento, restrição, dificuldade). O motor **nunca** substitui por exercício excluído.
3. Se um treino terminar com menos de 3 itens, o relatório marca o treino como "insuficiente — revise" (o rascunho é gerado mesmo assim, e a publicação depende da validação RN-035 e da revisão humana).

### Passo 7 — Organizar a sequência

Dentro do treino: compostos primeiro (na ordem das vagas), depois isolados, depois core. Treinos ordenados A, B, C… na sequência planejada.

### Passo 8 — Prescrever séries, repetições, intervalos e orientações

Aplicar a tabela de §5 conforme objetivo, experiência e tipo do exercício (composto/isolado/core), com os ajustes por idade (§5.3). Exercícios de medida `duration` (ex.: prancha) usam 20–45 s (iniciante), 30–60 s (intermediário/avançado). Orientações padrão por item: "Escolha uma carga que permita completar a faixa de repetições com boa execução." Carga sugerida: vazia.

### Passo 9 — Verificar o volume semanal (informativo) e gerar o relatório

Calcular séries semanais por grupo muscular **primário**, considerando a rotação dos treinos pelos dias disponíveis, e comparar com a faixa de referência do objetivo (§5.2). Fora da faixa → aviso no relatório (o motor não reajusta automaticamente além dos passos anteriores).

### Passo 10 — Entregar para revisão

Criar o rascunho (`draft.create`, origem `generated`) e abrir o editor (TELA-031) com o painel do relatório (TELA-051). Publicar exige ação humana (RN-009); versões anteriores continuam preservadas (RN-004).

## 4. Relatório do gerador (`generator_report`)

```json
{
  "engine_version": "1.0.0",
  "parameters_version": "1.0.0",
  "reference_date": "2026-11-10",
  "inputs": { "goal": "hypertrophy", "experience": "intermediate", "age": 34, "days_per_week": 4, "minutes_per_session": 60, "equipment": ["barbell", "dumbbell", "cable", "machine", "bench", "pullup_bar", "bodyweight"], "restrictions": ["lower_back"] },
  "split": "upper_lower_4",
  "excluded": [ { "exercise": "Agachamento livre com barra", "reason": "restriction:lower_back (axial_spine_load)" } ],
  "unfilled_slots": [ { "workout": "B — Inferior", "slot": "hinge", "reason": "nenhum exercício elegível sem marcadores excluídos" } ],
  "weekly_volume": [ { "group": "chest", "sets": 12, "reference": "10–20", "status": "ok" } ],
  "warnings": [ "Restrição em lombar: exercícios com carga axial foram excluídos. Em caso de dor, procure um profissional de saúde." ]
}
```

O relatório é exibido em linguagem simples (TELA-051): "Considerado: … · Excluídos e por quê: … · Não preenchido: … · Avisos: …".

## 5. Parâmetros de prescrição (ADR-062)

### 5.1 Séries, repetições e descanso por objetivo

Formato: séries (iniciante / intermediário / avançado) · repetições · descanso em segundos.

| Objetivo | Composto | Isolado | Core |
|---|---|---|---|
| Hipertrofia | 2 / 3 / 4 · 6–10 (iniciante 8–12) · 120 | 2 / 3 / 3 · 10–15 · 75 | 2 / 3 / 3 · 10–15 · 60 |
| Força | 2 / 3 / 4 · 3–6 (iniciante 6–8) · 180 | 2 / 2 / 3 · 8–12 · 90 | 2 / 3 / 3 · 8–12 · 60 |
| Emagrecimento | 2 / 3 / 3 · 10–15 · 60 | 2 / 3 / 3 · 12–15 · 45 | 2 / 3 / 3 · 12–20 · 45 |
| Condicionamento | 2 / 3 / 3 · 12–20 · 45 | 2 / 2 / 3 · 15–20 · 30 | 2 / 3 / 3 · 15–20 · 30 |
| Manutenção | 2 / 2 / 3 · 8–12 · 90 | 2 / 2 / 2 · 10–15 · 60 | 2 / 2 / 3 · 10–15 · 60 |
| Qualidade de vida | 2 / 2 / 3 · 10–15 · 75 | 2 / 2 / 2 · 12–15 · 60 | 2 / 2 / 3 · 10–15 · 60 |

### 5.2 Faixa de referência de séries semanais por grupo primário (somente para o aviso do Passo 9)

| Objetivo | Grupos grandes | Grupos pequenos |
|---|---|---|
| Hipertrofia | 10–20 | 6–12 |
| Força | 6–15 | 4–10 |
| Emagrecimento, condicionamento, manutenção, qualidade de vida | 4–12 | 2–8 |

Iniciantes: o limite inferior é reduzido pela metade.

### 5.3 Ajustes por idade (ADR-064)

- 60 anos ou mais: séries −1 por item (mínimo 1 em isolados, 2 em compostos); exercícios `technical_high` e `knee_impact` inelegíveis (TRN-03 §6); aviso para avaliação de saúde antes de iniciar.
- Menores de 18 anos não são atendidos (RN-010).

### 5.4 Referências gerais consultadas para os valores padrão

- American College of Sports Medicine. *Progression Models in Resistance Training for Healthy Adults* (posicionamento oficial). Medicine & Science in Sports & Exercise, 2009.
- Schoenfeld, Ogborn e Krieger. Relação dose-resposta entre volume semanal de treino de força e hipertrofia (meta-análise). Journal of Sports Sciences, 2017.
- Organização Mundial da Saúde. Diretrizes sobre atividade física e comportamento sedentário, 2020 (fortalecimento muscular ao menos 2 dias por semana).

As referências fundamentam a ordem de grandeza dos padrões; a escolha exata de cada número é uma simplificação do projeto e deve ser lida como tal.

## 6. Casos de teste de referência (SEG-03)

| Caso | Perfil | Resultado esperado (estrutura) |
|---|---|---|
| CT-GER-01 | Dados faltando (sem experiência) | Sem rascunho; pendência "Informe sua experiência" |
| CT-GER-02 | PER-01: intermediário, hipertrofia, 4 dias, 60 min, academia completa, sem restrições, 34 anos | Superior/Inferior com 4 treinos distintos; compostos em barra primeiro; 6–8 itens por treino; volume semanal de peitoral, costas e pernas na faixa 10–20 |
| CT-GER-03 | PER-02: iniciante, emagrecimento, 3 dias, 50 min, academia básica, sem restrições, 28 anos | Corpo inteiro A/B/C; prioridade a máquinas; 2 séries de 10–15; descanso 60 s nos compostos |
| CT-GER-04 | PER-03: intermediário, hipertrofia, 4 dias, 60 min, restrição `lower_back`, 41 anos | Nenhum exercício com `axial_spine_load`, `spine_flexion_loaded`, `spine_rotation_loaded` ou `hip_deep_flexion_loaded`; exclusões listadas; aviso de saúde |
| CT-GER-05 | Em casa, apenas peso corporal e elástico | Vagas sem candidato registradas como não preenchidas; nenhum exercício com equipamento ausente |
| CT-GER-06 | 65 anos, iniciante | Séries reduzidas conforme §5.3; nenhum `technical_high`/`knee_impact` |
| CT-GER-07 | Mesma entrada duas vezes | Saídas idênticas |
| CT-GER-08 | Restrição `other` | Rascunho gerado com aviso de revisão manual obrigatória |

## 7. IA sobre o motor (ADR-093; versão 1.2, planejada)

Um componente futuro de IA poderá **propor ajustes** ao rascunho gerado, recebendo apenas o perfil e os exercícios **elegíveis** (identificadores do catálogo). Toda proposta passa pelas mesmas validações (elegibilidade, RN-035) antes de alterar o rascunho, e o resultado continua exigindo revisão e publicação humanas (RN-009).

Na 1.2 esse componente é o Cloudflare Workers AI. Diferenças em relação ao texto acima: além do perfil e dos elegíveis, recebe os dados de ADR-093; devolve ajustes e motivos em linguagem simples; sem IA, sem cota ou com resposta inválida, vale o rascunho do motor (RN-062). A publicação é o toque da própria pessoa. **O motor continua sem sugerir cargas (§1).** A determinação de §2 vale para o motor; a resposta da IA não é determinística, por isso o relatório registra o modelo usado e se o rascunho final é só do motor.

## Critérios de conclusão

- [x] Os 10 passos especificados de forma determinística e testável.
- [x] Parâmetros explícitos, com referências e limites de uso declarados.
- [x] Casos de teste de referência definidos.
- [x] ADR-061, ADR-062 e ADR-064 aprovadas.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 5). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 5). |
| 2026-11-04 | Versão 1.2: IA sobre o motor e ênfase (ADR-093). |
