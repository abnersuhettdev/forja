# PRD-08 — Modalidades de Uso e Limites de Atuação Profissional

| Campo | Valor |
|---|---|
| Identificador | PRD-08 |
| Status | **Aprovado** (2026-10-26 — Etapa 1, revisão 3) |
| Dono do assunto | Separação entre uso pessoal e acompanhamento de terceiros; gate regulatório (GATE-TER); classificação preliminar de dados |
| Dependências | PRD-01, PRD-04, PRD-05, ADR-003, ADR-018 |
| Referenciado por | PRD-04, PRD-05, PRD-07, SEG-02, PLN-04, PLN-05 |
| Última atualização | 2026-11-04 (versão 1.2) |

> **Justificativa da inclusão deste documento** (alteração da estrutura documental do prompt mestre): o usuário pediu que funcionalidades de uso pessoal e de acompanhamento de terceiros fossem documentadas **separadamente**, junto com os requisitos legais a verificar. O assunto atravessa escopo, requisitos, dados e segurança; um documento próprio evita espalhar a regra e serve de fonte única para o gate. Registrado em ADR-018 e GOV-04.

> **Aviso:** as referências legais deste documento são **indicativas**, para orientar a verificação. Nada aqui constitui parecer jurídico. Cada item deve ser confirmado por profissional habilitado (advocacia) e, quando aplicável, junto ao conselho profissional competente, antes de liberar a modalidade TER.

## 1. Objetivo

Definir duas modalidades de uso, quais funcionalidades pertencem a cada uma, as condições para liberar a modalidade de terceiros e a classificação preliminar dos dados tratados.

## 2. Premissas

1. **Não se presume** que o usuário possua registro profissional de Educação Física (CREF).
2. O objetivo imediato é registrar e acompanhar os **próprios** treinos.
3. O papel "profissional" no sistema é um **papel técnico de gestão** (criar programas, gerenciar catálogo) e **não** declara ou pressupõe habilitação profissional (ADR-003).
4. **Consentimento para tratamento de dados não substitui** eventual habilitação profissional exigida para prescrever ou acompanhar treinos de terceiros (RN-041).

## 3. Modalidades

### 3.1 PES — Uso pessoal (liberada)

O usuário planeja, executa, registra e acompanha **os próprios** treinos. Um único aluno existe no sistema: o próprio usuário, com papel duplo.

- Programas são criados pelo usuário para si mesmo.
- O gerador automático (quando disponível, `DES`) produz uma **sugestão de organização de treino para uso próprio**, com aviso de que não substitui orientação de profissional habilitado nem avaliação de saúde (RN-030).
- Dados de saúde (restrições, medidas, peso) são do próprio usuário.

### 3.2 TER — Acompanhamento de terceiros (bloqueada pelo GATE-TER)

O usuário cadastra outras pessoas como alunos, cria/gera e publica programas para elas, coleta seus dados (incluindo de saúde) e acompanha frequência e evolução.

- A arquitetura suporta esta modalidade desde o início (ADR-002).
- Enquanto o GATE-TER não for liberado, as funcionalidades TER ficam **desabilitadas no servidor** (não apenas ocultas na interface) e o sistema aceita somente um aluno: o próprio usuário (RN-040).

## 4. Funcionalidades por modalidade

Fonte detalhada: coluna "Modal." de [PRD-05](05-requisitos-funcionais.md).

| Área | PES (Uso pessoal) | TER (somente terceiros) |
|---|---|---|
| Conta | Login, logout, troca de senha, alternância de área, configuração inicial pessoal (RF-001, 002, 005, 007, 009) | Convite de aluno, link de redefinição gerado pelo profissional, aceite de consentimento pelo aluno (RF-003, 004, 006) |
| Perfil e avaliação | Próprio perfil, avaliações, medições, reavaliação (RF-012, 015..018, 080..088); intervalo configurável é futuro (RF-019) | Cadastro, listagem, desativação de alunos, edição restrita pelo aluno (RF-011, 013, 014, 089) |
| Programas | Criar, gerar (sugestão), revisar, publicar, versionar o próprio programa (RF-020..028) | Copiar programa entre alunos (RF-029) |
| Catálogo | Todo o catálogo pela área de gestão, com conteúdo inicial curado (RF-030..036, RF-038) | Navegação livre do aluno terceiro pelo catálogo (RF-037) |
| Execução e histórico | Todo o fluxo de sessão, agenda, histórico, offline e dados locais (RF-050..073, 090..093, 100..103) | — |
| Acompanhamento | — | Dashboard multi-aluno, frequência de alunos (RF-010, 040, 041) |
| Privacidade | Exportar os próprios dados (RF-095) | Exclusão de aluno, revogação de consentimento, exportação pelo aluno (RF-096..098) |

