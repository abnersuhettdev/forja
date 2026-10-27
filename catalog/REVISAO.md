# Revisão do catálogo pelo usuário (TAR-012)

Condição para avançar da TAR-012 (PLN-01): revisar **primeiro os exercícios do seu programa real**. CA-038 só fica verde quando todos os textos estiverem revisados (`text_review: "revisado"`, conferido por `node scripts/catalog/validate.ts --release`).

## Como revisar

Para cada exercício, confira em `catalog/exercicios.json`:

1. **Nome** — é o nome usual na sua academia?
2. **Instruções e dicas** — corretas e claras? Sem linguagem de prescrição ou diagnóstico (RN-030).
3. **Classificação** — padrão de movimento, músculos primários/secundários, equipamentos, nível.
4. **Marcadores de sobrecarga** (TRN-03 §5) — determinam exclusões por restrição; na dúvida, prefira marcar.

Ao aprovar um item, marque a caixa abaixo (ou me diga quais códigos aprovar) e o campo passa para `"revisado"`. Correções podem ser ditas em linguagem livre.

## Pontos que dependem da sua decisão

- **Elástico como alternativa a máquina (D4):** para a cadeira abdutora, a única alternativa sem máquina na fonte usa elástico (caminhada lateral). O validador aceita elástico, banco, barra fixa e paralelas como "equipamento portátil". Confirme se isso atende ao critério.
- **Níveis:** a fonte classifica quase tudo como iniciante; ajustei vários compostos com barra para intermediário e deixei como avançado apenas agachamento frontal, elevação de pernas na barra e flexora nórdica.
- **Marcadores:** atribuídos de forma conservadora (ex.: flexão de braços com `wrist_loaded_extension`; remada curvada com `axial_spine_load`). São heurística de organização de treino, não orientação clínica.
- **Exercícios do seu programa real** que não estejam na lista: informe e eu os incluo primeiro (DAD-06 §4, prioridade).

## Lista (110 exercícios)

### Peitoral

| ✓   | Código                         | Nome                             | Nível         | Equipamentos         | Marcadores             |
| --- | ------------------------------ | -------------------------------- | ------------- | -------------------- | ---------------------- |
| [ ] | `supino-reto-barra`            | Supino reto com barra            | Iniciante     | barbell, bench       | —                      |
| [ ] | `supino-inclinado-barra`       | Supino inclinado com barra       | Iniciante     | barbell, bench       | —                      |
| [ ] | `supino-declinado-barra`       | Supino declinado com barra       | Intermediário | barbell, bench       | —                      |
| [ ] | `supino-reto-halteres`         | Supino reto com halteres         | Iniciante     | dumbbell, bench      | —                      |
| [ ] | `supino-inclinado-halteres`    | Supino inclinado com halteres    | Iniciante     | dumbbell, bench      | —                      |
| [ ] | `supino-maquina`               | Supino na máquina                | Iniciante     | machine              | —                      |
| [ ] | `supino-smith`                 | Supino reto no Smith             | Iniciante     | smith_machine, bench | —                      |
| [ ] | `flexao-de-bracos`             | Flexão de braços                 | Iniciante     | bodyweight           | wrist_loaded_extension |
| [ ] | `flexao-inclinada`             | Flexão inclinada (mãos no banco) | Iniciante     | bodyweight, bench    | wrist_loaded_extension |
| [ ] | `flexao-pes-elevados`          | Flexão com pés elevados          | Intermediário | bodyweight, bench    | wrist_loaded_extension |
| [ ] | `crucifixo-reto-halteres`      | Crucifixo reto com halteres      | Iniciante     | dumbbell, bench      | —                      |
| [ ] | `crucifixo-inclinado-halteres` | Crucifixo inclinado com halteres | Iniciante     | dumbbell, bench      | —                      |
| [ ] | `voador`                       | Voador (peck deck)               | Iniciante     | machine              | —                      |
| [ ] | `crossover-polia-alta`         | Crossover na polia alta          | Iniciante     | cable                | —                      |
| [ ] | `crossover-polia-baixa`        | Crossover na polia baixa         | Iniciante     | cable                | —                      |
| [ ] | `paralelas-peitoral`           | Paralelas com ênfase no peitoral | Intermediário | bodyweight, dip_bars | shoulder_end_range     |

