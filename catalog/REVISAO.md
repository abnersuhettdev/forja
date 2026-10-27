# Revisão do catálogo pelo usuário (TAR-012)

> **Revisão concluída em 2026-10-27:** o usuário revisou e aprovou todos os 110 exercícios ("todos estao revisados e aprovados").

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
| [x] | `supino-reto-barra`            | Supino reto com barra            | Iniciante     | barbell, bench       | —                      |
| [x] | `supino-inclinado-barra`       | Supino inclinado com barra       | Iniciante     | barbell, bench       | —                      |
| [x] | `supino-declinado-barra`       | Supino declinado com barra       | Intermediário | barbell, bench       | —                      |
| [x] | `supino-reto-halteres`         | Supino reto com halteres         | Iniciante     | dumbbell, bench      | —                      |
| [x] | `supino-inclinado-halteres`    | Supino inclinado com halteres    | Iniciante     | dumbbell, bench      | —                      |
| [x] | `supino-maquina`               | Supino na máquina                | Iniciante     | machine              | —                      |
| [x] | `supino-smith`                 | Supino reto no Smith             | Iniciante     | smith_machine, bench | —                      |
| [x] | `flexao-de-bracos`             | Flexão de braços                 | Iniciante     | bodyweight           | wrist_loaded_extension |
| [x] | `flexao-inclinada`             | Flexão inclinada (mãos no banco) | Iniciante     | bodyweight, bench    | wrist_loaded_extension |
| [x] | `flexao-pes-elevados`          | Flexão com pés elevados          | Intermediário | bodyweight, bench    | wrist_loaded_extension |
| [x] | `crucifixo-reto-halteres`      | Crucifixo reto com halteres      | Iniciante     | dumbbell, bench      | —                      |
| [x] | `crucifixo-inclinado-halteres` | Crucifixo inclinado com halteres | Iniciante     | dumbbell, bench      | —                      |
| [x] | `voador`                       | Voador (peck deck)               | Iniciante     | machine              | —                      |
| [x] | `crossover-polia-alta`         | Crossover na polia alta          | Iniciante     | cable                | —                      |
| [x] | `crossover-polia-baixa`        | Crossover na polia baixa         | Iniciante     | cable                | —                      |
| [x] | `paralelas-peitoral`           | Paralelas com ênfase no peitoral | Intermediário | bodyweight, dip_bars | shoulder_end_range     |

### Tríceps

| ✓   | Código                   | Nome                               | Nível         | Equipamentos         | Marcadores                                 |
| --- | ------------------------ | ---------------------------------- | ------------- | -------------------- | ------------------------------------------ |
| [x] | `supino-fechado-barra`   | Supino fechado com barra           | Intermediário | barbell, bench       | —                                          |
| [x] | `triceps-polia-barra`    | Tríceps na polia com barra         | Iniciante     | cable                | —                                          |
| [x] | `triceps-polia-corda`    | Tríceps na polia com corda         | Iniciante     | cable                | —                                          |
| [x] | `triceps-frances-polia`  | Tríceps francês na polia com corda | Iniciante     | cable                | overhead                                   |
| [x] | `triceps-testa-barra-w`  | Tríceps testa com barra W          | Intermediário | ez_bar, bench        | elbow_loaded_extension                     |
| [x] | `triceps-frances-halter` | Tríceps francês com halter         | Iniciante     | dumbbell             | overhead                                   |
| [x] | `triceps-coice-halter`   | Tríceps coice com halter           | Iniciante     | dumbbell, bench      | —                                          |
| [x] | `mergulho-banco`         | Mergulho no banco                  | Iniciante     | bodyweight, bench    | shoulder_end_range, wrist_loaded_extension |
| [x] | `paralelas-triceps`      | Paralelas com ênfase no tríceps    | Intermediário | bodyweight, dip_bars | shoulder_end_range                         |
| [x] | `triceps-maquina`        | Tríceps na máquina                 | Iniciante     | machine              | —                                          |

### Ombros

