# PRD-05 — Requisitos Funcionais

| Campo | Valor |
|---|---|
| Identificador | PRD-05 |
| Status | **Aprovado** (2026-10-26 — Etapa 1, revisão 3) |
| Dono do assunto | Requisitos funcionais (RF-###), prioridade e modalidade |
| Dependências | PRD-01..04, PRD-07, PRD-08 |
| Referenciado por | UX-05, DAD-04, TRN-*, PLN-01, PLN-03 |
| Última atualização | 2026-11-04 (versão 1.2) |

## 1. Objetivo

Listar, de forma testável e rastreável, o que o sistema deve fazer. Cada requisito tem identificador estável, prioridade, modalidade, ator e referências às regras de negócio.

## 2. Convenções

- **Prioridade** (ADR-019, proposta):
  - `ESS` — **Essencial**: compõe o Lançamento 1 (uso pessoal mínimo e completo).
  - `DES` — **Desejável**: incrementos após o Lançamento 1, na ordem de [PRD-04 §3](04-escopo-e-limites-do-mvp.md#3-desejáveis-des--incrementos-após-o-lançamento-1).
  - `FUT` — **Futuro**: fora do MVP. Requisitos TER ficam `FUT` até a liberação do GATE-TER.
- **Modalidade** ([PRD-08](08-modalidades-de-uso-e-limites-profissionais.md)): `PES` (uso pessoal; também vale na modalidade TER) ou `TER` (somente acompanhamento de terceiros; bloqueado pelo GATE-TER).
- **Ator:** `GES` (papel de gestão — papel técnico, não pressupõe habilitação profissional), `ALU` (aluno), `SIS` (sistema), `TODOS`. Na modalidade PES, o mesmo usuário exerce GES e ALU (ADR-003).
- RN-001 (isolamento do aluno) e RN-002 (exclusividade do papel de gestão) aplicam-se transversalmente a todos os requisitos e não são repetidas em cada linha.
- Faixas numéricas e prazos ficam nas regras de negócio ([PRD-07](07-regras-de-negocio.md)).
- Numeração agrupada por módulo; identificadores nunca são reutilizados. Itens fora do escopo: [PRD-04 §5](04-escopo-e-limites-do-mvp.md#5-fora-do-escopo).

## 3. Autenticação e conta (RF-001 a RF-009)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-001 | Login com e-mail e senha. | TODOS | PES | ESS | RN-031 |
| RF-002 | Logout, encerrando a sessão no dispositivo; havendo dados não sincronizados, aplica RF-101. | TODOS | PES | ESS | RN-047 |
| RF-003 | O gestor gera link de redefinição de senha de uso único e prazo limitado para um aluno. | GES | TER | FUT | RN-032 |
| RF-004 | O gestor gera link de convite para um aluno cadastrado; o aluno define a senha e ativa a conta. | GES, ALU | TER | FUT | RN-032 |
| RF-005 | Usuário com papel duplo alterna entre a área do aluno ("Meu treino") e a de gestão sem novo login. | TODOS | PES | ESS | RN-033 |
| RF-006 | O aluno terceiro registra ciência/consentimento conforme a base legal definida no GATE-TER, antes de informar dados tratados como sensíveis; registro com data e versão do documento. | ALU | TER | FUT | RN-024 |
| RF-007 | Alterar a própria senha informando a senha atual. | TODOS | PES | ESS | RN-031 |
| RF-008 | Recuperação de senha por e-mail (autoatendimento). | TODOS | PES | FUT | ADR-004, ADR-016 |
| RF-009 | Configuração inicial pessoal: no primeiro acesso, o usuário preenche seu perfil de aluno (perfil de treinamento e avaliação inicial com peso) em fluxo guiado, com aviso de que o app não substitui orientação profissional nem avaliação de saúde. Campos não obrigatórios podem ser pulados. | TODOS | PES | ESS | RN-018, RN-030 |

## 4. Perfil, avaliação e alunos (RF-010 a RF-019)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-010 | Dashboard de gestão multi-aluno: alunos ativos, sessões na semana, alunos sem presença há N dias, reavaliações vencidas, programas com revisão recomendada, rascunhos não publicados. | GES | TER | FUT | RN-016, RN-025, RN-034 |
| RF-011 | Cadastrar aluno terceiro (nome, e-mail, data de nascimento). | GES | TER | FUT | RN-010, RN-018, RN-040 |
| RF-012 | Editar dados cadastrais e de perfil de treinamento do aluno (na PES, o próprio perfil). | GES | PES | ESS | RN-018, RN-025 |
| RF-013 | Listar alunos com busca e filtro por situação. | GES | TER | FUT | — |
| RF-014 | Desativar e reativar aluno. | GES | TER | FUT | RN-019 |
| RF-015 | Visualizar perfil consolidado do aluno: dados, perfil de treinamento, programa ativo, frequência, evolução, avaliações e alertas. | GES | PES | DES | — |
| RF-016 | Registrar avaliação (inicial ou subsequente) com campos do perfil de treinamento e medições. | GES | PES | ESS | RN-014, RN-018, RN-030 |
| RF-017 | Consultar histórico de avaliações; comparar duas avaliações. | GES, ALU | PES | DES | — |
| RF-018 | Sinalizar visualmente dados desatualizados (peso, reavaliação, programa). | SIS | PES | DES | RN-016 |
| RF-019 | Definir intervalo de reavaliação por aluno. | GES | PES | FUT | RN-014 |

## 5. Programas de treino (RF-020 a RF-029)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-020 | Criar manualmente um rascunho de programa: nome, divisão, treinos (A, B, C…) e, em cada treino, exercícios do catálogo com prescrição (séries, faixa de repetições ou duração, intervalo, carga sugerida opcional, orientações). | GES | PES | ESS | RN-003, RN-005, RN-021, RN-035 |
| RF-021 | Gerar automaticamente um rascunho a partir do perfil ("Gerar treino automaticamente"); na PES, apresentado como sugestão para uso próprio. | GES | PES | DES → V1.2 | RN-006..009, RN-022, RN-023 |
| RF-022 | Antes de gerar, validar dados necessários e listar pendências com atalho para completá-las; sem dados obrigatórios, não gera. | GES | PES | DES → V1.2 | RN-006 |
| RF-023 | O rascunho gerado exibe as premissas consideradas e os exercícios excluídos por restrição ou equipamento. | GES | PES | DES → V1.2 | RN-008 |
| RF-024 | Editar rascunho: adicionar, remover, reordenar e substituir exercícios; alterar prescrição; renomear treinos. | GES | PES | ESS | RN-021, RN-035 |
| RF-025 | Publicar rascunho como versão ativa; a anterior passa a arquivada. | GES | PES | ESS | RN-003, RN-004, RN-009 |
| RF-026 | Consultar histórico de versões e visualizar versões anteriores (somente leitura). | GES | PES | DES | RN-004 |
| RF-027 | Criar novo rascunho a partir da versão ativa ou de versão anterior. | GES | PES | ESS | RN-004 |
| RF-028 | Descartar rascunho. | GES | PES | ESS | RN-005 |
| RF-029 | Copiar programa de um aluno para outro como rascunho. | GES | TER | FUT | RN-007, RN-008 |

> Versões anteriores são **preservadas** desde o Lançamento 1 (RN-004), mesmo que a tela de consulta (RF-026) chegue depois.

## 6. Catálogo de exercícios (RF-030 a RF-039)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-030 | Listar, buscar por nome e filtrar exercícios por grupo muscular, equipamento e dificuldade. | GES | PES | ESS | — |
| RF-031 | Detalhe do exercício: nome, imagens (ou placeholder), grupos musculares, equipamentos, dificuldade, instruções, dicas de segurança, alternativas e fonte/licença. | TODOS | PES | ESS | RN-036 |
| RF-032 | Cadastrar e editar exercício personalizado e corrigir nome, instruções e dicas de exercício importado (origem e correção ficam registradas). Imagem própria opcional é `DES`. | GES | PES | ESS | RN-036, RN-037 |
| RF-033 | Desativar/reativar exercício. | GES | PES | DES | RN-021 |
| RF-034 | Placeholder padronizado para exercício sem imagem. | SIS | PES | ESS | RN-036 |
| RF-035 | Associar contraindicações às categorias de restrição (uso do gerador). | GES | PES | DES | RN-008 |
| RF-036 | Registrar alternativas entre exercícios. | GES | PES | DES | — |
| RF-037 | Navegação livre do aluno terceiro por todo o catálogo (na PES o usuário já acessa pela área de gestão). | ALU | TER | FUT | — |
| RF-038 | Catálogo inicial curado disponível no Lançamento 1: ao menos 80 exercícios cobrindo todos os grupos musculares primários da taxonomia (TRN-03) e os equipamentos comuns (peso livre, máquina, cabo, peso corporal); cada exercício com nome e instruções em pt-BR revisados, grupos musculares, equipamentos, fonte registrada e imagem correspondente com licença verificada — ou placeholder quando não houver imagem adequada. | SIS | PES | ESS | RN-036, RN-037, ADR-012 |

## 7. Acompanhamento de alunos (RF-040 a RF-049)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-040 | Consultar frequência de um aluno (calendário e indicadores) pela área de gestão. | GES | TER | FUT | RN-011 |
| RF-041 | Consultar sessões de um aluno com séries, cargas e repetições pela área de gestão. | GES | TER | FUT | — |

> Na PES, frequência e sessões são consultadas pela área do aluno (RF-070..073).

## 8. Área do aluno (RF-050 a RF-059)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-050 | Dashboard do aluno: treino recomendado com o motivo (ou sessão em andamento); presenças na semana vs. meta; peso atual; aviso de reavaliação quando aplicável (a partir do incremento `DES` correspondente); pendências de sincronização; estados vazios orientativos. | ALU | PES | ESS | RN-011, RN-013, RN-049 |
| RF-051 | Determinar o treino recomendado conforme RN-013 (sequência, disponibilidade, descanso, histórico), também offline com os dados locais. O aluno pode escolher outro treino; se incompatível com o descanso, recebe aviso não bloqueante. | SIS, ALU | PES | ESS | RN-013, RN-050 |
| RF-052 | Listar os treinos do programa ativo com resumo (nome, nº de exercícios, duração estimada, grupos musculares). | ALU | PES | ESS | — |
| RF-053 | Visualizar treino: exercícios em ordem com miniatura, séries, repetições, intervalo e orientações. | ALU | PES | ESS | — |
| RF-054 | Detalhe do exercício no treino: prescrição, instruções, imagens e última carga/repetições registradas. | ALU | PES | ESS | — |
| RF-055 | Configurar o descanso entre treinos: valor padrão (horas) aplicado a todos os grupos musculares e ajuste opcional por grupo; 0 h desativa a verificação. A tela identifica o valor inicial como ponto de partida editável e informa que os valores são preferências pessoais, não recomendação médica ou esportiva. | ALU | PES | ESS | RN-050, ADR-021 |

## 9. Sessões de treino (RF-060 a RF-069)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-060 | Iniciar sessão de um treino do programa ativo (online ou offline). | ALU | PES | ESS | RN-012, RN-044 |
| RF-061 | Registrar cada série com carga (kg) e repetições, pré-preenchidas com a última execução (ou a prescrição); adicionar/remover séries. Cada série é persistida localmente antes da confirmação visual. | ALU | PES | ESS | RN-018, RN-026, RN-043 |
| RF-062 | Cronômetro de descanso iniciado ao concluir a série, com intervalo prescrito, +15 s/−15 s e pular. Calculado pelo horário de término, correto mesmo se o app for para segundo plano; alerta sonoro/visual com o app em primeiro plano e vibração onde suportada. | ALU | PES | ESS | ADR-017 |
| RF-063 | Pular exercício na sessão (registrado como não realizado). | ALU | PES | ESS | — |
| RF-064 | Substituir exercício na sessão por alternativa cadastrada (apenas nesta sessão). | ALU | PES | DES | RN-008 |
| RF-065 | Concluir sessão: registra início, término e duração; PSE (0–10) e observação opcionais; exibe resumo (volume, séries, duração). | ALU | PES | ESS | RN-011, RN-028 |
| RF-066 | Retomar sessão em andamento após fechar o app, recarregar ou perder conexão, sem perda de séries. | ALU | PES | ESS | RN-012, RN-043 |
| RF-067 | Descartar sessão em andamento (com confirmação). | ALU | PES | ESS | RN-012 |
| RF-068 | Registrar manualmente sessão já realizada (data passada, treino, horário, duração; séries opcionais). | ALU | PES | DES | RN-027 |
| RF-069 | Editar ou excluir registro de sessão própria. | ALU | PES | ESS | RN-027, RN-046 |

## 10. Agenda e histórico (RF-070 a RF-079)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-070 | Agenda mensal com navegação entre meses, destacando dias com presença. | ALU | PES | ESS | RN-011 |
| RF-071 | Diferenciar na agenda: planejado (projeção), em andamento, concluída, registrada manualmente, abandonada e pendente de sincronização. | ALU | PES | ESS | RN-011, RN-012, RN-029, RN-049 |
| RF-072 | Listar sessões de um dia e exibir detalhes (treino e versão do programa, horário, duração, exercícios, séries, cargas, reps, PSE, observação). | ALU | PES | ESS | RN-044 |
| RF-073 | Histórico por exercício: execuções com data, melhor série e volume; gráfico de carga máxima ao longo do tempo. | ALU | PES | DES | — |

## 11. Evolução física e reavaliação (RF-080 a RF-089)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-080 | Registrar peso avulso (data e valor) e excluir um registro de peso incorreto, com confirmação (UXP-01). | ALU | PES | ESS | RN-017, RN-018 |
| RF-081 | Gráfico de peso ao longo do tempo com peso inicial e linha de peso-meta. | ALU | PES | ESS | RN-017 |
| RF-082 | Metas e progresso: objetivo, peso inicial/atual/meta, % de progresso, data de início, meta semanal de presenças. | ALU | PES | DES | RN-017, RN-038 |
| RF-083 | Lembrete de reavaliação vencida dentro do aplicativo (dashboard). | SIS | PES | DES¹ | RN-014 |
| RF-084 | Fluxo de reavaliação: atualizar peso e medidas; confirmar ou alterar objetivo, disponibilidade, preferências, equipamentos e restrições; gera avaliação no histórico. | ALU | PES | DES¹ | RN-014, RN-025, RN-030 |
| RF-085 | Adiar o lembrete de reavaliação escolhendo a próxima data (sugestão: 7 dias depois). | ALU | PES | DES¹ | RN-015 |
| RF-086 | Sinalizar informações desatualizadas sem bloquear funcionalidades. | SIS | PES | DES | RN-016 |
| RF-087 | Marcar o programa ativo como "revisão recomendada" quando dados relevantes mudarem. | SIS | PES | DES | RN-025 |
| RF-088 | Registrar medidas corporais opcionais (circunferências, % de gordura informado). | ALU | PES | DES | ADR-010 |
| RF-089 | Aluno terceiro editar apenas os campos permitidos do próprio perfil. | ALU | TER | FUT | RN-039 |

¹ Primeiro incremento `DES`: deve estar disponível até 30 dias após o início do uso real do Lançamento 1 (PRD-04 §3).

## 12. PWA e resiliência (RF-090 a RF-094)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-090 | Instalável na tela inicial (Android e iPhone), com ícone, nome e tela de abertura; orientação de instalação específica por plataforma quando não houver prompt automático. | TODOS | PES | ESS | ADR-017 |
| RF-091 | Sem conexão, com o programa previamente carregado: abrir o app, ver programa e treino recomendado, iniciar, registrar séries, usar cronômetro e concluir sessão; operações em fila local sincronizada automaticamente. | ALU | PES | ESS | ADR-005, RN-042..049 |
| RF-092 | Indicar estado de conexão, disponibilidade offline do programa e estado de sincronização de cada registro em linguagem simples, distinguindo pendências normais (aguardando envio, nova tentativa automática) de situações que exigem atenção (recusado, conflito). | SIS | PES | ESS | RN-051, ADR-005, ADR-022 |
| RF-093 | Funções não suportadas offline informam claramente que exigem conexão. | SIS | PES | ESS | ADR-005 |
| RF-094 | Notificações push (lembrete de treino, reavaliação). | SIS | PES | FUT | ADR-017 |

## 13. Privacidade e dados (RF-095 a RF-099)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-095 | Exportar todos os dados de um aluno (na PES, os próprios) em JSON. | GES | PES | DES | RN-020 |
| RF-096 | Excluir definitivamente um aluno terceiro e todos os seus dados, com confirmação reforçada. | GES | TER | FUT | RN-020 |
| RF-097 | Aluno terceiro consultar o documento aceito e solicitar revogação. | ALU | TER | FUT | RN-024 |
| RF-098 | Aluno terceiro exportar os próprios dados diretamente. | ALU | TER | FUT | — |

## 14. Sincronização (RF-100 a RF-109)

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-100 | Tela de sincronização em três grupos: **Aguardando envio** (pendências normais e novas tentativas automáticas — nenhuma ação necessária; opção "enviar agora"); **Precisa da sua atenção** (recusados, com o motivo, e conflitos reais, com a versão deste aparelho e a do servidor lado a lado para escolher); **Para revisar** (possíveis duplicidades — opcional). Descartar exige confirmação mostrando o que será perdido. | ALU | PES | ESS | RN-045, RN-046, RN-051, ADR-022 |
| RF-101 | Sair da conta com registros não enviados (incluindo sessão em andamento): informar a quantidade e o conteúdo resumido e oferecer **Enviar e sair** (online), **Sair e manter neste aparelho** e **Descartar e sair** (com confirmação digitada), explicando as consequências de cada opção; falhas de envio e itens que exigem atenção são mostrados antes de sair. Nunca descarta em silêncio. | TODOS | PES | ESS | RN-047, RN-052 |
| RF-102 | Dados locais separados por usuário: no mesmo dispositivo, dados de um usuário nunca ficam visíveis nem são enviados na sessão de outro. | SIS | PES | ESS | RN-047 |
| RF-103 | Ao sair da conta, remover do aparelho os dados locais do usuário, exceto os registros não enviados que ele escolheu manter; informar o que será removido e que os dados sincronizados continuam na conta (UXP-02). | SIS | PES | ESS | RN-052 |

## 15. Resumo

| Prioridade | PES | TER | Total |
|---|---|---|---|
| ESS (Lançamento 1) | 44 | 0 | 44 |
| DES | 21 | 0 | 21 |
| FUT | 3 | 15 | 18 |
| **Total** | 68 | 15 | **83** |

> O total `ESS` inclui o RF-103 (confirmado pelo usuário em 2026-10-26).

Contagem verificada automaticamente na auditoria (GOV-02 §8). Na revisão 1 havia 70 RF obrigatórios no MVP; agora o Lançamento 1 tem 44 (revisão 3: + RF-038 e RF-055; Etapa 2: + RF-103), todos de uso pessoal, e todo requisito de terceiros está bloqueado pelo GATE-TER.

## 13. Versão 1.2 (planejada, ainda não implementada)

Prioridade `V1.2`: entra na versão 1.2 (PLN-06), só para o próprio usuário (ADR-096).

| ID | Requisito | Ator | Modal. | Prior. | Regras |
|---|---|---|---|---|---|
| RF-110 | Gerar a rotina automaticamente: o motor monta o rascunho e a IA ajusta entre exercícios elegíveis; a pessoa usa com um toque. | TODOS | PES | V1.2 | RN-009, RN-060..063 |
| RF-111 | Mostrar os motivos das escolhas da rotina em linguagem simples, com o aviso de RN-030. | TODOS | PES | V1.2 | RN-030, RN-060 |
| RF-112 | Permitir pedir ênfase em músculo ou área; o motor aumenta o volume dentro dos limites. | TODOS | PES | V1.2 | RN-064 |
| RF-113 | Modos Automático (padrão) e Manual (editor atual, opção discreta). | TODOS | PES | V1.2 | RN-009 |
| RF-114 | Aba Meu plano: rotina atual, motivos e "gerar outra". | TODOS | PES | V1.2 | RN-009 |
| RF-115 | Resumo semanal do que foi feito, do que evoluiu e do que faltou, sem inventar números. | TODOS | PES | V1.2 | RN-060, RN-062 |
| RF-116 | Propor ajuste da rotina conforme a frequência real; a proposta vira rascunho, aceito com um toque. | TODOS | PES | V1.2 | RN-009 |
| RF-117 | Incentivo e hábitos dentro do app, sem notificações. | TODOS | PES | V1.2 | RF-094 |
| RF-118 | Fotos nos exercícios do catálogo, com créditos e conferência de correspondência. | SIS | PES | V1.2 | RN-036 |

## Critérios de conclusão

- [x] Todos os itens das seções 6.1–6.11 do prompt mestre possuem RF (matriz em PRD-04 §7).
- [x] Cada RF tem prioridade, modalidade e regras associadas.
- [x] ADR-019 (recorte do Lançamento 1) aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação. |
| 2026-10-26 | Revisão 2: prioridades `ESS/DES/FUT` e coluna Modalidade; ator "profissional" passa a ser o papel de gestão (GES); novos RF-009, RF-037, RF-100..102; RF-062, RF-091, RF-092 ajustados às limitações de plataforma e ao offline; requisitos de terceiros movidos para `FUT` (GATE-TER). |
| 2026-10-26 | Revisão 3: novos RF-038 (catálogo inicial curado) e RF-055 (descanso configurável), ambos `ESS`; RF-032 permite corrigir textos importados; RF-085, RF-092 e RF-100 ajustados (adiamento por data; estados de sincronização com distinção entre pendência e conflito). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 1, revisão 3). |
| 2026-10-26 | Alterações aprovadas pelo usuário na Etapa 2: RF-080 (excluir registro de peso — UXP-01); RF-101 revisado e RF-103 criado (saída da conta e limpeza de dados locais — UXP-02). |
| 2026-10-26 | RF-101 (revisão) e RF-103 marcados como aguardando confirmação; nota sobre o total `ESS`. |
| 2026-10-26 | RF-101 (revisão) e RF-103 como `ESS` confirmados pelo usuário. |
| 2026-11-04 | Versão 1.2: RF-110..118; RF-021..023 antecipados (ADR-093, ADR-095). |
