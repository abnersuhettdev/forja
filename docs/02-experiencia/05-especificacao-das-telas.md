# UX-05 — Especificação das Telas

| Campo | Valor |
|---|---|
| Identificador | UX-05 |
| Status | **Aprovado** (2026-10-26 — Etapa 2) |
| Etapa | 2 |
| Dono do assunto | Especificação de cada tela (TELA-###): requisitos, conteúdo, ações, validações e estados |
| Dependências | PRD-05, PRD-07, UX-01, UX-02, UX-03, UX-04 |
| Referenciado por | UX-06, DAD-04, PLN-01, PLN-03 |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo

Permitir implementar cada tela sem decisões improvisadas. Telas `ESS` (Lançamento 1) são especificadas por completo; telas `DES` têm especificação resumida, a ser detalhada antes do respectivo incremento.

## 2. Convenções

- Estrutura de cada tela: **RF/RN** · **Objetivo** · **Conteúdo** (de cima para baixo) · **Ações** · **Validações** · **Estados**.
- Estados não citados seguem o padrão de [UX-01 §4](01-principios-de-ux-ui.md#4-padrão-de-feedback-aplicável-a-toda-tela).
- Componentes em `Monoespaçado` estão em [UX-06](06-componentes-e-padroes-visuais.md). Textos-padrão em [UX-02 §8](02-identidade-visual.md#8-tom-de-voz-e-microcopy).
- **Listas de opções** (objetivos, experiência, equipamentos, categorias de restrição, grupos musculares): fonte final em TRN-01 §3 e TRN-03 §2–§3 (Etapa 5). As telas usam os rótulos lá definidos; os exemplos nesta especificação são ilustrativos.
- "Offline" indica o comportamento sem conexão; "Gestão" exige conexão para alterar dados (RF-093).

## 3. Acesso e conta

### TELA-001 — Login

- **RF/RN:** RF-001 · RN-031.
- **Objetivo:** entrar no app.
- **Conteúdo:** logotipo; campo E-mail (`inputmode=email`, autocompletar `username`); campo Senha (autocompletar `current-password`, botão mostrar/ocultar); botão primário **Entrar**; texto "Esqueceu a senha? A redefinição é feita pelo responsável pela instalação do app" (ADR-004).
- **Validações:** campos obrigatórios; erro de credenciais genérico ("E-mail ou senha incorretos"), sem revelar qual; após limite (RN-031), "Muitas tentativas. Aguarde alguns minutos."
- **Estados:** enviando (botão com indicador, campos bloqueados); offline: "Para entrar é preciso estar conectado" — exceto se já houver sessão de acesso válida no aparelho (o app abre direto).

**Versão 1.2 (planejada, ainda não implementada — [PLN-06](../08-planejamento/06-plano-versao-1-2.md)):** direção Anilha (UX-02 §2.3). O texto de ajuda muda para "Esqueceu a senha? Fale com quem administra sua conta." **Já implementado** (2026-11-04): no computador, painel escuro com a anilha e formulário ao lado; o título da página continua sendo "Forja", e a frase é parágrafo.

### TELA-002 — Instalar o app

- **RF:** RF-090 · ADR-017.
- **Conteúdo por plataforma** (detecção em UX-08 §4):
  - Android/Chrome com prompt disponível: explicação curta + botão **Instalar**.
  - iPhone/Safari: passos ilustrados com ícones — 1) tocar em Compartilhar; 2) "Adicionar à Tela de Início"; 3) abrir pelo ícone. Nota: "No iPhone, usar o app pelo ícone mantém seus dados offline mais protegidos."
  - Navegador interno de outro app (ex.: rede social): "Abra este endereço no Safari ou no Chrome para instalar."
  - Já instalado: "O app já está instalado neste aparelho."
- **Acesso:** banner dispensável em Hoje (uma vez) e item em Conta.

### TELA-003 — Configuração inicial

- **RF/RN:** RF-009, RF-016 · RN-010, RN-018, RN-030.
- **Objetivo:** criar o perfil de aluno e a avaliação inicial em etapas curtas.
- **Estrutura:** assistente (`Wizard`) com barra de progresso "Etapa n de 7", botões **Continuar** / **Voltar**; "Pular" nas etapas sem campo obrigatório.

