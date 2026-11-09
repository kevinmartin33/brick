/// <reference types="vitest" />
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// /build/7140 is served by build/index.html (same rewrite as firebase.json in production).
const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
  if (req.url && /^\/build\/[^./?]+\/?(\?.*)?$/.test(req.url)) {
    const q = req.url.indexOf('?');
    req.url = '/build/index.html' + (q >= 0 ? req.url.slice(q) : '');
  }
  next();
};
const buildRoutes: Plugin = {
  name: 'build-routes',
  configureServer(server) { server.middlewares.use(rewrite); },
  configurePreviewServer(server) { server.middlewares.use(rewrite); },
};

export default defineConfig({
  plugins: [buildRoutes],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        site: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'build/index.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