### Tríceps

| ✓   | Código                   | Nome                               | Nível         | Equipamentos         | Marcadores                                 |
| --- | ------------------------ | ---------------------------------- | ------------- | -------------------- | ------------------------------------------ |
| [ ] | `supino-fechado-barra`   | Supino fechado com barra           | Intermediário | barbell, bench       | —                                          |
| [ ] | `triceps-polia-barra`    | Tríceps na polia com barra         | Iniciante     | cable                | —                                          |
| [ ] | `triceps-polia-corda`    | Tríceps na polia com corda         | Iniciante     | cable                | —                                          |
| [ ] | `triceps-frances-polia`  | Tríceps francês na polia com corda | Iniciante     | cable                | overhead                                   |
| [ ] | `triceps-testa-barra-w`  | Tríceps testa com barra W          | Intermediário | ez_bar, bench        | elbow_loaded_extension                     |
| [ ] | `triceps-frances-halter` | Tríceps francês com halter         | Iniciante     | dumbbell             | overhead                                   |
| [ ] | `triceps-coice-halter`   | Tríceps coice com halter           | Iniciante     | dumbbell, bench      | —                                          |
| [ ] | `mergulho-banco`         | Mergulho no banco                  | Iniciante     | bodyweight, bench    | shoulder_end_range, wrist_loaded_extension |
| [ ] | `paralelas-triceps`      | Paralelas com ênfase no tríceps    | Intermediário | bodyweight, dip_bars | shoulder_end_range                         |
| [ ] | `triceps-maquina`        | Tríceps na máquina                 | Iniciante     | machine              | —                                          |

### Ombros

| ✓   | Código                          | Nome                                    | Nível         | Equipamentos    | Marcadores                   |
| --- | ------------------------------- | --------------------------------------- | ------------- | --------------- | ---------------------------- |
| [ ] | `desenvolvimento-halteres`      | Desenvolvimento com halteres            | Intermediário | dumbbell, bench | overhead                     |
| [ ] | `desenvolvimento-militar-barra` | Desenvolvimento militar em pé com barra | Intermediário | barbell         | overhead, axial_spine_load   |
| [ ] | `desenvolvimento-maquina`       | Desenvolvimento na máquina              | Iniciante     | machine         | overhead                     |
| [ ] | `desenvolvimento-arnold`        | Desenvolvimento Arnold                  | Intermediário | dumbbell, bench | overhead, shoulder_end_range |
| [ ] | `elevacao-lateral-halteres`     | Elevação lateral com halteres           | Iniciante     | dumbbell        | —                            |
| [ ] | `elevacao-lateral-polia`        | Elevação lateral na polia               | Iniciante     | cable           | —                            |
| [ ] | `elevacao-frontal-halteres`     | Elevação frontal com halteres           | Iniciante     | dumbbell        | —                            |
| [ ] | `crucifixo-inverso-maquina`     | Crucifixo inverso na máquina            | Iniciante     | machine         | —                            |
| [ ] | `crucifixo-inverso-halteres`    | Crucifixo inverso com halteres          | Iniciante     | dumbbell        | —                            |
| [ ] | `face-pull`                     | Face pull na polia                      | Intermediário | cable           | —                            |
| [ ] | `remada-alta-barra`             | Remada alta com barra                   | Intermediário | barbell         | shoulder_end_range           |

### Dorsais

