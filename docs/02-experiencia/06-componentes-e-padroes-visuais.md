# UX-06 — Componentes e Padrões Visuais

| Campo | Valor |
|---|---|
| Identificador | UX-06 |
| Status | **Aprovado** (2026-10-26 — Etapa 2) |
| Etapa | 2 |
| Dono do assunto | Biblioteca de componentes, variantes, estados e padrões de interação |
| Dependências | UX-01, UX-02, UX-05 |
| Referenciado por | UX-07, ARQ-04 (nomes no código), PLN-01 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Definir os componentes reutilizáveis para que todas as telas sejam montadas com as mesmas peças. Nomes em `PascalCase` são os nomes de referência (o nome final no código segue ARQ-04). Valores visuais usam somente tokens de UX-02.

## 2. Regras gerais

- Todo componente interativo tem estados: padrão, foco (anel `color.focus` 2 px + afastamento 2 px), pressionado, desabilitado (opacidade 0,5 + `aria-disabled`, com explicação quando relevante) e carregando, quando aplicável.
- Alvos de toque: 48 px na execução e botões primários; 44 px nos demais (RNF-002).
- Ícones de ação sem texto exigem rótulo acessível e dica (`title`) no desktop.

## 3. Estrutura e navegação

| Componente | Descrição | Especificação |
|---|---|---|
| `AppHeader` | Cabeçalho da tela | Altura 56 px; título `type.title`; à esquerda voltar (quando aplicável); à direita `AreaSwitch` (papel duplo) e `SyncIndicator` |
| `BottomNav` | Barra inferior (celular/tablet) | 5 (Meu treino) ou 4 (Gestão) destinos; ícone 24 px + rótulo sempre visível (`type.label`); destino ativo em `primary` com indicador; altura 64 px + área segura do sistema |
| `SideRail` | Navegação lateral (≥ 1024 px) | Mesmos destinos; 88 px recolhido / 240 px expandido |
| `AreaSwitch` | Chave Meu treino / Gestão | Menu suspenso no cabeçalho; também em Conta como `SegmentedControl` |
| `SessionBar` | Barra de sessão em andamento | Acima da `BottomNav`; `info` como cor de destaque; "Treino B · 23 min · Voltar"; toque inteiro é alvo |
| `SyncIndicator` | Estado de conexão e sincronização | Ícone + texto curto (UX-02 §4.4); com itens que exigem atenção, ponto `danger`/`warning` e contagem; toque abre TELA-007; anuncia mudanças com `aria-live="polite"` |
| `Wizard` | Assistente em etapas | Barra de progresso "Etapa n de N"; Continuar (primário), Voltar, Pular (quando permitido) |
| `BottomSheet` | Folha inferior | Alça de arraste + botão Fechar; fecha com voltar do sistema; altura máx. 90%; no desktop vira diálogo centralizado |
| `Dialog` | Diálogo de confirmação | Título com a ação ("Descartar sessão?"); texto nomeia o que será perdido; botões: ação (perigo, à direita) e Cancelar; foco inicial em Cancelar para ações destrutivas |

## 4. Ações e entradas

| Componente | Descrição | Especificação |
|---|---|---|
| `Button` | Botão | Variantes: `primary` (fundo `primary`), `secondary` (contorno `border`), `ghost` (só texto), `danger` (fundo `danger`). Tamanhos: `lg` 56 px (execução), `md` 48 px, `sm` 44 px. Uma única variante `primary` por tela |
| `IconButton` | Botão de ícone | 48 × 48 px; rótulo acessível obrigatório |
| `FormField` | Campo com rótulo | Rótulo sempre visível acima (nunca só placeholder); texto de ajuda; erro em `danger` com ícone e texto; associação `aria-describedby` |
| `TextInput` | Texto | Altura 48 px; `inputmode` adequado (email, decimal, numeric) |
| `NumberInput` | Número com unidade | Sufixo de unidade ("kg", "cm"); vírgula decimal; teclado numérico |
| `Stepper` | Ajuste por incremento | Botões − e + de 48 px; valor central em `type.metric` tocável para digitar; passo configurável (carga 2,5; repetições 1; horas 6); mantém pressionado = repetição acelerada; limites de RN-018 |
| `SegmentedControl` | Escolha única curta | 2–5 opções; também usado para PSE (0–10) com rolagem horizontal no celular |
| `Select` | Escolha em lista | Folha inferior com lista e busca quando > 10 opções |
| `MultiSelectChips` | Escolha múltipla | Chips selecionáveis (dias da semana, equipamentos, categorias de restrição) |
| `FilterChip` | Filtro de lista | Chip com contagem; "Limpar filtros" visível quando houver filtro ativo |
| `Toggle` | Liga/desliga | Rótulo à esquerda, controle à direita |
| `DateInput` / `TimeInput` | Data e hora | Seletores nativos do sistema; formato pt-BR na exibição |
| `SearchField` | Busca | Ícone de lupa, limpar, resultado enquanto digita (≥ 2 caracteres) |

## 5. Conteúdo e dados

