import { defineConfig } from 'astro/config';

// Dirección pública (Vercel). Con un dominio propio: definir SITE_URL o cambiarla acá.
// Se usa para la vista previa al compartir (og:image), el canonical y el sitemap.
export default defineConfig({
  site: process.env.SITE_URL || 'https://hidalgo-portfolio-two.vercel.app',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
});