| ✓   | Código                          | Nome                              | Nível         | Equipamentos           | Marcadores |
| --- | ------------------------------- | --------------------------------- | ------------- | ---------------------- | ---------- |
| [ ] | `puxada-frontal-aberta`         | Puxada frontal aberta             | Iniciante     | cable                  | —          |
| [ ] | `puxada-frontal-fechada`        | Puxada frontal com pegada fechada | Iniciante     | cable                  | —          |
| [ ] | `puxada-supinada`               | Puxada com pegada supinada        | Iniciante     | cable                  | —          |
| [ ] | `barra-fixa-pronada`            | Barra fixa (pegada pronada)       | Intermediário | bodyweight, pullup_bar | —          |
| [ ] | `barra-fixa-supinada`           | Barra fixa (pegada supinada)      | Intermediário | bodyweight, pullup_bar | —          |
| [ ] | `barra-fixa-assistida-elastico` | Barra fixa assistida com elástico | Iniciante     | band, pullup_bar       | —          |
| [ ] | `pulldown-bracos-estendidos`    | Pulldown com braços estendidos    | Iniciante     | cable                  | —          |

### Costas (alta)

| ✓   | Código                     | Nome                                           | Nível         | Equipamentos        | Marcadores       |
| --- | -------------------------- | ---------------------------------------------- | ------------- | ------------------- | ---------------- |
| [ ] | `remada-baixa-polia`       | Remada baixa sentada na polia                  | Iniciante     | cable               | —                |
| [ ] | `remada-curvada-barra`     | Remada curvada com barra                       | Intermediário | barbell             | axial_spine_load |
| [ ] | `remada-unilateral-halter` | Remada unilateral com halter (serrote)         | Iniciante     | dumbbell, bench     | —                |
| [ ] | `remada-apoiada-halteres`  | Remada com halteres apoiada no banco inclinado | Iniciante     | dumbbell, bench     | —                |
| [ ] | `remada-maquina`           | Remada na máquina                              | Iniciante     | machine             | —                |
| [ ] | `remada-cavalinho`         | Remada cavalinho (barra T)                     | Intermediário | barbell             | axial_spine_load |
| [ ] | `remada-invertida`         | Remada invertida                               | Iniciante     | bodyweight, barbell | —                |
| [ ] | `encolhimento-halteres`    | Encolhimento com halteres                      | Iniciante     | dumbbell            | neck_load        |

### Lombar

| ✓   | Código                  | Nome                                     | Nível         | Equipamentos | Marcadores                                                |
| --- | ----------------------- | ---------------------------------------- | ------------- | ------------ | --------------------------------------------------------- |
| [ ] | `extensao-lombar-banco` | Extensão lombar no banco (hiperextensão) | Iniciante     | machine      | spine_flexion_loaded                                      |
| [ ] | `superman`              | Superman (extensão lombar no solo)       | Iniciante     | bodyweight   | —                                                         |
| [ ] | `levantamento-terra`    | Levantamento terra com barra             | Intermediário | barbell      | axial_spine_load, hip_deep_flexion_loaded, technical_high |

### Quadríceps

| ✓   | Código                            | Nome                                | Nível         | Equipamentos    | Marcadores                                                                          |
| --- | --------------------------------- | ----------------------------------- | ------------- | --------------- | ----------------------------------------------------------------------------------- |
| [ ] | `agachamento-livre-barra`         | Agachamento livre com barra         | Intermediário | barbell         | axial_spine_load, deep_knee_flexion_loaded, hip_deep_flexion_loaded, technical_high |
| [ ] | `agachamento-frontal-barra`       | Agachamento frontal com barra       | Avançado      | barbell         | axial_spine_load, deep_knee_flexion_loaded, wrist_loaded_extension, technical_high  |
| [ ] | `agachamento-goblet`              | Agachamento goblet                  | Iniciante     | dumbbell        | deep_knee_flexion_loaded                                                            |
| [ ] | `agachamento-peso-corporal`       | Agachamento com peso corporal       | Iniciante     | bodyweight      | —                                                                                   |
| [ ] | `leg-press-45`                    | Leg press 45°                       | Iniciante     | machine         | deep_knee_flexion_loaded, hip_deep_flexion_loaded                                   |
| [ ] | `agachamento-hack-maquina`        | Agachamento hack na máquina         | Intermediário | machine         | deep_knee_flexion_loaded                                                            |
| [ ] | `agachamento-smith`               | Agachamento no Smith                | Iniciante     | smith_machine   | axial_spine_load, deep_knee_flexion_loaded                                          |
| [ ] | `afundo-halteres`                 | Afundo com halteres                 | Iniciante     | dumbbell        | deep_knee_flexion_loaded                                                            |
| [ ] | `afundo-caminhando-barra`         | Afundo caminhando com barra         | Intermediário | barbell         | axial_spine_load, deep_knee_flexion_loaded                                          |
| [ ] | `afundo-caminhando-peso-corporal` | Afundo caminhando com peso corporal | Iniciante     | bodyweight      | —                                                                                   |
| [ ] | `afundo-estatico-halteres`        | Afundo estático com halteres        | Iniciante     | dumbbell        | deep_knee_flexion_loaded                                                            |
| [ ] | `subida-banco-halteres`           | Subida no banco com halteres        | Intermediário | dumbbell, bench | —                                                                                   |
| [ ] | `agachamento-sumo-halter`         | Agachamento sumô com halter         | Iniciante     | dumbbell        | —                                                                                   |
| [ ] | `cadeira-extensora`               | Cadeira extensora                   | Iniciante     | machine         | —                                                                                   |

