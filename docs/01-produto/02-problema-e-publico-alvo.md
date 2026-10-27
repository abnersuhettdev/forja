# PRD-02 — Problema e Público-Alvo

| Campo | Valor |
|---|---|
| Identificador | PRD-02 |
| Status | **Aprovado** (2026-10-26 — Etapa 1, revisão 3) |
| Dono do assunto | Problemas a resolver, público-alvo, contexto de uso |
| Dependências | PRD-01 |
| Referenciado por | PRD-03, PRD-04, UX-01 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Descrever os problemas que o produto resolve, quem os tem e em que contexto, para orientar priorização e decisões de UX.

## 2. Problemas

| ID | Problema | Quem sofre | Consequência atual | Como o produto responde |
|---|---|---|---|---|
| PB-01 | Treinos anotados em papel, planilhas ou apps genéricos ficam dispersos e difíceis de consultar na academia. | Aluno | Esquece cargas anteriores; perde tempo; não progride de forma consistente. | Treino do dia na tela inicial; última carga exibida em cada exercício (RF-054, RF-061). |
| PB-02 | Registrar séries no celular é lento e incômodo entre séries. | Aluno | Deixa de registrar; histórico incompleto. | Valores pré-preenchidos, registro em ≤ 2 toques, cronômetro automático (RF-061, RF-062). |
| PB-03 | Conexão ruim na academia faz apps online falharem no meio do treino. | Aluno | Perda de dados e frustração. | Execução de sessão resiliente a perda de conexão (RF-091, ADR-005). |
| PB-04 | Montar um treino personalizado do zero é trabalhoso e sujeito a esquecer restrições. | Quem planeja o treino | Treinos genéricos; risco físico. | Gerador por regras que considera perfil, equipamentos e restrições, com revisão obrigatória (RF-021 a RF-024). |
| PB-05 | Alterações de treino sobrescrevem o anterior e perde-se o histórico. | Quem planeja o treino | Impossível comparar ou voltar atrás. | Versionamento imutável de programas (RF-025, RN-004). |
| PB-06 | Frequência real é desconhecida (planejado ≠ realizado). | Ambos | Avaliação de progresso imprecisa. | Presença baseada apenas em sessões efetivamente registradas (RN-011). |
| PB-07 | Dados do aluno ficam desatualizados (peso, disponibilidade, objetivo) e o treino deixa de fazer sentido. | Ambos | Treino inadequado ao momento do aluno. | Reavaliação periódica com adiamento e sinalização de dados desatualizados (RF-083 a RF-087). |
| PB-08 | Evolução física e de cargas não é visualizada. | Aluno | Desmotivação. | Gráficos simples de peso e de carga por exercício (RF-073, RF-081). |

## 3. Público-alvo

### 3.1 Primário (MVP)

| Segmento | Descrição |
|---|---|
| **Usuário-idealizador (modalidade PES)** | Treina em academia e usará o app diariamente para planejar (área de gestão) e executar (área do aluno) os **próprios** treinos, com uma conta de papel duplo (ADR-003). Não se presume habilitação profissional. **É o único público do Lançamento 1.** |

### 3.2 Secundário (modalidade TER — condicionada ao GATE-TER)

- Um gestor acompanhando um pequeno grupo de alunos terceiros adultos (≥ 18 anos, ADR-009), até ~50 (RNF-024), de iniciantes a avançados.
- Liberação somente após verificação legal e regulatória ([PRD-08](08-modalidades-de-uso-e-limites-profissionais.md)).

### 3.3 Futuro

- Profissionais adicionais com carteiras próprias; pequenos estúdios.

### 3.4 Fora do público

- Menores de 18 anos (ADR-009; a LGPD tem regras específicas para esse público — ver REG-13 em PRD-08).
- Pessoas em reabilitação clínica que necessitam de prescrição terapêutica (o app não substitui fisioterapia ou acompanhamento médico).

## 4. Contexto de uso

| Dimensão | Gestão (planejamento) | Aluno (execução) |
|---|---|---|
| Dispositivo principal | Celular e desktop (montagem do programa pode ser feita no computador) | Celular (Android ou iPhone — ADR-017) |
| Local | Academia, casa, escritório | Academia (principal) |
| Duração das interações | Minutos (cadastro, revisão de treino) | Segundos (entre séries) |
| Conectividade | Geralmente estável | Instável |
| Condições físicas | Normais | Mãos ocupadas/suadas, fadiga, pouca atenção disponível |
| Frequência | Semanal | 2–6 vezes por semana |

## 5. Implicações para o produto

1. Alvos de toque grandes, texto legível à distância de braço, contraste alto (detalhado em UX-07).
2. O caminho "abrir → treino do dia → registrar" deve ser o mais curto possível.
3. Funções de gestão devem funcionar bem também no desktop (tabelas e formulários largos), sem sacrificar o celular.
4. Dados de saúde e limitações físicas recebem proteção reforçada (classificação preliminar em PRD-08 §6; final em SEG-02).

## Critérios de conclusão

- [x] Problemas identificados e mapeados a requisitos.
- [x] Público e contexto descritos.
- [x] Respostas às perguntas Q-001 e Q-003 incorporadas (revisão 2).
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação. |
| 2026-10-26 | Revisão 2: público primário = uso pessoal; terceiros como modalidade condicionada; remoção de afirmação jurídica não verificada. |
| 2026-10-26 | Aprovado pelo usuário (Etapa 1, revisão 3). |
