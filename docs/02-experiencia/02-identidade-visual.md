# UX-02 — Identidade Visual

| Campo | Valor |
|---|---|
| Identificador | UX-02 |
| Status | **Aprovado** (2026-10-26 — Etapa 2) |
| Etapa | 2 |
| Dono do assunto | Nome, conceito, paleta (tokens), tipografia, espaçamento, ícones, imagens, movimento, tom de voz e microcopy |
| Dependências | UX-01, Q-005 (delegada a Claude pelo usuário) |
| Referenciado por | UX-06, UX-07, UX-08 |
| Decisões | ADR-023 (identidade), ADR-024 (temas) — aprovadas |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo

Definir uma identidade **moderna, esportiva, elegante e consistente**, com valores concretos (tokens) que permitam implementar a interface sem decisões visuais improvisadas.

## 2. Nome e conceito

### 2.1 Nome (proposta — ADR-023)

| Opção | Ideia | Observação |
|---|---|---|
| **Forja** (recomendado) | Força construída com constância, sessão após sessão | Curto, pt-BR, memorável, funciona como ícone ("F") |
| Ritmo | Constância e frequência | Muito usado em apps de música/corrida |
| Carga | Termo central do treino | Ambíguo (carga elétrica, frete) |

- O nome é **provisório** até verificação de disponibilidade de marca e de domínio (ligada a Q-006, Etapa 3). Até lá, o nome técnico do projeto continua "AI-Trainer".
- `short_name` do app instalado: **Forja** (≤ 12 caracteres).

### 2.2 Conceito visual

"**Grafite e lima**": base neutra escura/clara (grafite), um único acento energético (verde-lima) e tipografia condensada nos números grandes, como placares e painéis de equipamentos. Elegância vem da contenção: um acento, muito espaço, poucos elementos por tela.

### 2.3 Marca

- **Logotipo:** palavra "Forja" em Barlow Semi Condensed, peso 700, com o "F" em cor de acento.
- **Ícone do app:** "F" estilizado em grafite sobre fundo lima (e versão maskable com área de segurança — UX-08 §3).
- Sem mascote, sem ilustrações complexas.