### Posteriores

| ✓   | Código               | Nome                                | Nível         | Equipamentos | Marcadores                                |
| --- | -------------------- | ----------------------------------- | ------------- | ------------ | ----------------------------------------- |
| [ ] | `mesa-flexora`       | Mesa flexora                        | Iniciante     | machine      | —                                         |
| [ ] | `cadeira-flexora`    | Cadeira flexora                     | Iniciante     | machine      | —                                         |
| [ ] | `flexora-nordica`    | Flexora nórdica                     | Avançado      | bodyweight   | —                                         |
| [ ] | `terra-romeno-barra` | Levantamento terra romeno com barra | Intermediário | barbell      | axial_spine_load, hip_deep_flexion_loaded |
| [ ] | `stiff-halteres`     | Stiff com halteres                  | Iniciante     | dumbbell     | axial_spine_load, hip_deep_flexion_loaded |

### Glúteos

| ✓   | Código                    | Nome                       | Nível         | Equipamentos   | Marcadores             |
| --- | ------------------------- | -------------------------- | ------------- | -------------- | ---------------------- |
| [ ] | `elevacao-pelvica-barra`  | Elevação pélvica com barra | Intermediário | barbell, bench | —                      |
| [ ] | `ponte-gluteo-barra`      | Ponte de glúteo com barra  | Intermediário | barbell        | —                      |
| [ ] | `ponte-gluteo-unilateral` | Ponte de glúteo unilateral | Iniciante     | bodyweight     | —                      |
| [ ] | `coice-gluteo-solo`       | Coice de glúteo no solo    | Iniciante     | bodyweight     | wrist_loaded_extension |
| [ ] | `coice-gluteo-polia`      | Coice de glúteo na polia   | Iniciante     | cable          | —                      |

### Abdutores

| ✓   | Código                        | Nome                           | Nível     | Equipamentos | Marcadores |
| --- | ----------------------------- | ------------------------------ | --------- | ------------ | ---------- |
| [ ] | `cadeira-abdutora`            | Cadeira abdutora               | Iniciante | machine      | —          |
| [ ] | `abducao-elastico-caminhando` | Caminhada lateral com elástico | Iniciante | band         | —          |

### Adutores

| ✓   | Código            | Nome                           | Nível     | Equipamentos | Marcadores |
| --- | ----------------- | ------------------------------ | --------- | ------------ | ---------- |
| [ ] | `cadeira-adutora` | Cadeira adutora                | Iniciante | machine      | —          |
| [ ] | `aducao-elastico` | Adução de quadril com elástico | Iniciante | band         | —          |

### Panturrilhas

