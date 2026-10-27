// Usuários fictícios dos testes (RN-037), definidos em supabase/fixtures.
import { readFileSync } from "node:fs";

interface FixtureUser {
  email: string;
  senha: string;
}

const { usuarios } = JSON.parse(
  readFileSync(
    new URL("../../../supabase/fixtures/usuarios-ficticios.json", import.meta.url),
    "utf8",
  ),
) as { usuarios: FixtureUser[] };

function user(email: string): FixtureUser {
  const found = usuarios.find((u) => u.email === email);
  if (!found) throw new Error(`Usuário fictício ausente: ${email}`);
  return found;
}

export const MAIN_USER = user("pessoa.ficticia@exemplo.test");
export const SECOND_USER = user("segunda.pessoa@exemplo.test");
export const passwordChangeUser = (browserName: string) =>
  user(`troca.${browserName}@exemplo.test`);
/** Gestor com aluno próprio exclusivo do teste de programa (um por navegador). */
export const managementUser = (browserName: string) => user(`gestao.${browserName}@exemplo.test`);
/** Aluno com programa publicado para os testes offline (um por navegador). */
export const offlineUser = (browserName: string) => user(`offline.${browserName}@exemplo.test`);
/** Usuário sem configuração inicial (um por navegador, para rodar em paralelo). */
export const firstAccessUser = (browserName: string) =>
  user(`primeiro.${browserName}@exemplo.test`);
export const SESSION_FILE = new URL("./.auth/sessao.json", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);
