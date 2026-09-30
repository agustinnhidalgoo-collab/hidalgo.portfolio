import type { APIRoute } from 'astro';
import { getProjects } from '../lib/projects';

/** Solo emite URLs si se compila con SITE_URL (dominio confirmado). */
export const GET: APIRoute = async ({ site }) => {
  const paths = ['/', '/sobre-mi'];
  for (const p of await getProjects()) paths.push(`/proyectos/${p.id}`);
  const urls = site ? paths.map((p) => `<url><loc>${new URL(p, site).toString()}</loc></url>`).join('') : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
