# UX-04 — Fluxos de Navegação

| Campo | Valor |
|---|---|
| Identificador | UX-04 |
| Status | **Aprovado** (2026-10-26 — Etapa 2) · detalhamento da saída da conta confirmado em 2026-10-26 |
| Etapa | 2 |
| Dono do assunto | Fluxos tela a tela das jornadas, pontos de decisão, estados de erro e fluxos offline |
| Dependências | PRD-03, PRD-07, UX-03 |
| Referenciado por | UX-05, PLN-03 (testes E2E) |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo

Descrever, para cada jornada do Lançamento 1 (PRD-03), a sequência de telas, decisões e desvios (erro, offline). Os fluxos servem de roteiro para os testes ponta a ponta (PLN-03). Nomes de telas: [UX-03 §4.1](03-arquitetura-de-informacao.md#41-inventário-de-telas).

## 2. JOR-08 — Primeiro acesso pessoal

```mermaid
flowchart TD
    A[Usuário criado por inicialização IMP-01] --> B[TELA-001 Login]
    B -->|credenciais inválidas| B1[Erro inline genérico: e-mail ou senha incorretos]
    B1 --> B
    B -->|muitas tentativas RN-031| B2[Aviso: aguarde alguns minutos]
    B -->|ok| C{Perfil configurado?}
    C -->|não| D[TELA-003 Configuração inicial — 7 etapas]
    D -->|sair no meio| D1[Progresso salvo no aparelho; retoma na mesma etapa]
    D --> E[Aviso de saúde + Concluir]
    C -->|sim| F
    E --> F{Programa publicado?}
    F -->|não| G[TELA-010 Hoje — vazio: Monte seu programa]
    G -->|tocar| H[TELA-030 Gestão › Programa]
    F -->|sim| I[TELA-010 Hoje com treino recomendado]
    I -.->|1ª visita, não instalado| J[Sugestão discreta: Instalar o app → TELA-002]
```

Notas:
- A sugestão de instalação aparece uma vez, como banner dispensável; nunca como modal.
- **Versão 1.2 (planejada, ainda não implementada — [PLN-06](../08-planejamento/06-plano-versao-1-2.md)):** no modo Automático, a configuração inicial termina na rotina proposta, com motivos e o aviso de RN-030. "Usar esta rotina" publica e leva a Hoje; a pessoa pode pedir outra (ADR-095).
- A configuração inicial exige conexão para o envio final; se offline, o botão "Concluir" explica que é preciso conexão e os dados permanecem no aparelho.

## 3. JOR-02 — Montagem do programa (manual)

```mermaid
flowchart TD
    A[TELA-030 Programa] -->|sem programa| B[Criar programa]
    A -->|com programa ativo| C[Editar programa → cria rascunho a partir da versão ativa RF-027]
    A -->|rascunho existente| D[Continuar rascunho]
    B --> E[TELA-031 Editor de rascunho]
    C --> E
    D --> E
    E --> F[Adicionar treino A, B, C… / renomear / reordenar]
    E --> G[Adicionar exercício → TELA-033 Escolher exercício]
    G -->|não encontrou| G1[Criar exercício personalizado → TELA-036]
    G --> H[TELA-032 Prescrição: séries, repetições ou duração, descanso, carga sugerida, orientações]
    H --> E
    E -->|Publicar| I{Validação RN-035 / RN-021}
    I -->|pendências| I1[Lista de pendências com atalho para cada item]
    I1 --> E
    I -->|ok| J[Diálogo: publicar substitui o programa ativo; versão atual fica guardada]
    J -->|confirmar| K[Programa publicado → snackbar + volta a TELA-030]
    E -->|Descartar rascunho| L[Diálogo de confirmação nomeando o rascunho] --> A
```

Notas:
- O editor salva o rascunho automaticamente no servidor a cada alteração (com indicação "Salvo às 14:32"); offline, o editor fica em modo leitura (RF-093).
- No desktop, TELA-031 mostra lista de treinos à esquerda e exercícios do treino selecionado à direita.

## 4. JOR-03 — Treino na academia (online e offline)

```mermaid
flowchart TD
    A[Abrir app] --> B{Sessão em andamento?}
    B -->|sim| X[TELA-015 Execução, no ponto em que parou]
    B -->|não| C[TELA-010 Hoje: treino recomendado + motivo]
    C -->|Iniciar treino| D[Sessão criada e gravada no aparelho]
    C -->|Escolher outro| C1[TELA-011 lista de treinos; incompatíveis com aviso não bloqueante]
    C1 --> D
    D --> X
    X --> E[Exercício atual: imagem, prescrição, última carga]
    E --> F[Ajustar carga/reps se necessário → ✓ Série]
    F --> G[Gravação local → confirmação visual → snackbar Desfazer]
    G --> H[Cronômetro de descanso inicia]
    H -->|termina ou Pular| I{Mais séries?}
    I -->|sim| E
    I -->|não| J{Mais exercícios?}
    J -->|sim| E2[Próximo exercício] --> E
    J -->|não| K[TELA-017 Concluir: PSE e observação opcionais]
    X -->|Pular exercício| J
    X -->|Visão geral| V[TELA-016 lista de exercícios e progresso]
    V --> E
    X -->|Minimizar| M[Volta ao app com SessionBar visível]
    X -->|Descartar sessão| Z[Diálogo: as N séries registradas serão perdidas] -->|confirmar| C
    K --> R[Resumo: duração, séries, volume] --> C2[TELA-010: treino de hoje concluído + próximo]
```

### 4.1 Desvios de conexão durante a execução

| Situação | O que o usuário vê | Comportamento |
|---|---|---|
| Sem conexão ao abrir | Indicador "Sem conexão"; Hoje mostra treino recomendado calculado localmente e "Disponível offline · atualizado às …" | Execução idêntica à online (RF-091) |
| Programa nunca carregado neste aparelho | Estado vazio: "Conecte-se uma vez para baixar seu programa para uso offline" | Sem execução possível (limitação de ADR-005) |
| Conexão cai no meio | Nada muda na execução; indicador passa a "Sem conexão" | Séries vão para a fila local |
| Conexão volta | Indicador "Enviando…" → "Sincronizado" | Envio automático (UX-08 §6) |
| Login expirado offline | Execução continua; após concluir: "Entre novamente para enviar seus treinos" | Pendências mantidas (RN-047) |
| App vai para segundo plano durante o descanso | Ao voltar, cronômetro mostra o tempo correto | Calculado pelo horário de término (RF-062) |
| App é fechado pelo sistema | Ao reabrir, Execução retoma no ponto exato | Estado persistido localmente (RF-066) |

## 5. JOR-04 — Agenda e detalhe

```mermaid
flowchart TD
    A[TELA-018 Agenda — mês atual] --> B[Navegar meses]
    A --> C[Tocar em um dia]
    C --> D[TELA-019 Dia: sessões do dia ou planejado]
    D --> E[Detalhe da sessão: treino, versão, horários, séries]
    E -->|Editar| F[TELA-020 Editar sessão] -->|salvar| E
    E -->|Excluir| G[Diálogo nomeando data e treino] --> D
    F -->|fora da janela de 60 dias| F1[Ação indisponível com explicação RN-027]
    D -->|sessão abandonada| H[Concluir informando término ou Excluir RN-012]
```

## 6. JOR-09 — Sincronização e pendências

```mermaid
flowchart TD
    A[SyncIndicator no cabeçalho] -->|toque| B[TELA-007 Sincronização]
    B --> C[Grupo Aguardando envio — informativo; botão Enviar agora]
    B --> D[Grupo Precisa da sua atenção]
    B --> E[Grupo Para revisar]
    D --> D1[Recusado: motivo + Corrigir / Descartar]
    D --> D2[Conflito: versões lado a lado → Manter a deste aparelho / Manter a do servidor]
    D2 -->|registro excluído no outro aparelho| D3[Recriar como novo registro / Descartar]
    E --> E1[Possível duplicidade: Manter ambas / Excluir uma]
    D1 -->|Descartar| Z[Diálogo mostrando o conteúdo a ser perdido]
    D2 --> Z2[A versão não escolhida é descartada só após confirmação]
```

### 6.1 Saída da conta (RF-101, RF-103, RN-052)

```mermaid
flowchart TD
    A[TELA-004 Conta → Sair] --> B{Há pendências? inclui sessão em andamento, recusados e conflitos}
    B -->|não| C[Diálogo: Os dados do app serão removidos deste aparelho. Seus dados sincronizados continuam na sua conta e voltam no próximo login.]
    C -->|Sair| C1[Remove dados locais do usuário → TELA-001]
    C -->|Cancelar| A
    B -->|sim| D[Diálogo de pendências: N registros não enviados + lista resumida]
    D -->|Enviar e sair — só online| E[Envio da fila]
    E -->|tudo sincronizado| C1
    E -->|falha de conexão em parte| F[Diálogo reaparece: 2 registros não puderam ser enviados agora]
    F --> D
    E -->|recusados ou conflitos| G[N itens precisam da sua atenção antes de sair]
    G -->|Resolver agora| H[TELA-007 Sincronização]
    G -->|outras opções| D
    D -->|Sair e manter neste aparelho| I[Confirmação com consequências → remove tudo, exceto as pendências; isoladas até o próximo login do mesmo usuário]
    I --> J[TELA-001]
    D -->|Descartar e sair| K[Confirmação digitada: DESCARTAR → pendências apagadas definitivamente → remove dados locais]
    K --> J
    D -->|Cancelar| A
```

#### Textos das opções (consequências explícitas)

| Opção | Disponível | Texto de consequência |
|---|---|---|
| **Enviar e sair** (primária) | Somente online | "Vamos enviar seus registros e depois sair. Se algo não puder ser enviado, você decide o que fazer." |
| **Sair e manter neste aparelho** | Sempre (pede a senha — ADR-028) | "Para proteger seus registros, confirme sua senha. Seus N registros não enviados ficam guardados e criptografados neste aparelho e serão enviados quando você entrar de novo nele. Outras pessoas que usarem o app neste aparelho não poderão vê-los, mas eles continuam armazenados aqui. Se você não voltar a entrar neste aparelho, eles não chegarão à sua conta." |
| **Descartar e sair** (perigo) | Sempre | "**Esta ação é irreversível.** Os N registros abaixo serão apagados para sempre deste aparelho e não chegarão à sua conta: \<lista\>. Digite DESCARTAR para confirmar." |
| **Cancelar** | Sempre | — |

Offline, **Enviar e sair** aparece desabilitado com a explicação "Sem conexão — conecte-se para enviar antes de sair".

### 6.2 Troca de usuário no mesmo aparelho

```mermaid
flowchart TD
    A[Usuário A saiu mantendo pendências] --> B[Usuário B entra no mesmo aparelho]
    B --> C[B vê apenas os próprios dados; nenhum indício das pendências de A]
    C --> D[Fila de A não é enviada com a sessão de B]
    D --> E[Usuário A entra novamente neste aparelho]
    E --> F[Pendências de A são enviadas automaticamente; sessão em andamento é retomada]
```

### 6.3 Sessão de acesso expirada ou revogada

Não é uma saída: nenhum dado local é removido. O app pede novo login; se for o **mesmo** usuário, tudo continua (RN-052 d). Se outra pessoa entrar, aplica-se §6.2.

## 7. Ciclo de vida da sessão (visão de interface)

```mermaid
stateDiagram-v2
    [*] --> EmAndamento: Iniciar treino
    EmAndamento --> Concluida: Concluir
    EmAndamento --> Descartada: Descartar (confirmação)
    EmAndamento --> Abandonada: 6 h sem atividade (RN-012)
    Abandonada --> Concluida: Concluir informando término
    Abandonada --> Excluida: Excluir (confirmação)
    Concluida --> Concluida: Editar (até 60 dias)
    Concluida --> Excluida: Excluir (até 60 dias)
    Descartada --> [*]
    Excluida --> [*]
```

O estado de **sincronização** (RN-051) é independente do ciclo de vida acima: qualquer estado pode estar "aguardando envio".

## 8. Fluxos dos incrementos `DES` (resumo)

| Incremento | Fluxo |
|---|---|
| D1 Reavaliação | Banner em Hoje → TELA-050 (peso, medidas opcionais, confirmar/alterar objetivo, disponibilidade, preferências, equipamentos, restrições) → salvar; ou "Lembrar em…" com seletor de data (sugestão +7 dias). Mudança relevante → banner "Revisão recomendada" em Gestão › Programa. |
| D2 Gerador | Gestão › Programa → "Gerar treino automaticamente" → verificação de pendências (atalhos para Perfil) → rascunho com premissas e exclusões → Editor → Publicar. |
| D3–D5 | Acesso a partir de Evolução, Detalhe do exercício, Agenda (dia sem registro → "Registrar treino realizado") e Conta (exportar). |

## Critérios de conclusão

- [x] Fluxos de todas as jornadas `ESS` com desvios de erro e offline.
- [x] Ciclo de vida da sessão e fluxo de pendências.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 2). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 2); seções de saída da conta detalhadas conforme condição da UXP-02. |
| 2026-10-26 | Texto de irreversibilidade no descarte; confirmação de senha em "Sair e manter" (ADR-028). |
| 2026-10-26 | Detalhamento da saída da conta e isolamento confirmado pelo usuário. |
| 2026-11-04 | Versão 1.2: fluxo do modo Automático. |
