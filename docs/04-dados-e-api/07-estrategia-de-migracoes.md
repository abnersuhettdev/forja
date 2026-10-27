# DAD-07 — Estratégia de Migrações

| Campo | Valor |
|---|---|
| Identificador | DAD-07 |
| Status | **Aprovado** (2026-10-26 — Etapa 4) |
| Etapa | 4 |
| Dono do assunto | Versionamento e evolução do esquema do servidor e do banco local, seeds e dados de teste |
| Dependências | DAD-01..03, DAD-06, ARQ-02, ARQ-03, UX-08 §9 |
| Referenciado por | IMP-01, IMP-02, IMP-03, PLN-01 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Permitir evoluir o banco do servidor e o banco local do aparelho sem perder dados — especialmente a fila de saída (UX-08 §9) — com histórico versionado e reproduzível.

## 2. Servidor (PostgreSQL)

| Item | Regra |
|---|---|
| Ferramenta | CLI do provedor (migrações SQL em `supabase/migrations/`) |
| Nomenclatura | `AAAAMMDDHHMMSS_descricao_curta.sql` (ex.: `20261101120000_create_sessions.sql`) |
| Conteúdo | Uma mudança lógica por migração; tabelas, restrições, gatilhos, **políticas por linha** e permissões de papéis na mesma migração da tabela |
| Direção | **Somente para frente**: correções por nova migração compensatória; nunca editar migração já aplicada em produção |
| Mudanças destrutivas | Em duas fases (expandir → migrar dados → contrair) para não quebrar versões do app ainda instaladas com fila pendente |
| Compatibilidade com o app | A função de sincronização aceita a versão de contrato atual e a anterior (`contract_version`) durante a transição |
| Aplicação | Pelo CI após testes, antes do deploy do app (IMP-02); backup imediatamente antes de migrações em produção |
| Verificações automáticas | (a) toda tabela de dados de aluno tem política; (b) testes de acesso cruzado; (c) migração aplicada do zero em banco limpo |

## 3. Seeds

| Seed | Conteúdo | Ambiente |
|---|---|---|
| `seed_taxonomies` | Grupos musculares, equipamentos, categorias de restrição, objetivos (TRN-01/TRN-03) | Todos |
| `seed_catalog_vN` | Catálogo curado (DAD-06), fontes e licenças; incremental por versão | Todos |
| `seed_system_settings` | `ter_enabled = false` | Todos |
| Usuário inicial | **Não** fica em seed versionado (contém e-mail): criado por procedimento operacional (DAD-05 §4, IMP-01) | Produção |
| `fixtures/` | Usuários e treinos **fictícios**, marcados como fictícios | Somente local e testes (RN-037) |

## 4. Banco local (aparelho)

| Item | Regra |
|---|---|
| Versionamento | Número de versão do esquema local; cada versão descreve suas tabelas e índices e uma função de atualização a partir da anterior |
| Preservação | Fila de saída, sessão em andamento e pendências mantidas (criptografadas) **nunca** são apagadas por migração; se a migração falhar, o app mantém a versão anterior dos dados e registra o erro (UX-08 §9) |
| Dados descartáveis | Caches (programa, catálogo, histórico) podem ser recriados a partir do servidor em vez de migrados |
| Momento | Migração aplicada na ativação de nova versão do app, nunca durante sessão em andamento |
| Testes | Para cada nova versão: abrir com dados da versão anterior contendo fila pendente e sessão em andamento (SEG-03) |

## 5. Ambientes

| Ambiente | Banco | Observação |
|---|---|---|
| Local | Instância local do provedor via CLI (pode exigir container — verificar na fundação) ou projeto gratuito de desenvolvimento | Dados fictícios |
| Produção | Projeto gratuito em São Paulo (VH-03) | Dados reais; o plano gratuito permite dois projetos (desenvolvimento + produção) |

Detalhes de configuração em IMP-01.

## Critérios de conclusão

- [x] Regras de migração do servidor e do aparelho, seeds e separação de dados fictícios definidas.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 4). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 4). |
