# IMP-03 — Backup e Recuperação

| Campo | Valor |
|---|---|
| Identificador | IMP-03 |
| Status | **Aprovado** (2026-10-26 — Etapa 6) |
| Etapa | 6 |
| Dono do assunto | Política, execução, guarda e teste de backups; RPO/RTO; recuperação |
| Dependências | RNF-011, ADR-036, ARQ-02 §7 (VH-02), SEG-01 §7, SEG-02 §3 |
| Referenciado por | IMP-02, IMP-04, PLN-05 |
| Decisões | ADR-073 (implementação do backup) — aprovada |
| Última atualização | 2026-10-28 |

## 1. Política (ADR-073)

| Item | Definição |
|---|---|
| O que | Cópia lógica completa do banco de produção (esquema + dados), incluindo usuários do serviço de autenticação |
| Frequência | Diária (madrugada, horário de Brasília) + imediatamente antes de cada migração em produção (IMP-02 P1) |
| Ferramenta | Comando de exportação do provedor (`db dump`), como recomenda a documentação oficial para projetos gratuitos |
| Criptografia | Antes de sair do executor do CI, com **chave pública** (ferramenta `age`); somente a chave privada, guardada pelo usuário, decifra |
| Guarda primária | Artefatos do GitHub Actions do repositório privado, retenção de **35 dias** (≥ 30 — RNF-011) |
| Guarda secundária | Uma cópia por mês baixada pelo usuário para armazenamento pessoal fora do GitHub (manter as 3 últimas) |
| Integridade | Soma de verificação registrada junto a cada arquivo |
| Monitoramento | Falha do workflow → notificação do GitHub (SEG-04) |
| Metas | RPO ≤ 24 h; RTO ≤ 8 h (RNF-011) |

Itens a confirmar na fundação: cota de armazenamento de artefatos e minutos do plano gratuito do GitHub (VH-09); tamanho real dos backups.

### 1.1 Efeito colateral sobre a pausa do provedor

O backup diário acessa o banco por necessidade legítima de proteção dos dados. Na prática, essa atividade diária pode impedir que o projeto gratuito seja pausado por inatividade. **Não é o objetivo** do backup e não se fará nenhuma outra atividade artificial (a verificação de disponibilidade não consulta o banco — SEG-04 §4). Se você preferir evitar esse efeito, a alternativa é backup semanal (RPO de 7 dias, abaixo de RNF-011) — decisão registrada na ADR-073.

## 2. O que **não** é coberto

| Item | Motivo | Mitigação |
|---|---|---|
| Pendências ainda não sincronizadas no aparelho | Estão só no aparelho | Avisos de pendências antigas (UX-08 §7) |
| Logs do provedor | Fora do escopo | — |
| Catálogo, imagens, código | Já estão no repositório | — |

## 3. Restauração

1. Criar (ou limpar) o projeto de destino — em teste, o projeto de desenvolvimento.
2. Baixar o artefato e decifrá-lo com a chave privada do usuário, na máquina do usuário.
3. Conferir a soma de verificação.
4. Importar no banco de destino; reaplicar papéis e segredos (IMP-01).
5. Verificar: contagem de registros por tabela, login do usuário, abertura do app, sincronização de uma sessão de teste.
6. Em produção: apontar o app para o projeto restaurado (se novo) e registrar o incidente (SEG-01 §8).

## 4. Testes de restauração

| Quando | Destino | Registro |
|---|---|---|
| Antes do início do uso real | Projeto de desenvolvimento | Data, duração, resultado |
| Trimestral | Projeto de desenvolvimento | Idem |
| Após mudança relevante de esquema | Projeto de desenvolvimento | Idem |

Os dados de produção restaurados no ambiente de desenvolvimento são apagados ao final do teste.

### 4.1 Registro

| Data | Destino | Duração | Resultado |
|---|---|---|---|
| 2026-10-28 | **Local** (ADR-090 estendida): banco Postgres limpo, mesma imagem do ambiente local, simulando projeto novo (esquemas gerenciados `auth`/`storage` e papel do realtime presentes); backup do banco local com dados fictícios, cifrado com chave `age` **descartável de teste** | Backup 128 s; decifrar + importar 73 s | **Sucesso**: somas conferidas; arquivo alterado e chave errada recusados; contagens iguais em 34 itens (32 tabelas de `public`, 27 usuários, 15 migrações registradas); 74 políticas, 48 funções `app` e 31 gatilhos iguais; RLS forçada em todas as tabelas. Banco de teste e arquivos decifrados apagados ao final. **Não coberto localmente:** login, abertura do app e sincronização de uma sessão (passo 5) — sem serviço de autenticação nesse banco; repetir no projeto de desenvolvimento após a TAR-003 |

## 5. Responsabilidade da chave privada

A chave privada fica **somente** com você (gerenciador de senhas + uma cópia offline). Perder a chave torna todos os backups ilegíveis; vazá-la permite ler os backups. Sem ela, nem o CI nem o GitHub conseguem ler o conteúdo.

## Critérios de conclusão

- [x] Política, guarda, restauração, testes e responsabilidades definidos.
- [x] ADR-073 aprovada.
- [x] Aprovação do usuário.

## Histórico

| Data | Alteração |
|---|---|
| 2026-10-26 | Esqueleto criado. |
| 2026-10-26 | Conteúdo completo (Etapa 6). |
| 2026-10-26 | Aprovado pelo usuário (Etapa 6). |
| 2026-10-28 | §4.1: registro do 1º teste de restauração (local, TAR-007). |
