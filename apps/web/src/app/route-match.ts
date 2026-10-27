// Correspondência de rotas lógicas (UX-03 §5). Parâmetros são identificadores opacos ou datas,
// nunca dados pessoais (RNF-017).

export type RouteParams = Readonly<Record<string, string>>;

/** Retorna os parâmetros se `pathname` corresponder a `pattern` (ex.: "/treinos/:id"). */
export function matchRoute(pattern: string, pathname: string): RouteParams | null {
  const patternParts = split(pattern);
  const pathParts = split(pathname);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (const [index, part] of patternParts.entries()) {
    const value = pathParts[index] ?? "";
    if (part.startsWith(":")) {
      if (value === "") return null;
      params[part.slice(1)] = decodeURIComponent(value);
    } else if (part !== value) {
      return null;
    }
  }
  return params;
}

function split(path: string): string[] {
  return path.split("/").filter((part) => part !== "");
}
