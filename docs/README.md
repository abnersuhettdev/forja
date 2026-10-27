# Documentação — AI-Trainer (Aplicativo de Treinos Personalizados)

> **Status da documentação:** Fase 1 concluída e aprovada (Etapas 0 a 8). Marco de aprovação formal autorizado em 2026-10-26.
> **Implementação:** Fase 2 em andamento, seguindo [PLN-01](08-planejamento/01-dependencias-e-ordem-de-implementacao.md).

## O que é este projeto

Aplicativo web mobile-first (PWA instalável) de gerenciamento de treinos de academia, com:

- **Área de gestão:** perfil e avaliações, criação manual e geração automática de treinos, revisão, publicação e versionamento, catálogo de exercícios (e, futuramente, gestão de alunos terceiros).
- **Área do aluno:** treino do dia, execução guiada com registro de séries e cargas, cronômetro de descanso, agenda, registro de peso, metas e reavaliações.

Visão completa: [01-produto/01-visao-do-produto.md](01-produto/01-visao-do-produto.md).

**Modalidades:** o primeiro lançamento é de **uso pessoal** (PES). O acompanhamento de terceiros (TER) está bloqueado até a verificação legal e regulatória descrita em [01-produto/08-modalidades-de-uso-e-limites-profissionais.md](01-produto/08-modalidades-de-uso-e-limites-profissionais.md).

## Como navegar

| Se você quer... | Comece por |
|---|---|
| Entender o estado atual do projeto e o que falta | [00-governanca/02-controle-de-progresso.md](00-governanca/02-controle-de-progresso.md) |
| Ver todos os documentos, dependências e status | [00-governanca/00-indice-documentacao.md](00-governanca/00-indice-documentacao.md) |
| Entender o processo (cascata, aprovações) | [00-governanca/01-metodologia-cascata.md](00-governanca/01-metodologia-cascata.md) |
| Entender termos do domínio | [00-governanca/03-glossario.md](00-governanca/03-glossario.md) |
| Ver requisitos | [01-produto/05-requisitos-funcionais.md](01-produto/05-requisitos-funcionais.md), [06](01-produto/06-requisitos-nao-funcionais.md), [07](01-produto/07-regras-de-negocio.md) |
| Ver o que entra no Lançamento 1 | [01-produto/04-escopo-e-limites-do-mvp.md](01-produto/04-escopo-e-limites-do-mvp.md) |
| Ver decisões (ADRs) | [03-arquitetura/06-adrs.md](03-arquitetura/06-adrs.md) |

## Estrutura

```
docs/
├── 00-governanca/          Processo, índice, progresso, glossário, histórico
├── 01-produto/             Visão, público, escopo, requisitos (RF/RNF/RN)
├── 02-experiencia/         UX/UI, telas, componentes, PWA
├── 03-arquitetura/         Arquitetura, stack, repositório, padrões, ADRs
├── 04-dados-e-api/         Modelo de dados, contratos de API, auth, catálogo
├── 05-regras-de-treinamento/ Perfil, motor de geração, sessões, evolução
├── 06-seguranca-e-qualidade/ Segurança, LGPD, testes, desempenho, erros
├── 07-implantacao/         Ambientes, deploy, backup, operação
└── 08-planejamento/        Ordem de implementação, fases, aceite, riscos, checklist
```

## Convenções

- **Idioma:** português brasileiro.
- **Identificadores estáveis:** `RF-###` (requisito funcional), `RNF-###` (não funcional), `RN-###` (regra de negócio), `ADR-###` (decisão), `Q-###` (pergunta ao usuário), `TELA-###`, `ENT-###` (entidade), `API-###`, `TAR-###` (tarefa de implementação), `CA-###` (critério de aceite), `RSK-###` (risco), `REG-###` (item regulatório a verificar), `JOR-###` (jornada), `PER-###` (persona). Identificadores nunca são reutilizados; itens removidos ficam marcados como *removidos*.
- **Fonte única de verdade:** cada assunto tem um documento dono (indicado no índice). Os demais documentos referenciam, não copiam.
- **Status de documento:** `Não iniciado` → `Em elaboração` → `Rascunho concluído` → `Em revisão` → `Aprovado` (ou `Substituído`). Definições em [01-metodologia-cascata.md](00-governanca/01-metodologia-cascata.md#4-status-de-documentos).
- **Status de decisão (ADR):** `Proposta`, `Aprovada`, `Rejeitada`, `Substituída`. Nenhuma decisão é marcada como `Aprovada` sem confirmação explícita do usuário.
- Toda alteração relevante é registrada em [04-historico-de-alteracoes.md](00-governanca/04-historico-de-alteracoes.md).

## Para uma nova sessão do Claude Code

1. Leia [02-controle-de-progresso.md](00-governanca/02-controle-de-progresso.md) — seção "Próximo passo".
2. Leia [01-metodologia-cascata.md](00-governanca/01-metodologia-cascata.md) — regras da fase atual.
3. Consulte as ADRs com status `Proposta` antes de assumir qualquer decisão.
4. Na Fase 2, implemente somente a tarefa corrente de PLN-01, consultando os documentos referenciados e atualizando GOV-02 ao concluir.
