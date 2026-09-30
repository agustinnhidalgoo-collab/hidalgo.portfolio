import { defineConfig } from 'astro/config';

// Sin `site`: el dominio final no está confirmado, así que no se emiten
// canonicals ni sitemap con URLs absolutas (ver README, "Dominio").
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  devToolbar: { enabled: false },
});
