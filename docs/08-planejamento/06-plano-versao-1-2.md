# PLN-06 — Plano da versão 1.2

| Campo | Valor |
|---|---|
| Identificador | PLN-06 (PR-PROD-02 em GOV-02 §4.3) |
| Status | **Proposta — não aprovada.** Nada aqui altera requisitos, regras ou o plano até decisão do usuário |
| Etapa | 9 |
| Dono do assunto | Escopo, ordem e riscos da versão 1.2: design, imagens, geração e acompanhamento por IA, separação entre "Meu treino" e Gestão, vários alunos |
| Dependências | PRD-08 (GATE-TER), PRD-09, TRN-02, DAD-06, ADR-006, ADR-016, ADR-018, ADR-052, RN-007..009, RN-036, RN-040, SEG-04 §2 |
| Data | 2026-11-04 |

## 1. Objetivo e ponto de partida

Tornar o app mais automático e mais bonito: a pessoa informa seus dados, a IA monta a rotina e a acompanha durante a meta.

**Numeração:** "1.0" é o Lançamento 1 de PLN-02. A 1.2 reúne os incrementos D1 e D2 e itens novos.

**Antes da 1.2:** a produção ainda não foi publicada (em 2026-11-04, app e função de produção respondem 404). Faltam a publicação, TAR-025 (aparelhos) e TAR-026 (uso real). O uso real é o que vai mostrar o que melhorar, então recomenda-se não adiar.

## 2. Um gestor pode criar um treino para vários alunos?

**Hoje não, e o comportamento observado no teste é o esperado.** Três coisas impedem:

| Barreira | Onde | O que faz |
|---|---|---|
| Regra de negócio | RN-040 | Com o GATE-TER fechado, cada gestor tem um único aluno: ele mesmo |
| Servidor | `ter_enabled = false` (TG-04) | Recusa cadastrar outros alunos, mesmo que a interface tente |
| Modelo do programa | `programs.student_id` | Cada programa pertence a um aluno; não existe "modelo" reutilizável. RF-011 e RF-029 estão como `FUT` |

Tecnicamente é viável: a arquitetura foi feita para vários alunos (ADR-002). O bloqueio é **legal, de propósito** (ADR-018; PRD-09 §4). Ele só cai com o GATE-TER completo e nova ADR (RN-041).

**Proposta:** na 1.2, criar "modelo de programa" e "aplicar a um aluno" já pensando em vários alunos, testado com alunos fictícios no ambiente de desenvolvimento, mas **desligado em produção** até a consulta jurídica. Cada aluno recebe sua própria cópia em rascunho, com restrições reavaliadas (RN-008): nunca o mesmo treino compartilhado.

## 3. Escopo proposto

### 3.1 Design (TAR-V12-01, V12-02)

Observado na tela de login: nome em texto, dois campos e um botão no terço superior; o resto da tela fica vazio; não há logotipo, imagem nem frase sobre o produto. Funciona e passa em acessibilidade, mas não dá identidade.

- **Direção:** manter "Grafite e lima" (UX-02), evoluindo a execução. Mudar a identidade exigiria nova decisão.
- **Login:** logotipo com o "F", frase curta do que o app faz, composição que ocupe a tela, e no computador um painel lateral com a marca. O texto "Esqueceu a senha?" fala em "responsável pela instalação" e precisa ser reescrito.
- **Telas principais:** Hoje, Treino, Execução, Evolução, com mais hierarquia, cartões e estados vazios com ilustração.
- **Forma de trabalho:** duas ou três direções visuais do login para escolher **antes** de programar. Depois, aplicar às demais telas.
- **Limites:** contraste, alvos e testes de acessibilidade continuam valendo (CA-201..203). O JS inicial tem só ~5 KB de folga no orçamento, então nada de biblioteca nova de componentes no carregamento inicial; arte em SVG e CSS.

### 3.2 Imagens dos exercícios (TAR-V12-03)

Hoje **nenhum** dos 110 exercícios tem imagem: todos usam o placeholder, porque a ADR-052 exige procedência comprovada (RN-036), e a origem das imagens do free-exercise-db não foi comprovada.

