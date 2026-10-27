# SEG-01 — Segurança e Privacidade

| Campo | Valor |
|---|---|
| Identificador | SEG-01 |
| Status | **Aprovado** (2026-10-26 — Etapa 6) |
| Etapa | 6 |
| Dono do assunto | Modelo de ameaças, controles (OWASP), cabeçalhos HTTP, segredos, proteção dos dados no aparelho (CP-03), parâmetros criptográficos (ADR-028 L6), incidentes |
| Dependências | RNF-012..017, ADR-027, ADR-028, ADR-034, ADR-050, ADR-051, DAD-03, DAD-05, UX-08 |
| Referenciado por | SEG-03, IMP-01..04, PLN-01, PLN-05 |
| Decisões | ADR-070 (parâmetros criptográficos), ADR-071 (cabeçalhos de segurança) — aprovadas |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Consolidar as ameaças relevantes e os controles que as tratam, verificáveis por testes (SEG-03), atendendo RNF-012..017 e as condições CP-01..CP-05 da ADR-027.

## 2. Ativos

| Ativo | Classificação (PRD-08 §6) | Onde está |
|---|---|---|
| Dados do aluno (perfil, restrições, medidas, peso, sessões, observações) | Comum e tratado como sensível | Banco do servidor, banco local do aparelho, backups |
| Credenciais (senha, tokens de sessão) | Segurança | Serviço de autenticação; tokens no aparelho |
| Segredos operacionais (senha do banco, papel `sync_writer`, tokens de deploy) | Segurança | Cofres do CI e do provedor |
| Chave privada dos backups | Segurança | **Somente com o usuário** (ADR-073) |
| Código e catálogo | Público/interno | Repositório privado |

## 3. Modelo de ameaças (resumo)

| ID | Ameaça | Controles | Verificação |
|---|---|---|---|
| AM-01 | Acesso a dados de outro aluno pela API | Políticas por linha em todas as tabelas; `authenticated` só leitura; escrita só via `sync_writer` com `current_actor()` (DAD-03 §7, ADR-050) | Testes de acesso cruzado (SEG-03 §4) |
| AM-02 | Escrita direta contornando a função de sincronização | Sem permissão de escrita para `authenticated`/`anon` | Teste: escrita direta recusada |
| AM-03 | Operação enviada pela conta errada | Dono por operação; guardas no aparelho e no servidor (ADR-028 L2–L4) | T-PWA-09, T-PWA-15 |
| AM-04 | Roubo de token por script injetado (XSS) | Conteúdo do usuário renderizado como texto; CSP restritiva (§5); sem scripts de terceiros | Teste de cabeçalhos; revisão |
| AM-05 | Força bruta de senha | Limite por IP no provedor + espera progressiva no app (RN-031, ADR-051); senha mínima de 10 | Teste manual |
| AM-06 | Senha fraca ou comum | Validação no app (lista embutida) + mínimo no provedor (ADR-051) | Teste unitário |
| AM-07 | Aparelho perdido ou compartilhado | Bloqueio de tela do aparelho; dados separados por usuário; limpeza ao sair (RN-052); pendências mantidas criptografadas (L6); revogação de sessões pelo painel (IMP-04) | T-PWA-11..16 |
| AM-08 | Dados pessoais em caches, URLs ou logs | `no-store`; service worker sem dados pessoais; nada pessoal em URLs; logs sem dados pessoais (ADR-028 L5, RNF-017) | T-PWA-17; revisão de logs |
| AM-09 | Vazamento de segredos | Segredos só em cofres; varredura de segredos no CI; chaves com escopo mínimo | Varredura automática no CI |
| AM-10 | Vazamento de backup | Backup criptografado com chave pública; chave privada só com o usuário (ADR-073) | Teste de restauração (IMP-03) |
| AM-11 | Dependência comprometida | Versões fixadas; auditoria de dependências no CI; atualização mensal revisada (IMP-04) | Relatório do CI |
| AM-12 | Perda de dados por falha do provedor | Backup diário próprio; app segue offline com fila (ADR-005) | Teste de restauração |
| AM-13 | Uso não autorizado da modalidade TER | `ter_enabled = false` + gatilho TG-04 (RN-040) | Teste de integração |

## 4. Controles por categoria do OWASP Top 10 (2021)

