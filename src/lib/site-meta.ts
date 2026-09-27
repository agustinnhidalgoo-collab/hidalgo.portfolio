/** URL pública: SITE_URL si está definida; si no, la que asigna Vercel; si no, localhost. */
export function siteUrl(): string {
  const url =
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}