## 5. GATE-TER — Condições para liberar a modalidade de terceiros

A modalidade TER só pode ser liberada quando **todos** os itens abaixo estiverem concluídos, com evidência registrada, e uma nova ADR de liberação for aprovada pelo usuário.

### 5.1 Itens regulatórios e legais a verificar

| ID | Tema | O que verificar | Quem verifica |
|---|---|---|---|
| REG-01 | Regulamentação da profissão de Educação Física | Se e em que condições a prescrição, orientação ou acompanhamento de treinos de terceiros por meio do aplicativo exige registro profissional (referências a confirmar: Lei nº 9.696/1998 e normas do sistema CONFEF/CREF); se sugestões geradas automaticamente entregues a terceiros caracterizam prescrição; exigência de responsável técnico. | Advocacia e/ou consulta ao CREF regional |
| REG-02 | Modelo de atuação | Se o usuário atuará com profissional habilitado responsável pelas prescrições a terceiros, e como isso se reflete em papéis do sistema (ex.: somente profissional habilitado publica para terceiros). | Usuário + advocacia |
| REG-03 | Bases legais para dados pessoais e sensíveis | Qual base legal da LGPD se aplica a cada finalidade, especialmente para dados referentes à saúde (referência a confirmar: art. 11); se consentimento é a base adequada e, sendo, os requisitos de forma (específico, destacado, por finalidade). | Advocacia |
| REG-04 | Papéis de tratamento | Quem é controlador e quem é operador (usuário, provedores de hospedagem); obrigações decorrentes. | Advocacia |
| REG-05 | Agente de tratamento de pequeno porte | Se o usuário se enquadra nas regras simplificadas para pequenos agentes (referência a confirmar: Resolução CD/ANPD nº 2/2022), incluindo dispensa ou não de encarregado (DPO) e registro de operações. | Advocacia |
| REG-06 | Transferência internacional de dados | Se a hospedagem fora do Brasil (comum em camadas gratuitas — ADR-016) configura transferência internacional e quais mecanismos são exigidos (referência a confirmar: regulamentação da ANPD sobre transferência internacional). | Advocacia + Etapa 3 |
| REG-07 | Incidentes de segurança | Obrigação e prazo de comunicação de incidentes à ANPD e aos titulares; procedimento interno. | Advocacia + SEG-01 |
| REG-08 | Direitos dos titulares | Prazos e formas de atendimento (acesso, correção, portabilidade, eliminação, revogação). | Advocacia + SEG-02 |
| REG-09 | Guarda de registros de acesso | Se o aplicativo se enquadra como provedor de aplicações sujeito à guarda de registros de acesso (referência a confirmar: Marco Civil da Internet, Lei nº 12.965/2014). | Advocacia |
| REG-10 | Relação de consumo | Se houver remuneração (direta ou indireta), aplicabilidade do Código de Defesa do Consumidor, termos de uso e responsabilidade. | Advocacia |
| REG-11 | Triagem de saúde | Se é exigido ou recomendável questionário de prontidão para atividade física ou atestado antes de prescrever a terceiros (pode haver normas estaduais/municipais a confirmar). | Advocacia + profissional habilitado |
| REG-12 | Licenças de conteúdo | Se as licenças das imagens/dados do catálogo permitem o uso pretendido com terceiros (inclusive eventual uso comercial). | Etapa 4 (DAD-06) |
| REG-13 | Menores de idade | Confirmar a exclusão de menores (ADR-009) e as regras aplicáveis caso isso mude. | Advocacia |

### 5.2 Itens de produto e técnicos

| ID | Item |
|---|---|
| GT-01 | Termo de uso e aviso de privacidade redigidos/revisados conforme REG-03..REG-10. |
| GT-02 | Fluxo de consentimento (se essa for a base legal) implementado com registro de versão, data e finalidade. |
| GT-03 | Testes de isolamento entre alunos passando em 100% dos endpoints (RNF-014). |
| GT-04 | Procedimentos de exportação, eliminação e incidente testados (SEG-02, IMP-04). |
| GT-05 | Papéis do sistema ajustados conforme REG-02 (ex.: exigir indicação de profissional responsável). |
| GT-06 | Revisão das ADRs e requisitos marcados TER. |

