# GOV-02 — Controle de Progresso

| Campo | Valor |
|---|---|
| Identificador | GOV-02 |
| Status | Vivo (atualizado a cada rodada de trabalho) |
| Dono do assunto | Fonte oficial do andamento: etapas, documentos, decisões abertas, perguntas, bloqueios, aprovações |
| Última atualização | 2026-10-27 (Fase 2 — TAR-014 parcial) |

## 1. Situação atual

| Item | Valor |
|---|---|
| Fase | **Fase 2 — Implementação** (Etapa 9) |
| Etapa corrente | **Etapa 9 — Implementação incremental** · I-1 Fundação · TAR-001 (local), TAR-002 e TAR-005 concluídas; TAR-012 entregue, aguardando revisão do usuário; TAR-004 e TAR-008 a TAR-011 concluídas localmente (ADR-090); I-2 completo localmente; TAR-012 concluída; TAR-013 concluída localmente; TAR-014 parcial (decisão pendente sobre correção de importados) |
| Fase 2 (implementação) | **Autorizada** em 2026-10-26 (Marco) |
| Modalidade TER (terceiros) | **Bloqueada** pelo GATE-TER (PRD-08) |
| Bloqueio atual | TAR-003 (ambientes) exige contas no Supabase, Cloudflare e GitHub; TAR-004 e seguintes avançam no ambiente local (ADR-090), com verificação no projeto real depois; TAR-006/007 seguem bloqueadas. TAR-012 concluída; TAR-013 liberada |

## 2. Etapas (sequência oficial — ADR-001)

| Etapa | Nome | Status | Observação |
|---|---|---|---|
| 0 | Inspeção e inventário | **Concluída** | Ver §7 |
| 1 | Visão do produto e requisitos | **Aprovada** (2026-10-26) | 8 documentos; 22 ADRs aprovadas |
| 2 | UX/UI e telas | **Aprovada e encerrada** (2026-10-26) | 8 documentos; 38 telas; ADR-023..027 aprovadas (023 e 027 com condições); detalhamentos de §4.2 seguem pendentes de confirmação |
| 3 | Arquitetura e decisões técnicas | **Aprovada** (2026-10-26) | 5 documentos; ADR-030..039 aprovadas |
| 4 | Dados, APIs e contratos | **Aprovada** (2026-10-26) | 7 documentos; 28 entidades; ADR-050..053 aprovadas |
| 5 | Regras de treinamento | **Aprovada** (2026-10-26) | 5 documentos; ADR-060..065 aprovadas |
| 6 | Segurança, qualidade e implantação | **Aprovada** (2026-10-26) | 9 documentos; ADR-070..075 aprovadas |
| 7 | Plano detalhado de implementação | **Aprovada** (2026-10-26) | 4 documentos; 32 tarefas; 100 critérios; 18 riscos; ADR-080 aprovada |
| 8 | Auditoria cruzada | **Aprovada** (2026-10-26) | PLN-05 |
| Marco | Aprovação formal | **Autorizado** (2026-10-26) | — |
| 9 | Implementação incremental | **Em andamento** | I-1 Fundação; acompanhamento em §11 |
| 10 | Validação, implantação e manutenção | Bloqueada | — |

## 3. Documentos

Status por documento: [índice](00-indice-documentacao.md).

| Situação | Documentos |
|---|---|
| **Aprovados** (2026-10-26) | README, GOV-01, GOV-03, PRD-01..PRD-08, UX-01..UX-08, ARQ-01..ARQ-05, DAD-01..DAD-07, TRN-01..TRN-05, SEG-01..SEG-05, IMP-01..IMP-04, PLN-01..PLN-04 |
| Detalhamentos acrescentados após a aprovação, aguardando confirmação | Saída da conta e dados locais: RF-101 (revisado), RF-103, RN-052, UX-04 §6.1–6.3, UX-08 §8 |
| Vivos | GOV-00, GOV-02, GOV-04, ARQ-06 |
| **Aprovados** | PLN-05 |

## 4. Decisões e aprovações

Fonte das decisões: [ARQ-06](../03-arquitetura/06-adrs.md). Três categorias, sem sobreposição:

### 4.1 Aprovadas pelo usuário

| Item | Observação |
|---|---|
| ADR-001 a ADR-022 (Etapa 1) | ADR-021 com valor inicial de 48 h |
| ADR-023 a ADR-028 (Etapa 2) | ADR-023: nome condicionado à verificação de marca e domínio · ADR-027: condicionada a CP-01..CP-05 · ADR-028 confirmada em 2026-10-26 |
| ADR-030 a ADR-039 (Etapa 3) | ADR-032 com aceitação dos riscos confirmados do Supabase gratuito |
| ADR-080 (Etapa 7) | Ordem e incrementos do Lançamento 1 |
| ADR-070 a ADR-075 (Etapa 6) | ADR-073: chave privada de backup sob custódia do usuário |
| ADR-060 a ADR-065 (Etapa 5) | Gerador, parâmetros de treino, restrições e idade — válidos para uso pessoal; revisão profissional obrigatória antes da TER |
| ADR-050 a ADR-053 (Etapa 4) | ADR-051 aprovou a nova redação da RN-031; ADR-052: imagens só com procedência comprovada |
| UXP-01, UXP-02 e seu detalhamento | RF-080, RF-101 (revisado), RF-103 (`ESS`), RN-052, RN-053, UX-04 §6, UX-08 §8 — confirmados em 2026-10-26 |
| Etapas 1 a 6 | PRD-01..08, UX-01..08, ARQ-01..05, DAD-01..07, TRN-01..05, SEG-01..05, IMP-01..04, README, GOV-01, GOV-03 |

**Total: 55 ADRs aprovadas** (001–028, 030–039, 050–053, 060–065, 070–075 e 080).

### 4.2 Detalhamentos aguardando confirmação

| Item | O que confirmar |
|---|---|
| — | Nenhum (esclarecimento de TRN-04 §4 confirmado em 2026-10-26) |

