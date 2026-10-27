# @forja/web

PWA Forja (React + Vite). Especificação: `docs/02-experiencia/` (UX-01..08).

| Pasta             | Conteúdo                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/app/`        | Casca do app: rotas lógicas (UX-03 §5), roteador mínimo sobre a History API, navegação por área, textos centralizados |
| `src/components/` | Componentes base de UX-06                                                                                             |
| `src/design/`     | Tokens de UX-02 (temas claro e escuro — ADR-024)                                                                      |
| `src/screens/`    | Telas; as ainda não implementadas indicam a tarefa que as entregará                                                   |
| `tests/`          | Ponta a ponta com Playwright + axe (Chromium e WebKit)                                                                |

Comandos (na raiz): `pnpm dev` (servidor local) e `pnpm test:e2e`. Em desenvolvimento, `/_componentes` mostra a vitrine dos componentes (excluída do build de produção).
