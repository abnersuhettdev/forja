// Parâmetros de negócio centralizados — espelho de PRD-07 §11.
// Alterar um valor exige atualizar PRD-07 §11 e incrementar PARAMETERS_VERSION.

export const PARAMETERS_VERSION = "1.0.0";

/** RN-014 — intervalo fixo de reavaliação no MVP (ADR-008). */
export const REASSESSMENT_INTERVAL_DAYS = 30;
/** RN-015 — sugestão de adiamento (sem limite de adiamentos — ADR-020). */
export const REASSESSMENT_SNOOZE_SUGGESTION_DAYS = 7;
/** RN-050 — valor inicial do descanso padrão por grupo muscular (ADR-021). */
export const DEFAULT_REST_HOURS = 48;
/** RN-012 — sessão sem atividade por este tempo passa a "abandonada". */
export const SESSION_ABANDON_HOURS = 6;
/** RN-027 — janela de registro manual e de edição de sessões. */
export const SESSION_EDIT_WINDOW_DAYS = 60;
/** RN-048 — tolerância para horário futuro informado pelo aparelho. */
export const CLIENT_CLOCK_TOLERANCE_MINUTES = 5;
/** RN-016 — limites de dados desatualizados. */
export const WEIGHT_STALE_DAYS = 30;
export const PROGRAM_STALE_WEEKS = 12;
/** RN-034 — inatividade no dashboard da modalidade TER. */
export const INACTIVITY_ALERT_DAYS = 7;
/** RN-031 — o app impõe espera progressiva após este número de falhas seguidas de login. */
export const LOGIN_FAILURES_BEFORE_BACKOFF = 5;
/**
 * RN-031 — espera progressiva (decisão de implementação da TAR-008): 30 s na quinta falha,
 * dobrando a cada nova falha, até 15 min.
 */
export const LOGIN_BACKOFF_BASE_SECONDS = 30;
export const LOGIN_BACKOFF_MAX_SECONDS = 900;
/** RN-031 — tamanho mínimo de senha (também configurado no serviço de autenticação). */
export const PASSWORD_MIN_LENGTH = 10;
/** UX-08 §6.2 — janela de sessões mantidas no aparelho (também limita o ciclo — TRN-04 §4). */
export const LOCAL_SESSIONS_WINDOW_DAYS = 90;
/** UX-08 §7 — pendências antigas: aviso e destaque de perigo. */
export const PENDING_WARNING_HOURS = 24;
export const PENDING_DANGER_HOURS = 72;
/** TRN-04 §5 — fórmula de duração estimada (ADR-065). */
export const ESTIMATE_SECONDS_PER_SET = 45;
export const ESTIMATE_TRANSITION_SECONDS = 60;
export const ESTIMATE_ROUNDING_MINUTES = 5;
