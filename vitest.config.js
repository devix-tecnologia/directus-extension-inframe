import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 300000, // 5 minutos para cada teste
    hookTimeout: 300000, // 5 minutos para hooks (beforeAll, afterAll)
    maxConcurrency: 3, // Máximo 3 versões do Directus em paralelo
    fileParallelism: false, // Desabilitar paralelismo entre arquivos de teste
    setupFiles: [],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/e2e/**', // Excluir testes E2E do Playwright
    ],
    // Migração do poolOptions para top-level (Vitest 4+)
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    maxThreads: 3,
    minThreads: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/', '**/*.spec.ts', '**/*.test.ts'],
    },
  },
});