| Opção | Custo | Qualidade e risco | Avaliação |
|---|---|---|---|
| **A. Mapa muscular próprio em SVG** | Grátis | Mostra os músculos trabalhados, em todos os exercícios; não mostra o movimento | **Recomendada como base**: sem risco de licença |
| **B. Ilustrações geradas por IA** (Workers AI: Flux) | Grátis até a cota; estimativa de ~40 neurônios por imagem | Pode desenhar o movimento errado, o que é perigoso aqui. Exige revisão de cada imagem e confirmar termos | **Testar em 10 exercícios** antes de decidir |
| C. wger e Wikimedia Commons | Grátis | Licença por arquivo, atribuição, possível compartilhamento pela mesma licença (CC BY-SA); estilos diferentes | Complemento, item a item |
| D. Free-exercise-db | Grátis | Depende de comprovar a origem; contato ainda em aberto | Só com comprovação (ADR-052) |
| E. Conjunto comercial licenciado | Pago | Estilo uniforme e licença clara | Exige exceção à ADR-016 |

**Proposta:** A em todos os exercícios, mais B ou C nos ~40 mais usados, revisadas pelo usuário. Uso gerado por IA exige ajuste na ADR-052 e no RN-036, que falam em procedência e licença. Técnica: arquivos WebP pequenos, fora do pré-carregamento do service worker, em cache sob demanda (UX-08 §6.1).

### 3.3 "Meu treino", Gestão e modos (TAR-V12-04)

Hoje a pessoa alterna entre duas áreas, e a Gestão expõe o editor completo, o que confunde quem só quer treinar.

| Modo | Para quem | Como funciona |
|---|---|---|
| **Automático (padrão)** | Quem só quer treinar | Configuração inicial → rotina proposta → "Usar esta rotina". Sem área de Gestão visível; aba **Meu plano** com rotina, motivos e "gerar outra" |
| **Manual** | Quem quer controlar | Editor atual, em Gestão. A IA vira assistente, propondo ajustes |
| **Profissional** (futuro, GATE-TER) | Gestor com alunos | Lista de alunos, modelos, frequência (RF-010, RF-011, RF-029, RF-040) |

Muda UX-03 e UX-05, e RF-005 (alternância de área).

### 3.4 Geração de treinos por IA (TAR-V12-05..08)

**Pré-requisitos já planejados:** TAR-031 (contraindicações no catálogo) e TAR-032 (motor de regras, TRN-02). Sem contraindicações, nem as regras nem a IA conseguem excluir com segurança um exercício por lesão.

```mermaid
flowchart LR
    A[App: pedir rotina] --> B[Função no servidor: confere o usuário e a cota]
    B --> C[Motor de regras: elegíveis e rascunho]
    C --> D[Workers AI: ajustar e explicar, sem dados de identificação]
    D --> E[Validação: mesmas regras do motor]
    E -->|válido| F[Rascunho com motivos]
    E -->|inválido, sem IA ou sem cota| G[Rascunho só do motor]
    F --> H[Pessoa toca em Usar esta rotina]
    G --> H
```

**Regras:**

- A IA escolhe só entre exercícios elegíveis, por identificador; nunca publica (RN-009).
- Vai o mínimo: objetivo, experiência, dias, tempo, equipamentos, categorias de restrição, faixa de idade. Sem nome, e-mail, identificador, peso exato nem texto livre.
- Saída em JSON é sempre validada, porque o modelo não garante o formato.
- Chave só nos segredos da função; limite por usuário e controle da cota diária.
- O aviso de RN-030 aparece junto da rotina.

**Modelo (estimativa para ~6 mil tokens de entrada e ~1,5 mil de saída; a cota é de 10.000 neurônios por dia):**

| Modelo | Neurônios por geração | Gerações por dia |
|---|---|---|
| `gemma-4-26b-a4b-it` | ~96 | ~100 |
| `qwen3-30b-a3b-fp8` | ~74 | ~135 |
| `gpt-oss-20b` | ~150 | ~65 |
| `llama-3.3-70b-instruct-fp8-fast` | ~467 | ~20 |

Os valores são contas sobre a tabela de preços; precisam de medição. A escolha sai da **prova de qualidade** (V12-05): 20 perfis fictícios, avaliando em português, formato, respeito às restrições, equilíbrio do treino e custo. Se nenhum modelo gratuito passar, o usuário decide entre pagar ou manter só as regras.

**Limitações conhecidas do Workers AI:** a página de limites não informa onde o processamento ocorre (REG-06), e a documentação de uso de dados não fala em revisão humana. Confirmar antes de usar com terceiros.

### 3.5 Acompanhamento por IA (TAR-V12-09)