### 4.3 Propostas (não aprovadas)

Nenhuma.

### 4.4 Condições e verificações abertas

| Item | Origem | Quando |
|---|---|---|
| Verificação de marca e domínio do nome Forja | ADR-023 | Antes da publicação |
| CP-01..CP-05 | ADR-027 | Etapas 6 e 9 |
| VP-01..VP-11 (Android/iPhone) | UX-08 §5.1 | Etapa 9, em aparelhos reais |
| VH-03 (região São Paulo no gratuito — parcial) | ARQ-02 §9 | Criação do projeto (fundação) |
| VH-11, 12 (revogação de sessão; papel `sync_writer`) | ARQ-02 §9 | Fundação (Etapa 9) |
| VH-09, 10 | ARQ-02 §9 | Fundação (Etapa 9) |

## 5. Perguntas ao usuário

| ID | Pergunta | Situação |
|---|---|---|
| Q-001 | Papel duplo e habilitação | Respondida → ADR-003, ADR-018 |
| Q-002 | Orçamento | Respondida → ADR-016 |
| Q-003 | Número de alunos | Respondida → ADR-002 |
| Q-004 | Plataformas | Respondida → ADR-017 |
| Q-005 | Nome, cores, referências visuais | Respondida (2026-10-26): delegada a Claude → proposta em ADR-023 / UX-02 |
| Q-006 | Domínio próprio | **Parcialmente respondida** (2026-10-26): endereço provisório gratuito durante o desenvolvimento; endereço definitivo a decidir antes do uso real (ADR-035) |
| Q-007 | Verificação jurídica da modalidade TER | Aberta, sem prazo — só se quiser liberar terceiros |

### 5.1 Q-006 — Domínio próprio

**Pergunta:** você tem, ou pretende registrar, um domínio próprio (ex.: `forja.app.br`, `seunome.com.br`) para o app? Ou prefere usar o endereço gratuito oferecido pela hospedagem?

**É bloqueadora para a Etapa 3? Não.** A arquitetura pode ser definida e a implementação pode começar com o **endereço provisório gratuito** da hospedagem (que já fornece HTTPS, exigido pela PWA). As escolhas da Etapa 3 não dependem do nome do domínio, apenas de que um domínio próprio possa ser apontado para a hospedagem escolhida — critério que será incluído na comparação (ARQ-02).

**Onde ela passa a importar:** na **troca** de endereço, porque o navegador associa ao endereço (origem) o app instalado, os dados offline, a fila de saída e a sessão de acesso. Mudar de endereço depois do uso real exige:

1. enviar todas as pendências no endereço antigo;
2. reinstalar o app pelo endereço novo;
3. entrar novamente (os dados sincronizados voltam; os locais não migram sozinhos).

**Recomendação:** decidir o endereço definitivo **antes do início do uso real** (Etapa 10 / go-live do Lançamento 1). Usar o endereço provisório durante o desenvolvimento e testes não traz risco. Se optar por domínio próprio, o custo é anual e baixo (verificar o preço vigente no Registro.br para `.br`); a escolha do nome está ligada à verificação de marca da ADR-023.

## 6. Registro de aprovações

