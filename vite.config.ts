import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: [
      ...(mode === 'e2e'
        ? [
            {
              find: '@/data/regulations/load',
              replacement: fileURLToPath(
                new URL('./tests/e2e/support/regulations.ts', import.meta.url),
              ),
            },
          ]
        : []),
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
}));