| ✓   | Código                          | Nome                                    | Nível         | Equipamentos    | Marcadores                   |
| --- | ------------------------------- | --------------------------------------- | ------------- | --------------- | ---------------------------- |
| [x] | `desenvolvimento-halteres`      | Desenvolvimento com halteres            | Intermediário | dumbbell, bench | overhead                     |
| [x] | `desenvolvimento-militar-barra` | Desenvolvimento militar em pé com barra | Intermediário | barbell         | overhead, axial_spine_load   |
| [x] | `desenvolvimento-maquina`       | Desenvolvimento na máquina              | Iniciante     | machine         | overhead                     |
| [x] | `desenvolvimento-arnold`        | Desenvolvimento Arnold                  | Intermediário | dumbbell, bench | overhead, shoulder_end_range |
| [x] | `elevacao-lateral-halteres`     | Elevação lateral com halteres           | Iniciante     | dumbbell        | —                            |
| [x] | `elevacao-lateral-polia`        | Elevação lateral na polia               | Iniciante     | cable           | —                            |
| [x] | `elevacao-frontal-halteres`     | Elevação frontal com halteres           | Iniciante     | dumbbell        | —                            |
| [x] | `crucifixo-inverso-maquina`     | Crucifixo inverso na máquina            | Iniciante     | machine         | —                            |
| [x] | `crucifixo-inverso-halteres`    | Crucifixo inverso com halteres          | Iniciante     | dumbbell        | —                            |
| [x] | `face-pull`                     | Face pull na polia                      | Intermediário | cable           | —                            |
| [x] | `remada-alta-barra`             | Remada alta com barra                   | Intermediário | barbell         | shoulder_end_range           |

### Dorsais

| ✓   | Código                          | Nome                              | Nível         | Equipamentos           | Marcadores |
| --- | ------------------------------- | --------------------------------- | ------------- | ---------------------- | ---------- |
| [x] | `puxada-frontal-aberta`         | Puxada frontal aberta             | Iniciante     | cable                  | —          |
| [x] | `puxada-frontal-fechada`        | Puxada frontal com pegada fechada | Iniciante     | cable                  | —          |
| [x] | `puxada-supinada`               | Puxada com pegada supinada        | Iniciante     | cable                  | —          |
| [x] | `barra-fixa-pronada`            | Barra fixa (pegada pronada)       | Intermediário | bodyweight, pullup_bar | —          |
| [x] | `barra-fixa-supinada`           | Barra fixa (pegada supinada)      | Intermediário | bodyweight, pullup_bar | —          |
| [x] | `barra-fixa-assistida-elastico` | Barra fixa assistida com elástico | Iniciante     | band, pullup_bar       | —          |
| [x] | `pulldown-bracos-estendidos`    | Pulldown com braços estendidos    | Iniciante     | cable                  | —          |

### Costas (alta)

| ✓   | Código                     | Nome                                           | Nível         | Equipamentos        | Marcadores       |
| --- | -------------------------- | ---------------------------------------------- | ------------- | ------------------- | ---------------- |
| [x] | `remada-baixa-polia`       | Remada baixa sentada na polia                  | Iniciante     | cable               | —                |
| [x] | `remada-curvada-barra`     | Remada curvada com barra                       | Intermediário | barbell             | axial_spine_load |
| [x] | `remada-unilateral-halter` | Remada unilateral com halter (serrote)         | Iniciante     | dumbbell, bench     | —                |
| [x] | `remada-apoiada-halteres`  | Remada com halteres apoiada no banco inclinado | Iniciante     | dumbbell, bench     | —                |
| [x] | `remada-maquina`           | Remada na máquina                              | Iniciante     | machine             | —                |
| [x] | `remada-cavalinho`         | Remada cavalinho (barra T)                     | Intermediário | barbell             | axial_spine_load |
| [x] | `remada-invertida`         | Remada invertida                               | Iniciante     | bodyweight, barbell | —                |
| [x] | `encolhimento-halteres`    | Encolhimento com halteres                      | Iniciante     | dumbbell            | neck_load        |

### Lombar

| ✓   | Código                  | Nome                                     | Nível         | Equipamentos | Marcadores                                                |
| --- | ----------------------- | ---------------------------------------- | ------------- | ------------ | --------------------------------------------------------- |
| [x] | `extensao-lombar-banco` | Extensão lombar no banco (hiperextensão) | Iniciante     | machine      | spine_flexion_loaded                                      |
| [x] | `superman`              | Superman (extensão lombar no solo)       | Iniciante     | bodyweight   | —                                                         |
| [x] | `levantamento-terra`    | Levantamento terra com barra             | Intermediário | barbell      | axial_spine_load, hip_deep_flexion_loaded, technical_high |

### Quadríceps