| Etapa | Campos | Obrigatório |
|---|---|---|
| 1. Sobre você | Nome; data de nascimento; sexo (Feminino, Masculino, Prefiro não informar) | Nome, data de nascimento |
| 2. Objetivo | Objetivo (hipertrofia, emagrecimento, força, condicionamento, manutenção, qualidade de vida); experiência (iniciante, intermediário, avançado — com descrição); nível de atividade fora da academia | Não |
| 3. Disponibilidade | Dias por semana (1–7); tempo por sessão (15–180 min, sugestões 30/45/60/75/90); dias preferidos (seg–dom, múltipla escolha) | Não |
| 4. Onde você treina | Local (academia completa, academia básica, casa, ao ar livre) + equipamentos disponíveis (lista de seleção) | Não |
| 5. Restrições | "Nenhuma restrição" **ou** seleção de categorias (ex.: ombro, joelho, coluna lombar…) + observação livre | Não (mas incentivado) |
| 6. Medidas | Altura (cm); peso atual (kg); peso-meta (kg, opcional) | Peso atual |
| 7. Antes de começar | Aviso de saúde (UX-02 §8.3) com botão **Entendi, concluir** | Confirmação |

- **Validações:** idade ≥ 18 (RN-010: "O app é destinado a maiores de 18 anos"); faixas de RN-018 com mensagem junto ao campo.
- **Estados:** progresso salvo no aparelho a cada etapa; offline na etapa 7: "Conecte-se para concluir. Suas respostas estão salvas neste aparelho."
- **Saída:** Hoje (TELA-010).

### TELA-004 — Conta

