# ARQ-04 — Padrões de Código

| Campo | Valor |
|---|---|
| Identificador | ARQ-04 |
| Status | **Aprovado** (2026-10-26 — Etapa 3) |
| Etapa | 3 |
| Dono do assunto | Convenções de código, nomenclatura, tipos, validação, erros, segurança no código, dependências e revisão |
| Dependências | ARQ-02, ARQ-03, GOV-03 |
| Referenciado por | Todas as tarefas da Etapa 9 |
| Última atualização | 2026-10-26 |

## 1. Objetivo

Garantir código consistente, legível e verificável, para que qualquer sessão futura implemente sem reinventar convenções.

## 2. Linguagem e ferramentas

| Item | Regra |
|---|---|
| TypeScript | `strict: true`, `noUncheckedIndexedAccess`, sem `any` implícito; `any` explícito só com comentário justificando |
| Lint | ESLint com regras de TypeScript, React Hooks e acessibilidade JSX (`jsx-a11y`) |
| Formatação | Prettier, aplicado automaticamente; sem discussões de estilo em revisão |
| CI | Bloqueia em erro de tipo, lint, teste ou cobertura abaixo das metas de RNF-021 |
| SQL | Palavras-chave em minúsculas, `snake_case`, uma migração por mudança lógica |

## 3. Camadas e dependências

```
interface (apps/web/features, components)
   ↓ usa
aplicação (apps/web/local, api)          supabase/functions/sync
   ↓ usa                                    ↓ usa
domínio (packages/domain) ←──────────────────┘
```

- O domínio é puro: funções determinísticas, entrada → saída; data/hora atual sempre recebida por parâmetro.
- A interface nunca acessa o banco local ou a rede diretamente — usa a camada de aplicação.
- Toda escrita de dados do aluno/gestão passa pela fila de saída (mesmo online), garantindo um único caminho (ADR-027, ADR-034).

## 4. Nomenclatura

- Código, identificadores e nomes de tabelas em **inglês**; textos de interface em **português** (centralizados em um módulo de mensagens, sem textos soltos em componentes).
- Mapeamento oficial do glossário (GOV-03) para o código:

| Termo (pt-BR) | Código | Tabela |
|---|---|---|
| Usuário | `User` | `auth.users` (serviço de autenticação) |
| Gestor (papel de gestão) | `Manager` | `managers` |
| Aluno | `Student` | `students` |
| Perfil de treinamento | `TrainingProfile` | `training_profiles` |
| Avaliação | `Assessment` | `assessments` |
| Registro de peso | `WeightEntry` | `weight_entries` |
| Exercício | `Exercise` | `exercises` |
| Programa | `Program` | `programs` |
| Versão do programa | `ProgramVersion` | `program_versions` |
| Treino | `Workout` | `workouts` |
| Exercício prescrito | `WorkoutItem` | `workout_items` |
| Sessão | `Session` | `sessions` |
| Série registrada | `SetLog` | `set_logs` |
| Configuração de descanso | `RestSettings` | `rest_settings` |
| Operação da fila de saída | `OutboxOperation` | (somente no aparelho) |
| Estado de sincronização | `SyncState` | (somente no aparelho) |

O modelo de dados definitivo é responsabilidade de DAD-01 (Etapa 4); divergências devem atualizar esta tabela.

- Arquivos: `kebab-case.ts`; componentes React: `PascalCase.tsx`; funções e variáveis: `camelCase`; constantes de parâmetros de negócio: `UPPER_SNAKE_CASE`, todas em um único módulo de parâmetros (espelho de PRD-07 §11).

## 5. Dados, datas e números

- Datas/horas armazenadas e trafegadas em UTC (ISO 8601); conversão para o fuso do usuário apenas na exibição e no cálculo do "dia" (RN-028).
- Pesos e cargas em quilogramas com no máximo uma casa decimal (carga em passos de 0,5); nunca formatar números com `toString` na interface — usar o formatador pt-BR.
- Identificadores de registros criados no aparelho: UUID gerado no aparelho (RN-042).

## 6. Validação e erros

- Esquemas Zod no pacote de domínio são a definição única das estruturas trafegadas; o app valida para dar retorno imediato e a função de sincronização revalida (nunca confia no aparelho).
- Erros de domínio são **valores** (resultado com sucesso/erro tipado), não exceções; exceções só para falhas inesperadas.
- Cada erro tem código estável (ex.: `SESSION_OUTSIDE_EDIT_WINDOW`) mapeado para mensagem em português (UX-02 §8.3); a taxonomia completa é definida em SEG-05.

## 7. Segurança no código

| Regra | Origem |
|---|---|
| Nunca registrar em log dados pessoais, de saúde, tokens ou senhas | RNF-017 |
| Nunca colocar dados pessoais em URLs ou chaves de cache | RNF-017, ADR-028 L5 |
| A função de sincronização usa a sessão do usuário; credencial administrativa só em tarefas operacionais (migrações, backup), nunca no app | ADR-034 |
| Toda tabela com dados de aluno tem política por linha e teste de acesso cruzado | RN-001, RNF-014 |
| Conteúdo vindo do usuário é exibido como texto (sem HTML) | RNF-016 |
| Operação da fila só é enviada se o dono for o usuário da sessão | ADR-028 L3 |

## 8. Dependências

- Somente licenças permissivas (MIT, Apache-2.0, BSD, ISC; fontes SIL OFL). Licenças copyleft fortes no pacote distribuído exigem ADR.
- Toda dependência nova é justificada no PR (tamanho, manutenção ativa, licença); versões exatas fixadas; atualização mensal assistida (IMP-04).

## 9. Testes (resumo — detalhes em SEG-03)

- Domínio: testes unitários com casos de referência das regras (≥ 90% de linhas — RNF-021).
- Função de sincronização e políticas: testes de integração, incluindo acesso cruzado e idempotência.
- E2E: jornadas do Lançamento 1 e cenários T-PWA (UX-08 §10).

## 10. Checklist de revisão de PR

- [ ] Tarefa, RF/RN/TELA citados; documentação atualizada se o comportamento mudou.
- [ ] Testes novos/atualizados; CI verde.
- [ ] Sem textos de interface fora do módulo de mensagens; sem dados pessoais em logs/URLs.
- [ ] Acessibilidade: rótulos, foco, contraste por tokens.
- [ ] Escritas passam pela fila de saída.

## Critérios de conclusão

- [x] Convenções, camadas, nomenclatura, validação, erros, segurança, dependências e revisão definidas.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 3). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 3). |
