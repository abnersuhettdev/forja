// Procedimento operacional de inicialização (IMP-01 §4 passo 3), executado só na máquina do
// responsável. O usuário já deve existir (criado no painel do provedor).
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/ops/init-manager.ts
// O e-mail é pedido no terminal (fica fora do histórico do shell).
import { createInterface } from "node:readline/promises";
import { ensureManager, findUserByEmail, maskEmail } from "./managers.ts";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente desta execução.");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const email = (await rl.question("E-mail do usuário gestor: ")).trim();
rl.close();

const creds = { url, serviceKey };
const user = await findUserByEmail(creds, email);
if (user === null) {
  console.error(`Usuário ${maskEmail(email)} não encontrado. Crie-o antes no painel do provedor.`);
  process.exit(1);
}
await ensureManager(creds, user.id);
console.log(`Gestor garantido para ${maskEmail(email)}. Registre a data no histórico (IMP-01 §4).`);
