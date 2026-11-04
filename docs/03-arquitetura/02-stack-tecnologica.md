# ARQ-02 — Stack Tecnológica

| Campo | Valor |
|---|---|
| Identificador | ARQ-02 |
| Status | **Aprovado** (2026-10-26 — Etapa 3) |
| Etapa | 3 |
| Dono do assunto | Critérios, comparação de alternativas, stack recomendada, custos, verificações pendentes, critérios de hospedagem para domínio próprio |
| Dependências | ARQ-01, RNF-020..024, ADR-016, ADR-017, ADR-027, ADR-028, Q-006 |
| Referenciado por | ARQ-03..05, DAD-*, IMP-*, PLN-01 |
| Decisões | ADR-031, ADR-032, ADR-033, ADR-035, ADR-036, ADR-039 — aprovadas |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo

Escolher tecnologias **proporcionais** a um projeto pessoal com potencial de crescimento, sem escolher por popularidade, respeitando as decisões aprovadas — especialmente custo gratuito/baixo (ADR-016), offline com fila própria (ADR-027) e Android + iPhone (ADR-017).

## 2. Critérios de avaliação

| Critério | Peso | Origem |
|---|---|---|
| C1 — Custo: gratuito no uso previsto, sem serviço pago obrigatório | Eliminatório | ADR-016 |
| C2 — Compatível com PWA offline e fila própria (sem sincronização "mágica" de terceiros) | Eliminatório | ADR-005, ADR-027 |
| C3 — Isolamento de dados aplicável no banco/servidor, não só no app | Eliminatório | RN-001, RN-053 |
| C4 — Simplicidade de operação (sem servidor para administrar) | Alto | PRD-01 §7 |
| C5 — Segurança pronta (hash de senha, HTTPS, sessões) com pouco código próprio | Alto | RNF-012..016 |
| C6 — Uma linguagem de ponta a ponta, tipada | Alto | RNF-020 |
| C7 — Dados relacionais (histórico, versões, consultas por período) | Alto | DAD-01 |
| C8 — Saída possível (dados em formato padrão, componentes substituíveis) | Médio | Evolução |
| C9 — Domínio próprio possível depois, sem custo obrigatório | Médio | Q-006 |
| C10 — Região de dados próxima ao Brasil | Médio | Latência; REG-06 |

## 3. Comparativos

### 3.1 Interface (frontend) — ADR-031

| Opção | Prós | Contras | Avaliação |
|---|---|---|---|
| **React + TypeScript + Vite (SPA)** | Ecossistema maduro para PWA (Workbox), IndexedDB, testes; SPA estática hospeda em CDN gratuita; ampla documentação | Bundle maior que Svelte | **Recomendado** |
| SvelteKit (modo estático) | Bundles menores, sintaxe simples | Ecossistema menor; menos exemplos de offline-first complexo | Alternativa viável |
| Vue + Vite | Simples, bom ecossistema | Sem vantagem clara sobre React para este caso | Viável |
| Next.js (renderização no servidor) | Rotas e API no mesmo projeto | Renderização no servidor não ajuda um app offline-first; exige hospedagem com funções; mais complexidade | Descartado |

### 3.2 Backend e dados — ADR-032

| Opção | C1 | C2 | C3 | C4 | C5 | C7 | Observações |
|---|---|---|---|---|---|---|---|
| **Supabase** (PostgreSQL + Auth + políticas por linha + Edge Functions) | ✓ (plano gratuito) | ✓ | ✓ (isolamento por linha nativo) | ✓ | ✓ (Auth pronto) | ✓ | **Recomendado.** Riscos do plano gratuito em §7 |
| Neon (PostgreSQL) + API própria em funções serverless | ✓ | ✓ | Parcial (isolamento só na API própria, salvo configuração manual) | ✓ | ✗ (autenticação, hash e sessões a construir) | ✓ | Mais código próprio de segurança; limites de CPU de algumas plataformas dificultam hash de senha forte |
| Firebase (Firestore + Auth) | ✓ | ✗ (offline/sincronização próprios do SDK conflitam com ADR-027) | ✓ (regras) | ✓ | ✓ | ✗ (documentos) | Descartado |
| Servidor próprio em VPS (Node + PostgreSQL) | ✗ (custo mensal) | ✓ | ✓ | ✗ | Parcial | ✓ | Descartado pelo custo e pela operação |
| PocketBase em VPS | ✗ (custo) | ✓ | ✓ | Parcial | ✓ | Parcial (SQLite) | Descartado pelo custo |

