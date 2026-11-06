// Textos da geração de rotina (TELA-051, TELA-060), fora do pacote inicial: só as telas
// carregadas sob demanda os usam (SEG-04 §2).
export const GENERATE_TEXTS = {
  intro: "O app monta uma rotina com os seus dados e o catálogo. Você revisa antes de usar.",
  checklist: "Dados usados",
  pending: {
    birth_date: "Informe sua data de nascimento",
    under_age: "O app é para maiores de 18 anos.",
    goal: "Escolha um objetivo",
    experience_level: "Informe sua experiência",
    days_per_week: "Informe quantos dias por semana pode treinar",
    minutes_per_session: "Informe o tempo disponível por treino",
    equipment: "Informe onde treina e os equipamentos disponíveis",
    restrictions: "Confirme se possui restrições ou limitações",
  },
  done: {
    birth_date: "Data de nascimento",
    under_age: "Data de nascimento",
    goal: "Objetivo",
    experience_level: "Experiência",
    days_per_week: "Dias por semana",
    minutes_per_session: "Tempo por treino",
    equipment: "Local e equipamentos",
    restrictions: "Restrições",
  },
  completeProfile: "Completar perfil",
  emphasis: (groups: readonly string[]) => `Ênfase pedida: ${groups.join(", ")}`,
  notice:
    "Esta rotina é uma sugestão de organização para uso próprio, não uma prescrição. Em caso de dor ou condição de saúde, procure um profissional.",
  draftExists: "Já existe um rascunho. Continue nele ou descarte-o em Programa para gerar outro.",
  submit: "Gerar rotina",
  failed: "Não foi possível gerar a rotina. Confira o perfil e tente de novo.",
  report: {
    title: "Como esta rotina foi montada",
    aiSwaps: "Trocas sugeridas pela IA",
    aiNotice: "Texto escrito por IA, que pode errar. Revise a rotina antes de usar.",
    aiFallback: {
      unavailable: "A IA não respondeu agora. Esta rotina foi montada só com as regras do app.",
      quota:
        "O limite de uso da IA acabou por hoje. Esta rotina foi montada só com as regras do app.",
      invalid:
        "A resposta da IA não passou na verificação. Esta rotina foi montada só com as regras do app.",
    },
    considered: "Considerado",
    days: (n: number) => `${String(n)} ${n === 1 ? "dia" : "dias"} por semana`,
    minutes: (n: number) => `${String(n)} min por treino`,
    noRestrictions: "Sem restrições",
    emphasis: (groups: string) => `Ênfase: ${groups}`,
    excluded: "Retirados e por quê",
    byRestriction: (label: string) => `restrição em ${label}`,
    byEquipment: (label: string) => `falta ${label}`,
    byAge: "não indicado a partir de 60 anos",
    excludedEquipment: (n: number) =>
      `${String(n)} ${n === 1 ? "exercício ficou" : "exercícios ficaram"} de fora por falta de equipamento.`,
    unfilled: "Não preenchido",
    unfilledReason: {
      restriction: "por restrição",
      equipment: "por falta de equipamento",
      difficulty: "pelo nível de experiência",
      age: "pela idade",
      time: "por falta de tempo",
      none: "sem exercício disponível",
    },
    volume: "Séries por semana fora da referência",
    volumeLine: (sets: number, min: number, max: number) =>
      `${String(sets)} (referência: ${String(min)} a ${String(max)})`,
  },
} as const;
