# UX-07 — Responsividade e Acessibilidade

| Campo | Valor |
|---|---|
| Identificador | UX-07 |
| Status | **Aprovado** (2026-10-26 — Etapa 2) |
| Etapa | 2 |
| Dono do assunto | Pontos de quebra, comportamento por largura, matriz de dispositivos e critérios WCAG 2.1 AA |
| Dependências | PRD-06 (RNF-001..004, RNF-018, RNF-028), UX-02, UX-06 |
| Referenciado por | UX-08, SEG-03, PLN-03 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Garantir que o app funcione bem de 360 px a 1440 px (RNF-001) e atenda à WCAG 2.1 nível AA (RNF-003), com critérios verificáveis.

## 2. Pontos de quebra

| Faixa | Largura | Navegação | Layout |
|---|---|---|---|
| Compacta (celular) | 360–599 px | `BottomNav` | Uma coluna; margens 16 px |
| Média (celular grande / tablet) | 600–1023 px | `BottomNav` | Uma coluna com largura máxima de 640 px centralizada; folhas como diálogos a partir de 768 px |
| Expandida (desktop) | ≥ 1024 px | `SideRail` | Conteúdo até 1200 px; telas de Gestão em duas colunas (lista \| detalhe); Execução centralizada até 560 px |

Regras:

1. Nenhuma rolagem horizontal da página em nenhuma faixa (RNF-001); tabelas largas só no desktop, com versão em lista no celular.
2. Larguras abaixo de 360 px: o app continua utilizável (sem cortes), mas não é otimizado.
3. Orientação: retrato é a principal; paisagem funciona sem perda de conteúdo (WCAG 1.3.4). A execução em paisagem exibe imagem à esquerda e séries à direita.
4. Áreas seguras do sistema (entalhe, barra de gestos) respeitadas em cabeçalho, `BottomNav`, `SessionBar` e zona do polegar.

## 3. Comportamento por tela (resumo)

| Tela | Compacta | Expandida |
|---|---|---|
| Hoje | Cartão principal + semana + peso empilhados | Cartão principal à esquerda; semana e peso à direita |
| Execução | Modo foco em tela cheia | Coluna central de 560 px; atalhos de teclado: Enter = concluir série, Espaço = pular descanso |
| Agenda | Mês em grade; dia abre nova tela | Mês à esquerda; dia selecionado à direita |
| Editor de rascunho | Lista de treinos → exercícios do treino (navegação em profundidade) | Duas colunas simultâneas |
| Catálogo | Lista; detalhe em nova tela | Lista \| detalhe |

## 4. Matriz de dispositivos e navegadores (RNF-018, ADR-017)

| Plataforma | Navegador / modo | Prioridade | Verificação |
|---|---|---|---|
| Android | Chrome — navegador e app instalado | Alta | Manual em aparelho real + emulação |
| iPhone (iOS ≥ 16.4) | Safari — navegador **e** app na Tela de Início | Alta | Manual em aparelho real (modos testados separadamente) |
| Desktop | Chrome, Edge, Firefox, Safari (2 últimas versões) | Média | Manual + testes automatizados |
| iPhone | Chrome/Firefox para iOS (motor WebKit) | Baixa | Funcional; instalação conforme UX-08 |

## 5. Critérios WCAG 2.1 AA aplicados

| Critério | Como o projeto atende | Verificação |
|---|---|---|
| 1.1.1 Conteúdo não textual | Ícones de ação com rótulo; imagens de exercício com texto alternativo; gráficos com tabela alternativa | axe-core + revisão |
| 1.3.1 Informação e relações | Rótulos associados a campos; títulos hierárquicos; listas semânticas; regiões (cabeçalho, navegação, principal) | axe-core |
| 1.3.4 Orientação | Retrato e paisagem suportados | Manual |
| 1.3.5 Propósito da entrada | `autocomplete` em e-mail, senha, nome | Revisão |
| 1.4.1 Uso de cor | Estados com ícone + texto (UX-02 §4.4) | Revisão |
| 1.4.3 / 1.4.11 Contraste | Pares verificados (UX-02 §4.3); componentes ≥ 3:1 | Ferramenta de contraste |
| 1.4.4 / 1.4.10 Redimensionar e refluxo | Tamanhos em rem; texto a 200% e largura de 320 CSS px sem perda | Manual |
| 1.4.12 Espaçamento de texto | Layout tolera aumento de espaçamento | Manual |
| 1.4.13 Conteúdo em foco/hover | Dicas dispensáveis e persistentes | Revisão |
| 2.1.1 Teclado | Tudo operável por teclado no desktop, incluindo calendário e reordenação | Manual |
| 2.2.1 Tempo ajustável | Nenhum tempo limite que encerre ações do usuário; o cronômetro de descanso é informativo, ajustável e nunca bloqueia | Revisão |
| 2.3.1 Três flashes | Nenhum conteúdo piscante | Revisão |
| 2.4.3 / 2.4.7 Ordem e foco visível | Ordem lógica; anel de foco (`color.focus`); foco movido para o título ao trocar de tela e para o diálogo ao abri-lo | Manual |
| 2.5.1 / 2.5.2 Gestos e cancelamento | Gestos com alternativa por botão; ações disparam ao soltar | Revisão |
| 2.5.3 Rótulo no nome | Nome acessível contém o texto visível | axe-core |
| 3.1.1 Idioma | `lang="pt-BR"` | Automático |
| 3.2.x Previsibilidade | Navegação consistente; nada muda de contexto ao focar | Revisão |
| 3.3.1 / 3.3.3 Erros | Mensagens de erro em texto, junto ao campo, com sugestão de correção | Revisão |
| 4.1.2 / 4.1.3 Nome, função, valor e mensagens de status | Componentes com papéis corretos; `Snackbar`, `SyncIndicator` e `RestTimer` usam regiões vivas | axe-core + leitor de tela |

Leitores de tela testados: TalkBack (Android) e VoiceOver (iPhone) nas telas TELA-001, 003, 010, 015, 017, 018 e 007.

## 6. Legibilidade na academia

- Números da execução ≥ 32 px; cronômetro 48 px; pesos de fonte ≥ 500 para números (UX-02 §5).
- Sem texto essencial em cinza claro: `text-muted` só para apoio, sempre com contraste ≥ 6,6:1.
- Tema escuro disponível; tema segue o sistema por padrão (ADR-024).
- Toque: alvos 48 px na execução, espaçamento ≥ 8 px; ação principal na zona do polegar.
- Brilho e reflexo: sem fundos com imagens ou gradientes atrás de números.

## 7. Movimento e preferências do sistema

- `prefers-reduced-motion`: sem transições de deslocamento; fades ≤ 150 ms; sem animação nos gráficos.
- `prefers-color-scheme`: tema inicial.
- Tamanho de fonte do sistema respeitado (unidades relativas).

## Critérios de conclusão

- [x] Pontos de quebra e comportamento por tela definidos.
- [x] Matriz de dispositivos coerente com ADR-017.
- [x] Critérios WCAG 2.1 AA mapeados a práticas e verificações.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 2). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 2). |
