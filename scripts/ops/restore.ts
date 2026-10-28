// Restauração (IMP-03 §3, passos 2–4): confere as somas de verificação, decifra os arquivos com a
// CHAVE PRIVADA do usuário (na máquina dele) e indica o comando de importação. Nada é enviado a
// lugar nenhum; os arquivos decifrados ficam só na pasta indicada.
//
// Uso:
//   node scripts/ops/restore.ts --in <pasta com .age e SHA256SUMS> --identity <arquivo da chave> --out <pasta>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Decrypter } from "age-encryption";
import { DUMPS, SUMS_FILE, sha256 } from "./backup.ts";

export async function verifyAndDecrypt(options: {
  input: string;
  identity: string;
  out: string;
}): Promise<string[]> {
  const expected = new Map(
    readFileSync(join(options.input, SUMS_FILE), "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const [hash, file] = line.split(/\s+/);
        return [file ?? "", hash ?? ""];
      }),
  );
  const decrypter = new Decrypter();
  decrypter.addIdentity(options.identity.trim());
  mkdirSync(options.out, { recursive: true });
  const restored: string[] = [];
  for (const dump of DUMPS) {
    const name = `${dump.file}.age`;
    const encrypted = readFileSync(join(options.input, name));
    if (expected.get(name) !== sha256(encrypted)) {
      throw new Error(`Soma de verificação não confere: ${name}. Não restaure este backup.`);
    }
    writeFileSync(join(options.out, dump.file), await decrypter.decrypt(encrypted));
    restored.push(dump.file);
  }
  return restored;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    const found = index === -1 ? undefined : args[index + 1];
    if (found === undefined) throw new Error(`Informe ${flag} <valor>.`);
    return found;
  };
  const out = value("--out");
  const files = await verifyAndDecrypt({
    input: value("--in"),
    identity: readFileSync(value("--identity"), "utf8"),
    out,
  });
  console.log(`Somas conferidas e arquivos decifrados em ${out}: ${files.join(", ")}`);
  const file = (name: string) => `--file ${join(out, name)}`;
  console.log(
    "Importar no banco de destino (projeto novo; IMP-03 §3):\n" +
      `  psql --single-transaction --variable ON_ERROR_STOP=1 ${file("roles.sql")} ` +
      `${file("schema.sql")} ${file("history_schema.sql")} ` +
      `--command "SET session_replication_role = replica" ${file("data.sql")} ` +
      `${file("history_data.sql")} --dbname "<endereço do banco de destino>"`,
  );
}
