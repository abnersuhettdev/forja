# @forja/domain

Regras de domínio puras e compartilhadas entre o app e a função de sincronização (ARQ-04 §3). Não acessa rede, armazenamento nem relógio: tudo entra por parâmetro.

| Módulo                     | Conteúdo                                                             | Referência                     |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------ |
| `parameters.ts`            | Parâmetros de negócio                                                | PRD-07 §11                     |
| `enums.ts`, `labels.ts`    | Enumerações finais e rótulos pt-BR                                   | TRN-01 §3, TRN-03              |
| `ranges.ts`                | Faixas válidas                                                       | RN-018, RN-035                 |
| `schemas.ts`               | Esquemas Zod das entidades                                           | DAD-02                         |
| `time.ts`, `rules.ts`      | Datas no fuso do aluno, janela de edição, relógio do aparelho, idade | RN-010, RN-027, RN-028, RN-048 |
| `messages.ts`, `result.ts` | Códigos de erro, mensagens e formatos pt-BR; resultado tipado        | SEG-05, ARQ-04 §6, RNF-004     |

Testes em `tests/` (`pnpm test`), com cobertura mínima de 90% (RNF-021).
