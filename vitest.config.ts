import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // .mjs tests guard static files and must stay outside the Workers TS project.
    include: ['functions/**/__tests__/**/*.test.{ts,mjs}'],
  },
});
