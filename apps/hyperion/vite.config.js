import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' keeps every asset path relative, so the build runs from any folder or static host
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // fonts are inlined only for the artifact preview, whose CSP blocks self-hosted font files
  build: {
    // two pages, one per car: index.html is Hyperion, f1.html the F1 study
    rollupOptions: { input: { index: 'index.html', f1: 'f1.html' } },
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    assetsInlineLimit: (file) => (process.env.VITE_MODEL_WRAP && file.endsWith('.woff2') ? true : false),
  },
  server: { host: true },
});
