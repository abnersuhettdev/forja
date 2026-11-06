import { describe, expect, it } from "vitest";
import { projectRef, redact, secretsFile, syncDbUrl } from "./configure-sync.ts";

describe("configuração da função no projeto real", () => {
  it("extrai a referência do endereço do projeto", () => {
    expect(projectRef("https://abcd1234.supabase.co")).toBe("abcd1234");
    expect(() => projectRef("https://exemplo.test")).toThrow("SUPABASE_URL");
  });

  it("troca o usuário administrativo pelo sync_writer, mantendo servidor e referência", () => {
    const admin =
      "postgresql://postgres.abcd1234:adm@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
    expect(syncDbUrl(admin, "senha-ficticia")).toBe(
      "postgresql://sync_writer.abcd1234:senha-ficticia@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
    );
  });

  it("tira os segredos da mensagem de erro", () => {
    expect(
      redact("falhou: postgresql://u:senha@h e senha", ["postgresql://u:senha@h", "senha"]),
    ).toBe("falhou: *** e ***");
    expect(redact("nada", [""])).toBe("nada");
  });

  it("na conexão direta, sem referência no usuário", () => {
    expect(syncDbUrl("postgresql://postgres:adm@db.abcd1234.supabase.co:5432/postgres", "s")).toBe(
      "postgresql://sync_writer:s@db.abcd1234.supabase.co:5432/postgres",
    );
  });
});

describe("segredos das funções (V12-10)", () => {
  it("leva os da Workers AI só quando os dois existem", () => {
    const base = { syncUrl: "postgresql://s:x@h/p", origins: "https://app.exemplo.test" };
    expect(secretsFile(base)).toBe(
      "SYNC_DB_URL=postgresql://s:x@h/p\nALLOWED_ORIGINS=https://app.exemplo.test\n",
    );
    expect(secretsFile({ ...base, cloudflareAccount: "conta" })).not.toContain("CLOUDFLARE");
    expect(
      secretsFile({
        ...base,
        origins: "",
        cloudflareAccount: "conta",
        cloudflareToken: "token-ficticio",
      }),
    ).toBe(
      "SYNC_DB_URL=postgresql://s:x@h/p\nCLOUDFLARE_ACCOUNT_ID=conta\nCLOUDFLARE_AI_TOKEN=token-ficticio\n",
    );
  });
});
