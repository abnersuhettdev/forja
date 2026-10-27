# ARQ-03 — Organização do Repositório

| Campo | Valor |
|---|---|
| Identificador | ARQ-03 |
| Status | **Aprovado** (2026-10-26 — Etapa 3) |
| Etapa | 3 |
| Dono do assunto | Estrutura de pastas, controle de versão, branches, commits, localização de testes, migrações, dados do catálogo e documentação |
| Dependências | ARQ-01, ARQ-02 |
| Referenciado por | ARQ-04, DAD-07, IMP-02, PLN-01 |
| Decisões | ADR-037 (monorepo, git e CI) — aprovada |
| Última atualização | 2026-10-26 |

## 1. Estado atual (Etapa 0)

O diretório `AI-Trainer` contém apenas `docs/`. **Não é um repositório git.** Nenhuma ação será tomada na Fase 1; a inicialização do git e a criação das pastas abaixo são a primeira tarefa da Etapa 9 (PLN-01).

## 2. Estrutura proposta (monorepo — ADR-037)

```
AI-Trainer/
├── docs/                      Documentação (fonte principal do projeto)
├── apps/
│   └── web/                   PWA (React + Vite)
│       ├── src/
│       │   ├── app/           Rotas, layout, providers
│       │   ├── features/      Uma pasta por área funcional (hoje, execucao, agenda,
│       │   │                  evolucao, conta, sincronizacao, gestao-programa,
│       │   │                  catalogo, perfil)
│       │   ├── components/    Componentes de UX-06
│       │   ├── design/        Tokens de UX-02 (cores, tipografia, espaçamento)
│       │   ├── local/         Banco local por usuário, fila de saída, motor de envio,
│       │   │                  proteção de pendências (ADR-027/028)
│       │   ├── api/           Clientes de leitura e de sincronização
│       │   └── sw/            Service worker
│       ├── public/            Manifest, ícones, fontes, imagens do catálogo
│       └── tests/             E2E (Playwright)
├── packages/
│   └── domain/                Regras puras compartilhadas (sem rede/armazenamento):
│                              recomendação, validações, esquemas Zod, classificação
│                              de sincronização, motor de geração (D2)
├── supabase/
│   ├── migrations/            Migrações SQL versionadas (DAD-07)
│   ├── functions/sync/        Função de sincronização (usa packages/domain)
│   ├── policies/              Políticas por linha (também versionadas como migrações)
│   └── seed/                  Dados iniciais: catálogo curado, usuário inicial (sem segredos)
├── catalog/                   Fonte do catálogo: dados curados, traduções,
│                              inventário de licenças (DAD-06), scripts de importação
├── scripts/                   Utilitários (backup, verificação de licenças)
├── .github/workflows/         CI, deploy, backup agendado
└── (arquivos de configuração do workspace: pnpm, TypeScript, lint, formatação)
```

Regras:

1. `packages/domain` não importa nada de `apps/` nem de `supabase/`, nem acessa rede, relógio ou armazenamento diretamente (relógio e dados entram por parâmetro) — garante testabilidade e mesmo resultado online/offline.
2. Testes unitários ficam ao lado do código (`*.test.ts`); E2E em `apps/web/tests/`; testes de políticas por linha e da função de sincronização em `supabase/` (SEG-03).
3. **Segredos nunca entram no repositório** (chaves de serviço, senhas, chaves de backup); ficam nos cofres de segredos do CI e dos provedores (IMP-01).
4. Dados fictícios de teste ficam em pastas `fixtures/` e são marcados como fictícios (RN-037); o `seed/` de produção contém apenas o catálogo real e nenhum dado pessoal.

## 3. Controle de versão

| Item | Definição |
|---|---|
| Ferramenta | Git; repositório remoto privado no GitHub |
| Branch principal | `main` — sempre implantável; protegida (CI obrigatório) |
| Branches de trabalho | `tarefa/TAR-###-descricao-curta`, uma por tarefa do plano (PLN-01) |
| Integração | Pull request para `main` com CI verde; merge por squash |
| Mensagens de commit | Conventional Commits em português, referenciando a tarefa e os requisitos: `feat(execucao): registrar série offline [TAR-021] (RF-061, RN-043)` |
| Tags | `v0.x.y` por entrega de incremento (PLN-02) |
| Arquivos ignorados | Dependências, builds, arquivos de ambiente (`.env*`), relatórios de cobertura |

## 4. Rastreabilidade documentação ↔ código

- Cada PR cita a tarefa `TAR-###` e os `RF`/`RN`/`TELA` atendidos (RNF-026).
- Mudança de comportamento sem documento correspondente bloqueia o PR (GOV-01 §6).
- Testes de aceite citam o `CA-###` (PLN-03) no nome.

## Critérios de conclusão

- [x] Estado atual registrado; estrutura, versão e rastreabilidade definidas.
- [x] ADR-037 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 3). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 3). |