### 5.2A Itens acrescentados com a versão 1.2

**Versão 1.2 (planejada, ainda não implementada — [PLN-06](../08-planejamento/06-plano-versao-1-2.md)):** a 1.2 fica na PES (ADR-096). Antes de abrir para terceiros, além dos itens acima:

| ID | Tema | O que verificar | Quem verifica |
|---|---|---|---|
| REG-14 | Decisões automatizadas | LGPD art. 20: revisão de decisões tomadas unicamente por tratamento automatizado. Uma rotina automática entra nisso? | Advocacia |
| REG-15 | Provedor de IA | Papel do provedor, retenção, região de processamento e quais dados podem ir, incluindo observações (ADR-093) | Advocacia |
| REG-16 | Regulação de IA | PL 2338/2023, que ainda não é lei segundo fontes de outubro de 2026 | Advocacia |
| REG-12 (acréscimo) | Fotos do catálogo | Reavaliar o risco das fotos sem origem comprovada (ADR-094) | Advocacia |

### 5.3 Registro

O resultado de cada item é registrado em uma seção "Evidências do GATE-TER" a ser criada neste documento quando a verificação começar. Até lá, o gate está **fechado**.

## 6. Classificação preliminar dos dados

Classificação **preliminar**, adotada por cautela; a classificação final depende de REG-03 e será consolidada em SEG-02 (Etapa 6).

| Categoria | Exemplos | Classificação preliminar | Tratamento no projeto |
|---|---|---|---|
| Identificação e contato | Nome, e-mail | Dado pessoal comum | Coleta mínima; nunca em URLs ou logs |
| Credenciais | Hash de senha, tokens de sessão | Dado de segurança | Hash adaptativo; nunca exibidos/logados |
| Dados demográficos | Data de nascimento, sexo (opcional) | Dado pessoal comum (sexo opcional, com "prefiro não informar") | Coleta mínima |
| Preferências e disponibilidade | Objetivo, experiência, dias, tempo, equipamentos, preferências | Dado pessoal comum | Proteção padrão |
| Restrições e limitações físicas, condições de saúde declaradas | Lesões, dores, limitações | **Tratado como sensível** (dado referente à saúde) | Proteção reforçada; acesso restrito ao titular e ao gestor do programa |
| Medidas corporais | Peso, altura, circunferências, % de gordura | **Tratado como sensível por cautela** (podem revelar condições de saúde) | Proteção reforçada |
| Registros de treino | Sessões, cargas, repetições, PSE, observações | Dado pessoal comum; observações livres podem conter dados de saúde → **tratadas como sensíveis** | Proteção reforçada para observações |
| Registros técnicos | Logs, endereço IP | Dado pessoal comum | Retenção limitada; sem conteúdo de saúde |

### 6.1 Na modalidade PES

O tratamento dos próprios dados pelo próprio usuário, para fins exclusivamente particulares, **pode** estar fora do âmbito de aplicação da LGPD (hipótese a verificar — referência: art. 4º, I). Independentemente disso, o projeto aplica as mesmas proteções técnicas (criptografia em trânsito, isolamento, backup, coleta mínima), pois os dados ficam em provedores de terceiros e a arquitetura será reutilizada na modalidade TER.

### 6.2 Na modalidade TER

A base legal e os documentos (termo, aviso de privacidade, registro de consentimento, se aplicável) serão definidos após REG-03..REG-08. Os requisitos RF-006 e RF-097 e a regra RN-024 descrevem o comportamento mínimo previsto, sujeito a essa verificação.

## Critérios de conclusão

- [x] Modalidades definidas e funcionalidades classificadas.
- [x] Itens legais e regulatórios a verificar listados, sem afirmações jurídicas conclusivas.
- [x] Classificação preliminar de dados registrada como preliminar.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Criação (Etapa 1, revisão 2), a pedido do usuário. |
| 2026-10-26 | Revisão 3: RF-038 incluído na coluna PES. |
| 2026-10-26 | Aprovado pelo usuário (Etapa 1, revisão 3). |
| 2026-10-26 | RF-103 incluído na coluna PES. |
| 2026-11-04 | REG-14..16 e acréscimo em REG-12, para a versão 1.2. |
