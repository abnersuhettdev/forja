# PRD-03 — Personas e Jornadas

| Campo | Valor |
|---|---|
| Identificador | PRD-03 |
| Status | **Aprovado** (2026-10-26 — Etapa 1, revisão 3) |
| Dono do assunto | Personas de referência e jornadas ponta a ponta |
| Dependências | PRD-01, PRD-02, PRD-08 |
| Referenciado por | UX-03, UX-04, UX-05, PLN-03 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Definir personas de referência e as jornadas que o produto precisa suportar. As jornadas servem de base para os fluxos de navegação (UX-04) e para os testes de aceite ponta a ponta (PLN-03). Cada jornada indica modalidade (PRD-08) e prioridade (PRD-04).

## 2. Personas

### PER-01 — Rafael, que planeja e registra os próprios treinos (usuário inicial — PES)

- Treina em academia 4x por semana; usa o celular (Android ou iPhone) na academia e o notebook em casa.
- Usa uma conta com papel duplo: planeja o próprio programa na área de gestão e executa na área do aluno (ADR-003).
- **Não** se presume habilitação profissional (ADR-018).
- **Dor:** perder o histórico de cargas, não saber quando trocar o treino, app que falha sem internet.
- **Sucesso:** após 3 meses, enxerga frequência, evolução de peso e de cargas por exercício, sem ter perdido nenhum registro.

> O nome é ilustrativo.

### PER-02 — Camila, aluna iniciante (referência para TER e para o gerador)

- 28 anos, objetivo emagrecimento e qualidade de vida, 3x/semana, 50 minutos por sessão.
- Depende de imagens e instruções para executar.
- **Dor:** insegurança sobre execução e carga.
- **Uso no projeto:** persona da modalidade TER (futura) e caso de teste de referência do gerador (perfil iniciante).

### PER-03 — Diego, aluno intermediário com limitação (referência para TER e para o gerador)

- 41 anos, objetivo hipertrofia, 4x/semana, 60 minutos, desconforto lombar declarado.
- **Dor:** treinos genéricos com exercícios que agravam a lombar.
- **Uso no projeto:** persona TER (futura) e caso de teste do gerador para exclusão por restrição (RN-008).

## 3. Jornadas

| ID | Jornada | Modal. | Prior. |
|---|---|---|---|
| JOR-08 | Primeiro acesso pessoal | PES | ESS |
| JOR-02 | Avaliação e montagem do programa | PES | ESS (manual) / DES (gerador) |
| JOR-03 | Treino na academia (fluxo principal), inclusive offline | PES | ESS |
| JOR-04 | Agenda e registro esquecido | PES | ESS (agenda) / DES (registro manual) |
| JOR-05 | Reavaliação mensal | PES | DES (D1) |
| JOR-09 | Revisão de pendências de sincronização | PES | ESS |
| JOR-01 | Convite de aluno terceiro | TER | FUT |
| JOR-06 | Acompanhamento de alunos terceiros | TER | FUT |
| JOR-07 | Desativação e saída de aluno terceiro | TER | FUT |

### JOR-08 — Primeiro acesso pessoal (PES · ESS)

1. O usuário é criado pelo procedimento de inicialização (IMP-01) com papéis de gestão e de aluno.
2. Faz login no celular; o app orienta a instalação conforme a plataforma (Android: prompt; iPhone: "Compartilhar → Adicionar à Tela de Início").
3. Fluxo guiado de configuração: dados básicos, objetivo, experiência, disponibilidade (dias e tempo), dias preferidos, equipamentos, restrições, peso inicial e peso-meta; aviso de que o app não substitui orientação profissional nem avaliação de saúde.
4. O descanso entre treinos já vem com um valor inicial editável (RF-055), sem exigir configuração antes do primeiro treino.
5. Estado vazio orienta: "Monte seu programa" → leva à área de gestão.

Requisitos: RF-001, RF-005, RF-009, RF-090. Regras: RN-010, RN-018, RN-030, RN-040.

### JOR-02 — Avaliação e montagem do programa (PES · ESS/DES)

1. Na área de gestão, o usuário revisa o próprio perfil/avaliação (RF-012, RF-016).
2. **Manual (ESS):** cria rascunho, adiciona treinos e exercícios do catálogo, define séries, repetições, intervalos; ordena os treinos (sequência planejada).
3. **Gerador (DES — D2):** toca "Gerar treino automaticamente"; o sistema valida dados e lista pendências; apresenta rascunho com premissas e exclusões como **sugestão para uso próprio**.
4. Ajusta e publica. A versão anterior é arquivada e preservada.

