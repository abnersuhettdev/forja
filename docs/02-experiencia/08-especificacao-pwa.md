# UX-08 — Especificação PWA

| Campo | Valor |
|---|---|
| Identificador | UX-08 |
| Status | **Aprovado** (2026-10-26 — Etapa 2) · detalhamento da saída da conta confirmado em 2026-10-26 |
| Etapa | 2 |
| Dono do assunto | Instalação, manifest, ícones, service worker, cache, dados offline, sincronização (comportamento), atualização e limitações por plataforma |
| Dependências | ADR-005, ADR-017, ADR-022, RF-090..093, RF-100..102, RN-042..051, RNF-010, RNF-019, RNF-028 |
| Referenciado por | ARQ-01, ARQ-02, DAD-04, SEG-03, SEG-05, IMP-02 |
| Decisões | ADR-027 (estratégia de dados offline) — aprovada |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Especificar como o app é instalado e como funciona sem internet, de forma que nenhuma série registrada se perca (RNF-010) em Android e iPhone (ADR-017). Contratos de API e formatos de dados ficam em DAD-04 (Etapa 4); tecnologias concretas em ARQ-02 (Etapa 3).

> **Sobre as limitações de plataforma:** as afirmações sobre navegadores refletem o conhecimento disponível em 2026-10 e **devem ser confirmadas em aparelhos reais** com as versões vigentes durante a Etapa 9. Nenhuma funcionalidade essencial depende de recurso cuja disponibilidade seja incerta (P12).

## 2. Requisitos de instalabilidade

| Requisito | Definição |
|---|---|
| HTTPS | Obrigatório em produção (hospedagem definida na Etapa 3) |
| Manifest | Arquivo de manifest válido (§3) referenciado em todas as páginas |
| Service worker | Registrado no primeiro acesso; controla todo o escopo `/` |
| Ícones | Conjunto do §3.2 |
| Início offline | A página inicial abre sem rede após o primeiro carregamento |

## 3. Manifest e ícones

### 3.1 Campos

| Campo | Valor |
|---|---|
| `name` | Forja — Treinos (provisório, ADR-023) |
| `short_name` | Forja |
| `description` | Planeje, execute e registre seus treinos. |
| `lang` / `dir` | `pt-BR` / `ltr` |
| `start_url` | `/hoje?origem=app` (parâmetro apenas para métricas de uso instalado; sem dado pessoal) |
| `scope` | `/` |
| `id` | `/` |
| `display` | `standalone` |
| `orientation` | `any` (retrato preferido, paisagem suportada — UX-07) |
| `theme_color` | `#0E1114` (barra do sistema no tema escuro); a página ajusta `theme-color` por tema via meta tag com `media` |
| `background_color` | `#0E1114` |
| `categories` | `health`, `fitness`, `sports` |

### 3.2 Ícones

| Arquivo | Tamanho | Finalidade |
|---|---|---|
| Ícone padrão | 192 × 192 e 512 × 512 PNG | `any` |
| Ícone maskable | 512 × 512 PNG, símbolo dentro da área segura central de 80% | `maskable` (Android) |
| apple-touch-icon | 180 × 180 PNG, sem transparência | Tela de Início do iPhone |
| Favicon | SVG + 32 × 32 PNG | Navegador |

Arte: "F" grafite sobre lima (UX-02 §2.3). Telas de abertura específicas do iPhone (`apple-touch-startup-image`) são opcionais e ficam fora do Lançamento 1.

## 4. Instalação por plataforma (RF-090, TELA-002)

| Situação detectada | Comportamento |
|---|---|
| Já em modo instalado (`display-mode: standalone` ou equivalente no iPhone) | Não exibir sugestões de instalação |
| Navegador oferece evento de instalação (Chromium/Android) | Guardar o evento; botão **Instalar** em TELA-002 e no banner de Hoje |
| iPhone/iPad com Safari | Instruções ilustradas (Compartilhar → Adicionar à Tela de Início) |
| iPhone com outro navegador | Instruções equivalentes do menu de compartilhamento do navegador, quando disponível; senão, "abra no Safari" (a confirmar por navegador) |
| Navegador interno de outro aplicativo | "Abra este endereço no Safari ou no Chrome" |
| Desktop | Item discreto em Conta; sem banner |