| ✓   | Código                            | Nome                                | Nível         | Equipamentos    | Marcadores                                                                          |
| --- | --------------------------------- | ----------------------------------- | ------------- | --------------- | ----------------------------------------------------------------------------------- |
| [x] | `agachamento-livre-barra`         | Agachamento livre com barra         | Intermediário | barbell         | axial_spine_load, deep_knee_flexion_loaded, hip_deep_flexion_loaded, technical_high |
| [x] | `agachamento-frontal-barra`       | Agachamento frontal com barra       | Avançado      | barbell         | axial_spine_load, deep_knee_flexion_loaded, wrist_loaded_extension, technical_high  |
| [x] | `agachamento-goblet`              | Agachamento goblet                  | Iniciante     | dumbbell        | deep_knee_flexion_loaded                                                            |
| [x] | `agachamento-peso-corporal`       | Agachamento com peso corporal       | Iniciante     | bodyweight      | —                                                                                   |
| [x] | `leg-press-45`                    | Leg press 45°                       | Iniciante     | machine         | deep_knee_flexion_loaded, hip_deep_flexion_loaded                                   |
| [x] | `agachamento-hack-maquina`        | Agachamento hack na máquina         | Intermediário | machine         | deep_knee_flexion_loaded                                                            |
| [x] | `agachamento-smith`               | Agachamento no Smith                | Iniciante     | smith_machine   | axial_spine_load, deep_knee_flexion_loaded                                          |
| [x] | `afundo-halteres`                 | Afundo com halteres                 | Iniciante     | dumbbell        | deep_knee_flexion_loaded                                                            |
| [x] | `afundo-caminhando-barra`         | Afundo caminhando com barra         | Intermediário | barbell         | axial_spine_load, deep_knee_flexion_loaded                                          |
| [x] | `afundo-caminhando-peso-corporal` | Afundo caminhando com peso corporal | Iniciante     | bodyweight      | —                                                                                   |
| [x] | `afundo-estatico-halteres`        | Afundo estático com halteres        | Iniciante     | dumbbell        | deep_knee_flexion_loaded                                                            |
| [x] | `subida-banco-halteres`           | Subida no banco com halteres        | Intermediário | dumbbell, bench | —                                                                                   |
| [x] | `agachamento-sumo-halter`         | Agachamento sumô com halter         | Iniciante     | dumbbell        | —                                                                                   |
| [x] | `cadeira-extensora`               | Cadeira extensora                   | Iniciante     | machine         | —                                                                                   |

### Posteriores

| ✓   | Código               | Nome                                | Nível         | Equipamentos | Marcadores                                |
| --- | -------------------- | ----------------------------------- | ------------- | ------------ | ----------------------------------------- |
| [x] | `mesa-flexora`       | Mesa flexora                        | Iniciante     | machine      | —                                         |
| [x] | `cadeira-flexora`    | Cadeira flexora                     | Iniciante     | machine      | —                                         |
| [x] | `flexora-nordica`    | Flexora nórdica                     | Avançado      | bodyweight   | —                                         |
| [x] | `terra-romeno-barra` | Levantamento terra romeno com barra | Intermediário | barbell      | axial_spine_load, hip_deep_flexion_loaded |
| [x] | `stiff-halteres`     | Stiff com halteres                  | Iniciante     | dumbbell     | axial_spine_load, hip_deep_flexion_loaded |

### Glúteos

| ✓   | Código                    | Nome                       | Nível         | Equipamentos   | Marcadores             |
| --- | ------------------------- | -------------------------- | ------------- | -------------- | ---------------------- |
| [x] | `elevacao-pelvica-barra`  | Elevação pélvica com barra | Intermediário | barbell, bench | —                      |
| [x] | `ponte-gluteo-barra`      | Ponte de glúteo com barra  | Intermediário | barbell        | —                      |
| [x] | `ponte-gluteo-unilateral` | Ponte de glúteo unilateral | Iniciante     | bodyweight     | —                      |
| [x] | `coice-gluteo-solo`       | Coice de glúteo no solo    | Iniciante     | bodyweight     | wrist_loaded_extension |
| [x] | `coice-gluteo-polia`      | Coice de glúteo na polia   | Iniciante     | cable          | —                      |

### Abdutores

| ✓   | Código                        | Nome                           | Nível     | Equipamentos | Marcadores |
| --- | ----------------------------- | ------------------------------ | --------- | ------------ | ---------- |
| [x] | `cadeira-abdutora`            | Cadeira abdutora               | Iniciante | machine      | —          |
| [x] | `abducao-elastico-caminhando` | Caminhada lateral com elástico | Iniciante | band         | —          |

### Adutores

