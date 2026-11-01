import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ base: './', plugins: [react(), tailwindcss()], build: { target: 'es2022', assetsInlineLimit: (file) => (file.endsWith('.woff2') ? true : undefined) } });
