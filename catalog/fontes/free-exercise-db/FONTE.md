# Fonte: free-exercise-db

| Campo | Valor |
|---|---|
| Repositório | <https://github.com/yuhonas/free-exercise-db> |
| Commit do snapshot | `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5` |
| Arquivo | `dist/exercises.json` (873 exercícios), copiado sem alteração |
| Licença | Unlicense (domínio público declarado) — ver `LICENSE.md` |
| Data da cópia | 2026-10-26 |
| Uso no projeto | Seleção, classificação e base para textos reescritos em pt-BR (`catalog/exercicios.json`, campo `source_ref` = `id` da fonte) |
| Imagens | **Não copiadas nem usadas.** A procedência das imagens não é informada pela fonte (ADR-052) |

O snapshot é dado de entrada não confiável: só é lido pelo validador (`scripts/catalog/validate.ts`) para conferir `source_ref`. Produção nunca consulta a fonte externa (DAD-06 §5).
