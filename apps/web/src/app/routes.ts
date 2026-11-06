// Inventário de telas e rotas (UX-03 §4.1, §5). `task` indica a tarefa de PLN-01 que entrega a tela.

/**
 * "comum": tela das duas áreas (mantém a navegação da última área visitada); "foco": fluxo de
 * várias etapas, sem navegação, como a reavaliação.
 */
export type Area = "aluno" | "gestao" | "conta" | "comum" | "execucao" | "acesso" | "foco";

export interface RouteDefinition {
  readonly pattern: string;
  readonly screen: string;
  readonly title: string;
  readonly area: Area;
  readonly task: string;
}

export const ROUTES: readonly RouteDefinition[] = [
  { pattern: "/entrar", screen: "TELA-001", title: "Entrar", area: "acesso", task: "TAR-008" },
  {
    pattern: "/configuracao-inicial",
    screen: "TELA-003",
    title: "Configuração inicial",
    area: "acesso",
    task: "TAR-011",
  },
  { pattern: "/hoje", screen: "TELA-010", title: "Hoje", area: "aluno", task: "TAR-018" },
  { pattern: "/plano", screen: "TELA-060", title: "Meu plano", area: "aluno", task: "V12-04" },
  {
    pattern: "/reavaliacao",
    screen: "TELA-050",
    title: "Reavaliação",
    area: "foco",
    task: "V12-09",
  },
  { pattern: "/treinos", screen: "TELA-012", title: "Treinos", area: "aluno", task: "TAR-018" },
  { pattern: "/treinos/:id", screen: "TELA-013", title: "Treino", area: "aluno", task: "TAR-018" },
  {
    pattern: "/exercicios/:id",
    screen: "TELA-014",
    title: "Exercício",
    area: "comum",
    task: "TAR-013",
  },
  { pattern: "/sessao", screen: "TELA-015", title: "Execução", area: "execucao", task: "TAR-019" },
  {
    pattern: "/sessao/concluir",
    screen: "TELA-017",
    title: "Concluir treino",
    area: "execucao",
    task: "TAR-019",
  },
  { pattern: "/agenda", screen: "TELA-018", title: "Agenda", area: "aluno", task: "TAR-022" },
  { pattern: "/agenda/:data", screen: "TELA-019", title: "Dia", area: "aluno", task: "TAR-022" },
  {
    pattern: "/sessoes/:id/editar",
    screen: "TELA-020",
    title: "Editar sessão",
    area: "aluno",
    task: "TAR-022",
  },
  { pattern: "/evolucao", screen: "TELA-021", title: "Evolução", area: "aluno", task: "TAR-023" },
  { pattern: "/conta", screen: "TELA-004", title: "Conta", area: "conta", task: "TAR-011" },
  {
    pattern: "/conta/senha",
    screen: "TELA-005",
    title: "Alterar senha",
    area: "conta",
    task: "TAR-008",
  },
  {
    pattern: "/conta/descanso",
    screen: "TELA-006",
    title: "Descanso entre treinos",
    area: "conta",
    task: "TAR-018",
  },
  {
    pattern: "/conta/sincronizacao",
    screen: "TELA-007",
    title: "Sincronização",
    area: "conta",
    task: "TAR-020",
  },
  {
    pattern: "/conta/instalar",
    screen: "TELA-002",
    title: "Instalar o app",
    area: "conta",
    task: "TAR-006",
  },
  {
    pattern: "/gestao/programa",
    screen: "TELA-030",
    title: "Programa",
    area: "gestao",
    task: "TAR-016",
  },
  {
    pattern: "/gestao/programa/gerar",
    screen: "TELA-051",
    title: "Gerar treino",
    area: "gestao",
    task: "TAR-032",
  },
  {
    pattern: "/gestao/programa/rascunho",
    screen: "TELA-031",
    title: "Editor de programa",
    area: "gestao",
    task: "TAR-016",
  },
  {
    pattern: "/gestao/catalogo",
    screen: "TELA-034",
    title: "Catálogo",
    area: "gestao",
    task: "TAR-013",
  },
  {
    pattern: "/gestao/catalogo/novo",
    screen: "TELA-036",
    title: "Novo exercício",
    area: "gestao",
    task: "TAR-014",
  },
  {
    pattern: "/gestao/catalogo/:id/editar",
    screen: "TELA-036",
    title: "Editar exercício",
    area: "gestao",
    task: "TAR-014",
  },
  {
    pattern: "/gestao/perfil",
    screen: "TELA-037",
    title: "Perfil de treinamento",
    area: "gestao",
    task: "TAR-016",
  },
  {
    pattern: "/gestao/perfil/avaliacao",
    screen: "TELA-038",
    title: "Registrar avaliação",
    area: "gestao",
    task: "TAR-016",
  },
];

export const HOME_PATH = "/hoje";
