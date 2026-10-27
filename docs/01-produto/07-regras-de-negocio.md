# PRD-07 — Regras de Negócio

| Campo | Valor |
|---|---|
| Identificador | PRD-07 |
| Status | **Aprovado** (2026-10-26 — Etapa 1, revisão 3) |
| Dono do assunto | Regras de negócio (RN-###), limites, prazos, faixas válidas e parâmetros |
| Dependências | PRD-01, PRD-05, PRD-08, ADRs |
| Referenciado por | DAD-01..05, TRN-01..05, SEG-01, SEG-02, PLN-03 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Definir as regras que governam o comportamento do sistema independentemente da interface. As regras são verificadas no **servidor**; a interface pode replicá-las para feedback rápido e, no caso da execução offline, aplicá-las localmente, mas o servidor revalida tudo na sincronização.

Parâmetros numéricos estão concentrados na [seção 11](#11-parâmetros). Regras detalhadas do motor de geração são de [TRN-02](../05-regras-de-treinamento/02-motor-de-geracao-de-treinos.md).

Coluna **Modal.**: `PES` vale no uso pessoal (e também em TER); `TER` só se aplica à modalidade de terceiros (PRD-08).

## 2. Acesso, modalidades e isolamento

| ID | Regra | Modal. | Aplica-se a |
|---|---|---|---|
| RN-001 | Um aluno só pode ler e alterar os próprios dados. Tentativas de acessar dados de outro aluno retornam "não encontrado", sem revelar a existência do recurso. | PES | Todos os RF do aluno |
| RN-002 | Somente o papel de gestão pode criar, editar, publicar, arquivar ou descartar programas, gerenciar alunos e gerenciar o catálogo. | PES | RF-012..041 |
| RN-033 | Um usuário pode acumular os papéis de gestão e de aluno (ADR-003). Ao atuar como aluno, aplicam-se a ele as regras de aluno; seus dados de aluno ficam isolados como os de qualquer outro. | PES | RF-005 |
| RN-040 | Enquanto o GATE-TER estiver fechado: (a) cada usuário de gestão possui exatamente um aluno vinculado — ele próprio; (b) operações exclusivas da modalidade TER são recusadas pelo servidor, não apenas ocultadas na interface. | PES | RF-011 e todos os RF TER |
| RN-041 | A liberação da modalidade TER exige todos os itens do GATE-TER concluídos (PRD-08 §5) e nova ADR aprovada pelo usuário. Consentimento ou aceite de termos pelos alunos **não** substitui eventual habilitação profissional exigida. | TER | ADR-018 |

## 3. Conta e dados pessoais

| ID | Regra | Modal. | Aplica-se a |
|---|---|---|---|
| RN-010 | O aluno deve ter 18 anos ou mais na data do cadastro (ADR-009). | PES | RF-009, RF-011 |
| RN-031 | Senha com no mínimo 10 caracteres (exigido pelo serviço de autenticação); o app recusa senha igual ao e-mail ou presente em lista de senhas comuns. Tentativas de login são limitadas por endereço IP pelo serviço de autenticação; após 5 falhas seguidas, o app impõe espera progressiva antes de nova tentativa (redação aprovada pela ADR-051). | PES | RF-001, RF-007 |
| RN-032 | Links de convite e de redefinição são de uso único, expiram (72 h convite / 1 h redefinição) e a geração de um novo link invalida o anterior. | TER | RF-003, RF-004 |
| RN-019 | Aluno desativado não faz login; suas sessões de acesso são encerradas; dados preservados; reativável; fora dos indicadores. | TER | RF-014 |
| RN-020 | A exclusão definitiva de aluno remove todos os seus dados pessoais e registros, mantendo apenas registro mínimo de auditoria sem dados pessoais. Irreversível; exige confirmação reforçada. Na PES, a exportação (RF-095) dos próprios dados segue o mesmo formato. | PES/TER | RF-095, RF-096 |
| RN-024 | **Dados comuns e dados tratados como sensíveis** seguem a classificação preliminar de [PRD-08 §6](08-modalidades-de-uso-e-limites-profissionais.md#6-classificação-preliminar-dos-dados). Dados tratados como sensíveis (restrições e limitações físicas, condições de saúde declaradas, medidas corporais, observações livres) recebem proteção reforçada em qualquer modalidade. Na modalidade TER, esses dados só podem ser registrados para um aluno terceiro depois de cumprida a base legal definida no GATE-TER (REG-03) — se for consentimento, com registro de data, versão e finalidade; revogação desativa a conta e sinaliza ao gestor. O sistema não afirma, em textos ao usuário, enquadramentos jurídicos não verificados. | PES/TER | RF-006, RF-009, RF-016, RF-097 |
| RN-030 | O sistema não diagnostica condições de saúde. Restrições são categorias declaradas; textos orientam a buscar profissional de saúde quando houver dor ou condição clínica; sugestões do gerador na PES são apresentadas como organização de treino para uso próprio. | PES | RF-009, RF-016, RF-021, RF-084 |

## 4. Programas e treinos

| ID | Regra | Modal. | Aplica-se a |
|---|---|---|---|
| RN-003 | Cada aluno tem no máximo **um** programa ativo e no máximo **um** rascunho aberto. | PES | RF-020, RF-021, RF-025 |
| RN-004 | Versões publicadas são imutáveis. Alterar exige novo rascunho e nova publicação. Versões arquivadas permanecem consultáveis enquanto o aluno existir. | PES | RF-025..027 |
| RN-005 | Rascunhos nunca são visíveis na área do aluno. | PES | RF-020, RF-028 |
| RN-035 | Para publicar: 1 a 7 treinos; cada treino com ao menos 1 exercício; cada exercício prescrito com séries (1–10), faixa de repetições (1–100, mín ≤ máx) **ou** duração em segundos (isométricos/cardio), e intervalo (0–600 s). A ordem dos treinos define a **sequência planejada**. | PES | RF-020, RF-024, RF-025 |
| RN-021 | Exercícios desativados não podem ser adicionados a rascunhos; continuam visíveis em versões publicadas e no histórico; rascunho com exercício desativado não pode ser publicado. | PES | RF-020, RF-024, RF-033 |
| RN-025 | Alterações em objetivo, disponibilidade, equipamentos ou restrições após a publicação marcam o programa ativo como **revisão recomendada**, removida ao publicar nova versão ou por dispensa explícita. | PES | RF-012, RF-084, RF-087 |

## 5. Geração automática (governança)

| ID | Regra | Modal. | Aplica-se a |
|---|---|---|---|
| RN-006 | A geração exige: data de nascimento, objetivo, experiência, dias por semana, tempo por sessão, equipamentos disponíveis e declaração de restrições (lista **ou** "nenhuma restrição" explícito). Faltando algo, a geração é bloqueada e as pendências listadas. | PES | RF-021, RF-022 |
| RN-007 | O gerador só usa exercícios **ativos** do catálogo; nunca cria exercícios ou referências inexistentes. | PES | RF-021 |
| RN-008 | O gerador exclui exercícios contraindicados para as restrições declaradas e os que exigem equipamento indisponível; os excluídos por restrição são listados. | PES | RF-021, RF-023, RF-064 |
| RN-009 | Todo programa gerado nasce como rascunho e só fica visível na área do aluno após publicação explícita. Nenhum componente automático (regras ou IA futura) pode publicar. | PES | RF-021, RF-025 |
| RN-022 | Biotipo não é coletado no MVP (ADR-011). | PES | RF-021 |
| RN-023 | Sexo (opcional), peso e altura não alteram a seleção de exercícios no MVP; idade e experiência influenciam volume e complexidade (TRN-02). | PES | RF-021 |

## 6. Recomendação, sessões, presença e agenda

| ID | Regra | Modal. | Aplica-se a |
|---|---|---|---|
| RN-013 | **Treino recomendado** (ADR-007): (1) **Ciclo:** um ciclo se completa quando cada treino do programa ativo tem ao menos uma sessão concluída ou registrada no ciclo; ao publicar nova versão, inicia-se um novo ciclo. (2) **Candidato:** o primeiro treino, na ordem da sequência planejada, ainda não realizado no ciclo atual. (3) **Descanso:** o candidato é incompatível se compartilhar algum grupo muscular primário com sessão concluída ou registrada há menos horas do que o descanso configurado para esse grupo (RN-050); nesse caso, procura-se o próximo treino pendente compatível no ciclo. (4) **Disponibilidade:** se a meta semanal (RN-038) já foi atingida na semana corrente, a recomendação é "descanso sugerido"; se hoje não for um dia preferido, exibe-se a observação "hoje não é um dia planejado", sem impedir a recomendação. (5) **Sem candidato compatível:** recomenda-se descanso e informa-se quando o próximo treino ficará compatível. (6) **Já treinou hoje:** exibe "treino de hoje concluído" e o próximo recomendado. (7) O usuário pode escolher qualquer treino; se incompatível com o descanso, recebe aviso **não bloqueante**. (8) A recomendação sempre exibe o motivo. Parâmetros em ADR-021. | PES | RF-050, RF-051 |
| RN-050 | **Descanso configurado:** os grupos musculares de um treino são a união dos grupos **primários** dos exercícios prescritos (taxonomia em TRN-03). O descanso de cada grupo é o valor que o usuário definiu para ele ou, na falta, o valor padrão que configurou (RF-055); 0 h desativa a verificação para o grupo. Esses valores são preferências do usuário e o app não os apresenta como recomendação médica ou esportiva. | PES | RF-051, RF-055 |
| RN-011 | **Presença** = dia (no fuso do aluno) com ao menos uma sessão `concluída` ou `registrada manualmente`. Em andamento, abandonadas e dias planejados não contam. | PES | RF-050, RF-065, RF-070 |
| RN-012 | O aluno tem no máximo uma sessão em andamento **por dispositivo** (garantido localmente; entre dispositivos offline, ver RN-045). Sessão sem atividade há mais de 6 h (pela última série registrada no dispositivo) passa a `abandonada`; pode ser concluída depois pelo aluno (informando o término) ou excluída. Para iniciar outra sessão, a anterior deve ser concluída ou descartada. | PES | RF-060, RF-066, RF-067 |
| RN-026 | Cargas e repetições registradas não alteram a prescrição; servem para pré-preencher e como referência. | PES | RF-061 |
| RN-027 | Sessão manual: data entre hoje e 60 dias atrás; vinculada a um treino de programa (ativo ou arquivado) do aluno; duração 1–300 min. Edição/exclusão de sessões pelo aluno até 60 dias da data da sessão. A janela **não** se aplica ao recebimento, na sincronização, de sessões criadas offline. | PES | RF-068, RF-069 |
| RN-028 | Datas/horas armazenadas em UTC e exibidas no fuso do aluno (padrão `America/Sao_Paulo`). O dia de uma sessão é determinado pela hora de início no fuso do aluno. | PES | RF-065, RF-070 |
| RN-029 | Dias **planejados** na agenda são projeção a partir dos dias preferidos do perfil; não são persistidos e nunca contam como presença. | PES | RF-071 |

## 7. Offline e sincronização

| ID | Regra | Modal. | Aplica-se a |
|---|---|---|---|
| RN-042 | **Idempotência:** sessões, séries e operações recebem identificador gerado no dispositivo. O servidor trata reenvios com o mesmo identificador como a mesma operação (sem duplicar). Uma operação só é removida da fila local após confirmação do servidor. Identificador já pertencente a outro usuário é recusado sem revelar o motivo. | PES | RF-091 |
| RN-043 | **Persistência antes da confirmação:** cada série é gravada no armazenamento local do dispositivo antes de ser exibida como registrada; falha de gravação local é exibida imediatamente ao usuário. | PES | RF-061, RF-066 |
| RN-044 | Cada sessão referencia a **versão** do programa e o treino com que foi iniciada; publicações posteriores não a alteram. | PES | RF-060, RF-072 |
| RN-045 | Sessões criadas offline em dispositivos diferentes são todas aceitas e salvas. Se tiverem horários sobrepostos, recebem a marca "possível duplicidade", que **não** é conflito: a revisão (manter ambas ou excluir uma, com confirmação) é opcional — ADR-022. | PES | RF-100 |
| RN-046 | **Conflito** existe somente quando o mesmo registro foi alterado em dois lugares: (a) edição local baseada em revisão anterior à que o servidor possui; ou (b) edição local de registro excluído em outro aparelho. A versão local é preservada até o usuário escolher qual manter (ou recriar/descartar, no caso b). Alteração local ainda não enviada, cuja base continua atual, **não** é conflito — ADR-022. | PES | RF-069, RF-100 |
| RN-047 | Dados locais são separados por usuário. Pendências só são enviadas na sessão autenticada do usuário que as criou. Logout ou troca de usuário com pendências exige confirmação explícita; nada é descartado sem decisão do usuário. | PES | RF-002, RF-101, RF-102 |
| RN-048 | Horários de sessões e séries são os do dispositivo; o servidor os aceita, mas sinaliza para revisão registros com horário futuro além da tolerância. | PES | RF-091 |
| RN-049 | Sessão concluída offline aparece localmente como presença **pendente de sincronização** e passa a valer no servidor quando sincronizada. A recomendação offline usa o histórico local (sincronizado + pendente). | PES | RF-050, RF-071 |
| RN-051 | **Estados de sincronização** de cada registro: aguardando envio, enviando, sincronizado, nova tentativa automática (falha temporária), recusado (recusa definitiva do servidor por validação ou permissão — nunca por falta de rede), conflito (RN-046) e a marca possível duplicidade (RN-045). Apenas "recusado" e "conflito" exigem ação. Nenhum registro em nenhum estado é descartado sem ação explícita do usuário, com confirmação que mostra o conteúdo a ser perdido. | PES | RF-092, RF-100 |
| RN-052 | **Saída da conta e dados locais** (UXP-02): (a) **sem pendências** — após confirmação, todos os dados locais do usuário são removidos do aparelho; o pacote do app e as imagens do catálogo (não pessoais) podem permanecer; (b) **com pendências** (inclui sessão em andamento e itens recusados ou em conflito) — o usuário escolhe entre enviar e sair (só online), sair mantendo as pendências no aparelho (somente as pendências ficam guardadas, isoladas, e são enviadas no próximo login do **mesmo** usuário; o restante é removido) ou descartar e sair (confirmação digitada após aviso explícito de que a ação é **irreversível**; as pendências são apagadas definitivamente); (c) se o envio falhar total ou parcialmente, as opções são reapresentadas com a contagem atualizada; itens recusados ou em conflito exigem resolução ou uma das opções de (b); (d) expiração ou revogação da sessão de acesso pelo servidor **não** é saída: nada é removido; (e) outro usuário que entre no mesmo aparelho não vê nem envia pendências mantidas de outro usuário, e o app não revela a existência delas. | PES | RF-101, RF-102, RF-103 |
| RN-053 | **Isolamento técnico dos dados locais** (ADR-028): (a) um armazenamento local por usuário, identificado por código opaco; o app abre apenas o do usuário autenticado; (b) cada operação da fila registra seu dono; o aparelho só envia operações do usuário da sessão atual; (c) o servidor identifica o usuário pela sessão de acesso, recusa operação cujo dono declarado diverja e aplica isolamento por linha no banco; (d) dados pessoais nunca são guardados em caches compartilhados (service worker ou cache HTTP); (e) pendências mantidas após a saída são criptografadas com chave derivada da senha do usuário e só são liberadas com essa senha; (f) separar dados apenas na interface **não** atende esta regra. | PES | RF-101, RF-102, RF-103 |

## 8. Avaliação, evolução e dados desatualizados

| ID | Regra | Modal. | Aplica-se a |
|---|---|---|---|
| RN-014 | A reavaliação vence quando hoje ≥ data da última avaliação + intervalo (30 dias no MVP; configurável por aluno é `FUT`). Vencida, gera lembrete no app, não bloqueante. | PES | RF-016, RF-083, RF-084 |
| RN-015 | O aluno pode adiar o lembrete de reavaliação escolhendo a próxima data (sugestão: 7 dias depois); não há limite de adiamentos; cada adiamento fica registrado; o lembrete volta a aparecer na data escolhida e nunca bloqueia o uso (ADR-020). | PES | RF-085 |
| RN-016 | **Desatualizado** (sinalização sem bloqueio): peso sem registro há mais de 30 dias; reavaliação vencida; programa publicado há mais de 12 semanas ou com revisão recomendada. | PES | RF-018, RF-086 |
| RN-017 | Peso atual = registro mais recente. Peso inicial = peso da avaliação inicial. Progresso % = (inicial − atual) / (inicial − meta) × 100, limitado a 0–100%; não exibido sem meta ou com meta = inicial. | PES | RF-080..082 |
| RN-018 | Faixas válidas: altura 120–230 cm; peso 30–300 kg (1 casa decimal); carga 0–500 kg (passo 0,5); repetições 0–100; PSE 0–10; circunferências 10–250 cm; % gordura 2–70; tempo por sessão 15–180 min; dias por semana 1–7. | PES | RF-009, RF-016, RF-061, RF-080, RF-088 |
| RN-038 | Meta semanal de presenças = dias disponíveis por semana do perfil vigente. | PES | RF-050, RF-082 |
| RN-039 | O aluno terceiro pode editar diretamente peso, medidas, preferências, dias preferidos, disponibilidade, equipamentos e restrições; objetivo e peso-meta somente via reavaliação; dados cadastrais somente pelo gestor. Aplica RN-025. | TER | RF-089 |
| RN-034 | Indicador "sem presença há N dias" usa N = 7. | TER | RF-010 |

## 9. Catálogo

| ID | Regra | Modal. | Aplica-se a |
|---|---|---|---|
| RN-036 | Toda imagem de exercício deve corresponder ao exercício e ter fonte e licença registradas; sem imagem adequada e licenciada, usa-se o placeholder (imagem inadequada nunca é preferível ao placeholder). Nome e instruções são exibidos em pt-BR, revisados, com a fonte registrada; correções de exercícios importados mantêm o registro da origem e da correção. | PES | RF-031, RF-032, RF-034, RF-038 |
| RN-037 | Exercícios importados e personalizados são identificados pela origem. Dados fictícios nunca se misturam a dados reais em produção e, em ambientes de teste, são marcados como tais. | PES | RF-032 |

## 10. Regras reservadas

RN-054 a RN-059 reservadas para as Etapas 4 e 5.

## 11. Parâmetros

| Parâmetro | Valor | Regra | Status |
|---|---|---|---|
| Intervalo de reavaliação | 30 dias (fixo no MVP) | RN-014 | Aprovado (ADR-008) |
| Adiamento da reavaliação | data escolhida pelo usuário (sugestão +7 dias), sem limite | RN-015 | Aprovado (ADR-020) |
| Descanso entre treinos com grupo primário em comum | configurado pelo usuário (padrão + por grupo); valor inicial **48 h**, editável | RN-013, RN-050 | Aprovado (ADR-021) |
| Semana para meta de presenças | segunda a domingo | RN-013, RN-038 | Aprovado (ADR-021) |
| Abandono de sessão | 6 h sem atividade | RN-012 | Aprovado (Etapa 1) |
| Janela de sessão manual / edição | 60 dias | RN-027 | Aprovado (ADR-015) |
| Tolerância de horário futuro do dispositivo | 5 min | RN-048 | Aprovado (Etapa 1) |
| Peso desatualizado / programa desatualizado | 30 dias / 12 semanas | RN-016 | Aprovado (Etapa 1) |
| Inatividade (dashboard TER) | 7 dias | RN-034 | Aprovado (Etapa 1) |
| Expiração de convite / redefinição | 72 h / 1 h | RN-032 | Aprovado (Etapa 1) |
| Limite de login | Por IP no serviço de autenticação (padrão do provedor) + espera progressiva no app após 5 falhas seguidas | RN-031 | Aprovado (ADR-051) |

Parâmetros "Sistema" são constantes centralizadas, alteráveis por deploy, sem tela de administração no MVP.

## Critérios de conclusão

- [x] Toda RN citada em PRD-05 está definida aqui.
- [x] Regras testáveis, com valores explícitos e status dos parâmetros.
- [x] Regras de offline/sincronização coerentes com histórico e isolamento (verificação em GOV-02 §8).
- [x] ADRs propostas vinculadas aprovadas.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação. |
| 2026-10-26 | Revisão 2: coluna Modalidade; RN-013 reescrita (sequência + descanso + disponibilidade + histórico); RN-012, RN-014, RN-015, RN-024, RN-027 revisadas; novas RN-040..050; parâmetros com status. |
| 2026-10-26 | Revisão 3: RN-013/RN-050 com descanso configurável; RN-015 simplificada; RN-045/RN-046 distinguem pendência, duplicidade e conflito; nova RN-051 (estados de sincronização); RN-036 cobre qualidade dos textos do catálogo. |
| 2026-10-26 | Aprovado pelo usuário (Etapa 1, revisão 3). |
| 2026-10-26 | Etapa 2: RN-052 criada (saída da conta e dados locais — UXP-02 aprovada; detalhamento aguardando confirmação). |
| 2026-10-26 | RN-052 marcada como aguardando confirmação e com aviso de irreversibilidade; RN-053 criada (isolamento técnico — proposta, ADR-028). |
| 2026-10-26 | RN-052 e RN-053 confirmadas pelo usuário. |
| 2026-10-26 | RN-031 reescrita conforme ADR-051 (aprovada pelo usuário). |