| Data | Item | Forma | Observação |
|---|---|---|---|
| 2026-10-26 | ADR-003 | Mensagem do usuário: "adotar uma única conta com acesso às áreas profissional e aluno" | — |
| 2026-10-26 | ADR-005 | Mensagem do usuário: executar treino previamente carregado sem internet, com sincronização posterior | Pediu documentar perda de dados, conflitos e estados pendentes |
| 2026-10-26 | ADR-007 | Mensagem do usuário: "recomendar o próximo treino da sequência planejada, respeitando disponibilidade, descanso e histórico" | Substituiu a rotação simples |
| 2026-10-26 | ADR-016 | Mensagem do usuário: "priorizar alternativas gratuitas ou de baixo custo" | — |
| 2026-10-26 | ADR-017 | Mensagem do usuário: "projetar para Android e iPhone" | — |
| 2026-10-26 | ADR-008 | Mensagem do usuário: "intervalo de 30 dias, com lembrete dentro do aplicativo e possibilidade de adiamento" | Forma do adiamento em ADR-020 (proposta) |
| 2026-10-26 | ADR-002 | Mensagem do usuário: "manter a possibilidade de cadastrar vários alunos na arquitetura, mas priorizar um MVP que eu consiga utilizar pessoalmente" | Recorte em ADR-019 (proposta) |
| 2026-10-26 | ADR-018 | Mensagem do usuário: documentar separadamente uso pessoal e terceiros; verificar requisitos legais antes da segunda modalidade | — |
| 2026-10-26 | ADR-001 | Mensagem do usuário: "resolva a numeração das etapas e mantenha uma única sequência oficial" | — |
| 2026-10-26 | ADR-019, 020, 021 (valor inicial 48 h), 022 | Mensagem do usuário: "Aprovo … as ADR-019, 020, 021 (valor inicial 48 h) e 022" | — |
| 2026-10-26 | ADR-004, 006, 009 a 015 | Mensagem do usuário: "… e as recomendações de baixo impacto (ADR-004, 006, 009 a 015)" | — |
| 2026-10-26 | **Etapa 1 (revisão 3)** — README, GOV-01, GOV-03, PRD-01..08 | Mensagem do usuário: "Aprovo a Etapa 1 (revisão 3)" | Aprovação de etapa não equivale à aprovação do projeto nem libera a Fase 2 |
| 2026-10-26 | Início da Etapa 2 | Mensagem do usuário: "Pode iniciar a Etapa 2" | Q-005 delegada a Claude |
| 2026-10-26 | ADR-023 | "aprovo a identidade visual Grafite e lima e o nome provisório Forja, condicionado à verificação de marca e domínio antes da publicação" | Condição registrada |
| 2026-10-26 | ADR-026 | "aprovo a execução em modo foco" | — |
| 2026-10-26 | ADR-024 | "aprovo os temas claro e escuro, seguindo inicialmente a preferência do sistema" | — |
| 2026-10-26 | ADR-025 | "aprovo a navegação separada entre Meu treino e Gestão" | — |
| 2026-10-26 | ADR-027 | "aprovo a estratégia de armazenamento offline, condicionada às verificações de privacidade e preservação de dados pendentes" | Condições CP-01..05 |
| 2026-10-26 | UXP-01 | "aprovo permitir a exclusão de um registro de peso incorreto, com confirmação ou possibilidade de desfazer" | Adotada confirmação (padrão P6 para ações destrutivas) |
| 2026-10-26 | UXP-02 | "aprovo a UXP-02, desde que a saída da conta nunca cause perda silenciosa de registros não sincronizados" | Detalhamento aguardando confirmação (§4.2) |
| 2026-10-26 | Glossário — acréscimos da Etapa 2 | "aprovo os acréscimos dos termos modo foco, zona do polegar e fila de saída" | — |
| 2026-10-26 | **Etapa 2** — UX-01..UX-08 | "Aprovo a Etapa 2 com as seguintes decisões" | — |
| 2026-10-26 | Encerramento da Etapa 2 e início da Etapa 3 | "considere a Etapa 2 encerrada e inicie somente a Etapa 3" | Etapa 4 não autorizada |
| 2026-10-26 | Q-006 | "por enquanto podemos usar um endereço provisório gratuito durante o desenvolvimento" | Critérios HD-01..07 (ARQ-02 §8) |
| 2026-10-26 | Detalhamentos de saída da conta e isolamento; ADR-028 | "Confirmo os detalhamentos pendentes (RF-101 revisado, RF-103 como ESS, RN-052, RN-053, ADR-028 e os fluxos de UX-04 §6 e UX-08 §8)" | — |
| 2026-10-26 | Início da Etapa 4 | "Pode iniciar a Etapa 4." | — |
| 2026-10-27 | TAR-012 — revisão dos 110 exercícios do catálogo (nomes, textos, classificação, níveis e marcadores) | "todos estao revisados e aprovados" | Critério do elástico como alternativa a máquina (REVISAO.md) não respondido à parte |
| 2026-10-27 | Decisões de implementação da TAR-008 (espera progressiva, lista de senhas comuns, saída só neste aparelho); início da TAR-009 | "Aprovo as três decisões da TAR-008 (espera de 30 s dobrando até 15 min, lista do SecLists, saída só neste aparelho). Pode seguir para a TAR-009." | — |
| 2026-10-27 | ADR-090 — Supabase local para adiantar TAR-004 e seguintes | "Aprovo usar o Supabase local (CLI + Docker) para adiantar a TAR-004 e seguintes; registre a decisão como ADR e repita as verificações no projeto real depois." | Verificações repetidas no projeto real após TAR-003 |
| 2026-10-26 | **Marco de aprovação formal** — Etapa 8 aprovada; TRN-04 §4 confirmado; Fase 2 autorizada | "Confirmo o esclarecimento de TRN-04 §4, aprovo a Etapa 8 (PLN-05) e autorizo explicitamente o início da Fase 2, começando por TAR-001." | — |
| 2026-10-26 | **Etapa 7** — PLN-01..04; ADR-080; início da Etapa 8 | "Aprovo a Etapa 7 (PLN-01 a PLN-04) e a ADR-080. Pode iniciar a Etapa 8 (auditoria final)." | Fase 2 continua bloqueada até o Marco |
| 2026-10-26 | Início da Etapa 7 | "Pode iniciar a Etapa 7." | — |
| 2026-10-26 | **Etapa 6** — SEG-01..05, IMP-01..04; ADR-070..075 | "Aprovo a Etapa 6 (SEG-01 a SEG-05 e IMP-01 a IMP-04) e as ADR-070 a ADR-075, incluindo a custódia da chave privada de backup comigo." | Etapa 7 não autorizada ainda |
| 2026-10-26 | Início da Etapa 6 | "Pode iniciar a Etapa 6." | — |
| 2026-10-26 | **Etapa 5** — TRN-01..05; ADR-060..065 | "Aprovo a Etapa 5 (TRN-01 a TRN-05) e as ADR-060 a ADR-065." | Etapa 6 não autorizada ainda |
| 2026-10-26 | Início da Etapa 5 | "Pode iniciar a Etapa 5." | — |
| 2026-10-26 | **Etapa 4** — DAD-01..07; ADR-050..053; nova RN-031 | "Aprovo a Etapa 4 (DAD-01 a DAD-07) e as ADR-050 a ADR-053, incluindo a nova redação da RN-031 proposta na ADR-051." | Etapa 5 não autorizada ainda |
| 2026-10-26 | **Etapa 3** — ARQ-01..05; ADR-030..039 | "Aprovo a Etapa 3 (ARQ-01 a ARQ-05) e as ADR-030 a ADR-039, aceitando os riscos confirmados do Supabase gratuito." | Etapa 4 não autorizada ainda; ADR-028 e itens de §4.2 seguem pendentes |

## 7. Resultado da Etapa 0 — Inspeção do repositório

| Aspecto | Constatação |
|---|---|
| Conteúdo | Diretório `AI-Trainer` vazio — nenhum código ou documentação prévia. |
| Controle de versão | Não é um repositório git (decisão em ARQ-03, Etapa 3). |
| Tecnologias no projeto | Nenhuma. |
| Ferramentas na máquina (informativo) | Node.js 24.18, npm 11.18, Python 3.14, Git 2.54, Windows 11. |
| Conflitos com a estrutura documental | Resolvidos: numeração de etapas (ADR-001) e grafia do arquivo TRN-05 (corrigida na revisão 2). |

## 8. Auditoria da Etapa 1 (revisão 3)

Executada em 2026-10-26 por script sobre os 54 arquivos `.md`.

