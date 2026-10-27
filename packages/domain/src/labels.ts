// Rótulos pt-BR das enumerações (TRN-01 §3, TRN-03 §2–§4).
import type {
  ActivityLevel,
  Difficulty,
  Equipment,
  ExperienceLevel,
  Goal,
  MovementPattern,
  MuscleGroup,
  Restriction,
  Sex,
  TrainingLocation,
} from "./enums.ts";

export const GOAL_LABELS: Readonly<Record<Goal, string>> = {
  hypertrophy: "Hipertrofia",
  weight_loss: "Emagrecimento",
  strength: "Força",
  conditioning: "Condicionamento",
  maintenance: "Manutenção",
  quality_of_life: "Qualidade de vida",
};

export const EXPERIENCE_LABELS: Readonly<Record<ExperienceLevel, string>> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export const ACTIVITY_LABELS: Readonly<Record<ActivityLevel, string>> = {
  sedentary: "Pouco ativo",
  light: "Levemente ativo",
  moderate: "Moderadamente ativo",
  high: "Muito ativo",
};

export const LOCATION_LABELS: Readonly<Record<TrainingLocation, string>> = {
  full_gym: "Academia completa",
  basic_gym: "Academia básica",
  home: "Em casa",
  outdoor: "Ao ar livre",
};

export const RESTRICTION_LABELS: Readonly<Record<Restriction, string>> = {
  shoulder: "Ombro",
  elbow: "Cotovelo",
  wrist: "Punho/mão",
  neck: "Pescoço/cervical",
  thoracic: "Parte alta das costas/torácica",
  lower_back: "Lombar",
  hip: "Quadril",
  knee: "Joelho",
  ankle: "Tornozelo/pé",
  cardiovascular: "Condição cardiovascular ou respiratória",
  pregnancy: "Gestação ou pós-parto recente",
  other: "Outra",
};

export const MUSCLE_GROUP_LABELS: Readonly<Record<MuscleGroup, string>> = {
  chest: "Peitoral",
  upper_back: "Costas — parte alta",
  lats: "Dorsais",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraços",
  abs: "Abdômen",
  obliques: "Oblíquos",
  lower_back: "Lombar",
  glutes: "Glúteos",
  quadriceps: "Quadríceps",
  hamstrings: "Posteriores de coxa",
  adductors: "Adutores",
  abductors: "Abdutores",
  calves: "Panturrilhas",
};

export const EQUIPMENT_LABELS: Readonly<Record<Equipment, string>> = {
  barbell: "Barra",
  ez_bar: "Barra W",
  dumbbell: "Halteres",
  kettlebell: "Kettlebell",
  machine: "Máquina",
  smith_machine: "Smith",
  cable: "Polia/cabo",
  band: "Elástico",
  bench: "Banco",
  pullup_bar: "Barra fixa",
  dip_bars: "Paralelas",
  medicine_ball: "Bola de peso",
  bodyweight: "Peso corporal",
};

export const MOVEMENT_PATTERN_LABELS: Readonly<Record<MovementPattern, string>> = {
  squat: "Agachar",
  hinge: "Dobrar o quadril",
  lunge: "Unilateral de pernas",
  h_push: "Empurrar horizontal",
  v_push: "Empurrar vertical",
  h_pull: "Puxar horizontal",
  v_pull: "Puxar vertical",
  knee_ext: "Extensão de joelho",
  knee_flex: "Flexão de joelho",
  hip_abd_add: "Abdução/adução de quadril",
  calf: "Panturrilha",
  elbow_flex: "Flexão de cotovelo",
  elbow_ext: "Extensão de cotovelo",
  shoulder_iso: "Ombro isolado",
  chest_iso: "Peitoral isolado",
  core_stability: "Core — estabilidade",
  core_flexion: "Core — flexão/rotação",
  carry_grip: "Carregar/pegada",
};

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = EXPERIENCE_LABELS;

export const SEX_LABELS: Readonly<Record<Sex, string>> = {
  female: "Feminino",
  male: "Masculino",
  undisclosed: "Prefiro não informar",
};
