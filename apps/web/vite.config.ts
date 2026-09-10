import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@trackcontrol/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    // host: true expone el server en la red local (0.0.0.0) para poder probar
    // desde un teléfono/tablet físico conectado al mismo WiFi.
    host: true,
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000', changeOrigin: true },
    },
  },
});