### 8.1 Verificações automáticas — 0 problemas

| Verificação | Resultado |
|---|---|
| Links relativos e âncoras (133) | 0 quebrados |
| RF, RNF, RN, ADR, JOR, PER, REG citados × definidos | 0 sem definição (faixas como "RF-050..073" validadas pelas extremidades, pois atravessam números reservados) |
| Todo RF com prioridade e modalidade | OK — 83 RF |
| Ator "PRO" remanescente; RF TER fora de `FUT` | Nenhum |
| PRD-04 (listas ESS, DES, TER, FUT) × PRD-05 | Coerentes |
| PRD-08 §4 (coluna TER) × PRD-05 | Coerentes |
| Status das ADRs: índice × corpo | Coerentes — 22 aprovadas |
| Numeração de etapas | Sequência única |
| Grafia antiga do arquivo TRN-05 | Ausente (exceto no registro histórico) |
| Textos desatualizados ("41 RF", "recuperação rápida", "2 adiamentos", estados antigos) | Apenas em registros históricos |

### 8.2 Números

| Item | Quantidade |
|---|---|
| RF | 83 — `ESS` 44 (inclui RF-103, confirmado) · `DES` 21 · `FUT` 18 (3 PES + 15 TER) |
| RNF | 28 |
| RN | 53 (RN-001..053) |
| ADR | 55 — todas aprovadas |
| Matriz de rastreabilidade | 65 RF `ESS`/`DES` com tela, API, entidade, tarefa e critério (PLN-05 §4) |

### 8.3 Cobertura funcional do MVP

| Necessidade de uso ponta a ponta | Lançamento 1 (`ESS`) |
|---|---|
| Cadastro e edição do perfil | RF-009, RF-012, RF-016 |
| Criação e edição manual de treinos | RF-020, RF-024, RF-025, RF-027, RF-028 |
| Catálogo com imagens adequadas e informações confiáveis | RF-030, RF-031, RF-032, RF-034, **RF-038 (novo)** |
| Execução com séries, repetições, cargas e conclusão | RF-060..063, RF-065..067 |
| Offline de treinos já carregados | RF-090, RF-091, RF-093 |
| Sincronização com pendências e conflitos claros | RF-092, RF-100..102 |
| Recomendação do próximo treino e agenda | RF-050, RF-051, **RF-055 (novo)**, RF-070, RF-071 |
| Histórico de sessões e peso | RF-054, RF-069, RF-072, RF-080, RF-081 |

Seções 6.1–6.11 do prompt mestre: todas mapeadas (PRD-04 §7).

### 8.4 Coerência entre offline, histórico, sincronização e isolamento

Os 12 pontos analisados na revisão 2 (C-01..C-12) continuam válidos. Ajustes da revisão 3:

| # | Ponto | Resolução |
|---|---|---|
| C-13 | Pendência local tratada como conflito | Definição restrita: só há conflito quando o mesmo registro foi alterado em dois lugares (RN-046); pendências e duplicidades não exigem ação (RN-045, RN-051). |
| C-14 | Falha de rede classificada como "recusado" | Proibido: "recusado" só para recusa definitiva do servidor (RN-051). |
| C-15 | Descanso fixo × ADR-007 | Descanso configurável por grupo (RN-050, RF-055) mantém a obrigação da ADR-007 sem impor um valor universal. |

Limitações aceitas que continuam valendo: recomendação offline não vê sessões de outro aparelho ainda não sincronizadas (C-04); risco de remoção de dados locais no iPhone antes da sincronização, com mitigações a detalhar em UX-08 (C-11).

## 8A. Auditoria da Etapa 2

Executada em 2026-10-26 por script sobre os 54 arquivos `.md`.

