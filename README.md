# Forja

Aplicativo web progressivo (PWA) para planejar, executar e registrar treinos de academia, com uso offline. Nome provisório (ADR-023).

A **documentação em [`docs/`](docs/README.md) é a fonte principal do projeto**: requisitos, decisões (ADRs), arquitetura e o plano de implementação. O andamento está em [`docs/00-governanca/02-controle-de-progresso.md`](docs/00-governanca/02-controle-de-progresso.md).

## Estrutura

| Pasta              | Conteúdo                                   |
| ------------------ | ------------------------------------------ |
| `docs/`            | Documentação aprovada (Fase 1)             |
| `apps/web/`        | PWA (React + Vite)                         |
| `packages/domain/` | Regras de domínio compartilhadas           |
| `supabase/`        | Banco, políticas e função de sincronização |
| `catalog/`         | Catálogo de exercícios curado e licenças   |
| `scripts/`         | Utilitários de verificação e operação      |

## Requisitos

- Node.js 24 (ver `.nvmrc`)
- pnpm 12.14.0, via Corepack: `corepack enable` (a versão vem do campo `packageManager`)

## Comandos

```bash
pnpm install
```

```bash
pnpm check
```

`pnpm check` executa verificação de tipos, lint, formatação e licenças — o mesmo que o CI. Sem `corepack enable`, use `corepack pnpm <comando>`.
