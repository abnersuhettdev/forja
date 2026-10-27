// Códigos de erro (DAD-04 §7, SEG-05 §2) com mensagens pt-BR e formatos de exibição (RNF-004,
// UX-02 §8.4). Textos de interface não ficam espalhados pelos componentes (ARQ-04 §4).

export const ERROR_MESSAGES = {
  // Acesso
  AUTH_REQUIRED: "Entre novamente para enviar seus registros.",
  OWNER_MISMATCH: "Este registro não pertence à conta conectada.",
  NOT_FOUND: "Registro não encontrado.",
  FORBIDDEN_ROLE: "Esta ação é exclusiva da área de gestão.",
  TER_DISABLED: "Acompanhamento de outros alunos não está disponível.",
  // Validação
  VALIDATION_FAILED: "Confira os dados informados.",
  AGE_UNDER_18: "O app é destinado a maiores de 18 anos.",
  EDIT_WINDOW_EXPIRED: "Registros com mais de 60 dias não podem ser alterados.",
  DATE_OUT_OF_WINDOW: "Escolha uma data entre hoje e 60 dias atrás.",
  NOT_DELETABLE: "Este peso faz parte de uma avaliação.",
  VERSION_NOT_AVAILABLE: "Este treino não pertence aos seus programas.",
  DRAFT_ALREADY_EXISTS: "Já existe um rascunho em edição.",
  DRAFT_INVALID: "O programa tem pendências.",
  EXERCISE_INACTIVE: "Um exercício do programa está desativado.",
  NAME_TAKEN: "Já existe um exercício com esse nome.",
  NOT_AN_ALTERNATIVE: "Escolha uma das alternativas cadastradas.",
  // Sincronização
  REVISION_CONFLICT: "Este registro foi alterado em outro aparelho.",
  ENTITY_DELETED: "Este registro foi excluído em outro aparelho.",
  DEPENDENCY_PENDING: "Aguardando o envio de um registro anterior.",
  // Transporte
  NETWORK_UNAVAILABLE: "Sem conexão. Seus dados estão salvos neste aparelho.",
  TIMEOUT: "Não foi possível enviar agora. Tentaremos de novo automaticamente.",
  RATE_LIMITED: "Muitas tentativas; tentaremos de novo em instantes.",
  INTERNAL: "Não foi possível enviar agora. Tentaremos de novo.",
  // Aparelho
  LOCAL_WRITE_FAILED: "Não foi possível salvar neste aparelho. Não feche o app; tente novamente.",
  LOCAL_QUOTA_EXCEEDED: "O espaço do app neste aparelho acabou. Libere dados temporários.",
  LOCAL_MIGRATION_FAILED:
    "Não foi possível atualizar os dados deste aparelho. Seus dados estão preservados.",
  DECRYPT_FAILED: "Não foi possível abrir os registros guardados com esta senha.",
  SW_UPDATE_FAILED: "Não foi possível atualizar o app agora.",
  OFFLINE_REQUIRED: "Esta ação precisa de conexão. Seus treinos continuam disponíveis offline.",
  UNEXPECTED: "Algo deu errado. Seus dados salvos neste aparelho estão seguros.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function messageFor(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** "82,5 kg" */
export function formatKg(value: number): string {
  return `${decimal.format(value)} kg`;
}

/** "26/10/2026" a partir de "2026-10-26". */
export function formatLocalDate(localDate: string): string {
  const [y, m, d] = localDate.split("-");
  return `${d ?? ""}/${m ?? ""}/${y ?? ""}`;
}

/** "52 min" ou "1 h 05 min". */
export function formatDurationMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${String(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  return `${String(hours)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** Cronômetro "1:30" (UX-02 §8.4). */
export function formatTimer(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}
