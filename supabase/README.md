# supabase

Migrações, políticas por linha, testes de banco e (na TAR-010) a função de sincronização.

- Referências: DAD-01..07, ADR-050, ADR-090 (ambiente local)
- `migrations/` — SQL versionado, somente para frente (DAD-07 §2)
- `tests/database/` — testes pgTAP: estrutura, acesso cruzado e gatilhos

## Ambiente local (requer Docker Desktop em execução)

```bash
corepack pnpm db:start   # sobe o Supabase local e aplica as migrações
corepack pnpm db:reset   # recria o banco do zero com todas as migrações
corepack pnpm db:test    # roda os testes de banco
corepack pnpm db:stop
```

Portas locais na faixa 554xx (API 55421, banco 55422, Studio 55423): a faixa padrão 543xx é reservada pelo Windows nesta máquina.

O papel `sync_writer` é criado sem login. Senha e `LOGIN` são definidos por procedimento operacional, com a senha guardada só nos segredos da função (IMP-01 §2); nunca em arquivo versionado.

## Função de sincronização (`functions/sync`, TAR-010)

Único caminho de escrita (ADR-034, ADR-050). Núcleo em `process.ts` e `operations.ts`, usado pela função (`index.ts`, Deno) e pelos testes de integração (`sync.test.ts`, Node, contra o banco local):

```bash
corepack pnpm db:test   # pgTAP + contrato da função (cobertura ≥ 80%)
```

Localmente, `scripts/db/local-sync-role.ts` gera `functions/.env` (ignorado pelo git) e habilita o login do papel `sync_writer` com senha aleatória; `pnpm db:start` já faz isso na ordem certa.
