# GOV-03 — Glossário

| Campo | Valor |
|---|---|
| Identificador | GOV-03 |
| Status | **Aprovado** (2026-10-26 — Etapa 1, revisão 3) · acréscimos da Etapa 2 aprovados em 2026-10-26 |
| Dono do assunto | Vocabulário oficial do domínio e do projeto |
| Dependências | PRD-05, PRD-07 |
| Última atualização | 2026-11-04 (versão 1.2) |

Este glossário é a fonte de verdade dos termos. Documentos, telas e código (na Fase 2) devem usar estes termos de forma consistente. Entre parênteses, o nome técnico sugerido em inglês para o código (definido de forma final em ARQ-04).

## Pessoas e papéis

| Termo | Definição |
|---|---|
| **Usuário** (`user`) | Pessoa com credenciais de acesso ao sistema. |
| **Papel de gestão** (`manager`; antes chamado "profissional") | Papel técnico de quem gerencia programas, catálogo, avaliações e — na modalidade TER — alunos. **Não** declara nem pressupõe habilitação profissional (ADR-003, ADR-018). O nome técnico final é definido em ARQ-04. |
| **Profissional habilitado** | Pessoa com habilitação legal para prescrever/orientar exercícios a terceiros, se exigida (verificação REG-01 em PRD-08). Não é um papel do sistema no MVP. |
| **Aluno** (`student`) | Pessoa que executa e registra treinos. Na modalidade PES, é o próprio usuário. Possui dados isolados dos demais alunos. |
| **Modalidade PES (uso pessoal)** | Uso do app para os próprios treinos. Única liberada no MVP. Ver PRD-08. |
| **Modalidade TER (acompanhamento de terceiros)** | Uso para planejar/acompanhar treinos de outras pessoas. Bloqueada pelo GATE-TER. |
| **GATE-TER** | Conjunto de verificações legais, regulatórias e técnicas que precisam ser concluídas, com nova ADR aprovada, antes de liberar a modalidade TER (PRD-08 §5). |
| **Perfil do aluno** (`student_profile`) | Conjunto de dados cadastrais e de treinamento do aluno (objetivo, experiência, disponibilidade, equipamentos, restrições, preferências). |
| **Conta com papel duplo** | Usuário com papel de gestão e papel de aluno de si mesmo (caso de uso inicial). Ver ADR-003. |

## Treinamento

| Termo | Definição |
|---|---|
| **Exercício** (`exercise`) | Item do catálogo: movimento com nome, grupos musculares, equipamentos, instruções, dificuldade, imagens e fonte/licença. |
| **Catálogo de exercícios** | Conjunto de exercícios disponíveis para prescrição. Composto por exercícios importados de fonte externa licenciada e exercícios personalizados criados pelo profissional. |
| **Grupo muscular primário / secundário** | Músculos principal e auxiliares trabalhados pelo exercício. |
| **Programa de treino** (`program`) | Plano de treinamento atribuído a um aluno, composto por um ou mais *treinos* (ex.: A, B, C). Existe em versões. |
| **Versão do programa** (`program_version`) | Fotografia imutável de um programa no momento da publicação. Versões anteriores ficam preservadas para consulta. |
| **Rascunho** (`draft`) | Versão de programa ainda em edição, invisível ao aluno. Pode ter sido criada manualmente ou pela geração automática. |
| **Publicação** | Ato do gestor de transformar um rascunho em versão ativa visível ao aluno. A versão ativa anterior passa a *arquivada*. |
| **Programa ativo** | A versão publicada vigente do aluno. No máximo uma por aluno. |
| **Sequência planejada** | Ordem dos treinos no programa (A → B → C…), usada pela recomendação. |
| **Ciclo** | Período em que cada treino do programa é realizado ao menos uma vez; base da recomendação (RN-013). |
| **Descanso configurado** | Horas que o usuário define (valor padrão e ajustes por grupo muscular) antes de o app recomendar de novo um treino que trabalhe o mesmo grupo primário. Preferência pessoal, não recomendação médica ou esportiva (RN-050, ADR-021). |
| **Treino** (`workout`) | Uma das rotinas do programa (ex.: "Treino A — Superiores"), com lista ordenada de exercícios prescritos. |
| **Divisão de treino** (`split`) | Forma de distribuir grupos musculares entre os treinos (ex.: Full Body, AB, ABC, Superior/Inferior). |
| **Exercício prescrito** (`workout_item`) | Exercício dentro de um treino, com prescrição: séries, faixa de repetições, intervalo de descanso, carga sugerida (opcional), método e orientações. |
| **Série** (`set`) | Uma execução contínua de repetições de um exercício. |
| **Repetição** (`rep`) | Uma execução completa do movimento. |
| **Faixa de repetições** | Intervalo prescrito (ex.: 8–12). |
| **Intervalo / descanso** | Tempo de pausa entre séries, em segundos. |
| **Carga** | Peso utilizado no exercício, em kg. Pode ser zero (peso corporal). |
| **RPE / PSE** | Percepção subjetiva de esforço (escala 0–10). Opcional no registro da sessão. |
| **Gerador / motor de geração** | Componente determinístico que monta um rascunho de programa a partir do perfil do aluno e do catálogo. Ver TRN-02. |

## Execução e frequência