| ✓   | Código            | Nome                           | Nível     | Equipamentos | Marcadores |
| --- | ----------------- | ------------------------------ | --------- | ------------ | ---------- |
| [x] | `cadeira-adutora` | Cadeira adutora                | Iniciante | machine      | —          |
| [x] | `aducao-elastico` | Adução de quadril com elástico | Iniciante | band         | —          |

### Panturrilhas

| ✓   | Código                       | Nome                           | Nível     | Equipamentos | Marcadores |
| --- | ---------------------------- | ------------------------------ | --------- | ------------ | ---------- |
| [x] | `panturrilha-em-pe-maquina`  | Panturrilha em pé na máquina   | Iniciante | machine      | —          |
| [x] | `panturrilha-sentado`        | Panturrilha sentado            | Iniciante | machine      | —          |
| [x] | `panturrilha-leg-press`      | Panturrilha no leg press       | Iniciante | machine      | —          |
| [x] | `panturrilha-em-pe-halteres` | Panturrilha em pé com halteres | Iniciante | dumbbell     | —          |

### Bíceps

| ✓   | Código                     | Nome                         | Nível     | Equipamentos    | Marcadores |
| --- | -------------------------- | ---------------------------- | --------- | --------------- | ---------- |
| [x] | `rosca-direta-barra`       | Rosca direta com barra       | Iniciante | barbell         | —          |
| [x] | `rosca-direta-barra-w`     | Rosca direta com barra W     | Iniciante | ez_bar          | —          |
| [x] | `rosca-alternada-halteres` | Rosca alternada com halteres | Iniciante | dumbbell        | —          |
| [x] | `rosca-martelo`            | Rosca martelo                | Iniciante | dumbbell        | —          |
| [x] | `rosca-inclinada-halteres` | Rosca inclinada com halteres | Iniciante | dumbbell, bench | —          |
| [x] | `rosca-concentrada`        | Rosca concentrada            | Iniciante | dumbbell, bench | —          |
| [x] | `rosca-scott-barra`        | Rosca Scott com barra        | Iniciante | barbell, bench  | —          |
| [x] | `rosca-polia`              | Rosca na polia               | Iniciante | cable           | —          |
| [x] | `rosca-maquina`            | Rosca na máquina             | Iniciante | machine         | —          |

### Antebraços

| ✓   | Código                         | Nome                                | Nível         | Equipamentos    | Marcadores |
| --- | ------------------------------ | ----------------------------------- | ------------- | --------------- | ---------- |
| [x] | `rosca-punho-halteres`         | Rosca de punho com halteres         | Iniciante     | dumbbell, bench | —          |
| [x] | `rosca-punho-inversa-halteres` | Rosca de punho inversa com halteres | Iniciante     | dumbbell, bench | —          |
| [x] | `caminhada-do-fazendeiro`      | Caminhada do fazendeiro             | Intermediário | dumbbell        | —          |

### Abdômen

| ✓   | Código                  | Nome                                | Nível         | Equipamentos           | Marcadores           |
| --- | ----------------------- | ----------------------------------- | ------------- | ---------------------- | -------------------- |
| [x] | `prancha`               | Prancha                             | Iniciante     | bodyweight             | —                    |
| [x] | `dead-bug`              | Dead bug                            | Iniciante     | bodyweight             | —                    |
| [x] | `abdominal-supra`       | Abdominal supra                     | Iniciante     | bodyweight             | —                    |
| [x] | `abdominal-polia`       | Abdominal na polia ajoelhado        | Intermediário | cable                  | spine_flexion_loaded |
| [x] | `abdominal-infra`       | Abdominal infra (reverso)           | Iniciante     | bodyweight             | —                    |
| [x] | `elevacao-pernas-barra` | Elevação de pernas na barra fixa    | Avançado      | bodyweight, pullup_bar | —                    |
| [x] | `elevacao-pernas-banco` | Elevação de pernas deitado no banco | Iniciante     | bodyweight, bench      | —                    |

### Oblíquos

| ✓   | Código              | Nome                                 | Nível         | Equipamentos | Marcadores            |
| --- | ------------------- | ------------------------------------ | ------------- | ------------ | --------------------- |
| [x] | `prancha-lateral`   | Prancha lateral                      | Iniciante     | bodyweight   | —                     |
| [x] | `abdominal-obliquo` | Abdominal oblíquo                    | Iniciante     | bodyweight   | —                     |
| [x] | `rotacao-russa`     | Rotação russa                        | Intermediário | bodyweight   | spine_rotation_loaded |
| [x] | `pallof-press`      | Pallof press (antirrotação na polia) | Iniciante     | cable        | —                     |