- **RF:** RF-002, RF-005, RF-007, RF-101.
- **Conteúdo (lista):** nome e e-mail · **Área**: Meu treino / Gestão (`SegmentedControl`, só com papel duplo) · **Aparência**: Sistema / Claro / Escuro · Descanso entre treinos → TELA-006 · Sincronização → TELA-007 (com resumo do estado) · Instalar o app → TELA-002 (se não instalado) · Alterar senha → TELA-005 · Sobre e aviso de uso · **Sair** (cor de perigo, último item).
- **Ações:** Sair segue o fluxo de [UX-04 §6.1](04-fluxos-de-navegacao.md#61-saída-da-conta-rf-101-rf-103-rn-052) (RF-101, RF-103, RN-052).

### TELA-005 — Alterar senha

- **RF/RN:** RF-007 · RN-031.
- **Conteúdo:** senha atual; nova senha (com regras exibidas: mínimo 10 caracteres, diferente do e-mail); confirmar nova senha; **Salvar**.
- **Validações:** regras de RN-031 em tempo real após a primeira digitação; confirmação igual.
- **Estados:** offline → formulário desabilitado com explicação.

### TELA-006 — Descanso entre treinos

- **RF/RN:** RF-055 · RN-050 · ADR-021.
- **Conteúdo:** texto de aviso (UX-02 §8.3, "Descanso"); **Descanso padrão** com `Stepper` em horas (0–168, passo 6 h; toque no valor abre teclado numérico), valor inicial 48 h com rótulo "ponto de partida editável"; lista de grupos musculares primários, cada um mostrando "Padrão (48 h)" ou o valor próprio; toque abre folha com opção "Usar padrão" ou valor próprio; ação **Restaurar padrões**.
- **Regras:** 0 h = sem verificação para o grupo; alterações valem imediatamente para a recomendação.
- **Estados:** offline → alterações salvas no aparelho e enviadas depois (configuração do próprio aluno, sujeita à mesma fila).

### TELA-007 — Sincronização

- **RF/RN:** RF-092, RF-100 · RN-045, RN-046, RN-051 · ADR-022.
- **Conteúdo:**
  1. Cabeçalho de estado: "Conectado · último envio às 14:32" ou "Sem conexão".
  2. **Disponível offline:** "Programa (versão de 20/10) · atualizado às 14:30" + **Atualizar agora**.
  3. **Precisa da sua atenção** (aparece só se houver): itens recusados (motivo + **Corrigir** / **Descartar**) e conflitos (**Comparar**, abrindo `ConflictCompare`).
  4. **Aguardando envio**: contagem e lista resumida ("Sessão de 26/10 — Treino B · 18 séries"); botão **Enviar agora** (desabilitado offline); texto "Nenhuma ação necessária".
  5. **Para revisar**: possíveis duplicidades (**Manter ambas** / **Excluir uma**).
  6. **Armazenamento neste aparelho:** "Proteção contra limpeza automática: ativada/não disponível" e espaço usado (UX-08 §7).
- **Estados:** tudo sincronizado → `EmptyState` "Tudo sincronizado".

## 4. Meu treino

### TELA-010 — Hoje

- **RF/RN:** RF-050, RF-051 · RN-011, RN-013, RN-038, RN-049.
- **Conteúdo:**
  1. Cabeçalho: "Hoje · seg., 26 out." + `SyncIndicator`.
  2. Banners (se aplicável): instalar o app (uma vez); pendências antigas (UX-08 §7); reavaliação (D1).
  3. **Cartão principal** (único cartão de destaque, `primary-container`), em uma das variantes:

| Variante | Conteúdo | Ação primária | Ações secundárias |
|---|---|---|---|
| Sessão em andamento | "Treino B em andamento · 23 min · 9 de 18 séries" | **Continuar** | — |
| Treino recomendado | Nome do treino; motivo (ex.: "Próximo da sequência · peitoral descansado há 3 dias"); nº de exercícios; duração estimada; grupos musculares (chips); observação "Hoje não é um dia planejado" quando aplicável | **Iniciar treino** | Escolher outro treino; Ver treino |
| Descanso sugerido | Motivo ("Meta da semana atingida: 4 de 4" ou "Próximo treino fica disponível amanhã às 7:10 pelo seu descanso configurado") | — | **Treinar mesmo assim** (abre TELA-011) |
| Concluído hoje | "Treino A concluído · 58 min" + próximo recomendado | Ver resumo | Escolher outro treino |

  4. **Semana:** 7 marcadores seg–dom (presença, pendente, planejado) + "3 de 4 treinos nesta semana".
  5. **Peso:** "82,4 kg · há 5 dias" (+ meta, se houver) + **Registrar peso** (TELA-022).
  6. Linha "Disponível offline · atualizado às 14:30".
- **Duração estimada:** fórmula de [TRN-04 §5](../05-regras-de-treinamento/04-execucao-e-registro-de-sessoes.md#5-fórmulas-de-exibição-adr-065) (séries × (45 s + descanso) + 60 s de transição por exercício, arredondada para 5 min).
- **Estados vazios:** sem programa publicado → "Você ainda não tem um programa" + **Montar programa** (abre Gestão › Programa); programa nunca baixado e offline → UX-04 §4.1.

```
┌──────────────────────────────────┐
│ Hoje · seg., 26 out.     ☁✓      │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ RECOMENDADO                  │ │
│ │ Treino B — Inferiores        │ │
│ │ Próximo da sequência ·       │ │
│ │ pernas descansadas há 3 dias │ │
│ │ 6 exercícios · ~55 min       │ │
│ │ [Quadríceps][Posterior][Glút]│ │
│ │ ┌──────────────────────────┐ │ │
│ │ │      Iniciar treino      │ │ │
│ │ └──────────────────────────┘ │ │
│ │ Escolher outro · Ver treino  │ │
│ └──────────────────────────────┘ │
│ Semana   ● ● ○ ◌ ◌ ◌ ◌  2 de 4   │
│ Peso     82,4 kg · há 5 dias  +  │
│ Disponível offline · 14:30       │
├──────────────────────────────────┤
│ Hoje  Treinos  Agenda  Evol. Conta│
└──────────────────────────────────┘
```

### TELA-011 — Escolher treino (folha inferior)

- **RF/RN:** RF-051 · RN-013, RN-050.
- **Conteúdo:** treinos do programa ativo na ordem da sequência, cada um com estado: "Recomendado", "Feito neste ciclo (24/10)", ou aviso de descanso ("Peitoral treinado há 20 h · descanso configurado 48 h", ícone de aviso).
- **Ações:** tocar em treino compatível → inicia a sessão; em incompatível → confirmação inline "Iniciar mesmo assim?" (não bloqueante).

### TELA-012 — Treinos

- **RF:** RF-052.
- **Conteúdo:** nome do programa e "versão de 20/10"; lista de treinos: nome, nº de exercícios, duração estimada, grupos musculares; selo "Disponível offline".
- **Estados:** sem programa → mesmo vazio de Hoje.

### TELA-013 — Detalhe do treino

- **RF/RN:** RF-053, RF-060 · RN-012.
- **Conteúdo:** nome, resumo (exercícios, duração, grupos); lista ordenada: miniatura (ou placeholder), nome, "3 × 8–12 · descanso 90 s", carga sugerida se houver; botão fixo inferior **Iniciar treino**.
- **Ações:** tocar em exercício → TELA-014; Iniciar com outra sessão em andamento → diálogo "Você tem o Treino A em andamento. Concluir ou descartar antes de iniciar outro." com **Ir para o treino em andamento**.

### TELA-014 — Detalhe do exercício

- **RF/RN:** RF-031, RF-034, RF-054 · RN-036.
- **Conteúdo:** imagens (`ExerciseImage`, carrossel com botões anterior/próximo e indicador; placeholder se não houver); nome; chips de grupos primários e secundários; equipamentos; dificuldade; **Sua prescrição** (quando aberto de um treino); **Última vez** (data e séries: "12/10 · 40 kg × 10, 10, 9"); instruções numeradas; dicas de segurança; alternativas (quando cadastradas); **Créditos e fonte** (origem, licença, "editado" se corrigido).
- **Variante Gestão:** ação **Editar** (TELA-036).

### TELA-015 — Execução (modo foco, ADR-026)

- **RF/RN:** RF-060..063, RF-066, RF-067, RF-091 · RN-012, RN-018, RN-026, RN-043, RN-044.
- **Estrutura:**
  1. **Barra superior:** minimizar (`chevron-down`), nome do treino, tempo decorrido (`mm:ss`), progresso "Exercício 2 de 6", `SyncIndicator` compacto, menu ⋮ (Visão geral, Pular exercício, Descartar sessão).
  2. **Exercício atual:** imagem (altura reduzida; toque amplia), nome (`type.title`), prescrição "3 × 8–12 · descanso 90 s", orientações (expansível), "Última vez: 40 kg × 10, 10, 9".
  3. **Séries** (`SetRow`): uma linha por série prescrita. Linhas concluídas: compactas, com valores e ✓. **Série atual**: destacada, com `Stepper` de carga (±2,5 kg; toque no número abre teclado decimal, passo 0,5) e de repetições (±1), em `type.metric`. Séries futuras: valores pré-preenchidos em `text-muted`. Ação "+ Adicionar série"; remover série pelo menu da linha (séries extras ou ainda não registradas).
  4. **Zona do polegar (fixa):** botão primário **✓ Concluir série 2** (altura 56 px); secundário **Próximo exercício** quando todas as séries estiverem registradas.
- **Pré-preenchimento (RF-061):** carga e repetições da mesma série na última execução do exercício; sem histórico, carga sugerida da prescrição e o mínimo da faixa de repetições; sem carga sugerida, campo vazio (obrigatório antes de confirmar). Exercícios de peso corporal: carga padrão 0 com rótulo "peso corporal + kg". Exercícios por duração: campo "segundos" no lugar de repetições.
- **Ao confirmar a série:** gravação local → ✓ na linha → `Snackbar` "Série registrada · Desfazer" (5 s) → cronômetro de descanso (`RestTimer`) ocupa a zona do polegar: contagem regressiva em `type.display`, **−15 s**, **+15 s**, **Pular**, e "A seguir: série 3 · 40 kg × 10". Ao terminar: som curto (se permitido), vibração (se suportada), mensagem "Descanso concluído" e retorno do botão de série.
- **Validações:** carga 0–500 (passo 0,5) e repetições 0–100 (RN-018), com mensagem junto ao `Stepper`.
- **Estados:** offline idêntico ao online; falha de gravação local → `Banner` de perigo "Não foi possível salvar neste aparelho. Não feche o app; tente novamente." (RN-043); tela mantida ligada quando suportado (UX-08 §5).

```
┌──────────────────────────────────┐
│ ⌄  Treino B · 23:41   2/6   ☁↑ ⋮ │
├──────────────────────────────────┤
│ [ imagem do exercício      ]     │
│ Agachamento livre                │
│ 3 × 8–12 · descanso 90 s         │
│ Última vez: 60 kg × 10, 10, 9    │
├──────────────────────────────────┤
│ 1  60 kg × 10                 ✓  │
│ 2 ┌───────────┐ ┌───────────┐    │
│   │ − 60,0 kg+│ │ −  10   + │    │
│   └───────────┘ └───────────┘    │
│ 3  60 kg × 10   (previsto)       │
│ + Adicionar série                │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │     ✓ Concluir série 2       │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘

Durante o descanso, a zona inferior vira:
│        1:12                      │
│  [−15 s]   [Pular]   [+15 s]     │
│  A seguir: série 3 · 60 kg × 10  │
```

### TELA-016 — Visão geral da sessão (folha)

- **RF:** RF-063, RF-066.
- **Conteúdo:** lista de exercícios com progresso ("2 de 3 séries"), estado (concluído, atual, pulado, pendente); tocar leva ao exercício (permite mudar a ordem de execução); **Concluir treino** no rodapé.

### TELA-017 — Concluir e resumo

- **RF/RN:** RF-065 · RN-011, RN-028, RN-049.
- **Concluir:** aviso se houver séries não registradas ("3 séries não registradas serão ignoradas"); PSE opcional (`SegmentedControl` 0–10 com rótulos "leve" em 0–3, "moderado" 4–6, "intenso" 7–8, "máximo" 9–10); observação opcional (até 500 caracteres); **Concluir treino**.
- **Resumo:** duração, exercícios realizados/pulados, séries, volume total (Σ carga × repetições), estado de sincronização ("Salvo neste aparelho · será enviado" ou "Sincronizado"); **Voltar para Hoje**.

### TELA-018 — Agenda

- **RF/RN:** RF-070, RF-071 · RN-011, RN-029, RN-049.
- **Conteúdo:** mês com navegação ‹ › e título "Outubro de 2026"; grade de 7 colunas iniciando na segunda-feira; cada dia com número e **um** marcador principal (UX-02 §4.4) + marcador pequeno de "aguardando envio" quando aplicável; legenda recolhível; resumo "12 treinos em outubro".
- **Ações:** tocar no dia → TELA-019; botão "Hoje".
- **Estados:** offline → dados do aparelho com aviso "dados de \<hora\>".

### TELA-019 — Dia e sessões

- **RF/RN:** RF-069, RF-072 · RN-012, RN-027, RN-044.
- **Conteúdo:** data; se apenas planejado: "Dia planejado — nenhum treino registrado"; para cada sessão: treino e versão do programa, início–término, duração, estado, PSE e observação; exercícios com séries (carga × repetições) e exercícios pulados.
- **Ações:** **Editar** → TELA-020; **Excluir** (confirmação com data e treino); sessão abandonada: **Concluir** (informar término) / **Excluir**; fora da janela de 60 dias, ações ocultas com nota "Registros com mais de 60 dias são somente leitura".

### TELA-020 — Editar sessão

- **RF/RN:** RF-069 · RN-018, RN-027, RN-046.
- **Conteúdo:** horário de início e término; por exercício, linhas de série editáveis (carga, repetições), adicionar/remover série; PSE; observação; **Salvar**.
- **Estados:** edição de registro já sincronizado pode gerar conflito (RN-046), tratado em TELA-007.

### TELA-021 — Evolução

- **RF/RN:** RF-080, RF-081 · RN-017.
- **Conteúdo:** peso atual e variação desde o início; gráfico de linha (`LineChart`) com período (30 dias, 90 dias, 1 ano, tudo; padrão 90 dias), linha tracejada do peso inicial e linha do peso-meta; lista dos registros (data, valor), cada um com ação **Excluir** (diálogo de confirmação com data e valor — UXP-01); **Registrar peso**.
- **Estados:** menos de 2 registros → gráfico substituído por "Registre seu peso mais vezes para ver a evolução".
- No incremento D3, a tela ganha abas: Peso · Exercícios · Medidas · Metas.

### TELA-022 — Registrar peso (folha)

- **RF/RN:** RF-080 · RN-018.
- **Conteúdo:** data (padrão hoje, não futura); peso (teclado decimal, 30–300 kg, uma casa decimal); **Salvar**.
- **Estados:** offline → salvo no aparelho e enviado depois.

## 5. Gestão

### TELA-030 — Programa

- **RF/RN:** RF-025, RF-027, RF-028 · RN-003, RN-004, RN-005.
- **Conteúdo:** programa ativo (nome, divisão, "publicado em 20/10", lista resumida de treinos); se houver rascunho, `Banner` "Rascunho em edição · alterado às 14:10" com **Continuar** e **Descartar**.
- **Ações:** **Editar programa** (cria rascunho a partir da versão ativa, RF-027); sem programa: **Criar programa** (e, no D2, **Gerar automaticamente**).
- **Estados:** offline → leitura, ações desabilitadas (RF-093).

### TELA-031 — Editor de rascunho

- **RF/RN:** RF-020, RF-024, RF-025 · RN-021, RN-035.
- **Conteúdo:** nome do programa; divisão (Full body, AB, ABC, ABCD, Superior/Inferior, Outra); treinos em sequência — cada um com nome editável ("A — Peito e tríceps"), exercícios com resumo ("3 × 8–12 · 90 s") e ações (editar, mover para cima/baixo, remover com desfazer); **+ Adicionar exercício**; **+ Adicionar treino**; reordenar treinos (arrastar pela alça **e** botões subir/descer, por acessibilidade); indicador "Salvo às 14:32" (salvamento automático).
- **Ações:** **Publicar** (primária) → validação → diálogo de confirmação (UX-04 §3); **Descartar rascunho** (menu).
- **Validações (RN-035, RN-021):** lista de pendências com atalhos (ex.: "Treino C não tem exercícios", "Supino declinado está desativado — substitua").
- **Desktop:** duas colunas (treinos | exercícios do treino selecionado).

### TELA-032 — Exercício prescrito (folha)

- **RF/RN:** RF-020, RF-024 · RN-035.
- **Conteúdo:** exercício (nome + **Trocar**); medida: Repetições | Duração; séries (1–10); repetições mín.–máx. (1–100) ou duração em segundos; descanso (atalhos 30/60/90/120/180 s + valor livre 0–600); carga sugerida (opcional); orientações (até 500 caracteres); **Salvar**.

### TELA-033 — Escolher exercício (folha em tela cheia)

- **RF/RN:** RF-030, RF-034 · RN-021.
- **Conteúdo:** busca por nome; filtros (`FilterChip`) de grupo muscular, equipamento, dificuldade; lista com miniatura, nome, grupo primário, equipamento; exercícios desativados não aparecem; ao final, **Criar exercício** (TELA-036).
- **Ação:** tocar seleciona e abre TELA-032.

### TELA-034 — Catálogo

- **RF/RN:** RF-030, RF-031, RF-038 · RN-036, RN-037.
- **Conteúdo:** igual a TELA-033, com filtro adicional de origem (Todos, Importados, Personalizados) e ação **Novo exercício**; tocar abre TELA-014 (variante Gestão).

### TELA-036 — Criar/editar exercício

- **RF/RN:** RF-032 · RN-036, RN-037.
- **Personalizado:** nome; grupos primários (≥ 1) e secundários; equipamentos; dificuldade; medida padrão (repetições/duração); instruções (passos numerados); dicas de segurança; imagem própria (D5+, `DES`).
- **Importado:** apenas nome, instruções e dicas editáveis; aviso "Importado de \<fonte\>. Suas correções ficam registradas e a fonte original é preservada."
- **Validações:** nome obrigatório e único entre exercícios ativos; ao menos um grupo primário.

### TELA-037 — Perfil de treinamento

- **RF/RN:** RF-012 · RN-018, RN-025.
- **Conteúdo (seções, cada uma com **Editar** em folha):** Dados pessoais (nome, data de nascimento, sexo, altura); Objetivo (objetivo, peso-meta); Experiência e atividade; Disponibilidade (dias, tempo, dias preferidos); Onde treina e equipamentos; Restrições; Preferências (texto livre); **Avaliações**: "Última: 26/10 · 82,4 kg" + **Registrar avaliação**.
- **Regra:** alterações em objetivo, disponibilidade, equipamentos ou restrições registram a marca de revisão recomendada do programa (RN-025); a exibição dessa marca chega no D4 (RF-087).

### TELA-038 — Registrar avaliação

- **RF/RN:** RF-016 · RN-014, RN-018, RN-030.
- **Conteúdo:** data (padrão hoje); peso (obrigatório); atalho "Revisar perfil" para TELA-037; observações; **Salvar**. (Medidas corporais entram no D3.)

## 6. Requisitos `DES` sem tela própria

| RF | Elemento | Onde |
|---|---|---|
| RF-015 | Resumo consolidado no topo de TELA-037 (programa, frequência, peso, alertas) | TELA-037 |
| RF-018, RF-086 | Selo "Desatualizado" com explicação (`Badge` + texto) | TELA-010, TELA-037 |
| RF-033 | Ação Desativar/Reativar | TELA-036 |
| RF-035 | Campo "Contraindicado para" (categorias de restrição) | TELA-036 |
| RF-036 | Campo "Alternativas" (seleção de exercícios) | TELA-036; exibidas em TELA-014 |
| RF-087 | `Banner` "Revisão recomendada" com motivo e **Dispensar** | TELA-030 |

## 7. Telas `DES` (especificação resumida)

| Tela | Conteúdo essencial |
|---|---|
| TELA-050 Reavaliação (D1) | Assistente de 4 etapas: peso e medidas; objetivo e peso-meta; disponibilidade e preferências; equipamentos e restrições — cada uma com "Continua igual" como resposta rápida. Banner em Hoje com **Fazer agora** e **Lembrar em…** (seletor de data, sugestão +7 dias). |
| TELA-051 Gerar treino (D2) | Lista de verificação de dados (✓/pendente com atalho) → **Gerar** → rascunho no editor com painel "Premissas consideradas" e "Exercícios excluídos e por quê"; aviso de sugestão para uso próprio. |
| TELA-052 Histórico do exercício (D3) | Gráfico de carga máxima por sessão; lista de execuções com melhor série e volume. |
| TELA-053 Metas (D3) | Objetivo, peso inicial/atual/meta, barra de progresso (RN-017), meta semanal. |
| TELA-054 Medidas (D3) | Registro e lista de circunferências e % de gordura informado. |
| TELA-055 Histórico de avaliações (D3) | Lista por data; comparação de duas avaliações lado a lado. |
| TELA-056 Versões do programa (D4) | Lista de versões (data, ativa/arquivada); visualização somente leitura; **Criar rascunho a partir desta**. |
| TELA-057 Registrar treino realizado (D5) | Data (até 60 dias), treino, horário, duração; séries opcionais. |
| TELA-058 Substituir exercício (D5) | Alternativas cadastradas do exercício atual; vale só para a sessão. |
| TELA-059 Exportar meus dados (D5) | Explicação do conteúdo + **Gerar arquivo JSON** (download). |

## 8. Pontos que ampliam requisitos aprovados (decisão do usuário)

Durante a especificação, dois comportamentos se mostraram necessários mas não constavam dos RF aprovados. **Ambos foram aprovados pelo usuário em 2026-10-26** e incorporados: UXP-01 → RF-080; UXP-02 → RF-101 (revisado), RF-103 e RN-052.

| ID | Proposta | Motivo | Impacto |
|---|---|---|---|
| UXP-01 | Permitir **excluir** um registro de peso (com confirmação), ampliando RF-080 | Um valor digitado errado distorceria o gráfico permanentemente | Pequeno; uma ação na lista de TELA-021 |
| UXP-02 | Ao **sair da conta sem pendências**, apagar do aparelho os dados locais daquele usuário | Privacidade em aparelho compartilhado; coerente com RF-102 | Pequeno; próximo login baixa os dados novamente |

## Telas da versão 1.2

**Versão 1.2 (planejada, ainda não implementada — [PLN-06](../08-planejamento/06-plano-versao-1-2.md)):**

- **TELA-051 — Gerar treino:** no modo Automático, sem os atalhos de gestão; lista de pendências de RF-022; mostra a ênfase pedida; resultado com motivos e aviso; sem IA, informa de forma simples que a rotina veio só das regras.
- **TELA-060 — Meu plano:** rotina atual, motivos, "gerar outra" e acesso ao resumo da semana. Estados: sem rotina, gerando, sem conexão (mostra a rotina guardada; gerar exige conexão).
- **TELA-061 — Resumo da semana:** fatos calculados por regras, texto da IA e proposta de ajuste, se houver, aceita com um toque. Sem IA ou sem conexão, só os fatos.
- **TELA-014 — Exercício:** fotos do exercício, com créditos (RF-118); sem foto adequada, placeholder.

## Critérios de conclusão

- [x] Toda tela `ESS` especificada com RF, conteúdo, ações, validações e estados.
- [x] Requisitos `ESS` cobertos por telas (verificação em GOV-02 §8).
- [x] Telas e elementos `DES` resumidos.
- [x] UXP-01 e UXP-02 decididas (aprovadas).
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 2). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 2). |
| 2026-10-26 | Nota das listas de opções aponta para TRN-01/TRN-03. |
| 2026-10-26 | Correção da auditoria final (Etapa 8): fórmula de duração alinhada a TRN-04 §5 (antes omitia a transição de 60 s). |
| 2026-11-04 | Versão 1.2: TELA-001, TELA-014, TELA-051, TELA-060 e TELA-061. |