| Termo | Definição |
|---|---|
| **Sessão de treino** (`session`) | Ocorrência real de execução de um treino em uma data, com séries registradas. |
| **Série registrada** (`set_log`) | Carga e repetições efetivamente realizadas em uma série de uma sessão. |
| **Status da sessão** | `em andamento` (iniciada, não concluída), `concluída` (encerrada pelo aluno), `registrada manualmente` (lançada após o fato), `abandonada` (aberta e não concluída dentro do prazo — ver RN). |
| **Treino planejado** | Projeção, na agenda, de um dia em que o aluno pretende treinar, derivada da disponibilidade semanal. Não gera registro e **não** conta como presença. |
| **Presença** | Dia com ao menos uma sessão `concluída` ou `registrada manualmente`. |
| **Treino recomendado** | Treino sugerido para hoje: próximo da sequência planejada, compatível com descanso, disponibilidade e histórico (RN-013), sempre com o motivo exibido. Pode ser "descanso sugerido". |

## Avaliação e evolução

| Termo | Definição |
|---|---|
| **Avaliação** (`assessment`) | Registro datado do estado do aluno: peso, medidas opcionais, objetivo, disponibilidade, preferências e restrições confirmadas. A primeira é a *avaliação inicial*. |
| **Reavaliação** | Avaliação periódica (padrão: a cada 30 dias) solicitada pelo sistema. |
| **Adiamento** | Postergação do lembrete de reavaliação para uma data escolhida pelo aluno (RN-015). |
| **Registro de peso** (`weight_entry`) | Medição de peso avulsa, fora de uma avaliação completa. |
| **Peso atual** | O registro de peso mais recente (de avaliação ou avulso). |
| **Peso-meta** | Peso alvo definido para o aluno. |
| **Dado desatualizado** | Informação cuja idade excede o limite definido nas regras de negócio; é sinalizada sem bloquear o uso. |
| **Revisão recomendada** | Sinalização ao gestor de que o programa ativo pode não refletir mais o perfil do aluno. |

## Versão 1.2

- **Modo Automático / Manual:** forma de usar o app (ADR-095). No Automático, a rotina é proposta e aceita com um toque; no Manual, a pessoa usa o editor.
- **Meu plano:** aba do modo Automático com a rotina atual e os motivos.
- **Ênfase:** músculo ou área que a pessoa quer priorizar (RN-064).
- **Motor de regras:** parte determinística que monta e valida a rotina (TRN-02); a IA trabalha sobre ele.

## Técnicos

| Termo | Definição |
|---|---|
| **PWA** | Progressive Web App: aplicação web instalável na tela inicial, com manifest e service worker. |
| **Service worker** | Script do navegador que intercepta requisições e permite cache e funcionamento offline. |
| **Manifest** | Arquivo JSON que descreve nome, ícones, cores e modo de exibição do app instalado. |
| **Fila de sincronização** | Armazenamento local (IndexedDB) de operações feitas offline, enviadas ao servidor quando a conexão volta. |
| **Estado de sincronização** | Aguardando envio, enviando, sincronizado, nova tentativa automática, recusado, conflito; marca "possível duplicidade". Só recusado e conflito exigem ação (RN-051, ADR-022). |
| **Pendência** | Registro salvo no aparelho e ainda não enviado. Não é conflito. |
| **Recusado** | Registro que o servidor não aceitou de forma definitiva (validação ou permissão); continua guardado no aparelho até o usuário corrigir ou descartar. |
| **Conflito de sincronização** | O mesmo registro alterado em dois lugares (ou excluído em um e alterado em outro). Resolvido por escolha do usuário, sem perda silenciosa (RN-046, ADR-022). |
| **Possível duplicidade** | Sessões criadas em dispositivos diferentes com horários sobrepostos (RN-045). |
| **Modo foco** | Forma da tela de execução: um exercício por vez, em tela cheia, com ações na zona do polegar (ADR-026). |
| **Zona do polegar** | Terço inferior da tela, alcançável com uma mão; recebe as ações principais da execução (UX-01 P3). |
| **Fila de saída** | Operações feitas no aparelho e ainda não confirmadas pelo servidor; nunca apagadas automaticamente (UX-08 §6). |
| **Lançamento 1** | Primeira entrega utilizável, composta pelos requisitos `ESS` (PRD-04 §2). |
| **ESS / DES / FUT** | Prioridades: essencial (Lançamento 1), desejável (incrementos D1–D5), futuro. |
| **Idempotência** | Propriedade de uma operação que pode ser repetida sem efeito duplicado (essencial para sincronização). |
| **ADR** | Architecture Decision Record — registro de decisão. |
| **MVP** | Produto mínimo viável: escopo definido em PRD-04. |
| **LGPD** | Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018). Aplicação ao projeto a verificar conforme PRD-08 §5. |
| **Dado tratado como sensível** | Dado que o projeto protege de forma reforçada por poder revelar informação de saúde (classificação preliminar em PRD-08 §6). |

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação. |
| 2026-10-26 | Revisão 2: papel de gestão, modalidades, GATE-TER, recomendação, sincronização, prioridades. |
| 2026-10-26 | Revisão 3: descanso configurado, estados de sincronização, pendência, recusado, conflito, adiamento. |
| 2026-10-26 | Aprovado pelo usuário (Etapa 1, revisão 3). |
| 2026-10-26 | Etapa 2: modo foco, zona do polegar, fila de saída. |
| 2026-10-26 | Acréscimos da Etapa 2 aprovados pelo usuário. |
| 2026-11-04 | Versão 1.2: termos novos. |
