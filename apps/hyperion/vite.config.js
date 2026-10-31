import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// <title> and description follow the car profile chosen with VITE_CAR (default: the F1 study)
const META = {
  hyperion: ['Hyperion GEN.2', 'Hyperion GEN.2, a hypercar that was never built, designed and modelled by Sumanth Richie. Live 3D, exploded anatomy and Cycles renders.'],
  f1: ['Alpine F1 Study', 'A Formula 1 car in Alpine livery, rebuilt and rigged in 3D by Sumanth Richie: UV-C sweep, steering and DRS, exploded anatomy with a V6 hybrid, Cycles renders.'],
};
const carMeta = () => ({
  name: 'car-meta',
  transformIndexHtml(html) {
    const [title, desc] = META[process.env.VITE_CAR] || META.f1;
    return html.replace(/<title>.*<\/title>/, `<title>${title}</title>`).replace(/(<meta name="description" content=")[^"]*/, `$1${desc}`);
  },
});

// base './' keeps every asset path relative, so the build runs from any folder or static host
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), carMeta()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1200, assetsInlineLimit: 0 },
  server: { host: true },
});