O banner de instalação aparece no máximo uma vez em Hoje e pode ser dispensado; continua disponível em Conta.

## 5. Recursos de plataforma — uso progressivo

Cada recurso é detectado em tempo de execução; a ausência nunca impede a função essencial.

| Recurso | Uso no app | Android (Chrome) | iPhone (Safari / Tela de Início) | Sem o recurso |
|---|---|---|---|---|
| Armazenamento persistente (`storage.persist`) | Proteger dados locais da limpeza automática | Disponível (concessão a critério do navegador) | Suporte e efeito a confirmar | Avisos de pendências antigas (§7) |
| Sincronização em segundo plano | Enviar com o app fechado | Disponível em Chromium | Indisponível | Envio apenas com o app aberto (§6.3) — **padrão para todos** |
| Execução em segundo plano | Cronômetro com app minimizado | Limitada | Mais restrita | Cronômetro por horário de término (RF-062) |
| Vibração | Retorno ao registrar série e fim do descanso | Disponível | Indisponível na web | Retorno visual e sonoro |
| Som | Alerta de fim de descanso | Requer interação prévia do usuário | Requer interação prévia; respeita modo silencioso | Alerta visual |
| Manter tela ligada (Wake Lock) | Durante a Execução | Disponível | Suporte recente; histórico de falhas no modo Tela de Início (a confirmar) | Tela pode apagar; ao voltar, estado preservado |
| Notificações push | Fora do MVP (RF-094) | — | Só com app instalado (iOS ≥ 16.4) | — |
| Prompt de instalação | Botão Instalar | Disponível | Indisponível | Instruções manuais |

### 5.1 Pontos a validar em aparelhos reais

Toda afirmação sobre plataforma acima é uma **hipótese de trabalho**. Cada ponto abaixo deve ser validado em aparelho real (Android/Chrome e iPhone/Safari, no navegador e instalado) durante a Etapa 9, com resultado registrado aqui. Se a validação contrariar a hipótese, a alternativa da coluna "Sem o recurso" passa a ser o comportamento padrão naquela plataforma.

| ID | Ponto a validar | Plataforma | Risco se falhar | Status |
|---|---|---|---|---|
| VP-01 | Prompt de instalação e instalação pelo botão | Android | Baixo — instruções manuais | A validar |
| VP-02 | Instalação manual pela Tela de Início e abertura offline pelo ícone | iPhone | Médio | A validar |
| VP-03 | Concessão de armazenamento persistente | Android, iPhone | **Alto** (perda de pendências — C-11) | A validar |
| VP-04 | Permanência dos dados locais após vários dias sem abrir o app (navegador × Tela de Início) | iPhone | **Alto** | A validar |
| VP-05 | Cronômetro correto após minimizar o app por 2 min | Android, iPhone | Médio | A validar |
| VP-06 | Som de fim de descanso com e sem modo silencioso | Android, iPhone | Baixo | A validar |
| VP-07 | Vibração | Android (iPhone: confirmar ausência) | Baixo | A validar |
| VP-08 | Manter tela ligada durante a execução, no navegador e instalado | Android, iPhone | Baixo | A validar |
| VP-09 | Cotas de armazenamento suficientes para programa, imagens (até 50 MB) e 90 dias de sessões | Android, iPhone | Médio | A validar |
| VP-10 | Separação dos dados entre o Safari e o app instalado no iPhone (podem ter armazenamentos distintos) | iPhone | Médio — orientar o uso sempre pelo ícone | A validar |
| VP-11 | Instalação a partir de navegadores alternativos no iPhone | iPhone | Baixo | A validar |

