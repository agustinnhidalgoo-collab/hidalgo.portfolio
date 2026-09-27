import type { MetadataRoute } from "next";
import { projects } from "@/lib/content";
import { siteUrl } from "@/lib/site-meta";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages = ["", "/work", "/about", "/contact"];
  const entry = (path: string): MetadataRoute.Sitemap[number] => ({
    url: `${base}/es${path}`,
    alternates: { languages: { es: `${base}/es${path}`, en: `${base}/en${path}` } },
  });
  return [...pages.map(entry), ...projects.map((p) => entry(`/work/${p.slug}`))];
}
