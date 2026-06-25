import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['functions/_shared/platforms/__tests__/**/*.test.ts'],
  },
});