| Verificação | Resultado |
|---|---|
| Links e âncoras | 0 quebrados |
| Identificadores citados × definidos (inclui TELA-###) | 0 sem definição — 38 telas definidas (TELA-070..089 reservadas para TER) |
| RF `ESS` e `DES` sem tela ou elemento de interface | Nenhum |
| Status das ADRs: índice × corpo | Coerentes — 27 aprovadas |
| Contraste das cores (UX-02 §4.3) | Todos os pares ≥ 4,5:1 (texto) e ≥ 3:1 (componentes), calculados |
| Consistência com a Etapa 1 | Estados de sincronização = RN-051; descanso = RN-050/RF-055 (valor inicial 48 h); recomendação = RN-013; janela de 60 dias = RN-027; limitações de plataforma = ADR-017 |
| Requisitos aprovados ampliados | Dois casos identificados e **não** incorporados sem aprovação: UXP-01 e UXP-02 |

### 8B. Coerência: armazenamento offline × sincronização × saída da conta × isolamento

| # | Ponto | Resolução |
|---|---|---|
| K-01 | Fila de saída "nunca removida automaticamente" (UX-08 §6.1) × limpeza ao sair (RF-103) | A limpeza só remove pendências pela opção **Descartar e sair**, com confirmação digitada (RN-052 b); sem escolha, nada é removido. |
| K-02 | "Sair e manter neste aparelho" × privacidade | Pendências isoladas por usuário e invisíveis a outros na interface (RN-052 e); não são criptografadas pelo app — consequência informada no texto da opção e avaliada em SEG-01 (CP-03). |
| K-03 | Falha de envio ao sair × "nenhuma perda silenciosa" | Falha parcial reapresenta as opções com contagem atualizada; recusados e conflitos exigem resolução ou escolha explícita (RN-052 c, RN-051). |
| K-04 | Sessão expirada × limpeza | Expiração/revogação não é saída: nada é removido (RN-052 d); envio só após login do mesmo usuário (RN-047). |
| K-05 | Troca de usuário × fila de outro usuário | Fila nunca enviada com a sessão de outro usuário (RN-047); identificador pertencente a outro usuário é recusado no servidor (RN-042); existência das pendências não é revelada (RN-052 e). |
| K-06 | Sessão em andamento × saída | Contada como pendência; retomada no próximo login do mesmo usuário se mantida (RN-052 b). |
| K-07 | Atualização do app × pendências | Migrações preservam a fila; atualização só fora de sessão em andamento (UX-08 §9). |
| K-08 | Imagens em cache × dados pessoais | Imagens do catálogo não são pessoais e podem permanecer; imagens próprias do usuário são removidas na limpeza (UX-08 §8.2). |
| K-09 | Aviso de pendências antigas (UX-08 §7) × pendências mantidas após sair | Sem usuário ativo não há aviso, para não revelar dados a terceiros. **Limitação aceita**, informada no texto da opção "Sair e manter". |
| K-10 | Login após limpeza | Login exige conexão (TELA-001); os dados sincronizados são baixados novamente — coerente com a remoção local. |

Nenhuma contradição encontrada entre RN-042, RN-043, RN-047, RN-051, RN-052, RF-100..103, UX-04 §6 e UX-08 §6–9.

Limitações registradas: afirmações sobre suporte de navegadores (UX-08 §5) são hipóteses a validar em aparelhos reais na Etapa 9 (VP-01..VP-11); listas de opções do perfil e grupos musculares são provisórias até TRN-01/TRN-03 (Etapa 5).

## 8C. Auditoria da Etapa 3

Ver resultado da execução automática em §8C.1 (atualizado a cada rodada).

### 8C.1 Resultado

| Verificação | Resultado |
|---|---|
| Links e âncoras | 0 quebrados |
| Identificadores citados × definidos | 0 sem definição |
| Status das ADRs: índice × corpo | Coerentes — 37 aprovadas, 1 proposta (ADR-028) |
| Coerência ARQ × decisões aprovadas | ARQ-01 respeita ADR-005 (offline), ADR-016 (custo: tudo gratuito), ADR-017 (sem depender de segundo plano), ADR-027 (fila própria; descarte de Firebase por isso), ADR-028 (camada L4 implementada por políticas por linha + função de sincronização) |
| Coerência ARQ × requisitos | Localização de todas as RN em ARQ-01 §5; RNF mapeados em ARQ-01 §7; RNF-011 (backup) atendido por ADR-036 diante da ausência de backup gratuito |
| Pontos que podem exigir mudança de requisito aprovado | RN-031 (limitação por e-mail e lista de senhas comuns) pode não ser configurável no serviço de autenticação — **não alterado**; decisão em DAD-05 com sua aprovação |
| Informações externas | Verificadas na documentação oficial em 2026-10-26: VH-01, 02, 06, 07, 08 confirmadas; VH-03 parcial; VH-04, 05, 09, 10 pendentes para etapas posteriores (ARQ-02 §9) |
| Mudança decorrente das verificações | ADR-033 passou de "Cloudflare (Pages ou Workers)" para **Cloudflare Pages**; nenhuma decisão aprovada foi alterada |

## 8D. Auditoria da Etapa 4

| Verificação | Resultado |
|---|---|
| Links, âncoras e identificadores (inclui ENT, API) | Ver execução automática (0 problemas na última rodada) |
| RF `ESS`/`DES` × entidades | Todos cobertos (DAD-01 §8) |
| Telas `ESS` × leituras/escritas | Todas com API-R e operação correspondente (DAD-04 §3 e §5) |
| RN × local de garantia | Regras críticas no banco (DAD-03 §3–§5); demais na função de sincronização |
| Isolamento | Leitura por políticas por linha; escrita só por `sync_writer` (ADR-050); testes de acesso cruzado previstos |
| Incompatibilidades com decisões aprovadas | Resolvidas: RN-031 reescrita (ADR-051 aprovada); ADR-034 refinada pela ADR-050 (aprovada) |
| Dependência de etapa posterior | Enumerações e taxonomia (TRN-01/TRN-03) provisórias em DAD-02 §7 |
| Fontes externas | Supabase (sessões, senhas, limites) e licenças do catálogo verificados em documentação oficial/repositórios em 2026-10-26 |

## 8E. Auditoria da Etapa 5

| Verificação | Resultado |
|---|---|
| Seção 6.6 do prompt (perfil) | Todos os campos mapeados (TRN-01 §2); biotipo não coletado (ADR-011) |
| Seção 6.7 (10 passos do gerador) | Cada passo especificado (TRN-02 §3); proibições respeitadas: sem exercícios inventados (RN-007), sem treino fixo apresentado como personalizado (relatório explica cada entrada), sem publicação automática (RN-009), sem ignorar restrições (TRN-03 §5) |
| Determinístico × IA futura | Separação explícita (TRN-02 §7) |
| Coerência com regras aprovadas | Recomendação (TRN-04 §4) implementa RN-013/RN-050/ADR-021 sem regra nova; adiamento sem limite (ADR-020); fórmulas únicas para UX e gerador |
| Listas provisórias | Substituídas por TRN-01/TRN-03; DAD-02 §7 e UX-05 atualizados para referenciá-las |
| Colisões de identificadores | Corrigidas: casos de teste do gerador renomeados para CT-GER (TG-## é dos gatilhos de DAD-03); restrição `upper_back` renomeada para `thoracic` (código igual ao grupo muscular) |
| Limites declarados | Parâmetros e mapa de restrições declarados como referência geral/heurística, não prescrição nem orientação clínica (RN-030, ADR-018) |

## 8F. Auditoria da Etapa 6

| Verificação | Resultado |
|---|---|
| RNF-009..017, 021, 025 | Estratégia definida em SEG-01..05 e IMP-01..04 |
| Condições da ADR-027 (CP-01..CP-05) | CP-01, CP-02, CP-04, CP-05 → testes em SEG-03 §4; CP-03 avaliada em SEG-01 §6.1 |
| ADR-028 L6 | Parâmetros em SEG-01 §6.2 (ADR-070) |
| ADR-036 (backup) | Implementado em IMP-03 (ADR-073); chave privada só com o usuário |
| Offline exigido pelo prompt | Cache, persistência, sincronização e conflitos especificados (UX-08, DAD-04, SEG-05) |
| Migração de origem | Procedimento não transparente detalhado (IMP-02 §4) |
| Atividade artificial no provedor | Não há; efeito colateral do backup declarado (ADR-073) |
| Afirmações jurídicas | Hipóteses e itens a verificar; nenhuma conclusão jurídica (SEG-02) |

## 8G. Auditoria da Etapa 7

| Verificação | Resultado |
|---|---|
| Todo RF `ESS`/`DES` em ao menos uma tarefa | OK (verificação automática; 9 referências explícitas acrescentadas durante a revisão) |
| Todo RF `ESS`/`DES` e todo RNF com critério de aceite | OK — 100 critérios |
| Critérios citados nas tarefas e incrementos existem | OK; todo critério definido é usado por alguma tarefa ou incremento |
| Campos exigidos pelo prompt em cada tarefa | Objetivo, referências, pré-requisitos, entregáveis, critérios, testes, dependências, condição de avanço — presentes nas 32 tarefas |
| Ordem por dependências e começo pela fundação | Grafo em PLN-01 §2; caminho crítico em PLN-02 §4 |
| Escopo | Nenhuma tarefa para requisitos `FUT`/TER |
| Ações do usuário | Marcadas (contas, chaves, aparelhos, domínio, revisão de conteúdo) |

Os riscos consolidados estão em [PLN-04](../08-planejamento/04-riscos-e-mitigacoes.md) (RSK-001..018).

## 8H. Auditoria cruzada final (Etapa 8)

Resultado completo em [PLN-05](../08-planejamento/05-checklist-de-aprovacao-final.md): 11 verificações do prompt atendidas; correções registradas em PLN-05 §3 e GOV-04; nenhuma mudança de escopo ou decisão.

## 9. Riscos e pontos de atenção

Serão formalizados em [PLN-04](../08-planejamento/04-riscos-e-mitigacoes.md) na Etapa 7.

| Ponto | Descrição |
|---|---|
| Uso com terceiros | Bloqueado no servidor pelo GATE-TER (RN-040, RN-041). |
| Armazenamento no iPhone | Ver C-11; validação VP-03, VP-04 e VP-10 (alto risco). |
| Domínio | Troca de endereço depois do uso real exige reenviar pendências e reinstalar (Q-006, §5.1, ADR-035). |
| Pausa do backend gratuito | Confirmado: projetos gratuitos pausam após 1 semana de inatividade; app segue offline, sincronização só após restauração (ARQ-02 §7). |
| Termos do Supabase | Uso limitado a "internal business purposes"; suspensão e limites possíveis; cliente responsável pelo backup (VH-07). |
| Backup | Sem backup gerenciado no plano gratuito → backup próprio (ADR-036) precisa existir antes do uso real. |
| Curadoria do catálogo | RF-038 exige trabalho manual (tradução, revisão, verificação de imagens e licenças) antes do Lançamento 1; tarefa própria na Etapa 7. Imagens do free-exercise-db sem procedência informada (ADR-052). |
| Valores de treino sem revisão profissional | Parâmetros (ADR-062) e mapa de restrições (ADR-063) não foram revisados por profissional habilitado; adequados apenas ao uso pessoal, com revisão obrigatória antes da TER (GATE-TER). |
| Chave privada de backup | Perda torna os backups ilegíveis; vazamento permite lê-los (IMP-03 §5). |
| Sessão sem expiração | No plano gratuito, a sessão não expira por tempo; aparelho perdido depende do bloqueio de tela e de revogação pelo painel (DAD-05 §3). |
| Camadas gratuitas | Limites de banco, backups e suspensão por inatividade — avaliar na Etapa 3. |
| Hospedagem no exterior | Relevante apenas para a TER (REG-06). |

## 10. Próximo passo

Ver §11 (tarefa corrente).

## 11. Acompanhamento da implementação

| Tarefa | Situação | Observações |
|---|---|---|
| TAR-001 Repositório e ferramentas | **Concluída localmente** (commit `45c2a40`) | Por decisão do usuário (2026-10-26), o projeto segue **sem repositório remoto** por enquanto. Pendências: criar o repositório privado, enviar `main` e confirmar o CI verde (condição de avanço original) |
| TAR-002 Pacote de domínio e parâmetros | **Concluída** (local) | `@forja/domain`: parâmetros (PRD-07 §11), enumerações e rótulos (TRN-01/03), faixas (RN-018/035), esquemas Zod (DAD-02), datas no fuso (RN-028), idade (RN-010), janela de edição (RN-027), relógio (RN-048), mensagens e formatos pt-BR (SEG-05, RNF-004). 31 testes; cobertura 100% linhas / 94,9% ramos (meta 90%). CA-221 atendido localmente |
| TAR-003 Ambientes | Bloqueada | Exige contas no Supabase, Cloudflare e GitHub (ação do usuário) |
| TAR-005 Casca do app e componentes base | **Concluída** (local) | Rotas de UX-03 §5 com telas provisórias que indicam a tarefa de entrega; navegação por área (barra inferior/trilho lateral, chave de área); foco no título ao trocar de tela; tokens de UX-02 em dois temas; componentes `Button`, `IconButton`, `FormField`, `Stepper`, `Snackbar`, `Dialog`, `Banner`, `EmptyState`, `ErrorState`, `Skeleton`, barreira de erro; lint com React Hooks e jsx-a11y. Testes: 3 unitários do `Stepper`; 126 ponta a ponta (todas as rotas em 360 px nos dois temas, 768/1280 px, navegação, foco, alvos de toque, componentes), axe sem violações sérias. Build de produção: 103,5 KB de JS comprimido. Decisão de implementação: roteador próprio mínimo, sem dependência nova (ARQ-04 §8). CA-201..205 atendidos localmente |
| TAR-004 Banco base | **Concluída localmente — verificar no projeto real** (ADR-090) | Cinco migrações aplicadas do zero: papel `sync_writer` (sem login, sem `BYPASSRLS`), `app.current_actor()`, taxonomias de TRN-01/03 geradas do pacote de domínio (teste contra divergência), `system_settings` (`ter_enabled = false`), `managers`, `students`, `training_profiles`, `rest_settings`, `rest_overrides`, `assessments`, `weight_entries`; políticas habilitadas e forçadas; tabelas novas sem permissão automática para `anon`/`authenticated`; gatilhos TG-03, TG-04, TG-05, TG-08 (este aguarda `program_versions` da TAR-015), validação de códigos e dono imutável do aluno. 46 testes pgTAP (estrutura com reprovação de tabela sem política, acesso cruzado entre dois usuários fictícios, escrita direta recusada, gatilhos e faixas) e verificação HTTP com `anon`. VH-12 confirmada localmente. Pendências: repetir no projeto real após TAR-003; CI do banco só roda quando houver repositório remoto. CA-214, CA-222, CA-224 atendidos localmente |
| TAR-006, 007 | Bloqueadas | Dependem de TAR-003 (contas do usuário) |
| TAR-012 Curadoria do catálogo | **Concluída** (revisão do usuário em 2026-10-27; `validate.ts --release` sem pendências — CA-038) | `catalog/exercicios.json` com 110 exercícios do free-exercise-db (Unlicense, commit `f00c92c`), textos reescritos em pt-BR, classificados pela taxonomia de TRN-03 (padrão, músculos, equipamentos, marcadores, nível). Metas de DAD-06 §4 atendidas: grupos grandes ≥ 6, pequenos ≥ 2; peso livre 48, máquina 20, polia 16, peso corporal 25; três níveis; toda máquina com alternativa sem máquina. Nenhuma imagem (procedência não comprovada — ADR-052); placeholder. Snapshot, `FONTE.md`, `LICENCAS.md`, `REVISAO.md`; validador `scripts/catalog/validate.ts` no CI com 6 testes. Pendentes: contato com os mantenedores sobre as imagens (rascunho entregue; envio pelo usuário) e confirmação do critério do elástico como alternativa a máquina |
| TAR-008 Autenticação e conta básica | **Concluída localmente — verificar no projeto real** (ADR-090) | TELA-001 (login com erro genérico, mostrar/ocultar senha, aviso sem conexão, limite do provedor), sessão persistente, TELA-005 (senha atual conferida; RN-031 em tempo real: 10+ caracteres, ≠ e-mail, fora da lista de senhas comuns, ≠ atual), espera progressiva após 5 falhas seguidas, saída sem pendências (RN-052 a) a partir de uma TELA-004 parcial (e-mail, Alterar senha, Sair; o restante na TAR-011), bloqueio de telas sem sessão; script operacional `scripts/ops/init-manager.ts` (IMP-01 §4) e usuários fictícios locais. Testes: 8 unitários (RN-031) e 17 ponta a ponta de autenticação em Chromium e WebKit (+ suíte da casca com sessão), axe sem violações sérias. Decisões de implementação **aprovadas** (2026-10-27): espera de 30 s dobrando até 15 min; lista de senhas comuns do SecLists (MIT, entradas com 10+ caracteres); saída encerra só a sessão deste aparelho (`scope: local`). Configuração: `[auth.email] enable_signup` precisa ficar `true` (o valor `false` desliga o login por e-mail); o bloqueio do cadastro público vem de `[auth] enable_signup = false` (cadastro público recusado — verificado). CA-001, CA-002, CA-007, CA-213 atendidos localmente |
| TAR-009 Banco local e fila de saída | **Concluída localmente — verificar no projeto real** (ADR-090) | Banco local por usuário (Dexie/IndexedDB) com nome opaco (SHA-256 de sal do aparelho + usuário), aberto só para o usuário autenticado e fechado ao trocar; esquema versionado com migração testada (fila e sessão em andamento preservadas); fila com dono por operação e `op_id` gerado no aparelho; regras puras no domínio: seleção do lote (ordem de criação, só do usuário da sessão, operações seguintes do mesmo registro aguardam), classificação RN-051 e intervalos 5 s/15 s/1 min/5 min; motor com gatilhos de UX-08 §6.3 (abertura, primeiro plano, conexão, 60 s, Enviar agora), envio interrompido retomado pelo mesmo `op_id`; transporte HTTP do contrato DAD-04 (resposta validada; 401 → aguardando login; 429/5xx/rede → nova tentativa); pedido de armazenamento persistente registrado (chamado na TAR-019). Salvaguarda até a TAR-021: com registros não enviados, **Sair** não remove nada e oferece Enviar agora (CP-02). Testes: 12 unitários do domínio, 18 da camada local (IndexedDB simulado) e 2 ponta a ponta (T-PWA-09 e T-PWA-15, parte do aparelho; CA-102 sem pendências mantidas). Pendências: recusa do servidor em T-PWA-15 (TAR-010); CA-091 completo com a execução (TAR-019); pendências mantidas e criptografadas (TAR-021). JS inicial 144 KB comprimido (orçamento 200 KB) |
| TAR-010 Função de sincronização (base) | **Concluída localmente — verificar no projeto real** (ADR-090) | Função `sync` (Deno) com núcleo compartilhado com os testes: identidade pelo token verificado no serviço de autenticação; conexão com o papel `sync_writer` e ator fixado por transação; `contract_version`; uma transação por operação; idempotência por `op_id` em `sync_operations` (aceitas e recusas guardadas; reenvio devolve `duplicate`/a recusa original; `op_id` de outro usuário recusado sem explicar); `OWNER_MISMATCH` com evento em `audit_events` (resumo SHA-256 do usuário, sem dados pessoais); conflito por revisão com `server_record`; `deferred` para operações seguintes do mesmo registro; erros do banco traduzidos para os códigos de DAD-04 §7 (política por linha → `NOT_FOUND`); `Cache-Control: no-store`; CORS só para origens configuradas. Operações API-002 `onboarding.complete`, API-003 `profile.update`, API-007 `rest.update`, com esquemas compartilhados no domínio. Migração de `sync_operations` e `audit_events` (sem leitura pelo app). Testes: 14 de contrato contra o banco local (inclui 3 reenvios, conflito, dono divergente, NOT_FOUND e chamada HTTP real), cobertura da função 95% linhas / 86% ramos (meta 80%). VH-12 confirmada localmente também a partir da função. Pendências: repetir no projeto real (inclusive pelo pooler) após TAR-003; limpeza de `sync_operations` após 90 dias (TAR-007) |
| TAR-011 Configuração inicial e Conta | **Concluída localmente — verificar no projeto real** (ADR-090) | TELA-003: assistente de 7 etapas (barra "Etapa n de 7", Continuar/Voltar, Pular nas etapas sem obrigatório), validação por etapa no app (RN-010 no fuso padrão, faixas de RN-018), local pré-seleciona equipamentos (TRN-01 §3.4), aviso de saúde (UX-02 §8.3); progresso gravado no banco local do usuário a cada alteração; conclusão exige conexão e envia API-002 direto à função, com identificadores estáveis (reenvio idempotente; novo `op_id` só após recusa). API-R01 lido pela API de dados e guardado no aparelho (abre offline com a cópia; primeiro acesso offline explica que precisa de conexão). Sem aluno próprio, o app leva à configuração inicial; configurado, a rota leva a Hoje. TELA-004 completa: nome e e-mail, chave de área só com papel duplo (RF-005), aparência, atalhos (Descanso, Sincronização com resumo, Instalar, Alterar senha), "Sobre e privacidade" (SEG-01 §6.1 + aviso de uso) e Sair. Componente `ChoiceGroup`. Testes: 7 unitários do rascunho e E2E de JOR-08 completo (inclui progresso após recarregar, idade, faixas, offline na etapa 7 e conferência no banco), CA-005 e TELA-004, com axe. Ajuste dos testes ponta a ponta: 4 processos, esperas de 15 s (WebKit no Windows com o servidor de desenvolvimento). Os usuários fictícios agora vêm com a configuração inicial feita (exceto os de primeiro acesso, um por navegador) e têm a senha restaurada a cada preparação; o teste de gatilhos do banco passou a filtrar pelo aluno de teste. Suíte: 155 ponta a ponta, 86 unitários, 46 de banco e 14 de integração. Textos a confirmar: descrições de "Levemente ativo" e "Moderadamente ativo" (TRN-01 só descreve os extremos). CA-005, CA-009, CA-301 atendidos localmente |
| TAR-013 Catálogo no banco e telas | **Concluída localmente — verificar no projeto real** (ADR-090) | Migração do catálogo (DAD-02 §4): `content_sources`, `exercises` (padrões e marcadores de TRN-03 conferidos por teste contra o domínio; RN-037 por restrição; nome único entre ativos do mesmo escopo), músculos, equipamentos, imagens (fonte e licença obrigatórias — RN-036), contraindicações e alternativas; políticas: importados para todos os autenticados, personalizados só para o gestor dono e seus alunos; escrita só por migração (personalizados na TAR-014). Seed v1 gerado de `catalog/exercicios.json` com identificadores derivados do código (iguais em qualquer ambiente; teste contra divergência): 110 exercícios revisados, sem imagens (ADR-052). App: leitura API-R04/R05 com cópia no banco local (consulta offline), busca sem acento e filtros de grupo primário, equipamento, dificuldade e origem feitos no aparelho; TELA-034 e TELA-014 (placeholder "Imagem indisponível", grupos, equipamentos, dificuldade, instruções, dicas, créditos com fonte e licença, marca "editado"); detalhe mantém a área de onde veio. Sem imagens a otimizar (nenhuma com procedência comprovada). Testes: 12 pgTAP do catálogo, 3 do seed, 3 unitários de filtros/cópia e 4 E2E (busca+filtros, detalhe, offline, inexistente) com axe. Decisão de implementação: filtro de grupo usa o grupo **primário**; filtros em listas de seleção. JS inicial 153 KB comprimido. Observação: o teste de troca de senha no WebKit falhou uma vez sob carga paralela e passou 3/3 isolado (instabilidade de carga; CI repete uma vez). CA-030, CA-031, CA-034 atendidos localmente |
| TAR-014 Exercício personalizado e correção | **Parcial — personalizados concluídos localmente; correção de importados aguarda decisão** (ADR-090) | Operações `exercise.create`/`exercise.update` (API-020) para personalizados: esquema compartilhado no domínio, só o gestor dono (políticas por linha), nome único entre ativos visíveis (`NAME_TAKEN`, inclusive contra importados), classificação substituída na edição, dono/origem imutáveis (gatilho). TELA-036 (criar/editar, com "Padrão de movimento" obrigatório pelo modelo de TRN-03 §4, passos e dicas editáveis) e botão Editar no detalhe (variante Gestão). **Correção de falha da TAR-013:** `app.can_see_exercise` avaliava o ator no contexto do dono da função e o papel de sincronização não via o catálogo; corrigido com o padrão de ator por parâmetro e teste de regressão. Testes: 4 de contrato, 2 pgTAP de regressão, 3 unitários de esquemas e E2E de criação/edição/nome repetido (com axe). **Divergência pendente:** RF-032/API-020 pedem corrigir texto de importado, mas DAD-03 §7.2 diz que importados são escritos só por migrações (linhas globais) — decisão do usuário. Ainda não incluídos (sem decisão): marcadores de sobrecarga em personalizados (relevantes para restrições no D2). CA-032 atendido para personalizados |
| TAR-015..035 | Não iniciadas | TAR-015 depende de TAR-010 e TAR-013 (concluídas localmente) |