### 3.3 Hospedagem do aplicativo (estático) — ADR-033

| Opção | Prós | Contras | Avaliação |
|---|---|---|---|
| **Cloudflare Pages** | Plano gratuito com até 100 domínios próprios por projeto, 500 builds/mês, 20.000 arquivos (máx. 25 MiB cada); cabeçalhos configuráveis por arquivo `_headers` (CSP, `Cache-Control`); subdomínio próprio por CNAME **sem** mover o DNS; redirecionamento do endereço `*.pages.dev` (VH-08 confirmada) | Domínio raiz (apex) exige DNS na Cloudflare; a página oficial de limites não declara se a banda estática é ilimitada (irrelevante na escala prevista) | **Recomendado** |
| Cloudflare Workers com arquivos estáticos | Mais recursos; requisições a arquivos estáticos gratuitas; `_headers` e `_redirects` suportados | Domínio próprio **só** com nameservers gerenciados pela Cloudflare (documentação oficial) | Alternativa — menos flexível para domínio próprio |
| Netlify | Simples; domínio próprio | Cotas de banda e de build menores no gratuito | Alternativa |
| Vercel (Hobby) | Simples | Plano gratuito restrito a uso não comercial; cotas | Alternativa para uso pessoal |
| GitHub Pages | Gratuito | Sem controle de cabeçalhos HTTP (CSP, `no-store`) | Descartado (RNF-016) |

### 3.4 Bibliotecas de apoio — ADR-039