## 6. Dados offline e sincronização (ADR-027)

### 6.1 Camadas de armazenamento no aparelho

| Camada | Conteúdo | Atualização | Retenção |
|---|---|---|---|
| **Pacote do app** (cache do service worker) | HTML, JS, CSS, fontes, ícones | Pré-carregado a cada versão publicada | Até a próxima versão |
| **Imagens de exercícios** (cache dedicado) | Imagens dos exercícios do programa ativo (pré-baixadas ao publicar/atualizar o programa) e imagens vistas recentemente | Ao abrir o app online e ao publicar programa | Programa ativo: sempre; demais: até 50 MB, removendo as menos usadas |
| **Dados do app** (banco local, IndexedDB) | Ver §6.2 | Ao abrir online, ao voltar ao primeiro plano, após publicar | Ver §6.2 |
| **Fila de saída** (banco local) | Operações do usuário ainda não confirmadas pelo servidor | A cada ação do usuário | **Nunca removida automaticamente** — só após confirmação do servidor ou decisão explícita do usuário |

Todos os dados locais são **separados por usuário** (RF-102, RN-047).

### 6.2 Dados mantidos para uso offline

| Conjunto | Para quê | Janela |
|---|---|---|
| Perfil (subconjunto: nome, disponibilidade, dias preferidos) | Recomendação, meta semanal | Atual |
| Configuração de descanso | Recomendação (RN-050) | Atual |
| Programa ativo (versão publicada completa) + exercícios referenciados | Execução, listas, detalhes | Atual |
| Última execução de cada exercício do programa ativo | Pré-preenchimento (RF-061) e "Última vez" | Atual |
| Sessões recentes (resumo + séries) | Recomendação (ciclo e descanso), agenda, semana | Últimos 90 dias |
| Registros de peso | Evolução, Hoje | Últimos 12 meses |
| Sessão em andamento | Retomada (RF-066) | Até concluir/descartar |

O carimbo "Disponível offline · atualizado às hh:mm" (RF-092) refere-se ao último download bem-sucedido do programa ativo.

### 6.3 Envio da fila (comportamento)

1. **Gatilhos:** abertura do app, retorno ao primeiro plano, retomada da conexão, conclusão de sessão, a cada 60 s com o app aberto e pendências, e **Enviar agora**. Onde houver sincronização em segundo plano, ela é usada como reforço, nunca como único mecanismo.
2. **Ordem:** por registro, na ordem de criação (ex.: criar sessão antes das séries dela).
3. **Identificadores:** cada operação carrega identificador gerado no aparelho (RN-042).
4. **Classificação do resultado (RN-051):**

| Resultado do servidor | Estado |
|---|---|
| Aceito (ou já recebido antes, mesmo identificador) | Sincronizado |
| Falha de rede, tempo esgotado, servidor indisponível | Nova tentativa automática (intervalos crescentes: 5 s, 15 s, 1 min, 5 min; depois a cada 5 min) |
| Sessão de acesso expirada | Aguardando envio ("Entre novamente para enviar") |
| Recusa definitiva por validação ou permissão | Recusado (motivo exibido) |
| Revisão desatualizada ou registro excluído no servidor | Conflito (RN-046) |

5. A tradução exata desses resultados em códigos e formatos de resposta é definida em DAD-04 e SEG-05.

### 6.4 Recomendação offline

A recomendação (RN-013) é calculada no aparelho com os dados de §6.2 (incluindo sessões pendentes, RN-049), com a mesma regra usada online. Limitação aceita: sessões feitas em outro aparelho e ainda não sincronizadas não são consideradas (GOV-02, C-04).

## 7. Prevenção de perda de dados

