// Cria os usuários fictícios de supabase/fixtures no Supabase LOCAL (RN-037, ADR-090).
import { readFileSync } from "node:fs";
import { createUser, ensureManager, findUserByEmail } from "../ops/managers.ts";
import { localStatus } from "./local.ts";

interface Fixture {
  email: string;
  senha: string;
  gestor: boolean;
}

export async function seedFixtures(): Promise<Fixture[]> {
  const status = localStatus();
  const creds = { url: status.API_URL, serviceKey: status.SERVICE_ROLE_KEY };
  const { usuarios } = JSON.parse(
    readFileSync(
      new URL("../../supabase/fixtures/usuarios-ficticios.json", import.meta.url),
      "utf8",
    ),
  ) as { usuarios: Fixture[] };
  for (const fixture of usuarios) {
    const user =
      (await findUserByEmail(creds, fixture.email)) ??
      (await createUser(creds, fixture.email, fixture.senha));
    if (fixture.gestor) await ensureManager(creds, user.id);
  }
  return usuarios;
}

if (import.meta.main) {
  const created = await seedFixtures();
  console.log(`Usuários fictícios prontos: ${String(created.length)}`);
}
