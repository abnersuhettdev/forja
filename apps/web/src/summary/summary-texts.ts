// Textos da tela do resumo da semana (TELA-061), fora do pacote inicial: só as telas carregadas sob demanda os usam (SEG-04 §2).
export const SUMMARY_SCREEN_TEXTS = {
  title: "Resumo da semana",
  range: (from: string, to: string) => `${from} a ${to}`,
  metGoal: "Meta cumprida",
  week: "Semana",
  doneLine: "treinos na semana",
  howItWent: "Como foi",
  aiNote:
    "Texto escrito pela IA só com os números abaixo. Não substitui a orientação de um profissional.",
  noText: "O texto não ficou pronto agora. Aqui estão os números da semana.",
  offline: "Sem conexão: aqui estão só os números. O texto chega quando você se conectar.",
  numbers: "Os números",
  none: "O resumo aparece depois da primeira semana com uma rotina em uso.",
  labels: {
    workouts: "Treinos",
    previous: "Semana anterior",
    sets: "Séries registradas",
    time: "Tempo total",
    loadUp: "Carga subiu",
    skipped: "Ficou de fora",
    weight: "Peso",
    streak: "Sequência na meta",
  },
  skippedValue: (name: string, times: number) =>
    `${name}, ${String(times)} ${times === 1 ? "vez" : "vezes"}`,
  loadValue: (name: string, from: string, to: string) => `${name} ${from} → ${to} kg`,
  weightValue: (from: string, to: string) => `${from} → ${to} kg`,
  streakNone: "recomeça na próxima",
  proposal: {
    label: "Proposta",
    title: (days: number) => `Rotina de ${String(days)} ${days === 1 ? "dia" : "dias"}`,
    body: (previous: number, done: number, goal: number, days: number) =>
      `Nas últimas 2 semanas foram ${String(previous)} e ${String(done)} treinos, abaixo da meta de ${String(goal)}. Uma rotina de ${String(days)} ${days === 1 ? "dia" : "dias"} pode caber melhor. A atual continua valendo até você escolher.`,
    see: "Ver proposta",
    keep: (goal: number) => `Manter ${String(goal)} dias`,
    needsConnection: "Para montar a proposta é preciso estar conectado.",
  },
} as const;