| Componente | Descrição | Especificação |
|---|---|---|
| `ListItem` | Item de lista | Até 2 linhas (título + apoio), mídia opcional à esquerda (miniatura 56 px), ação/seta à direita; separadores `divider` |
| `HighlightCard` | Cartão de destaque | Fundo `primary-container`; usado **somente** para o cartão principal de Hoje e o resumo da sessão |
| `ExerciseImage` | Imagem de exercício | 4:3; carregamento progressivo; texto alternativo "Demonstração: \<nome do exercício\>"; placeholder padronizado (UX-02 §7); variante miniatura 56 px |
| `Chip` | Etiqueta | Grupos musculares, equipamentos; não interativo |
| `StatusBadge` | Estado | Ícone + rótulo + cor (UX-02 §4.4); nunca só cor |
| `SetRow` | Linha de série | Estados: futura (valores previstos em `text-muted`), atual (destacada, `Stepper`s grandes), registrada (valores + ✓ `success`), não realizada. Menu da linha: remover (séries extras/não registradas) |
| `RestTimer` | Cronômetro de descanso | Contagem regressiva em `type.display` com numerais tabulares; −15 s / +15 s / Pular; calcula pelo horário de término; ao fim: som (se permitido), vibração (se suportada), mensagem; anúncio a leitores de tela somente no início e no fim (`aria-live="assertive"` no fim) |
| `WeekStrip` | Semana em Hoje | 7 marcadores seg–dom com estados (presença, pendente de envio, planejado, vazio) + texto "3 de 4" |
| `MonthCalendar` | Agenda | Grade 7 colunas (segunda primeiro); célula ≥ 44 px; marcador principal + marcador de envio pendente; navegação por teclado (setas) no desktop; cada dia com rótulo acessível completo ("26 de outubro, treino concluído, aguardando envio") |
| `LineChart` | Gráfico simples | Uma série principal + linhas de referência (inicial tracejada, meta); eixos com unidades; toque/hover mostra valor; **tabela alternativa** acessível ("Ver como lista"); sem animação com movimento reduzido |
| `ProgressBar` | Progresso | Usado em assistentes e metas; texto com o valor sempre visível |
| `ConflictCompare` | Comparação de conflito | Duas colunas (celular: empilhadas) "Neste aparelho" × "No servidor", com diferenças destacadas por ícone e texto; botões **Manter esta** em cada lado |

## 6. Feedback

| Componente | Uso | Especificação |
|---|---|---|
| `Skeleton` | Carregamento > 300 ms | Formas neutras `surface-alt`; sem brilho animado com movimento reduzido |
| `EmptyState` | Lista/tela vazia | Ícone, título, frase explicativa e **uma** ação |
| `ErrorState` | Falha ao carregar | Mensagem (UX-02 §8.3) + **Tentar de novo** |
| `Snackbar` | Confirmação breve | Base da tela, acima da zona do polegar; 5 s; com ação "Desfazer" quando reversível; uma por vez; `aria-live="polite"` |
| `Banner` | Aviso persistente não bloqueante | Variantes info/warning/danger; ícone + texto + ação opcional + dispensar (quando dispensável) |
| `OfflineNotice` | Ação indisponível offline | Texto inline junto à ação desabilitada (RF-093) |
| `InlineConfirm` | Confirmação leve | Usada para "Iniciar mesmo assim?" (descanso) — não bloqueia a tela |

## 7. Padrões de interação

| Padrão | Regra |
|---|---|
| Desfazer em vez de confirmar | Registrar série, remover exercício do rascunho, remover série: ação imediata + `Snackbar` com desfazer. |
| Confirmar o destrutivo | Descartar sessão, excluir sessão, descartar rascunho, descartar pendência, sair com pendências: `Dialog` que nomeia o conteúdo afetado. |
| Salvamento automático | Editor de rascunho e assistente de configuração salvam a cada alteração, com indicação "Salvo às hh:mm". Formulários curtos (folhas) usam botão Salvar. |
| Teclado | Campos numéricos abrem teclado numérico; Enter avança para o próximo campo; o teclado não pode cobrir o botão de ação (rolagem automática). |
| Retorno tátil | Vibração curta (≈ 20 ms) ao registrar série e ao fim do descanso, **somente** onde suportado (Android); sem dependência funcional (ADR-017). |
| Arrastar | Reordenação por arrastar sempre tem alternativa por botões (subir/descer). |
| Gestos | Deslizar entre imagens do exercício tem botões equivalentes; não há gesto obrigatório. |

## 8. Gráficos

- Biblioteca definida na Etapa 3 (ARQ-02); requisitos: leve, funciona offline, permite rótulos acessíveis e tabela alternativa.
- Regras visuais: sem 3D, sem gradientes, linhas 2 px, pontos 6 px, grade horizontal discreta (`divider`), rótulos de eixo em `type.caption`.

## Critérios de conclusão

- [x] Componentes de todas as telas `ESS` definidos com variantes e estados.
- [x] Padrões de interação (desfazer, confirmar, salvar, teclado, gestos) definidos.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 2). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 2). |
