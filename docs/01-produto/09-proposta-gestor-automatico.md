# PRD-09 — Proposta: gestor automático para outras pessoas

| Campo | Valor |
|---|---|
| Identificador | PRD-09 (PR-PROD-01 em GOV-02 §4.3) |
| Status | **Proposta — não aprovada.** Nada aqui altera requisitos, regras ou o plano até decisão do usuário |
| Etapa | 9 (mudança de escopo) |
| Dono do assunto | Ideia do gestor automático: o usuário informa seus dados e o app cria a rotina e a acompanha durante a meta, para ele e para outras pessoas |
| Dependências | PRD-08 (GATE-TER), TRN-02, RN-007..009, RN-030, RN-040, RN-041, ADR-006, ADR-016, ADR-018, FUT-01, Q-007 |
| Data | 2026-11-03 |

> **Aviso:** isto não é parecer jurídico. As citações legais são pontos de partida para a consulta a advocacia e ao sistema CONFEF/CREF (PRD-08 §5). Esta pesquisa **não encontrou** posição oficial do CONFEF sobre aplicativos que geram treino por automação ou IA.

## 1. Resumo

A ideia é boa e boa parte da técnica já está planejada. O obstáculo principal **não é técnico**: oferecer rotinas personalizadas a outras pessoas pode ser atividade reservada a profissionais registrados. Essa dúvida precisa de resposta **antes** de construir a parte para terceiros, porque ela decide o formato do produto.

**Recomendação:**

1. Concluir a publicação e começar o uso pessoal.
2. Construir o motor de regras e o acompanhamento **para uso próprio**, o que já é permitido (PRD-08 §3.1) e serve de demonstração concreta para a consulta.
3. Fazer a consulta jurídica e ao CREF com essa demonstração em mãos.
4. Seguir para terceiros no modelo que a consulta permitir, começando por **profissional responsável** (modelo B, §3).
5. Integrar IA por cima do motor (camada 3), como pedido pelo usuário em 2026-11-03: Workers AI, gratuita até a cota, começando no uso próprio e com prova de qualidade.

## 2. O que muda em relação ao aprovado

| Tema | Hoje | Com a ideia |
|---|---|---|
| Quem usa | Só o próprio usuário (PES; RN-040) | Outras pessoas (TER; bloqueado pelo GATE-TER) |
| Quem cria o treino | O usuário; gerador é `DES` (TAR-032), em fase posterior | Automático, logo após a configuração inicial |
| Publicação | Sempre explícita; nada automático publica (RN-009) | Proposta: manter, com **um toque** da própria pessoa ou do profissional |
| Natureza do resultado | "Sugestão de organização para uso próprio" (RN-030) | Rotina personalizada para terceiros: é o ponto de REG-01 |
| Parâmetros do motor | Referência geral; **exigem revisão por profissional habilitado antes de uso com terceiros** (TRN-02 §1) | Revisão passa a ser obrigatória |
| IA generativa | Futuro, sempre com revisão humana (FUT-01; TRN-02 §7) | Só como camada opcional (§5) |
| Custo | Tudo gratuito (ADR-016) | Consulta jurídica e IA generativa têm custo; mais usuários consomem cotas |

## 3. Modelos possíveis

| Modelo | Como funciona | Dependência legal | Avaliação |
|---|---|---|---|
| **A. Só uso próprio** | Motor e acompanhamento só para o próprio usuário | Já previsto na PES | **Pode começar**; não atende "outras pessoas" |
| **B. Com profissional responsável** | Profissional registrado valida os parâmetros e responde tecnicamente; publica ou supervisiona as rotinas (REG-02, GT-05) | REG-01 e REG-02 a confirmar | **Recomendado para começar com terceiros**: menor risco; a pessoa ainda só informa os dados e toca em um botão |
| **C. Modelos prontos** | Profissional elabora modelos; as regras indicam um, sem montar treino individual | Em tese menor, mas se a seleção configura prescrição é pergunta para a consulta | Alternativa, menos personalizada |
| **D. Autosserviço total** | A pessoa informa os dados, o sistema monta e acompanha, sem profissional | **Maior incerteza** (REG-01) | É a ideia original. **Não construir antes de resposta formal** |

## 4. O que precisa ser verificado

Todos os itens de PRD-08 §5 continuam valendo. Os mais decisivos para esta ideia:

| Item | Pergunta | Ponto de partida |
|---|---|---|
| REG-01 | Rotina gerada por software para terceiros é atividade reservada? Muda se for gratuita, se for "sugestão" ou se houver responsável técnico? | Lei 9.696/1998: art. 1º (atividades são prerrogativa de registrados nos CREF) e art. 3º (competência para "planejar, programar", entre outras), com alterações da Lei 14.386/2022. A lei não trata de software |
| REG-02 | Quem é o responsável técnico e como isso aparece no sistema? | GT-05 |
| REG-03 | Qual a base legal para peso, medidas, lesões e restrições de terceiros? | LGPD art. 11: consentimento específico e destacado, entre outras hipóteses |
| REG-04, REG-05 | Quem é controlador? O usuário se enquadra como agente de pequeno porte? | PRD-08 |
| REG-06 | Transferência internacional, se houver provedor de IA fora do Brasil | PRD-08 |
| REG-10 | Haverá cobrança? Aplica-se o Código de Defesa do Consumidor? Quem responde se alguém se lesionar seguindo a rotina? | Decisão do usuário e advocacia |
| REG-11 | Triagem de saúde antes de gerar: questionário ou atestado? | Passa a ser **crítica**: não há profissional olhando cada caso nos modelos C e D |
| REG-12 | As licenças do catálogo permitem o uso com terceiros? | DAD-06; contato sobre a procedência das imagens segue em aberto |
| REG-13 | Exclusão de menores (ADR-009) | Cadastro precisa garantir |

**Itens novos propostos para o GATE-TER:**

| ID | Tema | O que verificar |
|---|---|---|
| REG-14 | Decisões automatizadas | LGPD art. 20: direito de pedir revisão de decisões tomadas unicamente por tratamento automatizado. Uma rotina automática entra nisso? Como atender? |
| REG-15 | Provedor de IA (só se a camada 3 for adotada) | Papel do provedor, retenção, uso para treinamento, proibição de uso em aconselhamento médico |
| REG-16 | Regulação de IA | PL 2338/2023 ainda não é lei, segundo fontes de outubro de 2026 (secundárias; conferir a ficha da Câmara). Acompanhar |

Perguntas para levar à consulta: as de REG-01, REG-10, REG-11 e REG-14, mais uma demonstração do motor funcionando. Q-007 (verificação jurídica) deixa de ser "só se quiser" e vira condição.

## 5. Como o sistema ficaria

| Camada | Função | Custo | Limites |
|---|---|---|---|
| **1. Motor de regras** (TRN-02, TAR-032) | Monta o programa a partir de perfil, restrições, equipamentos e catálogo | Grátis; determinístico e testável | Só exercícios ativos; exclui contraindicados (RN-007, RN-008); não sugere carga |
| **2. Acompanhamento por regras** (TAR-030, TAR-033 e novo) | Frequência, progressão sugerida, proximidade da meta, reavaliação | Grátis | Sugestões, sem alterar o programa sozinho. Sugerir carga contraria TRN-02 §1 hoje e exigiria decisão própria |
| **3. IA generativa** (FUT-01; pedida pelo usuário em 2026-11-03) | Ajustar o rascunho do motor dentro dos exercícios elegíveis e explicar as escolhas em linguagem simples | Grátis até a cota diária do Workers AI (a confirmar com medição) | Regras abaixo |

**Experiência proposta:** configuração inicial → tela "Sua rotina" com justificativas e o aviso de RN-030 → um toque em "Usar esta rotina" → Hoje. A área de Gestão some para quem só usa o modo automático.

**Regras para a camada 3, se adotada:**

- Chamada só pelo servidor, com limite por usuário e chave fora do app.
- Enviar o mínimo: sem nome, e-mail ou identificador; exercícios só por identificador do catálogo.
- Toda resposta passa pelas validações do motor; o que não passar é descartado, e o app segue só com as regras.
- Nunca publica sozinha (RN-009).
- Respeitar a cota: sem IA disponível ou com a cota esgotada, o motor sozinho entrega o rascunho.

**Provedores avaliados (2026-11-03):**

