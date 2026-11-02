import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// In dev, /api is proxied to server.mjs (npm run serve) so the real Claude transport works locally.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022' },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
