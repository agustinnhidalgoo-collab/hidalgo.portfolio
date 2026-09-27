import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-meta";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/es/preview", "/en/preview"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
