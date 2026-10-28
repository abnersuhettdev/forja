# ARQ-06 — Registro de Decisões (ADRs)

| Campo | Valor |
|---|---|
| Identificador | ARQ-06 |
| Status | Vivo (recebe novas ADRs a cada etapa) |
| Dono do assunto | Todas as decisões relevantes de produto, processo e arquitetura |
| Dependências | — |
| Referenciado por | Todos os documentos |
| Última atualização | 2026-10-28 (ADR-092; extensão da ADR-090) |

## 1. Objetivo

Registrar decisões relevantes com contexto, alternativas, justificativa e consequências, para que qualquer sessão futura entenda **por que** algo é como é.

## 2. Regras

- Status: `Proposta` → `Aprovada` | `Rejeitada`; uma decisão aprovada pode ser `Substituída` por outra ADR (indicar qual).
- **Nenhuma ADR é marcada como `Aprovada` sem confirmação explícita do usuário**, registrada em [GOV-02 §6](../00-governanca/02-controle-de-progresso.md#6-registro-de-aprovações).
- Quando o usuário aprova o núcleo de uma decisão, mas não os parâmetros detalhados propostos por Claude, os parâmetros ficam em ADR separada com status `Proposta`, para que o status de cada item seja inequívoco.
- ADRs nunca são apagadas; identificadores nunca são reutilizados.
- Decisões de produto também são registradas aqui (exigência do prompt mestre), com o campo **Tipo**.

## 3. Índice

| ADR | Título | Tipo | Etapa | Status | Depende de informação do usuário? |
|---|---|---|---|---|---|
| ADR-001 | Sequência oficial das etapas | Processo | 0 | **Aprovada** | Não |
| ADR-002 | Arquitetura multi-aluno, MVP focado no uso pessoal | Produto/Arquitetura | 1 | **Aprovada** | Não |
| ADR-003 | Conta única com papel duplo (profissional + aluno) | Produto | 1 | **Aprovada** | Não |
| ADR-004 | Acesso de terceiros por convite/link; recuperação pessoal por procedimento operacional | Produto | 1 | **Aprovada** | Não |
| ADR-005 | Execução de treino offline com sincronização posterior | Produto/Arquitetura | 1 | **Aprovada** | Não |
| ADR-006 | Geração de treino por motor de regras determinístico | Produto/Arquitetura | 1 | **Aprovada** | Não |
| ADR-007 | Treino recomendado: próximo da sequência, respeitando disponibilidade, descanso e histórico | Produto | 1 | **Aprovada** | Não |
| ADR-008 | Reavaliação a cada 30 dias, lembrete no app, adiável | Produto | 1 | **Aprovada** | Não |
| ADR-009 | Público exclusivamente adulto (≥ 18 anos) | Produto | 1 | **Aprovada** | Não |
| ADR-010 | Medições: peso obrigatório, medidas opcionais, sem fotos | Produto | 1 | **Aprovada** | Não |
| ADR-011 | Biotipo não coletado; sexo opcional e não determinante | Produto | 1 | **Aprovada** | Não |
| ADR-012 | Catálogo: fonte externa licenciada + exercícios personalizados | Produto | 1 (verificar na 4) | **Aprovada** | Não |
| ADR-013 | Localização: pt-BR, métrico, fuso America/Sao_Paulo | Produto | 1 | **Aprovada** | Não |
| ADR-014 | Edição de perfil por aluno terceiro com sinalização de revisão | Produto | 1 | **Aprovada** | Não |
| ADR-015 | Janela de 60 dias para sessões manuais e edições | Produto | 1 | **Aprovada** | Não |
| ADR-016 | Diretriz de custo: hospedagem gratuita ou de baixo custo | Produto/Arquitetura | 1 → 3 | **Aprovada** | Parcial — Q-006 (domínio) |
| ADR-017 | PWA para Android e iPhone, com limitações documentadas | Produto/Arquitetura | 1 → 2 | **Aprovada** | Não |
| ADR-018 | Modalidades de uso (Pessoal / Terceiros) e gate regulatório | Produto/Legal | 1 | **Aprovada** | Sim — verificação jurídica antes de liberar TER |
| ADR-019 | Recorte do Lançamento 1 (43 RF essenciais) | Produto | 1 | **Aprovada** | Não |
| ADR-020 | Adiamento da reavaliação por data escolhida, sem limite | Produto | 1 | **Aprovada** | Não |
| ADR-021 | Descanso como preferência configurável (padrão + por grupo muscular) | Produto | 1 (detalhar na 5) | **Aprovada** | Não |
| ADR-022 | Estados de sincronização e política de conflitos | Produto/Arquitetura | 1 (detalhar na 4) | **Aprovada** | Não |
| ADR-023 | Identidade visual "Grafite e lima" e nome provisório Forja | Produto/UX | 2 | **Aprovada** | Não |
| ADR-024 | Temas claro e escuro, seguindo o sistema | UX | 2 | **Aprovada** | Não |
| ADR-025 | Navegação por áreas com barra inferior | UX | 2 | **Aprovada** | Não |
| ADR-026 | Execução do treino em modo foco | UX | 2 | **Aprovada** | Não |
| ADR-027 | Estratégia de dados offline e fila de saída | UX/Arquitetura | 2 | **Aprovada** | Não |
| ADR-028 | Isolamento e proteção dos dados locais por usuário | Segurança/Arquitetura | 2 | **Aprovada** | Não |
| ADR-030 | Estilo arquitetural: PWA offline-first + backend gerenciado PostgreSQL | Arquitetura | 3 | **Aprovada** | Não |
| ADR-031 | Interface em React + TypeScript + Vite (SPA PWA) | Tecnologia | 3 | **Aprovada** | Não |
| ADR-032 | Backend gerenciado Supabase (PostgreSQL, Auth, políticas por linha, Edge Functions), região São Paulo | Tecnologia/Dados | 3 | **Aprovada** | Não |
| ADR-033 | Hospedagem do app no Cloudflare Pages | Infraestrutura | 3 | **Aprovada** | Não |
| ADR-034 | Escritas por função de sincronização; leituras pela API de dados com políticas por linha | Arquitetura | 3 | **Aprovada** | Não |
| ADR-035 | Endereço provisório gratuito e critérios para domínio próprio posterior | Infraestrutura | 3 | **Aprovada** | Não |
| ADR-036 | Backup próprio diário, criptografado, fora do provedor do banco | Operação | 3 | **Aprovada** | Não |
| ADR-037 | Monorepo com pnpm, Git e GitHub privado com CI no GitHub Actions | Processo/Ferramentas | 3 | **Aprovada** | Não |
| ADR-038 | Monitoramento mínimo sem terceiros adicionais | Operação | 3 | **Aprovada** | Não |
| ADR-039 | Bibliotecas de apoio: Workbox, Dexie, Zod, uPlot, Vitest, Playwright | Tecnologia | 3 | **Aprovada** | Não |
| ADR-050 | Escrita da sincronização com papel de banco de privilégio mínimo vinculado ao usuário verificado | Segurança/Dados | 4 | **Aprovada** | Não |
| ADR-051 | Adequação da RN-031 às capacidades do serviço de autenticação gratuito | Segurança/Produto | 4 | **Aprovada** | Não |
| ADR-052 | Fonte do catálogo e política de imagens com procedência comprovada | Produto/Conteúdo | 4 | **Aprovada** | Não |
| ADR-053 | Revisões e marcas de exclusão nos registros sincronizáveis | Dados | 4 | **Aprovada** | Não |
| ADR-060 | Taxonomia de exercícios: grupos, padrões de movimento e marcadores de sobrecarga | Conteúdo/Dados | 5 | **Aprovada** | Não |
| ADR-061 | Algoritmo do gerador: modelos de divisão + preenchimento de vagas, determinístico e sem sugestão de carga | Produto/Algoritmo | 5 | **Aprovada** | Não |
| ADR-062 | Parâmetros padrão de prescrição (séries, repetições, descanso, volume semanal) | Produto/Conteúdo | 5 | **Aprovada** | Não |
| ADR-063 | Tratamento conservador de restrições | Segurança/Produto | 5 | **Aprovada** | Não |
| ADR-064 | Ajustes conservadores por idade (60 anos ou mais) | Segurança/Produto | 5 | **Aprovada** | Não |
| ADR-065 | Fórmulas de exibição: duração estimada, volume e melhor série | Produto | 5 | **Aprovada** | Não |
| ADR-070 | Parâmetros criptográficos das pendências mantidas após a saída | Segurança | 6 | **Aprovada** | Não |
| ADR-071 | Cabeçalhos de segurança e política de conteúdo do app | Segurança | 6 | **Aprovada** | Não |
| ADR-072 | Prazos de retenção de dados | Privacidade | 6 | **Aprovada** | Não |
| ADR-073 | Backup diário criptografado com chave pública, guardado no GitHub, com cópia mensal do usuário | Operação/Segurança | 6 | **Aprovada** | Não |
| ADR-074 | Ambientes: local, desenvolvimento e produção em dois projetos gratuitos | Infraestrutura | 6 | **Aprovada** | Não |
| ADR-075 | Pipeline de CI/CD e ordem de publicação | Processo | 6 | **Aprovada** | Não |
| ADR-080 | Ordem de implementação e incrementos do Lançamento 1 | Processo | 7 | **Aprovada** | Não |
| ADR-090 | Adiantar TAR-004 e seguintes no ambiente local enquanto as contas não existem | Processo | 9 | **Aprovada** | Não |
| ADR-091 | Correção de exercícios importados altera o exercício comum (somente com GATE-TER fechado) | Produto/Segurança | 9 | **Aprovada** | Não |
| ADR-092 | Gráfico de linha próprio em SVG no lugar do uPlot (substitui parcialmente a ADR-039) | Tecnologia | 9 | **Aprovada** | Não |

Faixas: ADR-023 a ADR-029 para a Etapa 2 (UX/UI); ADR-030 a ADR-049 para a Etapa 3 (usadas: 030–039); ADR-050 a ADR-059 para a Etapa 4 (usadas: 050–053); ADR-060 a ADR-069 para a Etapa 5 (usadas: 060–065); ADR-070 a ADR-079 para a Etapa 6 (usadas: 070–075); ADR-080 a ADR-089 para a Etapa 7 (usada: 080); ADR-090+ para as etapas seguintes (usadas: 090, 091, 092).

---

## ADR-001 — Sequência oficial das etapas

- **Tipo:** Processo · **Status:** Aprovada (2026-10-26 — o usuário determinou "resolva a numeração das etapas e mantenha uma única sequência oficial") · **Data:** 2026-10-26
- **Contexto:** O prompt mestre apresentava duas numerações divergentes (seções 3 e 5). A estrutura de pastas segue a seção 5.
- **Alternativas:** (a) seguir a seção 3 e agrupar regras de treinamento na Etapa 4; (b) seguir a seção 5 e renumerar implementação/validação; (c) manter as duas.
- **Decisão:** sequência oficial única: **0** Inspeção · **1** Produto e requisitos · **2** UX/UI · **3** Arquitetura · **4** Dados e API · **5** Regras de treinamento · **6** Segurança, qualidade e implantação · **7** Plano de implementação · **8** Auditoria cruzada · **Marco de aprovação formal** · **9** Implementação incremental · **10** Validação, implantação e manutenção.
- **Justificativa:** coincide com as pastas, dá às regras de treinamento uma etapa própria e elimina ambiguidade.
- **Consequências:** toda a documentação usa somente esta sequência (fonte: [GOV-01 §3](../00-governanca/01-metodologia-cascata.md#3-etapas)).

## ADR-002 — Arquitetura multi-aluno, MVP focado no uso pessoal

- **Tipo:** Produto/Arquitetura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** O uso imediato é pessoal; o produto deve poder atender vários alunos no futuro.
- **Alternativas:** (a) sistema mono-usuário sem conceito de aluno/profissional; (b) multi-tenant completo desde já; (c) modelo de dados e autorização preparados para vários alunos vinculados a um profissional, com o primeiro lançamento restrito ao uso pessoal.
- **Decisão:** (c). Todo aluno é vinculado a um profissional no modelo de dados e toda autorização filtra por esse vínculo. Enquanto a modalidade Terceiros estiver bloqueada (ADR-018), o único aluno é o próprio usuário.
- **Justificativa:** custo quase nulo agora, evita migração destrutiva depois; (b) adicionaria telas e regras sem uso real.
- **Consequências:** não há tela de cadastro de profissionais; o usuário inicial é criado por procedimento de inicialização (IMP-01). Exercícios personalizados pertencem a um profissional.

## ADR-003 — Conta única com papel duplo

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** O usuário usará o app para os próprios treinos e também gerenciará o próprio programa na área profissional. O uso pessoal é a prioridade.
- **Alternativas:** (a) duas contas separadas; (b) uma conta com os dois papéis e alternância de área; (c) apenas área do profissional.
- **Decisão:** (b). Uma conta pode ter papel profissional e papel aluno; o seletor de área (RF-005) alterna entre "Meu treino" (aluno) e "Gestão" (profissional). Área inicial após login: a do aluno.
- **Justificativa:** evita login/logout constante; ao atuar como aluno aplicam-se as mesmas regras de qualquer aluno (RN-033).
- **Consequências:** autorização por papel + vínculo; testes cobrem o papel duplo. O papel "profissional" no sistema é um **papel técnico de gestão** e **não** pressupõe habilitação profissional (ver ADR-018).

## ADR-004 — Acesso de terceiros por convite/link; recuperação pessoal por procedimento operacional

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26 (revisada)
- **Contexto:** Na modalidade Pessoal há um único usuário, criado por inicialização. Na modalidade Terceiros (futura), alunos precisam de convite e recuperação de senha. Envio de e-mail exige provedor e configuração de domínio.
- **Alternativas:** (a) autocadastro público; (b) e-mail transacional; (c) links de uso único gerados pelo profissional e enviados por ele fora do sistema; (d) login sem senha por e-mail.
- **Decisão recomendada:** Modalidade Pessoal: usuário criado por procedimento de inicialização; recuperação de senha por procedimento operacional documentado (IMP-04). Modalidade Terceiros: (c), com (b) como evolução desejável.
- **Justificativa:** elimina dependência externa no Lançamento 1 (alinhado à ADR-016); autocadastro público aumentaria a superfície de ataque sem necessidade.
- **Consequências:** RF-003, RF-004 pertencem à modalidade TER; RN-032 só se aplica a ela. Limitação aceita: no Lançamento 1, esquecer a senha exige acesso ao ambiente de hospedagem.

## ADR-005 — Execução de treino offline com sincronização posterior

- **Tipo:** Produto/Arquitetura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** A conexão na academia é instável; perder séries destrói a confiança no produto (OBJ-02). O prompt exige estratégia de cache, persistência, sincronização e conflitos antes de considerar offline.
- **Alternativas:** (a) somente online; (b) offline para a execução de treinos previamente carregados, com fila de sincronização; (c) offline completo.
- **Decisão:** (b). Um treino **previamente carregado** pode ser executado sem internet, incluindo iniciar sessão, registrar séries e cargas, usar o cronômetro e concluir a sessão; a sincronização ocorre depois, automaticamente.
- **Elementos obrigatórios da solução** (detalhados em UX-08, DAD-04 e SEG-05):
  1. **Pré-carregamento:** enquanto online, o app mantém em cache local o app shell, o programa ativo, os exercícios dele (com imagens) e o histórico recente necessário para pré-preenchimento e para a recomendação. A interface indica se o treino está disponível offline.
  2. **Prevenção de perda de dados:** cada série é gravada no armazenamento local do dispositivo **antes** de ser exibida como registrada (RN-043); a operação só sai da fila local após confirmação do servidor (RN-042); logout ou troca de usuário com pendências exige confirmação explícita (RN-047); o app solicita armazenamento persistente quando o navegador permite.
  3. **Idempotência:** identificadores gerados no cliente para sessões, séries e operações; reenvios não duplicam (RN-042).
  4. **Estados pendentes:** cada registro exibe seu estado de sincronização em linguagem simples, distinguindo pendências normais (aguardando envio) de itens que exigem atenção (recusado, conflito) — RN-051, ADR-022 (RF-092, RF-100).
  5. **Conflitos:** política proposta em ADR-022.
  6. **Gatilhos de sincronização:** ao abrir o app, ao voltar a conexão, ao voltar ao primeiro plano e periodicamente enquanto aberto — sem depender de sincronização em segundo plano, indisponível em parte das plataformas (ADR-017).
- **Fora do offline:** funções de gestão (criar/publicar programa, catálogo, cadastro) exigem conexão (RF-093).
- **Consequências:** RF-091, RF-092, RF-093, RF-100 a RF-102; RN-042 a RN-049; RNF-010.

## ADR-006 — Geração de treino por motor de regras determinístico

- **Tipo:** Produto/Arquitetura · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Contexto:** O prompt recomenda regras determinísticas com possível IA futura e proíbe inventar exercícios, publicar sem revisão e ignorar restrições.
- **Alternativas:** (a) regras determinísticas; (b) LLM gerando o treino; (c) templates fixos por objetivo.
- **Decisão recomendada:** (a), com interface do motor (entrada: perfil + catálogo filtrado; saída: rascunho estruturado + justificativas) estável o bastante para, no futuro, um componente de IA propor ajustes que passem pelas mesmas validações.
- **Justificativa:** previsível, testável, sem custo por uso, sem risco de alucinação; (c) violaria "não apresentar treino fixo como personalizado".
- **Consequências:** algoritmo em TRN-02. Na modalidade Pessoal, o resultado é apresentado como **sugestão de organização para uso próprio**, não como prescrição profissional (ADR-018). No Lançamento 1 a geração é `DES` (ADR-019).

## ADR-007 — Treino recomendado

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, formulação do usuário) · **Data:** 2026-10-26
- **Contexto:** É preciso decidir qual treino o app recomenda em cada dia.
- **Alternativas:** (a) dia da semana fixo; (b) rotação simples (próximo após o último); (c) próximo da sequência planejada, filtrado por disponibilidade, descanso e histórico.
- **Decisão (usuário):** (c). Recomendar o próximo treino da sequência planejada, respeitando disponibilidade, descanso e histórico. Não depender exclusivamente do dia da semana e não recomendar automaticamente um treino incompatível com o descanso necessário.
- **Consequências:** regra em RN-013; parâmetros numéricos (descanso configurável por grupo, valor inicial 48 h, meta semanal) em ADR-021 (aprovada). O usuário sempre pode escolher outro treino; se incompatível com o descanso, recebe aviso não bloqueante.

## ADR-008 — Reavaliação

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão (usuário):** intervalo inicial de 30 dias, com lembrete dentro do aplicativo e possibilidade de adiamento; nunca bloqueia o uso.
- **Consequências:** RN-014, RN-015. No Lançamento 1 o intervalo é fixo em 30 dias; intervalo configurável por aluno é `FUT` (RF-019). Forma do adiamento em ADR-020 (aprovada).

## ADR-009 — Público exclusivamente adulto

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Contexto:** A LGPD tem regras específicas para dados de crianças e adolescentes (art. 14 — aplicabilidade a confirmar na verificação jurídica, PRD-08); prescrição de exercícios para menores tem particularidades.
- **Decisão recomendada:** cadastro somente para ≥ 18 anos (RN-010).
- **Consequências:** validação de data de nascimento; menores fora do escopo.

## ADR-010 — Medições

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Decisão recomendada:** peso obrigatório em cada avaliação; circunferências (pescoço, ombro, peito, cintura, abdômen, quadril, braço D/E, antebraço D/E, coxa D/E, panturrilha D/E) e % de gordura **informado** opcionais; sem cálculo por dobras; sem fotos.
- **Alternativas:** apenas peso; protocolo de dobras cutâneas; fotos de progresso.
- **Justificativa:** equilíbrio entre utilidade e coleta mínima; fotos são dado de alto risco.
- **Consequências:** RF-088 (`DES`); fotos = FUT-05.

## ADR-011 — Biotipo e sexo

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Decisão recomendada:** biotipo **não** coletado no MVP; sexo opcional ("prefiro não informar" disponível) e não altera a seleção de exercícios.
- **Justificativa:** o prompt exige que biotipo nunca seja determinante; como o motor não o usaria, coletá-lo contraria a coleta mínima.
- **Consequências:** RN-022, RN-023.

## ADR-012 — Catálogo

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Alternativas candidatas (a verificar em DAD-06, sem adoção prévia):** (a) base aberta com imagens em licença permissiva (ex.: projeto "free-exercise-db"); (b) wger (licença Creative Commons com atribuição/compartilhamento); (c) APIs comerciais (custo/termos); (d) catálogo 100% próprio.
- **Decisão recomendada:** importar subconjunto curado de fonte aberta com licença verificada, traduzido para pt-BR e revisado manualmente; complementar com exercícios personalizados; snapshot local, sem dependência da fonte em tempo de execução.
- **Consequências:** tradução e mapeamento de contraindicações feitos pelo projeto; licenças registradas por item (RN-036, RNF-027). Compatibilidade de licença para uso na modalidade TER também deve ser verificada (PRD-08).
- **Lançamento 1:** o catálogo é entregue já curado (RF-038): mínimo proposto de 80 exercícios cobrindo todos os grupos musculares primários e os equipamentos comuns, com textos em pt-BR revisados, fonte registrada e imagem correspondente com licença verificada — ou placeholder quando não houver imagem adequada. Imagem inadequada é pior que placeholder. Textos de exercícios importados podem ser corrigidos pelo usuário (RF-032), mantendo o registro da origem.

## ADR-013 — Localização

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Decisão recomendada:** pt-BR; kg e cm; `dd/mm/aaaa`; fuso padrão `America/Sao_Paulo`, com fuso por usuário; armazenamento em UTC.
- **Consequências:** RNF-004, RN-028.

## ADR-014 — Edição de perfil por aluno terceiro

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Decisão recomendada:** o aluno terceiro edita dados do dia a dia; objetivo e peso-meta somente via reavaliação; alterações relevantes sinalizam revisão ao profissional.
- **Consequências:** RN-039, RF-089. Na modalidade Pessoal, o usuário (papel duplo) edita todo o próprio perfil; RN-025 continua sinalizando "revisão recomendada" do próprio programa.

## ADR-015 — Janela de 60 dias para sessões manuais e edições

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Decisão recomendada:** registrar sessão manual ou editar/excluir sessões em até 60 dias da data da sessão. A janela **não** se aplica à sincronização de sessões criadas offline (RN-027).
- **Consequências:** RN-027.

## ADR-016 — Diretriz de custo de hospedagem

- **Tipo:** Produto/Arquitetura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão (usuário):** priorizar alternativas gratuitas ou de baixo custo, com possibilidade de evolução futura. Nenhum serviço pago obrigatório no fluxo principal sem justificativa e aprovação.
- **Consequências:** critério eliminatório na comparação de stack (ARQ-02, Etapa 3); RNF-023 reformulado. A escolha concreta de provedores será ADR própria na Etapa 3. Pendente: Q-006 (domínio próprio). Atenção: camadas gratuitas costumam ter limites (suspensão por inatividade, cota de banco, retenção de backup) que devem ser confrontados com RNF-009 e RNF-011 na Etapa 3; e provedores fora do Brasil implicam transferência internacional de dados, relevante para a modalidade TER (PRD-08).

## ADR-017 — PWA para Android e iPhone

- **Tipo:** Produto/Arquitetura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão (usuário):** projetar para Android e iPhone, documentando as limitações específicas de instalação, armazenamento e execução em segundo plano de cada plataforma.
- **Limitações conhecidas a confirmar com as versões vigentes na Etapa 2 (UX-08):**

| Aspecto | Android (Chrome) | iPhone (Safari / app na tela inicial) | Consequência no projeto |
|---|---|---|---|
| Instalação | Prompt de instalação disponível programaticamente | Sem prompt programático; instalação manual via "Compartilhar → Adicionar à Tela de Início" | Tela de orientação de instalação por plataforma (RF-090) |
| Armazenamento local | Cota ampla; pode ser solicitada persistência | Cota mais restrita; dados de sites podem ser removidos após período sem uso (regras do WebKit a confirmar; apps na tela inicial têm tratamento próprio) | Sincronizar o quanto antes; avisar quando houver pendências antigas; pedir persistência quando suportado |
| Sincronização em segundo plano | Background Sync disponível em navegadores Chromium | Não disponível | Sincronizar apenas com o app aberto (ADR-005 item 6) |
| Execução em segundo plano | JavaScript suspenso/limitado com o app em segundo plano | Suspensão mais agressiva | Cronômetro de descanso calculado por horário de término, não por contagem (RF-062) |
| Alertas do cronômetro | Vibração disponível; notificações exigem permissão | Vibração via web não suportada; notificações push somente com app instalado (iOS ≥ 16.4) | Alerta sonoro/visual com app em primeiro plano; push é `FUT` |
| Tela sempre ligada | Wake Lock API disponível | Suporte recente e com histórico de falhas em apps na tela inicial (confirmar) | Usar quando disponível, sem depender dele |

- **Consequências:** RNF-018, RNF-019, RNF-028; UX-08 detalha.

## ADR-018 — Modalidades de uso e gate regulatório

- **Tipo:** Produto/Legal · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** O usuário não possui habilitação profissional presumida (CREF). O objetivo imediato é registrar e acompanhar os próprios treinos. Prescrever ou acompanhar treinos de terceiros pode estar sujeito a regulamentação profissional e a obrigações de proteção de dados.
- **Decisão (usuário):** separar as funcionalidades em duas modalidades — **PES (Uso pessoal)** e **TER (Acompanhamento de terceiros)** — e só disponibilizar a TER após verificação dos requisitos legais e regulatórios listados em [PRD-08](../01-produto/08-modalidades-de-uso-e-limites-profissionais.md). Consentimento de dados **não** substitui eventual habilitação profissional exigida.
- **Consequências:** coluna "Modalidade" em PRD-05; RN-040, RN-041; funcionalidades TER bloqueadas **no servidor** enquanto o gate não for liberado. A arquitetura continua preparada para vários alunos (ADR-002). A liberação da TER exigirá nova ADR aprovada.

## ADR-019 — Recorte do Lançamento 1

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Contexto:** O usuário quer um MVP utilizável pessoalmente o mais rápido possível, sem um primeiro lançamento grande demais, mas utilizável de ponta a ponta.
- **Alternativas:** (a) manter os 70 RF obrigatórios da revisão 1; (b) Lançamento 1 com o ciclo pessoal completo, seguido de incrementos `DES` priorizados; (c) apenas registro de sessões, sem programas.
- **Decisão recomendada:** (b), com **43 RF `ESS`** (41 da revisão 2 + RF-038 e RF-055).
- **Verificação de uso ponta a ponta** (necessidades declaradas pelo usuário):

| Necessidade | Requisitos `ESS` | Situação |
|---|---|---|
| Cadastro e edição do perfil | RF-009, RF-012, RF-016 | Coberta |
| Criação e edição manual de treinos | RF-020, RF-024, RF-025, RF-027, RF-028 | Coberta |
| Catálogo com imagens adequadas e informações confiáveis | RF-030, RF-031, RF-032, RF-034, **RF-038** | **Lacuna corrigida:** a revisão 2 entregava as telas do catálogo, mas não garantia o conteúdo. RF-038 exige catálogo inicial curado; RF-032 passa a permitir corrigir textos importados. |
| Execução com séries, repetições, cargas e conclusão | RF-060, RF-061, RF-062, RF-063, RF-065, RF-066, RF-067 | Coberta |
| Funcionamento offline de treinos já carregados | RF-090, RF-091, RF-093 | Coberta |
| Sincronização posterior com pendências e conflitos claros | RF-092, RF-100, RF-101, RF-102 | Coberta; comportamento detalhado na ADR-022 (revisão 3) |
| Agenda ou recomendação do próximo treino | RF-050, RF-051, **RF-055**, RF-070, RF-071 | **Lacuna corrigida:** com o descanso configurável (ADR-021), a configuração precisa existir no Lançamento 1 → RF-055. |
| Histórico das sessões e peso corporal | RF-069, RF-072, RF-054 (última carga), RF-080, RF-081 | Coberta |

- **Deixados conscientemente fora do Lançamento 1:** reavaliação (D1, até 30 dias após o início do uso), gerador automático (D2), gráfico de carga por exercício, metas em % e medidas (D3), consulta de versões antigas — que continuam **preservadas** desde o início (D4), registro manual retroativo e substituição de exercício na sessão (D5).
- **Justificativa:** (c) não entregaria o fluxo principal; (b) entrega o fluxo completo com o menor conjunto.
- **Consequências:** PRD-04 §2 e PRD-05 refletem 43 `ESS` e 21 `DES`.
- **Atualização (2026-10-26, Etapa 2):** o RF-103 (limpeza de dados locais ao sair), derivado da UXP-02, foi incluído como `ESS` por **confirmação explícita do usuário** em 2026-10-26 → recorte de **44 `ESS`**.

## ADR-020 — Adiamento da reavaliação

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Contexto:** A ADR-008 (aprovada) exige lembrete de 30 dias, adiável, sem bloquear. A revisão 2 propunha limite de 2 adiamentos de 7 dias; o usuário prefere evitar regras desnecessárias.
- **Alternativas:** (a) 7 dias, no máximo 2 vezes seguidas (revisão 2); (b) adiar escolhendo a próxima data, sem limite de adiamentos; (c) apenas "lembrar depois", sem data.
- **Decisão recomendada:** (b). Ao adiar, o usuário escolhe a próxima data (sugestão pré-preenchida: 7 dias depois); o lembrete reaparece nessa data; cada adiamento é registrado no histórico; não há limite.
- **Justificativa:** o lembrete nunca bloqueia o uso, então um limite de adiamentos não protege nada essencial e acrescenta regra, estado e testes; (c) não registra a próxima data, que o usuário pediu.
- **Consequências:** RN-015 simplificada; RF-085 ajustado. O parâmetro "máximo de adiamentos" deixa de existir.

## ADR-021 — Descanso como preferência configurável

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Contexto:** A ADR-007 (aprovada) exige não recomendar automaticamente treino incompatível com o descanso necessário. O usuário pediu que 48 h não seja tratado como regra universal nem como recomendação médica ou esportiva.
- **Alternativas:** (a) 48 h fixas para todos os grupos (revisão 2); (b) valor padrão configurável pelo usuário + ajuste opcional por grupo muscular; (c) sem verificação de descanso (apenas sequência); (d) descanso por exercício.
- **Decisão recomendada:** (b).
  - O usuário define um **valor padrão** de descanso (em horas) aplicado a todos os grupos musculares primários, e pode **ajustar grupos específicos** (ex.: abdômen 0 h, pernas 72 h). Valor 0 desativa a verificação para o grupo.
  - O app traz um **valor inicial** (48 h) para não exigir configuração antes do primeiro treino — sempre identificado na tela como "ponto de partida editável", e com o texto: "valores são preferências pessoais, não recomendação médica ou esportiva".
  - A verificação compara, para cada grupo primário em comum com sessões recentes, as horas decorridas com o descanso configurado daquele grupo (RN-050).
  - Disponibilidade: meta semanal = dias disponíveis por semana do perfil; atingida a meta (semana de segunda a domingo), recomenda-se "descanso sugerido". Dias preferidos apenas geram a observação "hoje não é um dia planejado".
  - O usuário sempre pode escolher outro treino; se incompatível, recebe aviso não bloqueante.
- **Valor inicial aprovado pelo usuário:** **48 h** para o padrão, apresentado como ponto de partida editável (alternativas consideradas: 24 h; 0 h).
- **Justificativa:** (a) imporia um número universal; (c) violaria a ADR-007; (d) exigiria configuração extensa sem ganho proporcional.
- **Consequências:** RF-055 (`ESS`), RN-013, RN-050; a lista de "grupos de recuperação rápida" deixa de existir (substituída pelos ajustes por grupo).

## ADR-022 — Estados de sincronização e política de conflitos

- **Tipo:** Produto/Arquitetura · **Status:** Aprovada (2026-10-26, aprovação da Etapa 1 revisão 3) · **Data:** 2026-10-26
- **Princípios:** (1) **nenhum dado registrado é descartado sem decisão explícita do usuário**, com confirmação que mostra o que será perdido; (2) **só é conflito quando o mesmo registro foi alterado em dois lugares** — uma alteração local ainda não enviada é apenas uma pendência; (3) a interface separa o que **não exige ação** do que **exige atenção**.

### Estados apresentados ao usuário (RN-051)

| Estado | Quando ocorre | Mensagem (exemplo) | Exige ação? |
|---|---|---|---|
| Aguardando envio | Registro salvo no aparelho e ainda não enviado (sem conexão, envio em fila ou login expirado) | "Salvo neste aparelho. Será enviado quando houver conexão." / "Entre novamente para enviar." | Não (ou fazer login) |
| Enviando | Envio em andamento | "Enviando…" | Não |
| Sincronizado | Servidor confirmou | Indicador discreto | Não |
| Nova tentativa automática | Falha temporária: rede, tempo esgotado, servidor indisponível | "Não foi possível enviar agora. Tentaremos de novo automaticamente." | Não (opção "enviar agora") |
| Recusado | O servidor recusou de forma definitiva por validação ou permissão (ex.: valor fora da faixa) — **nunca** por falta de rede | "O servidor não aceitou este registro: \<motivo\>. Ele continua guardado neste aparelho." | **Sim** — corrigir e reenviar, ou descartar com confirmação |
| Conflito | O mesmo registro foi alterado aqui e em outro aparelho, ou excluído lá e alterado aqui | "Este treino foi alterado em outro aparelho. Escolha qual versão manter." (versões lado a lado) | **Sim** — escolher a versão |
| Possível duplicidade | Duas sessões com horários sobrepostos vindas de aparelhos diferentes; ambas foram salvas | "Encontramos dois treinos no mesmo horário. Quer revisar?" | Opcional |

### O que **não** é conflito

| Situação | Tratamento |
|---|---|
| Alteração local não enviada cuja base continua atual no servidor | Pendência normal; é enviada e aplicada. |
| Reenvio da mesma operação (rede instável) | Idempotente: sem duplicar (RN-042). |
| Sessões novas criadas offline | Nunca conflitam: são registros novos. |
| Nova versão do programa publicada durante sessão offline | A sessão fica vinculada à versão em que começou (RN-044). |
| Exercício desativado enquanto offline | Aceito; o histórico mantém o exercício (RN-021). |

### Conflitos reais e resolução

| Situação | Resolução |
|---|---|
| Edição local baseada em revisão antiga de registro alterado em outro aparelho | Servidor recusa a edição; o app mostra as duas versões; o usuário escolhe uma (a outra é descartada somente após confirmação). |
| Edição local de registro excluído em outro aparelho | O usuário escolhe recriar (como nova sessão/registro) ou descartar com confirmação. |

### Outras garantias

- Logout ou troca de usuário com pendências: aviso com a quantidade e opção de sincronizar antes (RN-047, RF-101).
- Horário do aparelho incoerente: registro aceito e sinalizado para revisão (RN-048).
- O contador visível no app soma apenas itens que **exigem atenção**; pendências normais aparecem como informação ("3 registros aguardando envio").

- **Consequências:** RF-092, RF-100..102; RN-042..049, RN-051.

## ADR-023 — Identidade visual e nome provisório

- **Tipo:** Produto/UX · **Status:** Aprovada (2026-10-26) — nome **condicionado** à verificação de marca e domínio antes da publicação · **Data:** 2026-10-26
- **Contexto:** O usuário delegou a proposta de identidade visual (Q-005). O prompt pede estética moderna, esportiva, elegante e consistente, com boa legibilidade na academia.
- **Alternativas:** (a) "Grafite e lima" — neutros + um acento verde-lima, tipografia condensada nos números; (b) paleta escura com laranja como acento; (c) visual claro e minimalista em azul.
- **Decisão recomendada:** (a), com nome provisório **Forja** (alternativas: Ritmo, Carga), tipografia Barlow / Barlow Semi Condensed e ícones Lucide. Detalhes em [UX-02](../02-experiencia/02-identidade-visual.md).
- **Justificativa:** um único acento energético dá identidade esportiva sem poluição; o lima tem contraste alto sobre grafite (12,2:1) e o verde escuro equivalente funciona no tema claro (7,08:1); números condensados lembram painéis de equipamentos e economizam largura.
- **Consequências:** o nome depende de verificação de marca e domínio (Q-006, Etapa 3); licenças de fontes e ícones confirmadas na Etapa 3.

## ADR-024 — Temas claro e escuro

- **Tipo:** UX · **Status:** Aprovada (2026-10-26) — seguindo inicialmente a preferência do sistema · **Data:** 2026-10-26
- **Alternativas:** (a) só escuro; (b) só claro; (c) ambos, seguindo o sistema, com escolha manual.
- **Decisão recomendada:** (c).
- **Justificativa:** academias têm iluminação variada; o tema escuro reduz reflexo e consumo em telas OLED, o claro é melhor sob luz intensa; seguir o sistema respeita a preferência do usuário.
- **Consequências:** todos os tokens existem nos dois temas, com contraste verificado (UX-02 §4.3); testes visuais nos dois temas.

## ADR-025 — Navegação por áreas com barra inferior

- **Tipo:** UX · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** (a) uma barra única misturando aluno e gestão; (b) duas áreas (Meu treino, Gestão), cada uma com sua barra inferior, e chave de área no cabeçalho; (c) menu lateral "hambúrguer".
- **Decisão recomendada:** (b). Meu treino: Hoje, Treinos, Agenda, Evolução, Conta. Gestão: Programa, Catálogo, Perfil, Conta. Trilho lateral no desktop.
- **Justificativa:** separa o uso diário (aluno) do planejamento (gestão), mantendo no máximo 5 destinos visíveis; o menu oculto (c) esconde funções e piora a descoberta.
- **Consequências:** UX-03 §3; na modalidade TER, "Perfil" dá lugar a "Alunos".

## ADR-026 — Execução do treino em modo foco

- **Tipo:** UX · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** (a) lista com todos os exercícios e séries em uma página rolável; (b) **modo foco**: um exercício por vez em tela cheia, com séries, cronômetro na zona do polegar e visão geral sob demanda; (c) uma série por tela.
- **Decisão recomendada:** (b).
- **Justificativa:** concentra a atenção no exercício atual, permite números grandes e o botão de registro na zona do polegar (P2, P3, P4); a visão geral (TELA-016) mantém a flexibilidade de mudar a ordem; (c) fragmenta demais e aumenta toques.
- **Consequências:** TELA-015/016; sem barra inferior durante a execução; "minimizar" mantém a sessão em andamento (`SessionBar`).

## ADR-027 — Estratégia de dados offline e fila de saída

- **Tipo:** UX/Arquitetura · **Status:** Aprovada (2026-10-26) — **condicionada** às verificações de privacidade e de preservação de dados pendentes (ver Condições) · **Data:** 2026-10-26
- **Contexto:** A ADR-005 (aprovada) exige executar treinos previamente carregados sem internet, sem perda de dados, com estados claros.
- **Alternativas:** (a) depender do cache HTTP do service worker para dados e enviar alterações por sincronização em segundo plano; (b) cache do service worker apenas para o pacote do app e imagens; dados do app em banco local (IndexedDB) com **fila de saída** gerenciada pelo próprio app; envio com o app aberto e sincronização em segundo plano apenas como reforço; (c) biblioteca de banco sincronizado de terceiros.
- **Decisão recomendada:** (b), conforme [UX-08 §6–9](../02-experiencia/08-especificacao-pwa.md#6-dados-offline-e-sincronização-adr-027).
- **Justificativa:** (a) não funciona no iPhone (sem sincronização em segundo plano) e mistura dados com cache; (c) adiciona dependência e possivelmente custo (ADR-016) para um volume pequeno de dados; (b) dá controle total sobre estados, idempotência e conflitos (ADR-022).
- **Consequências:** janelas de dados locais (UX-08 §6.2); avisos de pendências antigas; atualização do app nunca durante sessão em andamento; saída da conta conforme RN-052 e UX-08 §8 (detalhamento confirmado em 2026-10-26).
- **Condições da aprovação (verificações obrigatórias antes do Lançamento 1):**
  - CP-01 — Separação por usuário dos dados locais e da fila de saída testada (T-PWA-09, T-PWA-11) — Etapas 6 e 9.
  - CP-02 — Nenhuma saída da conta, troca de usuário ou atualização do app descarta pendências sem decisão explícita (T-PWA-08, T-PWA-12..14) — Etapas 6 e 9.
  - CP-03 — Proteção dos dados guardados no aparelho avaliada em SEG-01 (dados locais não são criptografados pelo app; dependem da proteção do aparelho) e documentada ao usuário — Etapa 6.
  - CP-04 — Nenhum dado pessoal em URLs ou chaves de cache do service worker (RNF-017) — Etapas 6 e 9.
  - CP-05 — Limpeza de dados locais conforme RN-052 verificada — Etapa 9.

## ADR-028 — Isolamento e proteção dos dados locais por usuário

- **Tipo:** Segurança/Arquitetura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** O usuário exigiu que dados locais e pendências sejam isolados por usuário, protegidos contra acesso indevido e impedidos de serem enviados pela conta errada — sem presumir que separar apenas na interface é suficiente. A ADR-027 foi aprovada condicionada a essas verificações (CP-01..CP-05).
- **Ameaças consideradas:** (T1) outra pessoa usa o app no mesmo aparelho e navegador; (T2) defeito no app envia a operação de um usuário com a sessão de outro; (T3) alguém com acesso ao aparelho inspeciona o armazenamento do navegador (ferramentas de desenvolvedor, cópia de arquivos); (T4) dados pessoais em caches compartilhados (cache HTTP / service worker); (T5) servidor aceita operação sobre dado de outro usuário.
- **Alternativas:** (a) separação apenas na interface; (b) separação física por usuário + verificações no aparelho e no servidor, sem criptografia própria; (c) como (b), **mais criptografia das pendências mantidas após a saída**, com chave derivada da senha do usuário; (d) criptografar todos os dados locais sempre (exigiria digitar senha ou PIN a cada abertura offline).
- **Decisão recomendada:** (c), em camadas:

| Camada | Medida | Ameaças |
|---|---|---|
| L1 — Armazenamento separado | Um banco local por usuário, nomeado por identificador opaco (nunca e-mail ou nome); o app abre somente o banco do usuário autenticado e fecha/descarta tudo em memória ao trocar de usuário | T1 |
| L2 — Dono em cada operação | Toda operação da fila registra o identificador do usuário que a criou | T2 |
| L3 — Guarda no aparelho | O motor de envio só transmite operações cujo dono é o usuário da sessão atual; divergência interrompe o envio daquela operação e registra erro técnico (sem dados pessoais) | T2 |
| L4 — Guarda no servidor | O servidor determina o usuário pela sessão de acesso (nunca pelo campo enviado pelo aparelho); se o dono declarado divergir, recusa; isolamento no próprio banco de dados por políticas por linha (detalhe em ARQ-01/DAD-05) | T2, T5 |
| L5 — Sem dados pessoais em caches compartilhados | Respostas com dados pessoais nunca vão para o cache do service worker nem para o cache HTTP (cabeçalho `no-store`); só pacote do app e imagens do catálogo são cacheados | T4 |
| L6 — Pendências mantidas após a saída | Na opção "Sair e manter neste aparelho", o usuário confirma a senha; as pendências são criptografadas (AES-GCM) com chave derivada da senha (PBKDF2-SHA-256 com sal aleatório e 600.000 iterações — ADR-070) e o restante dos dados é removido. No próximo login no aparelho, a senha digitada libera as pendências | T1, T3 |
| L7 — Dados do usuário ativo | Enquanto o usuário está conectado, os dados locais dependem da proteção do aparelho (bloqueio de tela e criptografia do sistema) e do isolamento por origem do navegador; o app informa isso em "Sobre e privacidade" | T3 (risco residual aceito) |

- **Casos de borda de L6:** se a senha tiver sido trocada em outro aparelho, o app pede a **senha anterior** para liberar as pendências; sem ela, as pendências continuam guardadas e criptografadas, com opção explícita de descartar — nunca há descarte silencioso. Offline, a opção "Sair e manter" funciona (a derivação de chave é local).
- **Justificativa:** (a) não protege contra T2–T5; (b) não protege pendências mantidas contra T3; (d) prejudicaria o uso offline na academia (P1/P2) para um risco que o bloqueio do aparelho já mitiga.
- **Consequências:** RN-053; UX-04 §6.1 (confirmação de senha em "Sair e manter"); UX-08 §8.5; testes T-PWA-09, 11–16; detalhes criptográficos e parâmetros em SEG-01 (Etapa 6). Dependência: a camada L4 depende da arquitetura escolhida na Etapa 3 (ARQ-01).

## ADR-030 — Estilo arquitetural: PWA offline-first + backend gerenciado PostgreSQL

- **Tipo:** Arquitetura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** offline com fila própria (ADR-005/027), isolamento real (ADR-028), custo gratuito (ADR-016), um desenvolvedor.
- **Alternativas:** (a) SPA PWA + backend gerenciado (BaaS) com PostgreSQL; (b) servidor próprio monolítico em VPS; (c) aplicação renderizada no servidor; (d) banco de documentos com sincronização automática de terceiros.
- **Decisão recomendada:** (a). Ver [ARQ-01](01-arquitetura-geral.md).
- **Justificativa:** (b) tem custo e operação; (c) não ajuda o uso offline; (d) conflita com ADR-027.
- **Consequências:** regras de domínio em pacote compartilhado; servidor revalida tudo; dependência de provedor gerenciado (riscos em ARQ-02 §7).

## ADR-031 — Interface em React + TypeScript + Vite (SPA PWA)

- **Tipo:** Tecnologia · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** React + Vite; SvelteKit estático; Vue + Vite; Next.js.
- **Decisão recomendada:** React + TypeScript + Vite, SPA estática, PWA com Workbox ([ARQ-02 §3.1](02-stack-tecnologica.md#31-interface-frontend--adr-031)).
- **Justificativa:** ecossistema maduro para offline-first e testes; hospedagem estática gratuita; SvelteKit seria viável, mas com menos referências para este tipo de app.
- **Consequências:** bundle um pouco maior; mitigado por divisão de código.

## ADR-032 — Backend gerenciado Supabase (PostgreSQL, Auth, políticas por linha, Edge Functions), região São Paulo

- **Tipo:** Tecnologia/Dados · **Status:** Aprovada (2026-10-26 — riscos confirmados do plano gratuito aceitos pelo usuário) · **Data:** 2026-10-26
- **Alternativas:** Supabase; Neon + API própria; Firebase; VPS próprio; PocketBase ([ARQ-02 §3.2](02-stack-tecnologica.md#32-backend-e-dados--adr-032)).
- **Decisão recomendada:** Supabase no plano gratuito, região São Paulo (sujeito a VH-03).
- **Justificativa:** único que atende ao mesmo tempo C1, C2, C3 e C5 com pouco código de segurança próprio; isolamento por linha nativo sustenta a camada L4 da ADR-028; PostgreSQL padrão permite saída.
- **Riscos aceitos se aprovado (confirmados na documentação oficial em 2026-10-26):** pausa após 1 semana de inatividade (VH-01); sem backups automáticos no gratuito (VH-02) → ADR-036; termos limitam o uso a "internal business purposes", permitem suspensão/limites e atribuem ao cliente a responsabilidade pelo backup (VH-07); região São Paulo sem restrição de plano declarada, a confirmar na criação (VH-03). Pendentes: limitação de login e política de senha da RN-031 (VH-04/05) → DAD-05.
- **Consequências:** upgrade pago só com nova aprovação (ADR-016).

## ADR-033 — Hospedagem do app no Cloudflare Pages

- **Tipo:** Infraestrutura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** Cloudflare Pages; Cloudflare Workers com arquivos estáticos; Netlify; Vercel Hobby; GitHub Pages.
- **Decisão recomendada:** **Cloudflare Pages**, endereço provisório gratuito `*.pages.dev` durante o desenvolvimento (revisada após VH-08).
- **Justificativa:** cabeçalhos configuráveis por `_headers` (necessários para CSP e `no-store`); domínio próprio gratuito depois, inclusive **subdomínio por CNAME sem mover o DNS**; redirecionamento do endereço provisório disponível (HD-01..07). Workers com arquivos estáticos só aceita domínio com nameservers na Cloudflare (documentação oficial), o que reduz a flexibilidade; GitHub Pages não permite cabeçalhos.
- **Consequências:** critérios de domínio e migração de origem na ADR-035.

## ADR-034 — Escritas por função de sincronização; leituras pela API de dados com políticas por linha

- **Tipo:** Arquitetura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** (a) app escreve direto nas tabelas, confiando só nas políticas por linha; (b) todas as escritas por uma função de sincronização que reutiliza o pacote de domínio, com as políticas por linha como segunda barreira; (c) toda leitura e escrita por API própria.
- **Decisão recomendada:** (b).
- **Justificativa:** um único ponto aplica idempotência, revisão (conflitos), regras de negócio, guarda de dono (ADR-028 L4) e o bloqueio TER (RN-040), com o mesmo código de validação do app; as leituras diretas mantêm a simplicidade sem perder o isolamento.
- **Consequências:** a função executa com as permissões do usuário; contratos em DAD-04.

## ADR-035 — Endereço provisório gratuito e critérios para domínio próprio posterior

- **Tipo:** Infraestrutura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** o usuário decidiu usar endereço provisório gratuito no desenvolvimento e pediu critérios para domínio próprio depois, **sem assumir migração transparente**.
- **Decisão recomendada:** adotar os critérios HD-01..HD-07 e o procedimento de migração de origem de [ARQ-02 §8](02-stack-tecnologica.md#8-domínio-próprio-depois--critérios-de-hospedagem-e-migração-de-origem-adr-035); definir o endereço definitivo antes do uso real.
- **Justificativa:** app instalado, banco local, fila e sessão pertencem à origem; trocar de origem exige envio das pendências e reinstalação.
- **Consequências:** IMP-02 detalha o procedimento; redirecionamento só com fila vazia.

## ADR-036 — Backup próprio diário, criptografado, fora do provedor do banco

- **Tipo:** Operação · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** o plano gratuito não oferece backups automáticos e a documentação oficial recomenda exportar e guardar cópias fora do provedor (VH-02 confirmada); RNF-011 exige backup diário, retenção ≥ 30 dias e restauração testada.
- **Alternativas:** (a) plano pago do provedor; (b) tarefa agendada no CI que gera cópia lógica do banco, criptografa com chave fora do provedor e guarda em armazenamento separado; (c) sem backup.
- **Decisão recomendada:** (b); (a) só com aprovação futura.
- **Consequências:** detalhes, retenção e teste de restauração em IMP-03; chave de criptografia guardada pelo usuário fora do repositório.

## ADR-037 — Monorepo com pnpm, Git e GitHub privado com CI no GitHub Actions

- **Tipo:** Processo/Ferramentas · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** monorepo; repositórios separados (app, backend).
- **Decisão recomendada:** monorepo ([ARQ-03](03-organizacao-do-repositorio.md)).
- **Justificativa:** o pacote de domínio é compartilhado entre app e função de sincronização; um único lugar para docs, código e migrações facilita a rastreabilidade.
- **Consequências:** git inicializado na primeira tarefa da Etapa 9.

## ADR-038 — Monitoramento mínimo sem terceiros adicionais

- **Tipo:** Operação · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** serviço externo de rastreamento de erros; monitoramento mínimo com recursos já usados (logs do provedor, tabela de diagnóstico sem dados pessoais, verificação agendada no CI).
- **Decisão recomendada:** mínimo ([ARQ-05 §3](05-integracoes-externas.md#3-monitoramento-mínimo-adr-038)).
- **Justificativa:** evita mais um destinatário de dados e custo; suficiente para um usuário.
- **Consequências:** reavaliar se a modalidade TER for liberada.

## ADR-039 — Bibliotecas de apoio: Workbox, Dexie, Zod, uPlot, Vitest, Playwright

- **Tipo:** Tecnologia · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão recomendada:** conforme [ARQ-02 §3.4](02-stack-tecnologica.md#34-bibliotecas-de-apoio--adr-039), com versões exatas e licenças verificadas na fundação (VH-10).
- **Justificativa:** bibliotecas pequenas, maduras, com licenças permissivas; criptografia pela Web Crypto nativa.
- **Consequências:** novas bibliotecas exigem justificativa no PR (ARQ-04 §8).
- **Alteração (2026-10-28):** para gráficos, substituída pela [ADR-092](#adr-092--gráfico-de-linha-próprio-em-svg-no-lugar-do-uplot-substitui-parcialmente-a-adr-039) (SVG próprio, sem uPlot). As demais bibliotecas seguem como decididas.

## ADR-050 — Escrita da sincronização com papel de banco de privilégio mínimo vinculado ao usuário verificado

- **Tipo:** Segurança/Dados · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** a ADR-034 (aprovada) diz que a função de sincronização é o único caminho de escrita e "executa com as permissões do usuário, nunca com credencial administrativa". Na prática, se a função escrevesse com o papel `authenticated` do usuário, esse mesmo papel poderia escrever direto pela API de dados, contornando a função (idempotência, revisão, mensagens).
- **Alternativas:** (a) papel `authenticated` com permissão de escrita + políticas por linha (contorno possível, limitado aos próprios dados; regras críticas ainda garantidas por restrições e gatilhos); (b) papel dedicado `sync_writer`, de privilégio mínimo, usado só pela função, com políticas por linha que comparam cada linha ao usuário verificado (`current_actor()`), e `authenticated` apenas com leitura; (c) credencial administrativa na função (viola ADR-034).
- **Decisão recomendada:** (b). Identidade sempre do token verificado; a credencial do `sync_writer` fica só nos segredos da função; nenhum privilégio administrativo.
- **Justificativa:** garante o caminho único de escrita sem abrir mão do isolamento por linha; respeita o espírito da ADR-034 (sem credencial administrativa, identidade do usuário).
- **Consequências:** DAD-03 §7 e DAD-05 §5.1; verificação na fundação de que a função consegue conectar ao banco com papel próprio (VH-12). Esta ADR **complementa** a ADR-034, sem substituí-la; a redação "executa com as permissões do usuário" passa a ser lida como "age em nome do usuário verificado, com privilégio mínimo".

## ADR-051 — Adequação da RN-031 às capacidades do serviço de autenticação gratuito

- **Tipo:** Segurança/Produto · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** verificações oficiais (VH-04, VH-05) mostraram que, no plano gratuito, a proteção contra senhas vazadas é paga e o limite de login é por IP (incluindo renovações de sessão), não por e-mail.
- **Alternativas:** (a) adequar a RN-031: mínimo de 10 no provedor; senha igual ao e-mail e senhas comuns recusadas no app; limite por IP do provedor + espera progressiva no app após 5 falhas; (b) plano pago (custo — ADR-016); (c) camada própria de login (não impede chamadas diretas ao serviço de autenticação, logo não cumpriria a regra).
- **Decisão recomendada:** (a), com texto proposto em [DAD-05 §6](../04-dados-e-api/05-autenticacao-e-autorizacao.md#6-adequação-da-rn-031-ao-provedor-adr-051--aprovada). Aprovada em 2026-10-26; a RN-031 foi reescrita.
- **Justificativa:** na modalidade pessoal, só o próprio usuário define a senha; a validação no app cobre o objetivo prático; o limite por IP protege contra força bruta.
- **Consequências:** reavaliar na liberação da TER (REG-*).

## ADR-052 — Fonte do catálogo e política de imagens com procedência comprovada

- **Tipo:** Produto/Conteúdo · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** o free-exercise-db (Unlicense, 800+ exercícios) é a melhor base de dados e textos, mas nenhum dos repositórios informa a origem das imagens; RN-036 exige procedência e licença comprovadas.
- **Alternativas:** (a) usar dados/textos do free-exercise-db e **não** usar suas imagens sem comprovação de procedência; placeholder + curadoria progressiva com Wikimedia Commons e imagens próprias; (b) usar as imagens assumindo a licença do repositório (risco de violar direito autoral); (c) conjunto comercial de imagens (custo).
- **Decisão recomendada:** (a) — [DAD-06 §3](../04-dados-e-api/06-catalogo-de-exercicios-e-fontes.md#3-política-de-imagens-adr-052--aprovada). Tentar comprovar a procedência com os mantenedores; se comprovada, as imagens podem ser usadas.
- **Consequências:** parte dos exercícios pode iniciar com placeholder; curadoria de imagens vira tarefa contínua.

## ADR-053 — Revisões e marcas de exclusão nos registros sincronizáveis

- **Tipo:** Dados · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** ADR-022 exige detectar conflitos reais e "registro excluído em outro aparelho".
- **Alternativas:** (a) carimbo de data (`updated_at`) como base de conflito; (b) número de revisão incrementado pelo servidor + marca de exclusão sem dados pessoais, removida após 90 dias; (c) histórico completo de versões de cada registro.
- **Decisão recomendada:** (b) — [DAD-01 §6](../04-dados-e-api/01-modelagem-de-dados.md#6-revisões-e-marcas-de-exclusão-adr-053).
- **Justificativa:** relógios de aparelhos não são confiáveis (RN-048); (c) é desproporcional; a marca sem dados pessoais respeita a exclusão pedida pelo usuário.
- **Consequências:** aparelhos offline por mais de 90 dias podem não reconhecer uma exclusão — tratados como conflito `NOT_FOUND`/recriação explícita.

## ADR-060 — Taxonomia de exercícios: grupos, padrões de movimento e marcadores de sobrecarga

- **Tipo:** Conteúdo/Dados · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** (a) classificar só por grupos musculares; (b) grupos + um padrão de movimento + marcadores de sobrecarga articular atribuídos na curadoria; (c) classificação biomecânica detalhada.
- **Decisão recomendada:** (b) — [TRN-03 §2–§5](../05-regras-de-treinamento/03-catalogo-e-selecao-de-exercicios.md).
- **Justificativa:** padrões permitem montar treinos equilibrados por vagas; marcadores permitem excluir exercícios por restrição de forma explícita e auditável; (c) é desproporcional.
- **Consequências:** a curadoria (RF-038) atribui padrão e marcadores a cada exercício; seeds em DAD-07.

## ADR-061 — Algoritmo do gerador: modelos de divisão + preenchimento de vagas, determinístico e sem sugestão de carga

- **Tipo:** Produto/Algoritmo · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** (a) modelos fixos por objetivo; (b) divisão escolhida por dias/experiência + vagas por padrão de movimento preenchidas com exercícios elegíveis, orçamento de tempo e relatório explicativo; (c) otimização/pontuação livre.
- **Decisão recomendada:** (b) — [TRN-02 §3](../05-regras-de-treinamento/02-motor-de-geracao-de-treinos.md#3-algoritmo-os-10-passos). Sem aleatoriedade; sem sugestão de carga; vagas sem candidato ficam vazias e reportadas.
- **Justificativa:** (a) violaria "não apresentar treino fixo como personalizado"; (c) é difícil de explicar e testar.
- **Consequências:** casos de teste CT-GER-01..08; incremento D2.

## ADR-062 — Parâmetros padrão de prescrição (séries, repetições, descanso, volume semanal)

- **Tipo:** Produto/Conteúdo · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** o gerador precisa de valores padrão por objetivo e experiência; o projeto não tem profissional habilitado revisando (ADR-018).
- **Alternativas:** (a) tabela única simplificada inspirada em referências gerais (ACSM 2009, meta-análise de volume de 2017, OMS 2020), configurável e versionada; (b) deixar todos os valores para o usuário preencher; (c) valores obtidos de fonte comercial.
- **Decisão recomendada:** (a) — [TRN-02 §5](../05-regras-de-treinamento/02-motor-de-geracao-de-treinos.md#5-parâmetros-de-prescrição-adr-062), declarada como referência geral e não prescrição individual.
- **Consequências:** revisão por profissional habilitado obrigatória antes do uso com terceiros (GATE-TER); alterações futuras aumentam `parameters_version`.

## ADR-063 — Tratamento conservador de restrições

- **Tipo:** Segurança/Produto · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Alternativas:** (a) exclusão por marcadores mapeados a cada categoria de restrição, somada à contraindicação explícita por exercício; categorias sem mapeamento seguro (cardiovascular, gestação, outra) geram aviso obrigatório e revisão manual; (b) só contraindicação manual por exercício; (c) reduzir carga/volume em vez de excluir.
- **Decisão recomendada:** (a) — [TRN-03 §5](../05-regras-de-treinamento/03-catalogo-e-selecao-de-exercicios.md#5-marcadores-de-sobrecarga-e-mapa-de-restrições-adr-060-adr-063).
- **Justificativa:** prefere excluir a arriscar; o gerador nunca substitui por exercício excluído; (c) implicaria julgamento clínico.
- **Consequências:** vagas podem ficar vazias para quem tem várias restrições; o mapa é heurística, não orientação clínica (RN-030).

## ADR-064 — Ajustes conservadores por idade (60 anos ou mais)

- **Tipo:** Segurança/Produto · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** RN-023 determina que idade influencia volume e complexidade.
- **Alternativas:** (a) a partir de 60 anos: −1 série por item e exclusão de exercícios de alta complexidade técnica e de impacto, com aviso de avaliação de saúde; (b) faixas etárias múltiplas; (c) nenhum ajuste.
- **Decisão recomendada:** (a) — [TRN-02 §5.3](../05-regras-de-treinamento/02-motor-de-geracao-de-treinos.md#53-ajustes-por-idade-adr-064).
- **Justificativa:** regra simples, conservadora e testável; (b) exigiria critérios sem respaldo suficiente no projeto.
- **Consequências:** caso de teste CT-GER-06.

## ADR-065 — Fórmulas de exibição: duração estimada, volume e melhor série

- **Tipo:** Produto · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão recomendada:** fórmulas de [TRN-04 §5](../05-regras-de-treinamento/04-execucao-e-registro-de-sessoes.md#5-fórmulas-de-exibição-adr-065) (45 s por série + descanso + 60 s de transição; volume = Σ carga × repetições; melhor série = maior carga, desempate por repetições; sem 1RM estimado).
- **Justificativa:** simples, explicáveis e iguais online e offline.
- **Consequências:** usadas por UX-05 e pelo orçamento de tempo do gerador.

## ADR-070 — Parâmetros criptográficos das pendências mantidas após a saída

- **Tipo:** Segurança · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** a ADR-028 (aprovada) exige criptografar as pendências mantidas com chave derivada da senha.
- **Alternativas:** PBKDF2-HMAC-SHA-256 (nativo na Web Crypto); Argon2id (exigiria biblioteca WebAssembly).
- **Decisão recomendada:** PBKDF2-HMAC-SHA-256 com 600.000 iterações, sal de 16 bytes; AES-256-GCM com vetor de 12 bytes; chave não exportável — [SEG-01 §6.2](../06-seguranca-e-qualidade/01-seguranca-e-privacidade.md#62-parâmetros-criptográficos-das-pendências-mantidas-adr-070).
- **Justificativa:** nativo em Android e iPhone, sem dependências; número de iterações conforme a referência da OWASP para PBKDF2-SHA-256.
- **Consequências:** medir o tempo em aparelho modesto na fundação; redução de iterações exige nova aprovação.

## ADR-071 — Cabeçalhos de segurança e política de conteúdo do app

- **Tipo:** Segurança · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão recomendada:** cabeçalhos de [SEG-01 §5](../06-seguranca-e-qualidade/01-seguranca-e-privacidade.md#5-cabeçalhos-http-do-app-adr-071): CSP restrita ao próprio app e ao backend, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`; nenhum script, fonte ou estilo de terceiros.
- **Justificativa:** reduz o impacto de injeção de scripts sobre os tokens guardados no aparelho (AM-04).
- **Consequências:** qualquer recurso externo futuro exige atualizar a CSP e esta ADR.

## ADR-072 — Prazos de retenção de dados

- **Tipo:** Privacidade · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão recomendada:** prazos de [SEG-02 §3](../06-seguranca-e-qualidade/02-lgpd-e-retencao-de-dados.md#3-retenção-adr-072): dados enquanto a conta existir; marcas de exclusão e operações de sincronização 90 dias; relatos de erro 30 dias; auditoria 2 anos sem dados pessoais; backups 35 dias (dados excluídos podem permanecer nos backups até expirarem).
- **Alternativas:** prazos menores (prejudicam reconciliação offline e recuperação); maiores (mais dados guardados sem necessidade).
- **Consequências:** limpeza diária automática; transparência em "Sobre e privacidade".

## ADR-073 — Backup diário criptografado com chave pública, guardado no GitHub, com cópia mensal do usuário

- **Tipo:** Operação/Segurança · **Status:** Aprovada (2026-10-26 — custódia da chave privada de backup aceita pelo usuário) · **Data:** 2026-10-26
- **Contexto:** ADR-036 (aprovada) definiu backup próprio diário, criptografado e fora do provedor; faltava a implementação.
- **Alternativas de guarda:** (a) artefatos do GitHub Actions (retenção configurável, repositório privado) + cópia mensal do usuário; (b) commit em repositório privado (histórico eterno dificulta a retenção); (c) armazenamento de objetos de terceiros (nova conta e possível exigência de meio de pagamento).
- **Decisão recomendada:** (a) — [IMP-03 §1](../07-implantacao/03-backup-e-recuperacao.md#1-política-adr-073), com criptografia `age` por chave pública: o CI só cifra; apenas o usuário decifra.
- **Responsabilidade aceita ao aprovar:** a chave privada fica **somente** com o usuário; se perdida, os backups ficam ilegíveis.
- **Efeito colateral:** o acesso diário legítimo ao banco pode, na prática, impedir a pausa por inatividade do plano gratuito; não é o objetivo e nenhuma atividade artificial será criada. Alternativa: backup semanal (RPO de 7 dias, não atende RNF-011).
- **Consequências:** VH-09 (cota de artefatos e minutos) a confirmar na fundação; testes de restauração (IMP-03 §4).

## ADR-074 — Ambientes: local, desenvolvimento e produção em dois projetos gratuitos

- **Tipo:** Infraestrutura · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão recomendada:** [IMP-01 §1](../07-implantacao/01-ambientes-e-configuracao.md#1-ambientes-adr-074): projeto gratuito nº 1 para desenvolvimento (dados fictícios), nº 2 para produção (região São Paulo); pré-visualizações por branch apontando para desenvolvimento.
- **Justificativa:** testes em aparelhos reais sem tocar dados reais; usa exatamente a cota gratuita de dois projetos.
- **Consequências:** não sobra projeto gratuito para outros fins; restauração de teste usa o projeto de desenvolvimento.

## ADR-075 — Pipeline de CI/CD e ordem de publicação

- **Tipo:** Processo · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Decisão recomendada:** [IMP-02 §1](../07-implantacao/02-estrategia-de-deploy.md#1-pipeline-adr-075): verificações e testes em todo PR; em produção, backup → migrações compatíveis → função → app → teste de fumaça; deploy só pelo CI a partir de `main`.
- **Justificativa:** evolução compatível com aparelhos que ainda têm fila pendente na versão anterior.
- **Consequências:** reversão de banco somente para frente ou por restauração.

## ADR-080 — Ordem de implementação e incrementos do Lançamento 1

- **Tipo:** Processo · **Status:** Aprovada (2026-10-26) · **Data:** 2026-10-26
- **Contexto:** o prompt pede plano ordenado por dependências, começando pela fundação técnica; o usuário quer usar o app pessoalmente o quanto antes (ADR-019).
- **Alternativas:** (a) 7 incrementos verticais com caminho crítico na execução offline e curadoria em paralelo; (b) camadas horizontais (todo o banco, depois toda a API, depois todas as telas); (c) priorizar o gerador antes da execução.
- **Decisão recomendada:** (a) — [PLN-01](../08-planejamento/01-dependencias-e-ordem-de-implementacao.md) e [PLN-02](../08-planejamento/02-plano-de-entrega-por-fases.md): I-1 Fundação → I-2 Identidade e dados locais → I-3 Catálogo → I-4 Programas → I-5 Execução offline → I-6 Histórico e peso → I-7 Qualidade e uso real; depois D1 (até 30 dias), D2–D5 (ordem ajustável por você).
- **Justificativa:** cada incremento entrega algo demonstrável; os riscos maiores (fila offline, isolamento, VH-12) aparecem cedo; (b) só mostra valor no fim; (c) contraria ADR-019 (gerador é `DES`).
- **Consequências:** critérios de saída por incremento; ações do usuário marcadas nas tarefas.

## ADR-090 — Adiantar TAR-004 e seguintes no ambiente local enquanto as contas não existem

- **Tipo:** Processo · **Status:** Aprovada (2026-10-27 — "Aprovo usar o Supabase local (CLI + Docker) para adiantar a TAR-004 e seguintes; registre a decisão como ADR e repita as verificações no projeto real depois.") · **Data:** 2026-10-27
- **Contexto:** pelo [PLN-01](../08-planejamento/01-dependencias-e-ordem-de-implementacao.md), TAR-004 depende de TAR-003 (projetos no provedor), que exige contas criadas pelo usuário. Sem elas, toda a implementação depois de TAR-005 ficaria parada. O ambiente **Local** já está previsto em [IMP-01 §1](../07-implantacao/01-ambientes-e-configuracao.md#1-ambientes-adr-074) (banco do provedor via CLI, dados fictícios).
- **Alternativas:** (a) aguardar as contas; (b) desenvolver TAR-004 e seguintes contra o ambiente local (CLI do Supabase com containers Docker), repetindo as verificações no projeto real quando TAR-003 for concluída; (c) simular o banco com outra tecnologia (diverge da produção).
- **Decisão:** (b). Migrações, papéis, políticas por linha, gatilhos, funções e testes são desenvolvidos e verificados contra o Supabase local. A CLI entra como dependência de desenvolvimento com versão exata (política de ARQ-02 §9).
- **Justificativa:** usa o ambiente já previsto, mantém paridade com a produção (mesmo Postgres e serviços do provedor) e destrava o caminho crítico.
- **Consequências:**
  1. As tarefas adiantadas ficam com status **"Concluída localmente — verificar no projeto real"** em GOV-02 §11 até a TAR-003.
  2. Ao concluir TAR-003, repetir no projeto de desenvolvimento e depois no de produção: aplicação das migrações, testes de políticas e de acesso cruzado, **VH-12** (função conectando com papel próprio) e as verificações de configuração de IMP-01 (cadastro público desabilitado, senha mínima, limites). Divergência relevante → parar e propor ajuste (PLN-01 §1, regra 4).
  3. Diferenças conhecidas do ambiente local (limites de taxa, e-mail, região, cotas do plano gratuito) não são consideradas verificadas localmente.
  4. A ordem do PLN-01 não muda; só o pré-requisito "TAR-003" passa a ser satisfeito provisoriamente pelo ambiente local.
  5. O CI remoto só executará os testes de banco quando houver repositório; até lá, rodam localmente.
  6. (Acréscimo de 2026-10-27, TAR-015 — registro técnico, sem mudança de decisão) Medir no projeto real o tempo de inicialização da função de sincronização sob o limite de CPU do plano gratuito: no ambiente local, sob carga, o edge runtime interrompeu trabalhadores por limite de CPU.
- **Extensão (2026-10-28 — aprovada: "Aprovo estender a ADR-090 às partes locais da TAR-006 e da TAR-007; registre a decisão e comece pela TAR-006."):** as partes locais da TAR-006 (manifest e ícones, service worker com pacote em cache, fluxo de atualização, `_headers`, TELA-002, verificação no build de produção servido em localhost) e da TAR-007 (script de backup com `db dump` + `age` + soma de verificação e retenção de 35 dias contra o banco local, com par de chaves **descartável de teste** — nunca a chave do usuário; tarefa diária de limpeza; 1º teste de restauração em banco local limpo) avançam antes das contas. Ficam para depois da TAR-003: publicação de pré-visualização e produção pelo CI, teste de fumaça no endereço publicado, HSTS, execução real do workflow no GitHub Actions, restauração no projeto de desenvolvimento e a chave pública `age` do usuário. Status em GOV-02 §11: "Parte local concluída — publicação/CI pendentes".

## ADR-091 — Correção de exercícios importados altera o exercício comum (somente com GATE-TER fechado)

- **Tipo:** Produto/Segurança · **Status:** Aprovada (2026-10-27 — "Aprovo a opção A: a correção de importados altera o exercício comum, permitida enquanto ter_enabled for falso, com original preservado; registre como ADR e reveja no GATE-TER.") · **Data:** 2026-10-27
- **Contexto:** RF-032 e API-020 permitem ao gestor corrigir nome, instruções e dicas de exercício importado, preservando o texto original (DAD-02 já prevê `original_text` e `edited_by_manager_at` em `exercises`). DAD-03 §7.2 dizia que importados são escritos somente por migrações, porque são linhas globais, comuns a todos os gestores. Divergência encontrada na TAR-014.
- **Alternativas:** (a) a correção altera o exercício comum, permitida só enquanto `ter_enabled` for falso (um único gestor), com o texto original preservado; (b) correção por gestor em tabela própria, sem tocar no exercício comum; (c) correções só por nova versão do seed.
- **Decisão:** (a). O papel de sincronização pode atualizar **apenas** nome, instruções e dicas de um importado, quando o ator é gestor e `ter_enabled` é falso; na primeira correção, o texto da fonte fica em `original_text` e nunca é sobrescrito; `edited_by_manager_at` marca a correção ("editado" no detalhe). Um gatilho recusa qualquer outra alteração em importados pela sincronização.
- **Justificativa:** segue o modelo já aprovado (DAD-02), é a opção mais simples e, na modalidade PES, não há outro gestor afetado.
- **Consequências:** DAD-03 §7.2 ajustada; **revisão obrigatória no GATE-TER** (com mais de um gestor, a correção afetaria todos — reavaliar (b)); um seed futuro do catálogo não deve sobrescrever importados com `edited_by_manager_at` preenchido sem decisão explícita.

## ADR-092 — Gráfico de linha próprio em SVG no lugar do uPlot (substitui parcialmente a ADR-039)

- **Tipo:** Tecnologia · **Status:** Aprovada (2026-10-28 — "Confirm, keep SVG") · **Data:** 2026-10-28
- **Contexto:** a ADR-039 previa uPlot para gráficos. Na TAR-023, o único gráfico do MVP (peso na TELA-021: uma linha, linha tracejada do peso inicial, linha da meta, toque/hover com valor e "Ver como lista") foi implementado como componente próprio em SVG (`LineChart`), sem dependência. Divergência registrada na TAR-024.
- **Alternativas:** (a) manter o SVG próprio; (b) trocar por uPlot, conforme a ADR-039.
- **Decisão:** (a). Gráficos do app são componentes próprios em SVG enquanto atenderem às necessidades (uma série por gráfico, poucas centenas de pontos).
- **Justificativa:** sem dependência a mais no pacote inicial (SEG-04 §2), cores pelos tokens do tema claro/escuro, e a acessibilidade (rótulos, tabela alternativa, alvos de toque) já verificada pelo axe e pelos testes E2E.
- **Consequências:** ARQ-02 §3.4 e §4 atualizados; a ADR-039 continua valendo para as demais bibliotecas. Reavaliar uPlot se surgir gráfico com várias séries, zoom ou milhares de pontos.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação com ADR-001 a ADR-015 (todas Propostas). |
| 2026-10-26 | Revisão 2: aprovadas pelo usuário ADR-001, 002, 003, 005, 007, 008; criadas ADR-016, 017, 018 (aprovadas, diretrizes do usuário) e ADR-019 a 022 (propostas, parâmetros detalhados por Claude). ADR-004 e ADR-014 reescopadas para a modalidade TER. |
| 2026-10-26 | Revisão 3: ADR-019 com verificação ponta a ponta (43 RF `ESS`: + RF-038 catálogo curado, + RF-055 descanso configurável); ADR-020 simplificada (data escolhida, sem limite); ADR-021 reformulada (descanso configurável por grupo, valor inicial a decidir pelo usuário); ADR-022 com estados de sincronização e distinção entre pendência e conflito; ADR-012 com critério de catálogo do Lançamento 1; ADR-005 item 4 com redação ajustada (sem mudança de decisão). |
| 2026-10-26 | Aprovação pelo usuário de ADR-004, 006, 009 a 015 e 019 a 022 (ADR-021 com valor inicial de 48 h). Todas as 22 ADRs da Etapa 1 estão aprovadas. |
| 2026-10-26 | Etapa 2: criadas ADR-023 a ADR-027 (propostas); faixas de numeração reorganizadas (Etapa 3 a partir de ADR-030). |
| 2026-10-26 | Aprovadas pelo usuário ADR-023 (nome condicionado à verificação de marca/domínio), 024, 025, 026 e 027 (condicionada às verificações CP-01..CP-05). ADR-019: nota de atualização para 44 `ESS`. |
| 2026-10-26 | ADR-028 criada (Proposta). Correção: a nota da ADR-019 sobre RF-103 deixa de afirmar a inclusão como decidida; referência da ADR-027 ao RN-052 marcada como aguardando confirmação. |
| 2026-10-26 | Etapa 3: ADR-030 a ADR-039 criadas (Propostas). |
| 2026-10-26 | Após verificações oficiais: ADR-033 revisada para Cloudflare Pages; ADR-032 e ADR-036 com riscos e contexto confirmados. Status inalterado (Propostas). |
| 2026-10-26 | Aprovadas pelo usuário ADR-030 a ADR-039 (ADR-032 com aceitação dos riscos confirmados do Supabase gratuito). ADR-028 permanece Proposta. |
| 2026-10-26 | ADR-028 aprovada; ADR-019 atualizada para 44 `ESS` (RF-103 confirmado); referência da ADR-027 ao RN-052 confirmada. |
| 2026-10-26 | Etapa 4: ADR-050 a ADR-053 criadas (Propostas). |
| 2026-10-26 | Aprovadas pelo usuário ADR-050 a ADR-053 (ADR-051 com a nova redação da RN-031). |
| 2026-10-26 | Etapa 5: ADR-060 a ADR-065 criadas (Propostas). |
| 2026-10-26 | Aprovadas pelo usuário ADR-060 a ADR-065. |
| 2026-10-26 | Etapa 6: ADR-070 a ADR-075 criadas (Propostas). |
| 2026-10-26 | Aprovadas pelo usuário ADR-070 a ADR-075 (ADR-073 com custódia da chave privada de backup pelo usuário). |
| 2026-10-26 | Etapa 7: ADR-080 criada (Proposta). |
| 2026-10-26 | ADR-080 aprovada pelo usuário. |
| 2026-10-26 | Correção da auditoria final (Etapa 8): parâmetro da ADR-028 L6 atualizado com o valor aprovado na ADR-070 (sem mudança de decisão). |
| 2026-10-27 | ADR-090 criada e aprovada pelo usuário (Supabase local para adiantar TAR-004 e seguintes). |
| 2026-10-27 | ADR-091 criada e aprovada pelo usuário (correção de importados no exercício comum, só com GATE-TER fechado). |
| 2026-10-28 | ADR-092 criada e aprovada pelo usuário (gráfico próprio em SVG; ADR-039 alterada só para gráficos). |
| 2026-10-28 | ADR-090 estendida pelo usuário às partes locais da TAR-006 e da TAR-007. |
