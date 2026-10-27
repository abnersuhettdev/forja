// Tipos mínimos do ambiente Deno usados pela função, para a checagem com o TypeScript do
// monorepo (a função roda no Supabase Edge Runtime).
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (request: Request) => Response | Promise<Response>): unknown;
}
