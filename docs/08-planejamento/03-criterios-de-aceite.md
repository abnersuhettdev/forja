# PLN-03 — Critérios de Aceite

| Campo | Valor |
|---|---|
| Identificador | PLN-03 |
| Status | **Aprovado** (2026-10-26 — Etapa 7) |
| Etapa | 7 |
| Dono do assunto | Critérios de aceite (CA-###) verificáveis, rastreados a RF, RNF, RN e jornadas |
| Dependências | PRD-04..07, UX-05, TRN-02..05, SEG-03 |
| Referenciado por | PLN-01, PLN-05 |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Convenções

- **Numeração rastreável:** `CA-0nn` verifica `RF-0nn`/`RF-1nn` (ex.: CA-061 ↔ RF-061; CA-101 ↔ RF-101); `CA-2nn` verifica `RNF-0nn`; `CA-3nn` verifica jornadas e critérios de lançamento.
- Formato: **Dado** (contexto) / **Quando** (ação) / **Então** (resultado observável).
- **Verificação:** U (unidade), I (integração/contrato), E (ponta a ponta automatizado), M (manual, inclusive aparelho real).
- Requisitos `FUT` (inclusive TER) não têm critério nesta versão.
- Os casos de referência de TRN e UX-08 (CT-*, T-PWA-*) fazem parte dos critérios indicados.

## 2. Lançamento 1 (`ESS`)

| CA | Req. | Dado / Quando / Então | Verif. |
|---|---|---|---|
| CA-001 | RF-001 | Dado usuário cadastrado / quando informa e-mail e senha corretos / então acessa a área inicial; com dados errados vê "E-mail ou senha incorretos" sem indicar qual | E |
| CA-002 | RF-002, RN-052 | Dado usuário conectado sem pendências / quando sai e confirma / então a sessão termina e os dados locais dele são removidos | E |
| CA-005 | RF-005 | Dado papel duplo / quando usa a chave de área / então alterna entre Meu treino e Gestão sem novo login | E |
| CA-007 | RF-007, RN-031 | Dado conectado / quando troca a senha informando a atual / então a nova é exigida com ≥ 10 caracteres, diferente do e-mail e fora da lista de senhas comuns; após 5 falhas de login seguidas, o app impõe espera progressiva | U, E |
| CA-009 | RF-009, RN-010 | Dado primeiro acesso / quando conclui as 7 etapas / então perfil, avaliação inicial, peso inicial e descanso padrão (48 h) existem; idade < 18 é recusada; progresso sobrevive ao fechar o app | E |
| CA-012 | RF-012, RN-025 | Dado programa publicado / quando altera objetivo, disponibilidade, equipamentos ou restrições / então o perfil é salvo e a marca de revisão recomendada é registrada | I, E |
| CA-016 | RF-016 | Dado perfil existente / quando registra avaliação com peso / então a avaliação e um registro de peso de origem "avaliação" são criados com a fotografia do perfil | I |
| CA-020 | RF-020, RN-035 | Dado sem rascunho / quando cria programa com treinos e exercícios prescritos / então o rascunho é salvo automaticamente e é invisível na área do aluno (RN-005) | E |
| CA-024 | RF-024 | Dado rascunho / quando adiciona, remove (com desfazer), reordena (arrastar e botões) e substitui exercícios / então as alterações persistem e alternativas são sugeridas | E |
| CA-025 | RF-025, RN-003, RN-004, RN-021 | Dado rascunho válido / quando publica e confirma / então vira versão ativa, a anterior é arquivada e imutável; com pendências (treino vazio, exercício desativado) a publicação é recusada com lista e atalhos | I, E |
| CA-027 | RF-027 | Dado versão ativa / quando escolhe "Editar programa" / então um rascunho idêntico é criado sem alterar a versão ativa | I |
| CA-028 | RF-028 | Dado rascunho / quando descarta e confirma / então o rascunho deixa de existir e a versão ativa permanece | I |
| CA-030 | RF-030 | Dado catálogo / quando busca "supino" e filtra por grupo e equipamento / então só aparecem exercícios ativos correspondentes | E |
| CA-031 | RF-031, RN-036 | Dado exercício / quando abre o detalhe / então vê imagens (ou placeholder), grupos, equipamentos, instruções, dicas e créditos com fonte e licença | E |
| CA-032 | RF-032, RN-037 | Dado gestão / quando cria exercício personalizado ou corrige texto de importado / então salva; o importado mantém o texto original e mostra "editado" | I, E |
| CA-034 | RF-034 | Dado exercício sem imagem comprovada / quando exibido / então aparece o placeholder padronizado "Imagem indisponível" | E |
| CA-038 | RF-038, RN-036 | Dado o seed do Lançamento 1 / quando validado / então há ≥ 80 exercícios ativos cobrindo todos os grupos primários e equipamentos de DAD-06 §4, textos revisados e toda imagem com fonte e licença | I, M |
| CA-050 | RF-050 | Dado programa publicado / quando abre Hoje / então vê, sem rolar em 360 × 640, o treino recomendado com motivo e "Iniciar treino", a semana e o peso; sem programa vê o estado vazio com "Montar programa" | E |
| CA-051 | RF-051, RN-013, RN-050 | Dados os casos CT-REC-01..07 / quando calculada a recomendação (online e offline) / então o resultado é o esperado; escolher treino incompatível mostra aviso não bloqueante | U, E |
| CA-052 | RF-052 | Dado programa ativo / quando abre Treinos / então vê cada treino com exercícios, duração estimada (TRN-04 §5) e grupos | E |
| CA-053 | RF-053 | Dado treino / quando abre o detalhe / então vê exercícios em ordem com prescrição | E |
| CA-054 | RF-054 | Dado exercício já executado / quando abre o detalhe no treino / então vê "Última vez" com data e séries | E |
| CA-055 | RF-055, RN-050 | Dado configuração de descanso / quando altera o padrão ou um grupo (inclusive 0 h) / então a recomendação passa a usar os novos valores e a tela exibe o aviso de preferência pessoal | U, E |
| CA-060 | RF-060, RN-012, RN-044 | Dado treino recomendado / quando inicia (online ou offline) / então a sessão fica em andamento, vinculada à versão; com outra sessão em andamento, o app exige concluir ou descartar | E |
| CA-061 | RF-061, RN-043 | Dado série atual pré-preenchida (CT-PRE-01) / quando toca "Concluir série" / então a confirmação aparece em ≤ 100 ms após gravar no aparelho, com "Desfazer" | U, E |
| CA-062 | RF-062 | Dado série concluída / quando o descanso inicia e o app vai para segundo plano por 2 min / então ao voltar o tempo restante está correto; ±15 s e Pular funcionam | E, M |
| CA-063 | RF-063 | Dado exercício atual / quando pula / então fica registrado como não realizado | E |
| CA-065 | RF-065 | Dado sessão / quando conclui com PSE e observação opcionais / então duração, volume e séries aparecem no resumo; presença do dia é marcada | E |
| CA-066 | RF-066 | Dado sessão com séries registradas / quando o app é fechado, recarregado ou perde conexão / então ao reabrir retoma no mesmo ponto sem perda | E |
| CA-067 | RF-067 | Dado sessão em andamento / quando descarta e confirma / então a sessão e suas séries são removidas; sem confirmação nada muda | E |
| CA-069 | RF-069, RN-027 | Dado sessão concluída há ≤ 60 dias / quando edita ou exclui / então salva; com > 60 dias as ações não estão disponíveis | I, E |
| CA-070 | RF-070, RN-011 | Dado sessões no mês / quando abre a Agenda / então dias com presença são destacados e o mês pode ser navegado | E |
| CA-071 | RF-071, RN-029, RN-049 | Dado sessões em vários estados e dias preferidos / quando vê a Agenda / então cada estado tem ícone e rótulo distintos, inclusive "planejado" e "aguardando envio" | E |
| CA-072 | RF-072 | Dado dia com sessão / quando toca no dia / então vê treino, versão, horários, duração, séries, PSE e observação | E |
| CA-080 | RF-080, UXP-01 | Dado Evolução / quando registra peso válido (30–300) ou exclui um registro manual com confirmação / então a lista e o peso atual se atualizam; peso de avaliação não pode ser excluído | I, E |
| CA-081 | RF-081, RN-017 | Dado ≥ 2 registros / quando abre Evolução / então vê o gráfico com peso inicial, meta e a alternativa em lista | E |
| CA-090 | RF-090 | Dado Android/Chrome e iPhone/Safari / quando segue TELA-002 / então o app é instalado e abre pelo ícone | M |
| CA-091 | RF-091 | Dado programa carregado / quando em modo avião executa sessão completa e reconecta / então tudo é enviado sem duplicatas (T-PWA-03) | E, M |
| CA-092 | RF-092 | Dado estados de conexão e sincronização / quando mudam / então o indicador mostra o estado correto em linguagem simples, distinguindo "aguardando envio" de "precisa da sua atenção" | E |
| CA-093 | RF-093 | Dado offline / quando tenta uma ação de gestão / então a ação está desabilitada com explicação | E |
| CA-100 | RF-100, RN-045, RN-046 | Dados recusados, conflito e duplicidade simulados / quando abre Sincronização / então aparecem nos grupos corretos; conflito mostra as duas versões; descartar exige confirmação mostrando o conteúdo | E |
| CA-101 | RF-101, RN-052 | Dado pendências / quando sai da conta / então vê as três opções com consequências; falha parcial reapresenta a contagem; "Descartar e sair" exige digitar DESCARTAR e informa irreversibilidade | E |
| CA-102 | RF-102, RN-053 | Dado usuário A com pendências mantidas / quando B entra no mesmo aparelho / então B não vê nem envia nada de A; A ao entrar envia as suas (T-PWA-13, T-PWA-15) | E |
| CA-103 | RF-103, ADR-028 | Dado "Sair e manter" / quando confirma a senha / então só as pendências ficam, criptografadas; liberadas com a senha (ou a anterior) no próximo login (T-PWA-16) | E |

## 3. Incrementos (`DES`)

| CA | Req. | Dado / Quando / Então | Verif. |
|---|---|---|---|
| CA-015 | RF-015 | Dado aluno / quando abre o perfil / então vê resumo de programa, frequência, peso e alertas | E |
| CA-017 | RF-017 | Dadas duas avaliações / quando compara / então vê as diferenças lado a lado | E |
| CA-018 | RF-018, RN-016 | Dado CT-DES-01 / quando abre Hoje ou Perfil / então vê o selo de desatualizado com explicação, sem bloqueio | U, E |
| CA-021 | RF-021 | Dados CT-GER-02..08 / quando gera / então o rascunho segue TRN-02 e o relatório; nada é publicado automaticamente | U, E |
| CA-022 | RF-022 | Dado CT-GER-01 / quando tenta gerar / então vê as pendências com atalhos e nenhum rascunho é criado | U, E |
| CA-023 | RF-023 | Dado rascunho gerado / quando o abre / então vê premissas, exclusões com motivo e vagas não preenchidas | E |
| CA-026 | RF-026 | Dadas versões arquivadas / quando abre o histórico / então visualiza cada uma em modo leitura | E |
| CA-033 | RF-033, RN-021 | Dado exercício em uso / quando desativa / então some do seletor, permanece no histórico e bloqueia a publicação de rascunhos que o contenham | I, E |
| CA-035 | RF-035, RN-008 | Dada contraindicação cadastrada / quando o gerador roda para aluno com a restrição / então o exercício é excluído e listado | U |
| CA-036 | RF-036 | Dada alternativa cadastrada / quando abre o exercício / então a alternativa aparece | E |
| CA-064 | RF-064 | Dada alternativa elegível / quando substitui na sessão / então só a sessão muda | E |
| CA-068 | RF-068, RN-027 | Dado dia passado ≤ 60 dias / quando registra treino realizado / então a sessão "registrada manualmente" conta como presença; fora da janela é recusada | I, E |
| CA-073 | RF-073 | Dado exercício com histórico / quando abre o histórico / então vê carga máxima por sessão e melhor série (TRN-04 §5) | U, E |
| CA-082 | RF-082, RN-017 | Dados CT-EVO-01..03 / quando abre Metas / então o progresso exibido é o esperado | U, E |
| CA-083 | RF-083, RN-014 | Dado CT-REA-01 / quando abre Hoje / então vê o lembrete | U, E |
| CA-084 | RF-084 | Dado lembrete / quando faz a reavaliação / então nova avaliação é registrada e o prazo reinicia | E |
| CA-085 | RF-085, RN-015 | Dados CT-REA-02, CT-REA-03 / quando adia / então o lembrete reaparece na data escolhida, sem limite | U, E |
| CA-086 | RF-086 | Dado dado desatualizado / quando usa o app / então nenhuma função é bloqueada | E |
| CA-087 | RF-087, RN-025 | Dada marca de revisão / quando abre Programa / então vê banner com motivo e pode dispensar | E |
| CA-088 | RF-088 | Dado registro de medidas / quando salva valores nas faixas / então aparecem no histórico | E |
| CA-095 | RF-095 | Dado aluno / quando exporta / então recebe um JSON com todos os seus dados, sem dados de outros | I, E |

## 3A. Versão 1.2 (planejada, ainda não implementada)

| ID | Origem | Critério | Prior. |
|---|---|---|---|
| CA-401 | RF-110 | Dado o perfil completo / quando pede a rotina / então recebe rascunho válido, com aviso, e nada é publicado sem o toque | E |
| CA-402 | RN-060 | Dada resposta da IA com exercício inexistente, inelegível ou restrito / então ela é descartada e vale o rascunho do motor | E |
| CA-403 | RN-062 | Dada IA indisponível ou sem cota / então a rotina vem só das regras, com aviso simples | E |
| CA-404 | RN-061 | Os dados enviados à IA não contêm nome, e-mail nem identificador, verificado por teste | E |
| CA-405 | RF-112, RN-064 | Dada ênfase pedida / então o volume aumenta dentro dos limites, sem desrespeitar restrições | E |
| CA-406 | RF-113, RF-114 | Modo Automático sem Gestão à vista; modo Manual com o editor atual | E |
| CA-407 | RF-115, RF-116 | Resumo sem números que não estejam nos fatos calculados; ajuste só vira rascunho | E |
| CA-408 | RF-118, RN-036 | Fotos com créditos e conferidas nos exercícios; sem foto adequada, placeholder | E |
| CA-409 | UX-02 | Login na direção Anilha, com acessibilidade e orçamento de JS verdes | E |
| CA-410 | RF-119, RN-008 | Dado um treino no rascunho / quando pede outro / então cada exercício é trocado por outro elegível do mesmo padrão e com grupo primário em comum, os demais treinos não mudam, o motivo aparece e é possível desfazer | U, E |

## 4. Requisitos não funcionais

| CA | Req. | Critério | Verif. |
|---|---|---|---|
| CA-201 | RNF-001 | Telas `ESS` sem rolagem horizontal em 360, 390, 768 e 1280 px | E |
| CA-202 | RNF-002 | Texto ≥ 16 px; números da execução ≥ 32 px; alvos ≥ 48 px na execução e ≥ 44 px no restante | E, M |
| CA-203 | RNF-003 | axe sem violações críticas/sérias; leitores de tela nas telas de UX-07 §5 | E, M |
| CA-204 | RNF-004 | Datas, números e unidades no formato pt-BR | E |
| CA-205 | RNF-005 | Toda tela `ESS` com estados carregando, vazio, erro e sucesso | E |
| CA-206 | RNF-006 | LCP ≤ 2,5 s (Lighthouse móvel); abertura instalada ≤ 1,5 s | M |
| CA-207 | RNF-007 | Confirmação de série ≤ 100 ms com rede desligada ou lenta | E |
| CA-208 | RNF-008 | Leituras p95 ≤ 500 ms com dados sintéticos de 2 anos | I |
| CA-209 | RNF-009 | Verificação de disponibilidade ativa e alertando | M |
| CA-210 | RNF-010 | Cenários T-PWA-03, 05, 06, 07, 08, 12, 14 sem perda de dados | E, M |
| CA-211 | RNF-011 | Backup diário, retenção ≥ 30 dias e restauração registrada (IMP-03 §4) | M |
| CA-212 | RNF-012 | HTTPS em todo o tráfego; HSTS presente | E |
| CA-213 | RNF-013 | Senhas apenas no serviço de autenticação; nenhuma em logs | M |
| CA-214 | RNF-014 | Teste de acesso cruzado em 100% das tabelas e operações; escrita direta recusada; operações TER recusadas | I |
| CA-215 | RNF-015 | Inventário, retenção e "Sobre e privacidade" conforme SEG-02 | M |
| CA-216 | RNF-016 | Cabeçalhos de SEG-01 §5 presentes; auditoria de dependências sem vulnerabilidade alta | E |
| CA-217 | RNF-017 | Nenhum dado pessoal em URLs, logs ou cache do service worker (T-PWA-17) | E, M |
| CA-218 | RNF-018 | Matriz de UX-07 §4 verificada | M |
| CA-219 | RNF-019 | Critérios de instalabilidade atendidos | E |
| CA-220 | RNF-020 | TypeScript estrito e lint sem erros no CI | I |
| CA-221 | RNF-021 | Coberturas de SEG-03 §3 atingidas | I |
| CA-222 | RNF-022 | Migrações aplicam do zero e em produção pelo CI | I |
| CA-223 | RNF-023 | Nenhum serviço pago ativo; uso dentro das cotas gratuitas | M |
| CA-224 | RNF-024 | Modelo com vínculo aluno → gestor e GATE-TER no banco | I |
| CA-225 | RNF-025 | Relatos e logs sem dados pessoais | M |
| CA-226 | RNF-026 | Todo PR cita TAR e requisitos | M |
| CA-227 | RNF-027 | Inventário de licenças completo e créditos visíveis | M |
| CA-228 | RNF-028 | VP-01..VP-11 registrados; nenhuma função essencial dependente de recurso de uma só plataforma | M |

## 5. Jornadas e lançamento

| CA | Origem | Critério | Verif. |
|---|---|---|---|
| CA-300 | PRD-04 §6.1 | Todos os CA de §2 e §4 aprovados; restauração testada; uso real por 2 semanas consecutivas sem perda de dados, com ao menos uma sessão totalmente offline | M |
| CA-301 | JOR-08 | Primeiro acesso completo até Hoje | E |
| CA-302 | JOR-02 (manual) | Montar e publicar programa e vê-lo em Treinos | E |
| CA-303 | JOR-03 | Treino completo online e offline | E, M |
| CA-304 | JOR-04 (agenda) | Agenda e detalhe da sessão | E |
| CA-305 | JOR-09 | Pendências, conflito e saída com pendências | E |
| CA-306 | JOR-05 (D1) | Reavaliação e adiamento | E |

## Critérios de conclusão

- [x] Todo RF `ESS` e `DES` e todo RNF têm critério verificável.
- [x] Jornadas e critério de lançamento definidos.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 7). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 7). |
| 2026-11-04 | Versão 1.2: CA-401..409. |
