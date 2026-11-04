# IMP-01 — Ambientes e Configuração

| Campo | Valor |
|---|---|
| Identificador | IMP-01 |
| Status | **Aprovado** (2026-10-26 — Etapa 6) |
| Etapa | 6 |
| Dono do assunto | Ambientes, variáveis e segredos, configuração do provedor, inicialização do usuário inicial |
| Dependências | ARQ-02, ADR-002, ADR-004, ADR-032, ADR-033, ADR-050, ADR-051, DAD-05, DAD-07, SEG-01 §7 |
| Referenciado por | IMP-02..04, PLN-01 |
| Decisões | ADR-074 (ambientes) — aprovada |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Ambientes (ADR-074)

| Ambiente | App | Backend | Dados | Uso |
|---|---|---|---|---|
| Local | Servidor de desenvolvimento na máquina | Banco local do provedor via CLI (pode exigir container — verificar na fundação) | Fictícios | Desenvolvimento e testes |
| Desenvolvimento (nuvem) | Deploys de pré-visualização da hospedagem (um endereço por branch) | Projeto gratuito nº 1 | Fictícios | Testes em aparelhos reais antes do lançamento |
| Produção | Endereço provisório `*.pages.dev` (domínio próprio depois — Q-006) | Projeto gratuito nº 2, região São Paulo | **Reais** | Uso do usuário |

- O plano gratuito permite dois projetos (ARQ-02); ambos ficam ocupados por desenvolvimento e produção.
- Pré-visualizações nunca apontam para produção. Cada endereço de pré-visualização é uma origem diferente (dados locais separados) — não usar para registrar treinos reais.

## 2. Variáveis de configuração

| Variável | Pública? | Ambientes | Onde fica |
|---|---|---|---|
| Endereço do backend | Sim | Todos | Configuração de build do app |
| Chave publishable do provedor (`sb_publishable_...`; substitui a `anon` legada, aposentada pelo provedor) | Sim (pública por design; acesso limitado pelas políticas) | Todos | Configuração de build (`VITE_SUPABASE_PUBLISHABLE_KEY`); na função, fornecida pelo provedor em `SUPABASE_PUBLISHABLE_KEYS` |
| Versão do app | Sim | Todos | Gerada no build |
| Senha administrativa do banco | **Não** | Dev, Prod | Cofre do CI |
| Senha do papel `sync_writer` | **Não** | Dev, Prod | Segredos da função de sincronização |
| Token de acesso do provedor (CLI) | **Não** | CI | Cofre do CI |
| Token de deploy da hospedagem | **Não** | CI | Cofre do CI |
| Token da Cloudflare para Workers AI e identificador da conta (versão 1.2) | **Não** | Dev, Prod | Segredos da função no servidor, separados do token de publicação |
| Chave pública de backup | Sim | Prod | Repositório/CI |
| Chave privada de backup | **Não** | — | Somente o usuário |

Nenhum arquivo `.env` com segredos é versionado (ARQ-03 §2).

## 3. Configuração do provedor (produção e desenvolvimento)

| Item | Valor |
|---|---|
| Região | São Paulo (`sa-east-1`), confirmar na criação (VH-03) |
| Cadastro público de contas | **Desabilitado** (ADR-004) |
| Senha mínima | 10 caracteres (RN-031) |
| Limite de login | Padrão do provedor por IP (RN-031, ADR-051) |
| Expiração do token de acesso | Padrão (1 h) |
| Papéis do banco | `authenticated` (somente leitura com políticas), `anon` (sem acesso a dados), `sync_writer` (escrita pela função — ADR-050) |
| `system_settings.ter_enabled` | `false` |
| Envio de e-mails do serviço de autenticação | Não usado no Lançamento 1 |

## 4. Inicialização do usuário inicial (produção)

1. Criar o projeto de produção e aplicar as migrações e seeds pelo CI (IMP-02).
2. No painel do provedor, criar o usuário com e-mail e senha forte (≥ 10 caracteres, não comum).
3. Executar o procedimento operacional de inicialização (script local, com credencial administrativa usada só nesta máquina e nunca versionada) que cria o registro em `managers` para esse usuário — `scripts/ops/init-manager.ts` (TAR-008), com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` só no ambiente da execução; o e-mail é pedido no terminal.
4. Entrar no app pelo celular, instalar (TELA-002) e concluir a configuração inicial (TELA-003) — que cria o aluno com `is_self = true`.
5. Registrar a data da inicialização no histórico da documentação.

## Critérios de conclusão

- [x] Ambientes, variáveis, segredos, configuração do provedor e inicialização definidos.
- [x] ADR-074 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 6). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 6). |
| 2026-10-27 | §4 passo 3: indicado o script `scripts/ops/init-manager.ts` (TAR-008); procedimento inalterado. |
| 2026-11-03 | §2: chave publishable no lugar da `anon` legada; a função de sincronização publicada com `verify_jwt = false` (confere o token por conta própria). Decisão do usuário: "Sim, ajuste e teste". |
| 2026-11-04 | Versão 1.2: token do Workers AI. |
