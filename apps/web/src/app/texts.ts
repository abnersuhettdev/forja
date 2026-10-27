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
  auth: {
    unconfigured:
      "O app não está configurado para se conectar ao servidor. Verifique a configuração de build.",
    login: {
      email: "E-mail",
      password: "Senha",
      showPassword: "Mostrar senha",
      hidePassword: "Ocultar senha",
      submit: "Entrar",
      forgot: "Esqueceu a senha? A redefinição é feita pelo responsável pela instalação do app.",
      required: "Preencha este campo.",
      invalid: "E-mail ou senha incorretos",
      tooMany: "Muitas tentativas. Aguarde alguns minutos.",
      wait: (seconds: number) =>
        `Muitas tentativas. Aguarde ${formatWait(seconds)} para tentar de novo.`,
      offline: "Para entrar é preciso estar conectado.",
      failed: "Não foi possível entrar agora. Tente de novo.",
    },
    changePassword: {
      current: "Senha atual",
      next: "Nova senha",
      confirm: "Confirmar nova senha",
      rules: "Mínimo de 10 caracteres, diferente do e-mail e fora da lista de senhas comuns.",
      submit: "Salvar",
      tooShort: "A senha precisa ter pelo menos 10 caracteres.",
      equalsEmail: "A senha não pode ser igual ao e-mail.",
      common: "Esta senha é muito comum. Escolha outra.",
      sameAsCurrent: "A nova senha precisa ser diferente da atual.",
      mismatch: "As senhas não coincidem.",
      wrongCurrent: "Senha atual incorreta.",
      offline: "Sem conexão. Conecte-se para alterar a senha.",
      done: "Senha alterada.",
      failed: "Não foi possível alterar a senha agora. Tente de novo.",
    },
    account: {
      changePassword: "Alterar senha",
      signOut: "Sair",
      signOutTitle: "Sair da conta?",
      signOutBody:
        "Os dados do app serão removidos deste aparelho. Seus dados sincronizados continuam na sua conta e voltam no próximo login.",
      pendingRest: "As demais opções da Conta chegam na TAR‑011.",
      unsentTitle: "Há registros não enviados",
      unsentBody: (count: number) =>
        `${count === 1 ? "1 registro ainda não foi enviado" : `${String(count)} registros ainda não foram enviados`}. Para não perdê-los, conecte-se e envie antes de sair. Nada foi removido deste aparelho.`,
      sendNow: "Enviar agora",
    },
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

function formatWait(seconds: number): string {
  if (seconds < 60) return `${String(seconds)} s`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minuto" : `${String(minutes)} minutos`;
}