| Categoria | Controle no projeto |
|---|---|
| A01 Controle de acesso | AM-01..03, AM-13; testes de acesso cruzado obrigatórios no CI |
| A02 Falhas criptográficas | HTTPS + HSTS; hash de senha do provedor; AES-GCM nas pendências mantidas (§6); backups criptografados |
| A03 Injeção | Consultas parametrizadas pelo cliente do banco e pela API de dados; validação por esquemas (Zod) |
| A04 Design inseguro | Este modelo de ameaças; regras críticas garantidas no banco (DAD-03) |
| A05 Configuração | Cabeçalhos de §5; cadastro público desabilitado; `anon` sem acesso a dados |
| A06 Componentes vulneráveis | AM-11 |
| A07 Falhas de autenticação | AM-05, AM-06; sessão conforme DAD-05 |
| A08 Integridade de software e dados | Deploy só pelo CI a partir de `main` protegida; migrações versionadas |
| A09 Registro e monitoramento | `audit_events` (ex.: `OWNER_MISMATCH`), relatos de erro sem dados pessoais (SEG-04) |
| A10 SSRF | A função de sincronização não busca URLs fornecidas pelo usuário |

## 5. Cabeçalhos HTTP do app (ADR-071)

Configurados no arquivo de cabeçalhos da hospedagem (Cloudflare Pages `_headers`, ARQ-02 HD-05):

| Cabeçalho | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://<projeto>.supabase.co; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (confirmar suporte na fundação — HD-05) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Cache-Control` | Pacote do app com hash no nome: longo e imutável; `index.html` e service worker: `no-cache` |

Sem scripts, fontes ou estilos de terceiros (fontes e ícones servidos pelo app — UX-02 §5).

## 6. Proteção dos dados no aparelho (CP-03) e criptografia (ADR-070)

### 6.1 Avaliação (CP-03 da ADR-027)

| Situação | Proteção | Risco residual |
|---|---|---|
| Usuário conectado | Isolamento por origem do navegador; banco separado por usuário; proteção do sistema do aparelho (bloqueio de tela e criptografia do armazenamento do sistema — dependem da configuração do usuário) | Alguém com o aparelho desbloqueado e acesso ao app vê os dados do usuário conectado — **aceito**, como em qualquer app |
| Pendências mantidas após a saída | Criptografia própria (§6.2) | Força bruta offline contra senha fraca — mitigada pela senha mínima e pelo custo da derivação |
| Usuário saiu sem pendências | Dados removidos (RN-052) | Nenhum |

Texto para "Sobre e privacidade" (TELA-004): "Seus treinos ficam guardados neste aparelho para funcionar sem internet. Mantenha o bloqueio de tela do seu celular ativado. Ao sair da conta, os dados são removidos do aparelho, exceto registros não enviados que você escolher manter — esses ficam criptografados."

### 6.2 Parâmetros criptográficos das pendências mantidas (ADR-070)

| Item | Valor |
|---|---|
| Derivação de chave | PBKDF2-HMAC-SHA-256, **600.000 iterações** (referência: OWASP Password Storage Cheat Sheet), sal aleatório de 16 bytes por gravação |
| Cifra | AES-256-GCM, vetor de inicialização aleatório de 12 bytes por gravação |
| Implementação | Web Crypto API nativa; chave não exportável; nunca armazenada |
| Conteúdo cifrado | Todas as pendências e a sessão em andamento do usuário que saiu; metadados em claro apenas: identificador opaco do dono, sal, vetor, versão do formato |
| Desempenho | Medir na fundação em aparelho modesto; se a derivação passar de ~3 s, reduzir iterações com nova aprovação |
| Falha de decifração | Pedir senha anterior (ADR-028); nunca apagar sem decisão explícita |

## 7. Segredos

| Segredo | Onde fica | Quem usa |
|---|---|---|
| Senha do banco (administrativa) | Cofre do CI | Migrações e backup |
| Senha do papel `sync_writer` | Segredos da função de sincronização | Função de sincronização |
| Token de deploy da hospedagem | Cofre do CI | Deploy |
| Token de acesso do provedor (CLI) | Cofre do CI | Deploy de funções/migrações |
| Chave pública de backup | Repositório/CI (não é segredo) | Backup |
| Chave privada de backup | **Usuário** (gerenciador de senhas + cópia offline) | Restauração |
| Chave pública do provedor (`anon`) | No app (pública por design) | Leituras com políticas por linha |

Rotação: anual ou imediata após suspeita de vazamento (IMP-04). Varredura de segredos em cada PR.

## 8. Incidentes

1. Detectar (alerta, evento `OWNER_MISMATCH`, relato).
2. Conter: revogar sessões e rotacionar segredos afetados (IMP-04).
3. Avaliar dados atingidos; restaurar de backup se necessário.
4. Registrar em `docs` (histórico) o ocorrido e a correção.
5. Na modalidade TER, obrigações de comunicação dependem da verificação REG-07 (PRD-08).

## Critérios de conclusão

- [x] Ameaças com controles e verificação; OWASP Top 10 mapeado.
- [x] CP-03 avaliada; parâmetros criptográficos definidos.
- [x] ADR-070 e ADR-071 aprovadas.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 6). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 6). |