| Risco | Medida |
|---|---|
| Fechamento do app / recarga durante a sessão | Cada série gravada localmente antes da confirmação visual (RN-043); sessão em andamento persistida |
| Falha de gravação local (cota cheia, erro do navegador) | `Banner` de perigo imediato na Execução; nova tentativa; orientação "não feche o app" |
| Limpeza automática do armazenamento pelo sistema (risco principal no iPhone — C-11) | Pedir armazenamento persistente após a primeira sessão concluída, onde houver; recomendar o uso pelo ícone da Tela de Início (TELA-002); enviar a fila a cada oportunidade (§6.3); **aviso em Hoje** quando houver pendências com mais de 24 h ("Você tem treinos não enviados desde 24/10. Abra o app com internet para enviá-los.") e destaque de perigo após 72 h |
| Atualização do app com pendências | Migrações do banco local preservam a fila; versão nova só é ativada fora de sessão em andamento (§9) |
| Logout com pendências | Fluxo de UX-04 §6.1 (RF-101) |
| Troca de usuário no mesmo aparelho | Dados e fila separados por usuário; fila de um usuário nunca é enviada com a sessão de outro (RN-047) |

Mitigação adicional **não incluída** no Lançamento 1 (reavaliar após uso real): exportar pendências como arquivo para envio posterior.

## 8. Sessão de acesso, saída da conta e dados locais

### 8.1 Sessão de acesso

- A sessão de acesso permanece válida no aparelho pelo período definido em DAD-05; enquanto válida, o app abre offline sem pedir login.
- Com a sessão expirada e sem conexão, o app ainda permite **executar** o treino com os dados locais do último usuário ativo; o envio aguarda novo login do **mesmo** usuário (RN-047).
- Expiração ou revogação da sessão **não** remove dados locais (RN-052 d).

### 8.2 Saída da conta (UXP-02 aprovada — RF-101, RF-103, RN-052)

| Situação | O que é removido do aparelho | O que permanece | Fluxo |
|---|---|---|---|
| Sem pendências | Todos os dados do usuário (perfil, programa, histórico local, configurações locais, imagens próprias) | Pacote do app e imagens do catálogo (não pessoais) | UX-04 §6.1 |
| Com pendências → Enviar e sair (sucesso) | Igual ao anterior | Igual ao anterior | UX-04 §6.1 |
| Com pendências → Enviar e sair (falha parcial, recusados ou conflitos) | Nada até o usuário escolher outra opção | Tudo | Diálogo reaparece com contagem atualizada; atalho para TELA-007 |
| Com pendências → Sair e manter neste aparelho | Tudo, **exceto** as pendências (e a sessão em andamento, se houver) | Pendências isoladas, ligadas ao usuário | Enviadas no próximo login do mesmo usuário |
| Com pendências → Descartar e sair | Tudo, incluindo pendências (após confirmação digitada) | Pacote do app e imagens do catálogo | — |
| Sessão expirada/revogada pelo servidor | Nada | Tudo | Novo login |

### 8.3 Troca de usuário no mesmo aparelho

- Dados locais e fila de saída são guardados em espaços separados por usuário (RF-102).
- Um novo usuário nunca vê, nem envia, dados ou pendências mantidos por outro; a interface não revela que existem (RN-052 e).
- As pendências mantidas são enviadas automaticamente quando o usuário dono delas entrar de novo naquele aparelho.

### 8.4 Isolamento técnico (RN-053, ADR-028)

A separação **não** é apenas visual. Resumo das camadas (detalhe na ADR-028):

1. Armazenamento local separado por usuário (identificador opaco), aberto somente para o usuário autenticado.
2. Cada operação da fila carrega o dono; o aparelho só envia as do usuário da sessão atual.
3. O servidor identifica o usuário pela sessão de acesso, recusa dono divergente e isola os dados por linha no banco.
4. Nenhum dado pessoal em cache do service worker ou cache HTTP.
5. Pendências mantidas após a saída ficam criptografadas com chave derivada da senha do usuário.
6. Enquanto o usuário está conectado, os dados dependem da proteção do aparelho (risco residual documentado ao usuário).

### 8.5 Limites desta política