Requisitos: RF-012, RF-016, RF-020..028. Regras: RN-003..009, RN-035.

### JOR-03 — Treino na academia, inclusive offline (PES · ESS)

1. Abre o app instalado → dashboard mostra o treino recomendado e o motivo (ex.: "Treino B — próximo da sequência; Treino A feito há 20 h").
2. Toca **Iniciar treino** → sessão `em andamento` gravada no aparelho.
3. Para cada exercício: imagem, prescrição e última carga; ajusta carga/reps; toca **✓** — a série é gravada no aparelho antes da confirmação visual.
4. Cronômetro de descanso inicia; se o app for para segundo plano, o tempo continua correto ao voltar.
5. Sem conexão, tudo continua funcionando; o indicador mostra "salvo no aparelho".
6. **Concluir treino** → PSE e observação opcionais → resumo. A presença aparece como "pendente de sincronização" até a conexão voltar.
7. Ao reconectar (com o app aberto), a sessão é sincronizada; o indicador passa a "sincronizado".

Requisitos: RF-050..054, RF-060..067, RF-091, RF-092. Regras: RN-011..013, RN-042..044, RN-049.

### JOR-04 — Agenda e registro esquecido (PES · ESS/DES)

1. Abre a agenda mensal; vê dias com presença, planejados, pendentes de sincronização e sessões abandonadas (ESS).
2. Toca em um dia → detalhes da sessão (ESS).
3. **Registro manual (DES — D5):** em dia passado sem registro, "Registrar treino realizado" → treino, horário, duração, séries opcionais → status `registrada manualmente`, conta como presença.

Requisitos: RF-068, RF-070..072. Regras: RN-011, RN-027, RN-029.

### JOR-05 — Reavaliação mensal (PES · DES — D1)

1. Passados 30 dias da última avaliação, o dashboard exibe lembrete (não bloqueante).
2. O usuário atualiza peso (e medidas opcionais), confirma ou altera objetivo, disponibilidade, preferências, equipamentos e restrições — ou adia escolhendo a próxima data.
3. Mudança relevante marca o programa como "revisão recomendada".

Requisitos: RF-083..087. Regras: RN-014..016, RN-025.

### JOR-09 — Revisão de pendências de sincronização (PES · ESS)

1. O indicador mostra, por exemplo, "3 registros aguardando envio" (informativo — nenhuma ação necessária) ou "1 item precisa da sua atenção" (recusado ou conflito).
2. Na tela de sincronização (RF-100), vê os grupos **Aguardando envio**, **Precisa da sua atenção** e **Para revisar**. Num conflito, compara a versão deste aparelho com a do servidor e escolhe; num recusado, lê o motivo e corrige; descartar sempre exige confirmação mostrando o conteúdo.
3. Ao tentar sair da conta com pendências, recebe aviso com a quantidade e a opção de sincronizar antes.

Requisitos: RF-092, RF-100, RF-101. Regras: RN-045..047, RN-051. Decisão: ADR-022.

### JOR-01 — Convite de aluno terceiro (TER · FUT)

Gestor cadastra aluno → gera link de convite → aluno define senha → cumpre a base legal definida no GATE-TER (ex.: aceite de termo) → dashboard vazio orientativo. Requisitos: RF-004, RF-006, RF-011. Bloqueada até o GATE-TER.

### JOR-06 — Acompanhamento de alunos terceiros (TER · FUT)

Dashboard multi-aluno com alertas → abrir aluno → frequência, evolução, cargas. Requisitos: RF-010, RF-040, RF-041.

### JOR-07 — Desativação e saída de aluno terceiro (TER · FUT)

Desativar (dados preservados) ou, a pedido do titular, exportar e excluir definitivamente. Requisitos: RF-014, RF-095, RF-096.

## Critérios de conclusão

- [x] Personas e jornadas refletem a prioridade do uso pessoal.
- [x] Jornadas rastreáveis a requisitos, com modalidade e prioridade.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação. |
| 2026-10-26 | Revisão 2: PER-01 sem presunção de CREF; PER-02/03 como referência TER e do gerador; novas JOR-08 e JOR-09; JOR-03 detalhada para offline; jornadas TER marcadas como futuras. |
| 2026-10-26 | Revisão 3: JOR-09 com estados de sincronização compreensíveis; JOR-05 com adiamento por data; JOR-08 menciona descanso configurável. |
| 2026-10-26 | Aprovado pelo usuário (Etapa 1, revisão 3). |