**Versão 1.2 (planejada, ainda não implementada — [PLN-06](../08-planejamento/06-plano-versao-1-2.md)):** a tela de login adota a direção **Anilha**, escolhida pelo usuário em 2026-11-04 ("gostei da opção B"): anilha realista desenhada em SVG, cortada no canto superior, com filete lima; ícone do "F" e nome; frase "A rotina certa, sem você precisar pensar nela."; campos e botão em pílula; a tela fica sempre em grafite, qualquer que seja o tema (exceção ao §3, confirmada pelo usuário em 2026-11-06). Sem foto e sem dependência nova, para manter o orçamento de JS (SEG-04 §1). As telas principais seguem a mesma direção ([protótipo aprovado](https://claude.ai/artifact/4vYVFUpeJq34NBbSQNLRMK), privado, "Aprovado, programar", 2026-11-05): o cartão de destaque de Hoje, o topo de Treino e o cartão de Evolução ficam sempre em grafite, com a anilha cortada no canto, nos dois temas; botões em pílula; contraste e alvos seguem CA-201..203. Protótipo: [opções de login](https://claude.ai/artifact/WoJTKzPSSWBuk5bC4kxUnC), privado.

## 3. Temas (ADR-024)

- Dois temas completos: **claro** e **escuro**.
- Padrão: **seguir o sistema** (`prefers-color-scheme`); o usuário pode fixar Claro/Escuro em Conta (TELA-004).
- A tela de execução usa o mesmo tema; ambos os temas foram verificados para contraste (§4.3).

## 4. Cores (tokens)

Nomes de tokens semânticos; o código deve referenciar **somente tokens**, nunca valores literais.

### 4.1 Tema claro

| Token | Valor | Uso |
|---|---|---|
| `color.bg` | `#F6F7F9` | Fundo da página |
| `color.surface` | `#FFFFFF` | Superfícies (listas, folhas, cards) |
| `color.surface-alt` | `#EDF0F3` | Áreas secundárias, linhas alternadas, campos |
| `color.border` | `#8A94A0` | Bordas de campos e controles (contraste ≥ 3:1) |
| `color.divider` | `#D3D8DE` | Separadores decorativos (não informativos) |
| `color.text` | `#12161B` | Texto principal |
| `color.text-muted` | `#4A5562` | Texto secundário |
| `color.primary` | `#3F6212` | Botão primário, links, seleção |
| `color.on-primary` | `#FFFFFF` | Texto/ícone sobre `primary` |
| `color.primary-container` | `#ECFCCB` | Destaques suaves (treino recomendado, chips selecionados) |
| `color.on-primary-container` | `#1A2E05` | Texto sobre `primary-container` |
| `color.success` | `#15803D` | Sincronizado, concluído |
| `color.warning` | `#B45309` | Avisos não bloqueantes |
| `color.danger` | `#B91C1C` | Ações destrutivas, erros |
| `color.info` | `#1D4ED8` | Informação, sessão em andamento |
| `color.focus` | `#2563EB` | Anel de foco |

### 4.2 Tema escuro

| Token | Valor |
|---|---|
| `color.bg` | `#0E1114` |
| `color.surface` | `#161A1F` |
| `color.surface-alt` | `#1F252C` |
| `color.border` | `#6B7684` |
| `color.divider` | `#2E3640` |
| `color.text` | `#F2F4F7` |
| `color.text-muted` | `#A9B3BF` |
| `color.primary` | `#A3E635` |
| `color.on-primary` | `#10160A` |
| `color.primary-container` | `#2A3A12` |
| `color.on-primary-container` | `#D9F99D` |
| `color.success` | `#4ADE80` |
| `color.warning` | `#FBBF24` |
| `color.danger` | `#F87171` (texto sobre ele: `#0E1114`) |
| `color.info` | `#60A5FA` |
| `color.focus` | `#93C5FD` |

### 4.3 Contrastes verificados (WCAG 2.1)

Calculados em 2026-10-26 pela fórmula de luminância relativa da WCAG 2.1. Mínimos: 4,5:1 para texto normal; 3:1 para texto grande e componentes de interface.

| Par (claro) | Razão | | Par (escuro) | Razão |
|---|---|---|---|---|
| text / surface | 18,16 | | text / bg | 17,19 |
| text / bg | 16,94 | | text / surface | 15,86 |
| text-muted / surface | 7,59 | | text-muted / surface | 8,23 |
| text-muted / surface-alt | 6,64 | | text-muted / surface-alt | 7,27 |
| on-primary / primary | 7,08 | | on-primary / primary | 12,20 |
| primary / surface (como texto) | 7,08 | | primary / surface (como texto) | 11,59 |
| on-primary-container / primary-container | 13,47 | | on-primary-container / primary-container | 10,50 |
| success / surface | 5,02 | | success / surface | 10,03 |
| warning / surface | 5,02 | | warning / surface | 10,47 |
| danger / surface | 6,47 | | danger / surface | 6,32 |
| info / surface | 6,70 | | info / surface | 6,87 |
| border / surface | 3,08 | | border / surface | 3,79 |
| focus / surface | 5,17 | | focus / surface | 9,69 |

Todos os pares atendem ao mínimo. Novas combinações exigem nova verificação antes do uso.

### 4.4 Cores dos estados de sessão e sincronização

Cor **nunca** é o único indicador: cada estado tem ícone e rótulo (UX-07).

| Estado | Cor | Ícone (Lucide) | Rótulo |
|---|---|---|---|
| Sessão concluída | `primary` (preenchido) | `check` | Concluída |
| Registrada manualmente | `primary` (contorno) | `pencil` | Registrada manualmente |
| Em andamento | `info` | `play` | Em andamento |
| Abandonada | `warning` | `circle-alert` | Não concluída |
| Planejado (projeção) | `text-muted` (contorno tracejado) | `calendar` | Planejado |
| Aguardando envio | `text-muted` | `cloud-upload` | Aguardando envio |
| Sincronizado | `success` | `cloud-check` | Sincronizado |
| Nova tentativa automática | `text-muted` | `refresh-cw` | Tentando de novo |
| Recusado | `danger` | `circle-x` | Precisa de atenção |
| Conflito | `warning` | `git-compare` | Precisa de atenção |
| Possível duplicidade | `info` | `copy` | Para revisar |
| Offline | `text-muted` | `cloud-off` | Sem conexão |

## 5. Tipografia

| Item | Definição |
|---|---|
| Família de interface | **Barlow** (SIL Open Font License 1.1 — confirmar na Etapa 3) |
| Família de números e títulos de destaque | **Barlow Semi Condensed** (mesma licença) |
| Numerais | Tabulares (`font-variant-numeric: tabular-nums`) em cargas, repetições, cronômetro, datas |
| Hospedagem | Arquivos de fonte servidos pelo próprio app e cacheados para uso offline (UX-08); fonte do sistema como fallback |
| Pesos usados | 400, 500, 600, 700 |

Escala (rem relativo a 16 px; respeita o tamanho de fonte do sistema):

| Token | Tamanho / altura de linha | Peso | Uso |
|---|---|---|---|
| `type.display` | 48 / 52 px (Semi Condensed) | 700 | Cronômetro, carga em edição |
| `type.metric` | 32 / 36 px (Semi Condensed) | 600 | Carga e repetições na execução |
| `type.title-lg` | 24 / 30 px | 700 | Título da tela |
| `type.title` | 20 / 26 px | 600 | Título de seção, nome do exercício |
| `type.body-lg` | 18 / 26 px | 400 | Instruções na execução |
| `type.body` | 16 / 24 px | 400 | Texto padrão (mínimo para corpo) |
| `type.label` | 14 / 20 px | 600 | Rótulos, chips, botões secundários |
| `type.caption` | 14 / 20 px | 400 | Apoio (nunca menor que 14 px) |

## 6. Espaçamento, forma e elevação

| Token | Valor |
|---|---|
| `space.1..8` | 4, 8, 12, 16, 24, 32, 48, 64 px |
| Margem lateral da página | 16 px (celular), 24 px (tablet), 32 px (desktop) |
| `radius.sm / md / lg / full` | 6 / 10 / 16 / 999 px |
| Elevação | Apenas 2 níveis: `shadow.sheet` (folhas inferiores e diálogos) e `shadow.raised` (botão flutuante, barra de sessão). No tema escuro, elevação por cor (`surface-alt`) em vez de sombra |
| Altura mínima de controles | 48 px (execução e botões primários); 44 px (demais) |

## 7. Ícones, imagens e movimento

- **Ícones:** biblioteca Lucide (licença ISC — confirmar na Etapa 3), traço 2 px, tamanhos 20/24 px; sempre com rótulo acessível.
- **Imagens de exercícios:** exibidas sem filtros, proporção 4:3, fundo `surface-alt`, carregamento progressivo. Origem e licença acessíveis no detalhe (RN-036). Nunca imagens decorativas genéricas no lugar de imagem do exercício.
- **Fotos (RF-118, versão 1.2):** fotos do free-exercise-db com créditos (ADR-094).
- **Placeholder (RF-034):** retângulo 4:3 em `surface-alt` com ícone `dumbbell` e o texto "Imagem indisponível" — padronizado e claramente distinto de uma demonstração.
- **Movimento:** durações 150 ms (micro), 250 ms (folhas e transições); curva `ease-out`. Com `prefers-reduced-motion`, transições viram troca instantânea ou fade curto. Nenhuma animação em loop, exceto o indicador de "enviando".

## 8. Tom de voz e microcopy

### 8.1 Tom

Direto, encorajador sem exageros, em segunda pessoa ("você"), frases curtas. Sem gírias, sem emojis na interface, sem linguagem de prescrição profissional ou de saúde (P10).

### 8.2 Vocabulário oficial na interface

| Usar | Evitar |
|---|---|
| Treino (A, B…) | Workout, ficha |
| Sessão / "seu treino de hoje" | Log, registro de workout |
| Série, repetições, carga | Sets, reps, peso (para carga) |
| Descanso | Rest |
| Programa | Plano, ficha |
| Publicar | Ativar, lançar |
| Rascunho | Draft |
| Aguardando envio / Sincronizado | Pending, sync |
| Precisa da sua atenção | Erro de sincronização |
| Gestão / Meu treino (áreas) | Admin, painel do profissional |

### 8.3 Mensagens-padrão

| Situação | Texto |
|---|---|
| Série registrada | "Série registrada." + ação "Desfazer" |
| Salvo offline | "Salvo neste aparelho. Será enviado quando houver conexão." |
| Treino disponível offline | "Disponível offline · atualizado às 14:32" |
| Função exige conexão | "Para \<ação\> é preciso estar conectado. Seus treinos continuam disponíveis offline." |
| Erro genérico de carregamento | "Não foi possível carregar agora. Seus dados salvos neste aparelho estão seguros." + "Tentar de novo" |
| Recusado | "O servidor não aceitou este registro: \<motivo\>. Ele continua guardado neste aparelho." |
| Conflito | "Este registro foi alterado em outro aparelho. Escolha qual versão manter." |
| Aviso de descanso | "O Treino A trabalha peitoral, que você treinou há 20 h. Seu descanso configurado é 48 h." |
| Aviso de saúde (configuração inicial) | "Este app ajuda você a organizar e registrar seus treinos. Ele não substitui a orientação de um profissional de Educação Física nem avaliação de saúde. Em caso de dor ou condição de saúde, procure um profissional." |
| Descanso (configuração) | "Estes valores são preferências pessoais, não recomendação médica ou esportiva. 48 h é apenas um ponto de partida." |

### 8.4 Formatos

- Datas: "seg., 26 out." em listas; `26/10/2026` em formulários; horas `14:32`.
- Números: vírgula decimal (`82,5 kg`); unidades sempre visíveis.
- Durações: `52 min`, `1 h 05 min`; cronômetro `1:30`.

## Critérios de conclusão

- [x] Nome, conceito e marca propostos com alternativas.
- [x] Tokens de cor de ambos os temas com contrastes verificados.
- [x] Tipografia, espaçamento, ícones, imagens, movimento e microcopy definidos.
- [x] ADR-023 e ADR-024 aprovadas.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 2); Q-005 delegada a Claude pelo usuário. |
| 2026-10-26 | Aprovado pelo usuário (Etapa 2). |
| 2026-11-04 | Versão 1.2: direção de login Anilha e fotos nos exercícios. |
| 2026-11-05 | Versão 1.2: direção Anilha nas telas principais. |
