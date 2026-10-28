import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Encrypter, generateX25519Identity, identityToRecipient } from "age-encryption";
import { afterEach, describe, expect, it } from "vitest";
import { DUMPS, SUMS_FILE, sha256, sumsFile } from "./backup.ts";
import { verifyAndDecrypt } from "./restore.ts";

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "forja-backup-teste-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Backup fictício cifrado com uma chave de teste descartável (IMP-03; RN-037). */
async function fakeBackup(recipient: string) {
  const dir = tempDir();
  const entries = [];
  for (const dump of DUMPS) {
    const encrypter = new Encrypter();
    encrypter.addRecipient(recipient);
    const encrypted = await encrypter.encrypt(`-- conteúdo fictício de ${dump.file}\n`);
    const file = `${dump.file}.age`;
    writeFileSync(join(dir, file), encrypted);
    entries.push({ file, hash: sha256(encrypted) });
  }
  writeFileSync(join(dir, SUMS_FILE), sumsFile(entries));
  return dir;
}

describe("backup e restauração (IMP-03 §1, §3)", () => {
  it("somas no formato do sha256sum", () => {
    expect(sumsFile([{ file: "data.sql.age", hash: "ab" }])).toBe("ab  data.sql.age\n");
  });

  it("confere as somas e decifra com a chave privada", async () => {
    const identity = await generateX25519Identity();
    const input = await fakeBackup(await identityToRecipient(identity));
    const out = tempDir();
    const files = await verifyAndDecrypt({ input, identity, out });
    expect(files).toEqual(DUMPS.map((d) => d.file));
    expect(readFileSync(join(out, "data.sql"), "utf8")).toBe("-- conteúdo fictício de data.sql\n");
  });

  it("arquivo alterado: recusa antes de decifrar", async () => {
    const identity = await generateX25519Identity();
    const input = await fakeBackup(await identityToRecipient(identity));
    writeFileSync(join(input, "data.sql.age"), "alterado");
    await expect(verifyAndDecrypt({ input, identity, out: tempDir() })).rejects.toThrow(
      "Soma de verificação não confere: data.sql.age",
    );
  });

  it("outra chave não decifra", async () => {
    const input = await fakeBackup(await identityToRecipient(await generateX25519Identity()));
    const other = await generateX25519Identity();
    await expect(verifyAndDecrypt({ input, identity: other, out: tempDir() })).rejects.toThrow();
  });
});