- Enquanto o usuário está conectado, os dados guardados no aparelho dependem da proteção do próprio aparelho (bloqueio de tela); só as pendências mantidas após a saída são criptografadas pelo app (ADR-028). Avaliação em SEG-01 (condição CP-03 da ADR-027).
- Pendências mantidas por um usuário que nunca mais entra naquele aparelho não chegam à conta — consequência informada no texto da opção (UX-04 §6.1).

## 9. Atualização de versão do app

1. Ao detectar nova versão, o service worker a baixa em segundo plano.
2. Sem sessão em andamento: `Banner` "Nova versão disponível" com **Atualizar** (recarrega) — ou aplicação automática na próxima abertura.
3. Com sessão em andamento: a atualização **só** é aplicada depois que a sessão for concluída ou descartada.
4. Mudanças no formato do banco local são migradas preservando fila de saída e sessão em andamento; falha de migração mantém a versão anterior dos dados e registra erro (SEG-04).

## 10. Testes previstos (detalhados em SEG-03)

| ID | Cenário | Plataformas |
|---|---|---|
| T-PWA-01 | Instalar e abrir pelo ícone | Android, iPhone |
| T-PWA-02 | Abrir offline após primeiro acesso | Android, iPhone (navegador e Tela de Início) |
| T-PWA-03 | Executar sessão completa em modo avião, fechar o app no meio, reabrir, concluir, reconectar → servidor sem duplicatas | Android, iPhone |
| T-PWA-04 | Cronômetro correto após 2 min com o app em segundo plano | Android, iPhone |
| T-PWA-05 | Conflito: editar a mesma sessão em dois aparelhos → ConflictCompare, nenhuma versão perdida sem confirmação | Qualquer |
| T-PWA-06 | Duplicidade: iniciar sessões em dois aparelhos offline → ambas salvas e marcadas | Qualquer |
| T-PWA-07 | Sessão de acesso expirada offline → executar → login → envio | Qualquer |
| T-PWA-08 | Atualização de versão durante sessão em andamento → aplicada só após concluir | Qualquer |
| T-PWA-09 | Troca de usuário no mesmo aparelho → nenhum dado do anterior visível ou enviado | Qualquer |
| T-PWA-10 | Pendências com mais de 24 h → aviso em Hoje | Qualquer |
| T-PWA-11 | Sair sem pendências → dados locais removidos; novo login baixa tudo de novo | Qualquer |
| T-PWA-12 | Sair com pendências online → Enviar e sair, com falha parcial simulada → diálogo reaparece com contagem correta | Qualquer |
| T-PWA-13 | Sair mantendo pendências → outro usuário entra e não vê nem envia → dono entra e pendências são enviadas | Qualquer |
| T-PWA-14 | Descartar e sair → aviso de irreversibilidade e confirmação digitada; sem confirmação nada é apagado | Qualquer |
| T-PWA-15 | Operação com dono diferente do usuário da sessão → não enviada pelo aparelho; se forçada, recusada pelo servidor | Qualquer |
| T-PWA-16 | Pendências mantidas após a saída → armazenamento contém apenas conteúdo criptografado; liberadas só com a senha do dono (incluindo senha anterior após troca) | Qualquer |
| T-PWA-17 | Respostas com dados pessoais ausentes do cache do service worker e com `no-store` | Qualquer |

## Critérios de conclusão

- [x] Manifest, ícones e instalação por plataforma especificados.
- [x] Cache, dados offline, fila de saída, classificação de resultados e prevenção de perda definidos.
- [x] Limitações de Android e iPhone documentadas com alternativa para cada recurso.
- [x] ADR-027 aprovada (com condições CP-01..05); UXP-02 aprovada e detalhada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 2). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 2); seções de saída da conta detalhadas conforme condição da UXP-02. |
| 2026-10-26 | §8.4 isolamento técnico (RN-053, ADR-028 — propostas); testes T-PWA-15..17. |
| 2026-10-26 | Detalhamento da saída da conta e isolamento confirmado pelo usuário. |
