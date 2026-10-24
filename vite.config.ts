/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import { buildCsp } from './csp.config.ts';

/**
 * Injeta a Content-Security-Policy só no build de produção.
 * Em dev o Vite precisa de estilos inline e WebSocket (HMR), que a CSP bloquearia.
 */
function cspPlugin(apiBaseUrl: string): Plugin {
  return {
    name: 'juryscan-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp(apiBaseUrl) },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiBaseUrl = env.VITE_API_BASE_URL ?? 'http://localhost:8000';

  return {
    plugins: [
      react(),
      tailwindcss(),
      cspPlugin(apiBaseUrl),
      // Serve o script do Service Worker do MSW apenas no modo "mock".
      ...(mode === 'mock' ? [msw({ mode: 'worker-only' })] : []),
    ],
    build: {
      sourcemap: false,
      target: 'es2022',
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