| ✓   | Código                       | Nome                           | Nível     | Equipamentos | Marcadores |
| --- | ---------------------------- | ------------------------------ | --------- | ------------ | ---------- |
| [ ] | `panturrilha-em-pe-maquina`  | Panturrilha em pé na máquina   | Iniciante | machine      | —          |
| [ ] | `panturrilha-sentado`        | Panturrilha sentado            | Iniciante | machine      | —          |
| [ ] | `panturrilha-leg-press`      | Panturrilha no leg press       | Iniciante | machine      | —          |
| [ ] | `panturrilha-em-pe-halteres` | Panturrilha em pé com halteres | Iniciante | dumbbell     | —          |

### Bíceps

| ✓   | Código                     | Nome                         | Nível     | Equipamentos    | Marcadores |
| --- | -------------------------- | ---------------------------- | --------- | --------------- | ---------- |
| [ ] | `rosca-direta-barra`       | Rosca direta com barra       | Iniciante | barbell         | —          |
| [ ] | `rosca-direta-barra-w`     | Rosca direta com barra W     | Iniciante | ez_bar          | —          |
| [ ] | `rosca-alternada-halteres` | Rosca alternada com halteres | Iniciante | dumbbell        | —          |
| [ ] | `rosca-martelo`            | Rosca martelo                | Iniciante | dumbbell        | —          |
| [ ] | `rosca-inclinada-halteres` | Rosca inclinada com halteres | Iniciante | dumbbell, bench | —          |
| [ ] | `rosca-concentrada`        | Rosca concentrada            | Iniciante | dumbbell, bench | —          |
| [ ] | `rosca-scott-barra`        | Rosca Scott com barra        | Iniciante | barbell, bench  | —          |
| [ ] | `rosca-polia`              | Rosca na polia               | Iniciante | cable           | —          |
| [ ] | `rosca-maquina`            | Rosca na máquina             | Iniciante | machine         | —          |

### Antebraços

| ✓   | Código                         | Nome                                | Nível         | Equipamentos    | Marcadores |
| --- | ------------------------------ | ----------------------------------- | ------------- | --------------- | ---------- |
| [ ] | `rosca-punho-halteres`         | Rosca de punho com halteres         | Iniciante     | dumbbell, bench | —          |
| [ ] | `rosca-punho-inversa-halteres` | Rosca de punho inversa com halteres | Iniciante     | dumbbell, bench | —          |
| [ ] | `caminhada-do-fazendeiro`      | Caminhada do fazendeiro             | Intermediário | dumbbell        | —          |

### Abdômen

| ✓   | Código                  | Nome                                | Nível         | Equipamentos           | Marcadores           |
| --- | ----------------------- | ----------------------------------- | ------------- | ---------------------- | -------------------- |
| [ ] | `prancha`               | Prancha                             | Iniciante     | bodyweight             | —                    |
| [ ] | `dead-bug`              | Dead bug                            | Iniciante     | bodyweight             | —                    |
| [ ] | `abdominal-supra`       | Abdominal supra                     | Iniciante     | bodyweight             | —                    |
| [ ] | `abdominal-polia`       | Abdominal na polia ajoelhado        | Intermediário | cable                  | spine_flexion_loaded |
| [ ] | `abdominal-infra`       | Abdominal infra (reverso)           | Iniciante     | bodyweight             | —                    |
| [ ] | `elevacao-pernas-barra` | Elevação de pernas na barra fixa    | Avançado      | bodyweight, pullup_bar | —                    |
| [ ] | `elevacao-pernas-banco` | Elevação de pernas deitado no banco | Iniciante     | bodyweight, bench      | —                    |

### Oblíquos

| ✓   | Código              | Nome                                 | Nível         | Equipamentos | Marcadores            |
| --- | ------------------- | ------------------------------------ | ------------- | ------------ | --------------------- |
| [ ] | `prancha-lateral`   | Prancha lateral                      | Iniciante     | bodyweight   | —                     |
| [ ] | `abdominal-obliquo` | Abdominal oblíquo                    | Iniciante     | bodyweight   | —                     |
| [ ] | `rotacao-russa`     | Rotação russa                        | Intermediário | bodyweight   | spine_rotation_loaded |
| [ ] | `pallof-press`      | Pallof press (antirrotação na polia) | Iniciante     | cable        | —                     |
