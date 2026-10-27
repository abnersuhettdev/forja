# catalog

Fonte curada do catálogo de exercícios (TAR-012; DAD-06, ADR-052).

| Arquivo                    | Conteúdo                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exercicios.json`          | Exercícios curados: nome, instruções e dicas em pt-BR, padrão, músculos, equipamentos, marcadores, nível, medida, estado da revisão e das imagens |
| `fontes/free-exercise-db/` | Snapshot da fonte (commit registrado em `FONTE.md`) e licença; dado de entrada, não editar                                                        |
| `LICENCAS.md`              | Inventário de licenças de dados, textos e imagens (DAD-06 §6)                                                                                     |
| `REVISAO.md`               | Lista de revisão do usuário (condição para avançar da TAR-012)                                                                                    |

## Validação

```bash
node scripts/catalog/validate.ts            # esquema + metas de DAD-06 §4 (CI)
node scripts/catalog/validate.ts --release  # também exige textos revisados (CA-038)
```

Regras: textos reescritos em pt-BR (não tradução automática sem revisão); nenhuma imagem sem procedência comprovada; `source_ref` deve existir no snapshot; dados fictícios só em fixtures de teste (RN-037). O seed do banco é gerado a partir deste arquivo na TAR-013.
