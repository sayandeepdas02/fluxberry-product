import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 40000,
    pool: 'forks',
  },
});
