// Textos de interface centralizados (ARQ-04 §4, UX-02 §8). Mensagens de erro vêm de @forja/domain.

export const TEXTS = {
  appName: "Forja",
  nav: {
    mainLabel: "Navegação principal",
    areaLabel: "Área",
    myTraining: "Meu treino",
    management: "Gestão",
    today: "Hoje",
    workouts: "Treinos",
    calendar: "Agenda",
    progress: "Evolução",
    account: "Conta",
    program: "Programa",
    catalog: "Catálogo",
    profile: "Perfil",
    back: "Voltar",
  },
  pending: {
    title: "Tela em construção",
    description: (task: string) =>
      // Hífen inseparável (U+2011) evita quebrar o identificador da tarefa em duas linhas.
      `Esta tela faz parte do plano de implementação e será entregue na ${task.replace("-", "‑")}.`,
  },
  notFound: {
    title: "Página não encontrada",
    description: "O endereço não corresponde a nenhuma tela do app.",
    action: "Ir para Hoje",
  },
  error: {
    title: "Algo deu errado nesta tela",
    retry: "Tentar de novo",
  },
  common: {
    cancel: "Cancelar",
    close: "Fechar",
    undo: "Desfazer",
    loading: "Carregando",
    decrease: "Diminuir",
    increase: "Aumentar",
  },
} as const;
