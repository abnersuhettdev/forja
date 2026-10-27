// Lista de senhas comuns (RN-031; fonte em data/FONTE.md), carregada sob demanda.
let cache: Promise<ReadonlySet<string>> | null = null;

export function loadCommonPasswords(): Promise<ReadonlySet<string>> {
  cache ??= import("./data/senhas-comuns.txt?raw").then(
    ({ default: text }) => new Set(text.split("\n").filter((line) => line !== "")),
  );
  return cache;
}
