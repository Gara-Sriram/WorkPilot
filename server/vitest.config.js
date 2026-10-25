import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    testTimeout: 60000,
    hookTimeout: 60000,
    threads: false, // run serially to avoid in-memory database collisions
  },
});
