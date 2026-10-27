// Inicialização do gestor (DAD-05 §4, IMP-01 §4): associa um usuário do serviço de
// autenticação a um registro em `managers`. Usa a credencial administrativa recebida por
// parâmetro, que nunca é gravada nem registrada em log.

export interface AdminCredentials {
  /** Endereço do projeto (ex.: https://<ref>.supabase.co ou http://127.0.0.1:55421). */
  url: string;
  /** Chave administrativa (service_role) — somente nesta máquina. */
  serviceKey: string;
}

interface AdminUser {
  id: string;
  email?: string;
}

function headers({ serviceKey }: AdminCredentials): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function request(creds: AdminCredentials, path: string, init: RequestInit = {}) {
  const response = await fetch(new URL(path, creds.url), {
    ...init,
    headers: { ...headers(creds), ...(init.headers as Record<string, string> | undefined) },
  });
  if (!response.ok) {
    // Só o código HTTP: o corpo pode ecoar dados enviados.
    throw new Error(`Falha em ${path.split("?")[0] ?? path}: HTTP ${String(response.status)}`);
  }
  return response;
}

/** Procura o usuário pelo e-mail (comparação sem caixa). */
export async function findUserByEmail(
  creds: AdminCredentials,
  email: string,
): Promise<AdminUser | null> {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const response = await request(creds, `/auth/v1/admin/users?page=${String(page)}&per_page=200`);
    const body = (await response.json()) as { users?: AdminUser[] };
    const users = body.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === wanted);
    if (found) return found;
    if (users.length < 200) return null;
  }
  return null;
}

/** Cria o usuário com e-mail já confirmado (uso local e de testes). */
export async function createUser(
  creds: AdminCredentials,
  email: string,
  password: string,
): Promise<AdminUser> {
  const response = await request(creds, "/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  return (await response.json()) as AdminUser;
}

/** Garante o registro em `managers` para o usuário (idempotente). */
export async function ensureManager(creds: AdminCredentials, userId: string): Promise<void> {
  await request(creds, "/rest/v1/managers?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId }),
  });
}

/** E-mail mascarado para mensagens de terminal (sem dado pessoal completo em log). */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}
