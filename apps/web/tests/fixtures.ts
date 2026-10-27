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
export const passwordChangeUser = (browserName: string) =>
  user(`troca.${browserName}@exemplo.test`);
export const SESSION_FILE = new URL("./.auth/sessao.json", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);