| Provedor | Custo | Dados | Avaliação |
|---|---|---|---|
| **Cloudflare Workers AI** | 10.000 neurônios por dia grátis, sem plano pago. Estimativa: ~150 neurônios por geração com Llama 3.1 8B (~3 mil tokens de entrada e ~1 mil de saída), cerca de 65 gerações por dia; modelos maiores custam mais | Não usa conteúdo para treinar; não guarda entradas e saídas em chamadas comuns | **Recomendado.** Conta já existe; aceita saída em JSON, sem garantia de seguir o formato (daí a validação). A qualidade em português precisa ser testada; verificar região de processamento (REG-06) |
| Grok (xAI) | Cobrança por token; só achei créditos da beta de 2024 e créditos discricionários para startups | Termos da API não verificados (acesso negado à página) | Não é gratuito para este uso |
| Gemini, plano gratuito | Grátis | Termos: conteúdo pode melhorar produtos e ser lido por revisores; pedem para não enviar dados sensíveis ou pessoais; vedam aconselhamento médico | **Descartado** para dados de usuários |
| Gemini pago, OpenAI | Pago | Google e OpenAI dizem não usar a API paga para treinar por padrão (OpenAI retém por até 30 dias) | Alternativa se a qualidade do Workers AI não bastar; exige exceção à ADR-016 |
| Groq (empresa diferente do Grok) | Tem plano gratuito | Política de dados não verificada | Sem base para recomendar |

## 6. Mudanças técnicas para terceiros (com ou sem IA)

- **Entrada de usuários:** cadastro hoje fechado (ADR-004). Exigiria convite ou autocadastro, recuperação de senha e, portanto, envio de e-mail.
- **Modelo de dados:** cada pessoa como aluno de si mesma é tecnicamente simples no modelo D. No modelo B, ajustar papéis (GT-05) e ligar `ter_enabled`.
- **Catálogo compartilhado:** a correção de importados só é permitida com o gate fechado; rever ADR-091.
- **Privacidade:** consentimento versionado, exportação, exclusão de conta e resposta a incidentes (GT-01, GT-02, GT-04; RF-096..098).
- **Isolamento:** a auditoria da TAR-024 já cobre tabelas e operações; repetir no projeto real (GT-03).
- **Operação:** cotas gratuitas (ARQ-02 §5 dimensionou para poucos usuários), suporte e termos de uso.

## 7. Fases propostas

| Fase | Conteúdo | Condição para avançar |
|---|---|---|
| 0 | Concluir TAR-003, TAR-006, TAR-007, TAR-025 e TAR-026 | Uso pessoal real |
| 1 | Motor **só para uso próprio**, antecipando TAR-032 no PLN-01, com IA ajustando o rascunho e explicando (camada 3, Workers AI) e testes de qualidade | Revisão com o próprio perfil |
| 2 | Consulta jurídica e ao CREF, com a demonstração da fase 1 | Resposta por escrito; evidências em PRD-08 §5.3 |
| 3 | Profissional revisa os parâmetros (TRN-02 §1); nova ADR libera a TER (RN-041) | GATE-TER completo |
| 4 | Piloto com poucas pessoas, no modelo permitido | Sem incidentes; cotas conferidas |
| 5 | Acompanhamento com IA e, para terceiros, revisão da camada 3 | REG-15 |

## 8. Decisões pedidas ao usuário

1. **Aprovar a fase 1** (motor com IA do Workers AI, só para uso próprio, depois da fase 0)? Altera ADR-006, ARQ-05, FUT-01 e PLN-01; a IA continua sem publicar (RN-009).
2. **Quem fará a consulta** (advocacia e/ou CREF), e há orçamento para ela? É o primeiro custo inevitável do caminho para terceiros.
3. **Haverá cobrança** das outras pessoas? Muda REG-10 e possivelmente o plano dos provedores.
4. **Conhecer um profissional registrado** que possa atuar como responsável (modelo B) ou revisar os parâmetros?

## 9. Fontes

- [Lei 9.696/1998, com as alterações da Lei 14.386/2022](https://www.planalto.gov.br/ccivil_03/leis/l9696.htm)
- [Lei 14.386/2022](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14386.htm)
- [LGPD, Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Workers AI: preços](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workers AI: uso de dados](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
- [Workers AI: modo JSON](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [API da xAI](https://x.ai/api)
- [Termos da Gemini API](https://aistudio.google.com/docs/terms)
- [Controles de dados da API da OpenAI](https://developers.openai.com/api/docs/guides/your-data)
- [Situação do PL 2338/2023 (fonte secundária)](https://alexandrecaramaschi.com/artigos/pl-2338-nao-e-lei-conar-ja-e-mapa-regulatorio-para-quem-publica-com-ia-no-brasil-2026)

## Histórico

| Data | Alteração |
|---|---|
| 2026-11-03 | Criação como proposta, a pedido do usuário ("Quero que outras pessoas usem também"). |
| 2026-11-03 | Usuário considera o motor essencial e pede IA integrada, de preferência gratuita: camada 3 antecipada para a fase 1; provedores avaliados; descarte genérico de IA gratuita corrigido. |
