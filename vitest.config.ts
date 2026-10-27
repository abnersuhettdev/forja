// Testes de unidade do monorepo (SEG-03). Metas de cobertura de RNF-021 bloqueiam o CI.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/tests/**/*.test.ts", "apps/*/src/**/*.test.ts", "scripts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/domain/src/**/*.ts"],
      thresholds: {
        "packages/domain/src/**": { lines: 90, branches: 90, functions: 90, statements: 90 },
      },
    },
  },
});
