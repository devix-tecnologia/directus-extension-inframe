import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 300000, // 5 minutos para cada teste
    hookTimeout: 300000, // 5 minutos para hooks (beforeAll, afterAll)
    setupFiles: [],
    maxConcurrency: 1, // Executa apenas 1 teste por vez
    pool: 'forks', // Usa processo separado para cada teste
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/', '**/*.spec.ts', '**/*.test.ts'],
    },
  },
});
