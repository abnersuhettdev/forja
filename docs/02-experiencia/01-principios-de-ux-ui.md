# UX-01 — Princípios de UX/UI

| Campo | Valor |
|---|---|
| Identificador | UX-01 |
| Status | **Aprovado** (2026-10-26 — Etapa 2) |
| Etapa | 2 |
| Dono do assunto | Princípios de design e regras práticas derivadas do contexto de uso |
| Dependências | PRD-01, PRD-02, PRD-06 |
| Referenciado por | UX-02..UX-08 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Traduzir a visão do produto (PRD-01 §7) e o contexto de uso na academia (PRD-02 §4) em princípios de interface **verificáveis**, que orientam todas as decisões de tela e componente sem improviso.

## 2. Escopo

Vale para todas as telas do Lançamento 1 e dos incrementos D1–D5. Telas da modalidade TER seguirão os mesmos princípios quando forem especificadas.

## 3. Princípios

Cada princípio tem regras práticas. Uma tela que viole uma regra precisa de justificativa registrada em UX-05.

### P1 — O treino de hoje em primeiro lugar

O caminho "abrir → ver treino recomendado → iniciar" é o mais curto do app.

- A tela inicial do aluno (TELA-010) mostra o treino recomendado e o botão **Iniciar treino** visíveis sem rolagem em 360 × 640 px.
- Iniciar um treino a partir da abertura do app exige no máximo **1 toque**; retomar uma sessão em andamento, também 1 toque.

### P2 — Registrar é instantâneo

- Registrar uma série com os valores pré-preenchidos exige **1 toque** (botão de confirmar a série); ajustar carga ou repetições, no máximo +2 toques (OBJ-01).
- A confirmação visual da série ocorre em até 100 ms (RNF-007), depois da gravação local (RN-043) — nunca espera a rede.
- Toda ação de registro tem **desfazer** imediato (snackbar por 5 s), em vez de diálogo de confirmação.

### P3 — Uma mão, em pé, entre séries

- Ações principais da tela de execução ficam no **terço inferior** da tela (zona do polegar).
- Alvos de toque ≥ 48 × 48 px na execução e ≥ 44 × 44 px no restante (RNF-002), com pelo menos 8 px entre alvos.
- Nenhum gesto é a única forma de executar uma ação (deslizar sempre tem botão equivalente).

### P4 — Legível a um braço de distância

- Números de carga, repetições e cronômetro ≥ 32 px na execução; texto de corpo ≥ 16 px (RNF-002).
- Contraste mínimo AA, verificado (UX-02 §4); tema escuro disponível para ambientes com reflexo (ADR-024).
- Fonte com numerais tabulares para valores que mudam (cronômetro, cargas), evitando "pulos" de largura.

### P5 — Honestidade sobre o estado

- O usuário sempre sabe se está **online**, se o treino está **disponível offline** e se há **algo a enviar** (RF-092).
- Mensagens distinguem "nada a fazer" (aguardando envio) de "precisa da sua atenção" (recusado, conflito) — RN-051, ADR-022.
- A recomendação de treino sempre mostra o **motivo** (RN-013).
- O app nunca exibe "Salvo" antes de o dado estar gravado ao menos no aparelho.

### P6 — Nenhuma perda silenciosa

- Toda ação destrutiva (descartar sessão, excluir registro, descartar pendência, sair com pendências) usa diálogo de confirmação que **nomeia o que será perdido**.
- Ações destrutivas usam cor de perigo e nunca são o botão primário da tela.

### P7 — Avisos que não bloqueiam

- Lembretes (reavaliação, dados desatualizados, incompatibilidade de descanso, dia não planejado) aparecem como **banner ou aviso inline**, nunca como modal que impede o uso (RN-014, RN-016, RN-013).

### P8 — Pouca densidade, hierarquia clara

- Uma tela = um objetivo principal com **um** botão primário.
- Evitar grades de cards: listas simples com separadores são o padrão; cards são reservados ao destaque principal da tela (ex.: treino recomendado).
- Tabelas só no desktop; no celular, listas com dois níveis de informação (título + linha de apoio).
- Formulários longos são divididos em etapas (assistente) com no máximo ~5 campos por etapa.

### P9 — Sem jargão técnico, com vocabulário consistente

- Termos da interface seguem o glossário (GOV-03) e o guia de microcopy (UX-02 §8). Ex.: "treino", "sessão", "série"; nunca "workout", "log", "sync".
- Mensagens de erro dizem **o que aconteceu**, **se os dados estão seguros** e **o que fazer**.

### P10 — Limites claros sobre saúde

- O app não usa linguagem de prescrição profissional nem de diagnóstico (RN-030, ADR-018).
- Configurações como descanso entre treinos são apresentadas como **preferências pessoais**, não recomendações (RF-055, RN-050).

### P11 — Acessível por padrão

- WCAG 2.1 AA (RNF-003; detalhado em UX-07): informação nunca depende só de cor; todo ícone de ação tem rótulo acessível; foco visível; respeito a "reduzir movimento".

### P12 — Funciona igual em Android e iPhone

- Nenhuma funcionalidade essencial depende de recurso disponível em só uma plataforma (ADR-017). Recursos extras (vibração, prompt de instalação, manter tela ligada) são **melhorias progressivas**, detectadas em tempo de execução (UX-08).

## 4. Padrão de feedback (aplicável a toda tela)

| Estado | Padrão | Componente (UX-06) |
|---|---|---|
| Carregando (até ~300 ms) | Nada exibido (evita piscar) | — |
| Carregando (> 300 ms) | Esqueleto com a forma do conteúdo | `Skeleton` |
| Vazio | Ilustração simples (ícone), frase explicando o porquê e **uma** ação para sair do vazio | `EmptyState` |
| Sucesso de ação | Snackbar breve; com "desfazer" quando reversível | `Snackbar` |
| Erro de carregamento | Mensagem inline no lugar do conteúdo + "Tentar de novo"; se houver dado em cache, mostrar o cache com aviso "dados de \<data/hora\>" | `ErrorState`, `Banner` |
| Erro de validação | Mensagem junto ao campo, no envio (e ao sair do campo após a primeira tentativa) | `FormField` |
| Offline | Indicador no cabeçalho; ações que exigem conexão ficam desabilitadas com explicação (RF-093) | `SyncIndicator`, `OfflineNotice` |

## 5. Hierarquia de prioridades por área

| Área | Prioridade 1 | Prioridade 2 | Prioridade 3 |
|---|---|---|---|
| Meu treino (aluno) | Treino recomendado / sessão em andamento | Semana (presenças × meta) | Peso atual, avisos |
| Execução | Exercício atual, série atual, confirmar | Cronômetro de descanso | Próximo exercício, visão geral |
| Gestão | Programa ativo e rascunho | Catálogo | Perfil de treinamento |

## 6. Decisões e premissas

- Princípios derivados de PRD-01 §7, PRD-02 §4–5 e das ADRs 005, 007, 017, 018 e 022.
- Métricas de verificação (toques, tamanhos, tempos) são checadas nos critérios de aceite (PLN-03).

## Critérios de conclusão

- [x] Princípios com regras verificáveis.
- [x] Padrão de feedback definido para todos os estados.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 2). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 2). |
