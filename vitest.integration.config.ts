// Testes de integração contra o Supabase local (ADR-090): exigem `pnpm db:start`.
// Meta da TAR-010: cobertura ≥ 80% na função de sincronização.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["supabase/functions/**/*.test.ts"],
    testTimeout: 20_000,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["supabase/functions/sync/**/*.ts"],
      // index.ts é o servidor Deno, exercitado pelo teste HTTP (fora da medição em Node).
      exclude: ["supabase/functions/sync/index.ts", "supabase/functions/**/*.d.ts"],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
