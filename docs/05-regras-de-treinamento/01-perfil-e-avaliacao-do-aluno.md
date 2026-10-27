# TRN-01 — Perfil e Avaliação do Aluno

| Campo | Valor |
|---|---|
| Identificador | TRN-01 |
| Status | **Aprovado** (2026-10-26 — Etapa 5) |
| Etapa | 5 |
| Dono do assunto | Campos do perfil de treinamento e da avaliação, enumerações **finais** (substituem as provisórias de DAD-02 §7 e UX-05), presets de local e dados mínimos para geração |
| Dependências | PRD-07 (RN-006, RN-010, RN-018, RN-022..025, RN-030), ADR-010, ADR-011, DAD-02 |
| Referenciado por | TRN-02, TRN-03, TRN-05, UX-05 (TELA-003, TELA-037, TELA-038), DAD-07 (seeds) |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Definir exatamente o que o perfil e a avaliação registram, os valores permitidos e o que é exigido para gerar um treino, cobrindo a seção 6.6 do prompt mestre.

## 2. Campos (cobertura da seção 6.6)

| Campo do prompt | Onde fica | Observação |
|---|---|---|
| Nome, e-mail, data de nascimento | `students` | E-mail = login na PES |
| Sexo (quando relevante e informado) | `students.sex` | Opcional; não altera o gerador (RN-023) |
| Altura | `students.height_cm` | Opcional |
| Peso inicial e atual | `weight_entries` (inicial = avaliação inicial) | RN-017 |
| Peso-meta | `training_profiles.goal_weight_kg` | Opcional |
| Objetivo | `training_profiles.goal` | §3.1 |
| Experiência na academia | `experience_level` | §3.2 |
| Estilo de vida e nível de atividade | `activity_level` | §3.3; informativo |
| Disponibilidade semanal | `days_per_week`, `preferred_weekdays` | RN-038, RN-029 |
| Tempo por sessão | `minutes_per_session` | 15–180 |
| Preferências | `preferences_note` (texto livre) | Exibido ao revisar o rascunho; **não** interpretado automaticamente |
| Equipamentos disponíveis | `training_location` + `equipment_codes` | §3.4; TRN-03 §3 |
| Restrições e limitações | `restrictions_declared`, `restriction_codes`, `restrictions_note` | §3.5; tratadas como sensíveis |
| Data da avaliação inicial | `assessments.assessed_on` (`initial`) | — |
| Data da última atualização | `training_profiles.updated_at` e última avaliação | RN-016 |
| Biotipo | **Não coletado** | ADR-011 |

## 3. Enumerações finais

### 3.1 Objetivo (`goal`)

| Código | Rótulo | Descrição exibida |
|---|---|---|
| `hypertrophy` | Hipertrofia | Aumentar a massa muscular |
| `weight_loss` | Emagrecimento | Reduzir gordura corporal com treino de força |
| `strength` | Força | Aumentar a carga máxima em exercícios principais |
| `conditioning` | Condicionamento | Resistência muscular e disposição |
| `maintenance` | Manutenção | Manter o que já conquistou |
| `quality_of_life` | Qualidade de vida | Saúde geral, mobilidade e bem-estar |

### 3.2 Experiência (`experience_level`)

| Código | Rótulo | Critério exibido (autodeclarado) |
|---|---|---|
| `beginner` | Iniciante | Treina há menos de 6 meses ou parou há mais de 1 ano |
| `intermediate` | Intermediário | Treina com regularidade há 6 meses a 2 anos |
| `advanced` | Avançado | Treina com regularidade há mais de 2 anos e domina os exercícios básicos |

### 3.3 Atividade fora da academia (`activity_level`)

`sedentary` (Pouco ativo — trabalho sentado, pouca caminhada) · `light` (Levemente ativo) · `moderate` (Moderadamente ativo) · `high` (Muito ativo — trabalho físico ou esportes frequentes). Informativo no MVP; não altera o gerador.

### 3.4 Local (`training_location`) e presets de equipamentos

O local pré-seleciona equipamentos (códigos de TRN-03 §3); o usuário pode ajustar a lista.

| Código | Rótulo | Equipamentos pré-selecionados |
|---|---|---|
| `full_gym` | Academia completa | Todos |
| `basic_gym` | Academia básica | `barbell`, `dumbbell`, `bench`, `machine`, `cable`, `pullup_bar`, `bodyweight` |
| `home` | Em casa | `dumbbell`, `band`, `bodyweight` |
| `outdoor` | Ao ar livre | `bodyweight`, `pullup_bar`, `band` |

### 3.5 Categorias de restrição (`restriction_codes`)

| Código | Rótulo | Tratamento no gerador (TRN-03 §5) |
|---|---|---|
| `shoulder` | Ombro | Exclusão por marcadores |
| `elbow` | Cotovelo | Exclusão por marcadores |
| `wrist` | Punho/mão | Exclusão por marcadores |
| `neck` | Pescoço/cervical | Exclusão por marcadores |
| `thoracic` | Parte alta das costas/torácica | Exclusão por marcadores |
| `lower_back` | Lombar | Exclusão por marcadores |
| `hip` | Quadril | Exclusão por marcadores |
| `knee` | Joelho | Exclusão por marcadores |
| `ankle` | Tornozelo/pé | Exclusão por marcadores |
| `cardiovascular` | Condição cardiovascular ou respiratória declarada | Sem exclusão automática; aviso obrigatório no rascunho para buscar avaliação de saúde (RN-030) |
| `pregnancy` | Gestação ou pós-parto recente | Sem exclusão automática; aviso obrigatório (RN-030) |
| `other` | Outra | Sem exclusão automática; aviso obrigatório e revisão manual |

Texto fixo na tela de restrições: "Estas categorias servem para o app evitar exercícios que costumam sobrecarregar a região. Elas não substituem avaliação de um profissional de saúde."

## 4. Dados mínimos para gerar um treino (RN-006)

| Dado | Pendência exibida se faltar |
|---|---|
| Data de nascimento | "Informe sua data de nascimento" |
| Objetivo | "Escolha um objetivo" |
| Experiência | "Informe sua experiência" |
| Dias por semana | "Informe quantos dias por semana pode treinar" |
| Tempo por sessão | "Informe o tempo disponível por treino" |
| Equipamentos (ao menos 1) | "Informe onde treina e os equipamentos disponíveis" |
| Restrições declaradas (`none` ou lista) | "Confirme se possui restrições ou limitações" |

Dados desatualizados (RN-016) não bloqueiam a geração, mas aparecem como aviso no relatório do gerador.

## 5. Avaliação

| Item | Inicial | Periódica (reavaliação — D1) |
|---|---|---|
| Peso | Obrigatório | Obrigatório |
| Medidas corporais | Opcionais (D3) | Opcionais (D3) |
| Fotografia do perfil (`profile_snapshot`) | Gravada | Gravada, com as respostas "continua igual" ou alterações |
| Efeito | Cria peso inicial | Atualiza perfil; aplica RN-025 se houver mudança relevante; reinicia o prazo de RN-014 |

## Critérios de conclusão

- [x] Todos os campos da seção 6.6 mapeados.
- [x] Enumerações finais com rótulos e regras.
- [x] Dados mínimos de geração definidos.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 5). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 5). |