- **As regras calculam os fatos:** frequência, séries, progressão, tempo até a meta, peso, reavaliação (TAR-030, TAR-033).
- **A IA escreve o resumo** semanal e sugere ajustes, em linguagem simples, sem inventar números. Gerado ao abrir o app, no máximo uma vez por semana; sem conexão, mostra só os fatos.
- **Mudanças no programa são só propostas:** viram novo rascunho, aceito com um toque (RN-009).
- **A definir:** sugerir carga. Hoje o motor não sugere (TRN-02 §1; RN-026). Proposta: só com base no histórico da própria pessoa e por regra de progressão, sem a IA definir números.
- **Limite:** não é orientação médica. Dor ou condição de saúde leva ao texto de procurar um profissional (RN-030).

### 3.6 Robustez (TAR-V12-10)

Desenvolvimento automático com produção em um clique (já combinado), testes da IA com casos fixos, alerta de cota, registro sem dados pessoais (SEG-04), e o motor funcionando sozinho quando a IA falhar. Também reduzir a verificação de hora em hora, para caber nos minutos gratuitos do GitHub (VH-09).

## 4. Tarefas e ordem

| Tarefa | Conteúdo | Depende de | Tamanho |
|---|---|---|---|
| — | Publicar 1.0, TAR-025, TAR-026 | — | Em andamento |
| V12-01 | Direções visuais do login; escolha do usuário | — | Pequeno |
| V12-02 | Novo login; design das telas principais | V12-01 | Grande |
| V12-03 | Mapa muscular; teste de ilustrações; imagens dos ~40 principais | Decisão da ADR-052 | Médio |
| V12-04 | Modos Automático e Manual; aba Meu plano | V12-08 | Médio |
| V12-05 | Prova de qualidade da IA | Token da Cloudflare | Pequeno |
| V12-06 | TAR-031: contraindicações | — | Médio |
| V12-07 | TAR-032: motor de regras | V12-06 | Grande |
| V12-08 | IA sobre o motor: função, validação, cota, tela de geração | V12-05, V12-07 | Grande |
| V12-09 | Reavaliação (TAR-030) e acompanhamento por IA | V12-08 | Grande |
| V12-10 | Robustez e automação | — | Pequeno |
| V12-11 | Modelos de programa e aplicação a alunos, desligado em produção | V12-07 | Médio |

**Em paralelo:** V12-01/02 e V12-05..08 não dependem um do outro. A sequência sugerida entrega valor visível cedo (login) enquanto o motor é construído.

**Fora da 1.2:** abrir para outras pessoas em produção (depende da consulta jurídica); conversa livre com a IA; pagamentos; aplicativo nativo.

## 5. Riscos

| Risco | Consequência | Medida |
|---|---|---|
| Rotina errada para alguém com lesão | Dano físico | Motor e validação decidem; IA nunca passa por cima; aviso; revisão de um profissional antes de terceiros |
| Qualidade do modelo gratuito em português | Texto ruim ou treino fraco | Prova de qualidade antes de construir; só as regras como alternativa |
| Cota gratuita ou mudança de preços | IA para de responder | Motor sozinho; limite por usuário; custo a cada geração registrado |
| Imagem gerada mostra o movimento errado | Execução incorreta | Revisão item a item; mapa muscular como base |
| Questão legal com terceiros | Impede a abertura | Desligado em produção; consulta antes (PRD-09) |
| Escopo grande | Atraso | Entrega em partes; cada tarefa é aproveitável sozinha |

## 6. Mudanças em documentos, se aprovado

ADR-006 e FUT-01 (IA deixa de ser futuro), ARQ-05 (nova integração), ADR-052 e RN-036 (imagens), TRN-02 (IA e carga), UX-03, UX-04, UX-05 e UX-02 (modos e design), RF-005, RF-021, RF-034, PLN-01 e PLN-02, SEG-02 e SEG-04 (dados enviados à IA), ADR-016 (se houver custo).

## 7. Decisões pedidas ao usuário

1. **Aprovar o escopo** (§3) e o que fica de fora, em especial terceiros **desligado em produção**.
2. **Ordem:** publicar a 1.0 e começar a usar antes da 1.2 (recomendado)?
3. **Imagens:** mapa muscular mais ~40 imagens revisadas, começando pelo teste de ilustrações por IA?
4. **Carga sugerida:** aceitar a proposta de §3.5?
5. **Limite de custo:** se a IA gratuita não passar na prova de qualidade, pagar até quanto por mês, ou ficar só com as regras?

## 8. Fontes

- [Workers AI: preços](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workers AI: limites](https://developers.cloudflare.com/workers-ai/platform/limits/)
- [Workers AI: uso de dados](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
- [Workers AI: modo JSON](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [wger: documentação](https://wger.readthedocs.io/)

## Histórico

| Data | Alteração |
|---|---|
| 2026-11-04 | Criação como proposta, a pedido do usuário. |