| Necessidade | Recomendação | Alternativa | Motivo |
|---|---|---|---|
| Service worker / cache | Workbox (via plugin PWA do Vite) | Service worker escrito à mão | Estratégias de cache testadas, atualização controlada |
| Banco local | Dexie (sobre IndexedDB) | `idb` (mais enxuto) | Migrações de esquema versionadas (UX-08 §9), consultas indexadas |
| Validação de dados | Zod (esquemas compartilhados) | Valibot | Mesmo esquema no app e na função de sincronização |
| Cliente do provedor | `@supabase/auth-js` + `@supabase/postgrest-js` (só autenticação e consultas — ADR-039 alterada em 2026-10-28) | `@supabase/supabase-js` completo | O app não usa tempo real, arquivos nem funções do cliente; −26 KiB gzip no JS inicial |
| Gráficos | Componente próprio em SVG ([ADR-092](06-adrs.md#adr-092--gráfico-de-linha-próprio-em-svg-no-lugar-do-uplot-substitui-parcialmente-a-adr-039); antes uPlot) | uPlot | Sem dependência; tabela alternativa feita pelo app (UX-06) |
| IA (versão 1.2) | Cloudflare Workers AI; modelo definido na prova de qualidade (ADR-093) | Grok, Gemini, Ollama, serviços pagos | Gratuito até a cota, sem treinar com os dados, conta já existente |
| Ícones / fontes | Lucide; Barlow (arquivos próprios) | — | ADR-023 |
| Testes | Vitest (unidade), Playwright (E2E, inclusive modo offline) | — | SEG-03 |
| Criptografia local (L6) | Web Crypto API nativa | — | Sem biblioteca extra |

Versões: fixadas de forma exata na tarefa de fundação (PLN-01), sempre com licença permissiva verificada (ARQ-04 §8).

## 4. Stack recomendada (resumo)

| Camada | Escolha |
|---|---|
| Linguagem | TypeScript (modo estrito) no app, no pacote de domínio e na função de sincronização |
| App | React + Vite, SPA, PWA com Workbox; Dexie; Zod; gráficos em SVG próprio (ADR-092) |
| Backend | Supabase: PostgreSQL com políticas por linha, Auth (e-mail e senha), API de dados, Edge Function de sincronização; região específica **São Paulo (`sa-east-1`)** (VH-03: existe e sem restrição de plano declarada; confirmar na criação do projeto) |
| Hospedagem do app | Cloudflare Pages, endereço provisório gratuito `*.pages.dev` |
| Repositório e CI | Git + GitHub (repositório privado) + GitHub Actions |
| Backup | Cópia diária do banco por tarefa agendada no CI, criptografada, armazenada fora do Supabase (ADR-036; detalhes em IMP-03) |
| Monitoramento | Mínimo, sem terceiros adicionais no Lançamento 1 (ARQ-05) |

## 5. Estimativa de uso (para checar as cotas gratuitas)

| Item | Estimativa (1 usuário, 2 anos) | Cota gratuita relevante |
|---|---|---|
| Banco | < 50 MB (≈ 4 sessões/semana × 20 séries × 2 anos ≈ 8.300 séries + catálogo de ~300 exercícios) | 500 MB por projeto (oficial) |
| Imagens do catálogo | 20–60 MB, servidas como arquivos estáticos do app | Até 20.000 arquivos e 25 MiB por arquivo (Pages); banda não declarada na página de limites |
| Chamadas à função de sincronização | < 5.000/mês | 500.000 invocações/mês incluídas (oficial — VH-06) |
| Usuários ativos | 1 (até 50 na modalidade TER) | 50.000 usuários ativos/mês (oficial) |

## 6. Custos

| Item | Lançamento 1 | Quando poderia custar |
|---|---|---|
| Supabase | US$ 0 | Plano pago (relatado: US$ 25/mês) para backups gerenciados e evitar pausa — **somente com aprovação** (ADR-016) |
| Cloudflare | US$ 0 | Não previsto |
| GitHub + Actions | US$ 0 (repositório privado com minutos gratuitos — verificar VH-09) | Não previsto |
| Domínio próprio (opcional) | — | Custo anual baixo, se você optar (Q-006) |

## 7. Riscos das camadas gratuitas e mitigação

| Risco | Fonte | Impacto | Mitigação |
|---|---|---|---|
| **Pausa do projeto Supabase após 1 semana de inatividade** — "Free projects are paused after 1 week of inactivity" | Página oficial de preços (VH-01 confirmada) | Sincronização para; o app continua funcionando offline com fila (ADR-027) | Uso diário evita a pausa; procedimento de restauração em IMP-04; aviso no app quando o servidor não responder por muito tempo. **Não** usar artifícios para burlar a política do provedor |
| **Sem backups gerenciados no plano gratuito** | Oficial: backups diários automáticos apenas nos planos Pro, Team e Enterprise; a documentação recomenda que projetos gratuitos exportem os dados regularmente com `db dump` e guardem cópias fora do provedor (VH-02 confirmada) | RNF-011 não atendido pelo provedor | Backup próprio diário fora do provedor (ADR-036), testado (RNF-011) |
| Limites de autenticação não configuráveis exatamente como RN-031 (5 tentativas/15 min por e-mail; lista de senhas comuns) | A verificar (VH-04, VH-05) | Regra aprovada pode não ser implementável só com o serviço | Se necessário: validação de senha comum no app + limitação adicional na função de login, ou ajuste da RN-031 com sua aprovação (decidir em DAD-05) |
| Mudança de condições do plano gratuito | Mercado | Custo inesperado | Revisão trimestral (IMP-04); dados em PostgreSQL padrão (saída viável) |
| Dependência de provedores estrangeiros | — | Relevante só para TER (REG-06) | Registrado no GATE-TER |
| Termos do Supabase (VH-07) | Termos oficiais: sem cláusulas específicas do plano gratuito; uso "limited to Customer's internal business purposes"; o provedor pode aplicar limites de uso, suspender acesso e alterar os termos; o cliente é responsável por "appropriate security, protection, and backup of Customer Data"; dados de saúde protegidos pela HIPAA (lei dos EUA) exigem acordo específico | Ambiguidade sobre uso estritamente pessoal; possível suspensão; obrigação de backup do cliente | Uso pessoal registrado como risco aceito a confirmar com você; backup próprio (ADR-036); a cláusula HIPAA (norma dos EUA) e a adequação para dados de saúde de terceiros entram na verificação do GATE-TER (REG-03, REG-06) |

## 8. Domínio próprio depois — critérios de hospedagem e migração de origem (ADR-035)

Decisão do usuário: usar **endereço provisório gratuito** durante o desenvolvimento (Q-006).

### 8.1 Critérios que a hospedagem do app deve atender

| ID | Critério | Cloudflare (recomendado) |
|---|---|---|
| HD-01 | Permitir domínio próprio no plano gratuito | Sim — até 100 por projeto (oficial) |
| HD-02 | Certificado HTTPS para o domínio próprio | Sim — emitido pela Cloudflare; pode exigir registros CAA que autorizem a emissão (oficial) |
| HD-03 | Manter o endereço provisório ativo após adicionar o domínio | Sim, implícito na documentação (o endereço `*.pages.dev` continua existindo); confirmar na prática |
| HD-04 | Redirecionamento configurável do endereço antigo para o novo | Sim — redirecionamento de `*.pages.dev` para o domínio próprio via Bulk Redirects (oficial); só ativar com fila vazia (§8.2) |
| HD-05 | Cabeçalhos HTTP configuráveis (CSP, HSTS, `no-store`) | Sim para arquivos estáticos via `_headers` (até 100 regras; CSP e `Cache-Control` citados na documentação; HSTS a confirmar na fundação) **HSTS confirmado em 2026-11-03** no endereço publicado. |
| HD-06 | Requisitos de DNS | Subdomínio (ex.: `app.seudominio.com.br`): CNAME para `*.pages.dev`, sem mover o DNS. Domínio raiz: exige adicionar o domínio como zona Cloudflare e trocar os nameservers (oficial) |
| HD-07 | Sem custo obrigatório para os itens acima | Sim no plano gratuito, exceto o registro do domínio |

O endereço do **backend** não é a origem da PWA; trocá-lo não afeta instalação nem dados locais. Domínio próprio no backend é recurso pago em alguns provedores e **não** é necessário.

### 8.2 A migração de origem **não** é transparente

O navegador associa ao endereço (origem) o app instalado, o banco local, a fila de saída, as pendências mantidas e a sessão de acesso. Nada disso migra sozinho. Procedimento previsto (detalhe em IMP-02):

1. Publicar o app também no domínio novo (as duas origens ativas).
2. No endereço antigo, exibir aviso persistente: "O app mudou de endereço. Envie seus registros e instale pelo novo endereço."
3. No endereço antigo, enviar todas as pendências; com a fila vazia, oferecer o botão **Ir para o novo endereço**.
4. No novo endereço: instalar de novo, entrar; os dados sincronizados são baixados.
5. Somente com fila vazia confirmada o endereço antigo passa a redirecionar; nunca redirecionar enquanto houver pendências (o redirecionamento impediria abrir o app antigo e enviá-las).
6. Pendências mantidas por usuários que saíram (RN-052) no endereço antigo não migram — o aviso deve orientar a entrar e enviá-las antes.

**Recomendação mantida:** definir o endereço definitivo antes do uso real (GOV-02 §5.1).

## 9. Verificações (VH)

Resultado das consultas à documentação oficial em 2026-10-26 (leitura de páginas públicas; nenhuma conta criada).

| ID | Verificação | Resultado | Situação |
|---|---|---|---|
| VH-01 | Pausa por inatividade do Supabase gratuito | Confirmada: "Free projects are paused after 1 week of inactivity" (preços oficiais). Procedimento de restauração não verificado nesta consulta | **Confirmada** (restauração a documentar em IMP-04) |
| VH-02 | Backups no Supabase gratuito | Confirmado: **não há** backups automáticos no gratuito (só Pro/Team/Enterprise, com 7/14/30 dias); a documentação recomenda exportar com `db dump` e guardar fora do provedor | **Confirmada** → reforça ADR-036 |
| VH-03 | Região São Paulo no gratuito | A região específica "South America (São Paulo), `sa-east-1`" existe; a página de regiões não declara restrição por plano, mas também não confirma expressamente o plano gratuito | **Parcial** — confirmar ao criar o projeto (fundação); se indisponível, usar a região disponível mais próxima (impacto: latência das sincronizações, que são assíncronas) **Confirmada em 2026-11-03:** os dois projetos gratuitos foram criados em `sa-east-1`. |
| VH-04 | Limitação de login × RN-031 | Oficial: limite no endpoint de token por **IP** (padrão 150/5 min, picos de 30), personalizável; inclui renovações de sessão; não há limite por e-mail | **Confirmada** — incompatível com a RN-031 literal → ADR-051 |
| VH-05 | Política de senha × RN-031 | Oficial: tamanho mínimo configurável; proteção contra senhas vazadas só no Pro ou superior | **Confirmada** — parte da RN-031 só no app → ADR-051 |
| VH-11 | Revogação das sessões ao trocar a senha e saída remota pelo painel | — | Pendente — fundação |
| VH-12 | Conexão da função de sincronização ao banco com papel próprio (`sync_writer`) | — | **Confirmada localmente** (2026-10-27, TAR-004): conexão direta com o papel e senha próprios, sem `BYPASSRLS`, sem criar objetos, ator fixado por transação. Confirmada também a partir da função de sincronização local (TAR-010, teste HTTP). Pendente: projeto real, inclusive pelo pooler (ADR-090) Em 2026-11-03, no `forja-dev`: login do papel aplicado pelo pooler; gravação real pela função ainda a verificar. |
| VH-06 | Cotas das Edge Functions | 500.000 invocações/mês no gratuito (preços oficiais) | **Confirmada** |
| VH-07 | Termos de uso | Sem cláusulas específicas do gratuito; uso limitado a "internal business purposes"; suspensão e limites possíveis; cliente responsável por backup; dados de saúde sob HIPAA exigem acordo (ver §7) | **Confirmada, com ressalvas** — decisão do usuário sobre aceitar o risco (GOV-02) |
| VH-08 | Cloudflare: Pages × Workers, domínio, certificado, DNS, redirecionamento | Pages sem indicação oficial de descontinuação; limites do gratuito confirmados; subdomínio por CNAME sem mover DNS; raiz exige zona Cloudflare; redirecionamento de `*.pages.dev` disponível; Workers com arquivos estáticos **só** aceita domínio com nameservers na Cloudflare | **Confirmada** → recomendação ajustada para **Cloudflare Pages** (ADR-033) |
| VH-09 | Minutos do GitHub Actions | — | Pendente — fundação |
| VH-10 | Licenças e versões das bibliotecas | npm (2026-10-26): React, React DOM, Vite, plugin React, vite-plugin-pwa, workbox-window, Zod, uPlot, supabase-js, ESLint e plugins, Prettier, Vitest — MIT; TypeScript, Dexie, Playwright — Apache-2.0; Lucide — ISC; Barlow/Barlow Semi Condensed (Fontsource) — OFL-1.1; `@axe-core/playwright` — MPL-2.0 (somente teste, não distribuída). TypeScript fixado em 6.0.3 porque o typescript-eslint 8.72 exige < 6.1 (TypeScript 7 ainda não suportado). Versões escolhidas com ≥ 7 dias de publicação, regra reforçada por `minimumReleaseAge` no pnpm; licenças verificadas continuamente no CI (`scripts/check-licenses.ts`) | **Confirmada** (TAR-001) |

## 10. Referências consultadas (2026-10-26)

Oficiais:

- Supabase — preços e limites do plano gratuito: <https://supabase.com/pricing>
- Supabase — backups: <https://supabase.com/docs/guides/platform/backups>
- Supabase — regiões: <https://supabase.com/docs/guides/platform/regions>
- Supabase — termos de serviço: <https://supabase.com/terms>
- Cloudflare Pages — limites: <https://developers.cloudflare.com/pages/platform/limits/>
- Cloudflare Pages — domínios próprios: <https://developers.cloudflare.com/pages/configuration/custom-domains/>
- Cloudflare Pages — cabeçalhos: <https://developers.cloudflare.com/pages/configuration/headers/>
- Cloudflare Workers — migração de Pages para arquivos estáticos: <https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/>
- Neon — preços: <https://neon.com/pricing>

De terceiros (usadas apenas na primeira triagem, substituídas pelas oficiais acima): <https://automationatlas.io/answers/supabase-free-tier-limits-2026/>, <https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/>

## Critérios de conclusão

- [x] Critérios definidos e alternativas comparadas por camada, com descartes justificados.
- [x] Custos, cotas e riscos das camadas gratuitas registrados.
- [x] Critérios de hospedagem para domínio próprio e procedimento de migração de origem documentados.
- [x] VH-01, VH-02, VH-07, VH-08 confirmadas na documentação oficial; VH-03 parcial (confirmação final na criação do projeto).
- [x] ADRs da etapa aprovadas.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 3). |
| 2026-10-26 | Verificações VH-01, 02, 03, 06, 07, 08 registradas com fontes oficiais; hospedagem ajustada para Cloudflare Pages; riscos dos termos do Supabase acrescentados. |
| 2026-10-26 | Aprovado pelo usuário (Etapa 3). |
| 2026-10-26 | Etapa 4: VH-04 e VH-05 confirmadas na documentação oficial; VH-11 e VH-12 acrescentadas. |
| 2026-10-26 | VH-10 registrada na TAR-001. |
| 2026-10-26 | TAR-005: versões fixadas do app (React 19.3.1, Vite 8.3.4, Lucide 1.59.0, Playwright 1.64.1, axe 4.14.0). `eslint-plugin-jsx-a11y` 6.10.2 declara suporte até o ESLint 9, mas funciona com o ESLint 10 (verificado); acompanhar nova versão. Roteamento feito com roteador próprio mínimo (sem dependência adicional). |
| 2026-10-27 | TAR-004 (ambiente local — ADR-090): Supabase CLI 2.121.0 (MIT) e `zod` na raiz como dependências de desenvolvimento; VH-12 confirmada localmente. Portas locais na faixa 554xx porque 54225–54324 é reservada pelo Windows nesta máquina. |
| 2026-10-27 | TAR-008: `@supabase/supabase-js` 2.118.0 (MIT). Lista de senhas comuns do SecLists (MIT, commit `758fecf`, arquivo NCSC 100k filtrado para 10+ caracteres) embutida no app e carregada sob demanda; licença publicada em `/licencas/SecLists-LICENSE.txt` (a exibir em "Créditos e fonte", TELA-014). |
| 2026-10-27 | TAR-009: Dexie 4.4.7 (Apache-2.0) para o banco local; `fake-indexeddb` 6.2.6 (Apache-2.0) só em testes. JS inicial após TAR-009: 144 KB comprimido (orçamento SEG-04: 200 KB); lista de senhas comuns em pacote separado sob demanda (43 KB). |
| 2026-10-27 | TAR-010: `postgres` 3.4.9 (Unlicense) — driver da função (Deno, via `npm:`) e dos testes de integração. No ambiente local, a função alcança o banco pelo alias `db.supabase.internal` (o resolvedor do Deno recusa o nome do container com sublinhado). |
| 2026-10-28 | ADR-092: gráficos em componente próprio em SVG no lugar do uPlot (§3.4, §4). TAR-024: `@supabase/supabase-js` 2.118.0 também na raiz, só para o teste de leituras com 2 anos de dados. |
| 2026-10-28 | TAR-006 (parte local): `vite-plugin-pwa` 2.0.0 e `workbox-window` 7.4.1 (MIT). `pnpm audit`: 2 vulnerabilidades baixas só nas ferramentas de build do plugin (`workbox-build` → `serialize-javascript`, `deepmerge`), fora do pacote distribuído. Lighthouse 13.5.0 usado pontualmente pelo `npx`, sem entrar nas dependências. |
| 2026-10-28 | TAR-007 (parte local): `age-encryption` 0.3.1 (BSD-3-Clause; implementação oficial do formato `age`, pelo mesmo autor) como dependência de desenvolvimento, só nos scripts de backup e restauração — não vai para o app. |
| 2026-10-28 | PR-DES-02 item 1 (aprovado): `@supabase/auth-js` 2.118.0 e `@supabase/postgrest-js` 2.118.0 (MIT) no app no lugar do `@supabase/supabase-js`, que fica só como dependência de desenvolvimento da raiz (teste de integração). |
| 2026-11-03 | VH-03 e HSTS (HD-05) confirmados no projeto real (TAR-003). |
| 2026-11-04 | Versão 1.2: IA na stack (ADR-093). |
