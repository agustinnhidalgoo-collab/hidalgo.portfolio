import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const LOCALES = ["es", "en"];

function preferredLocale(req: NextRequest): string {
  const header = req.headers.get("accept-language") ?? "";
  const first = header.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return first === "en" ? "en" : "es";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Panel privado y vistas previas: exigen sesión válida.
  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isPreview = /^\/(es|en)\/preview(\/|$)/.test(pathname);
  if (isAdminPage || isPreview) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (pathname.startsWith("/admin")) return NextResponse.next();

  // Sitio público: toda ruta sin prefijo de idioma se redirige.
  const segment = pathname.split("/")[1];
  if (!LOCALES.includes(segment)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${preferredLocale(req)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Se excluyen la API (cada handler verifica la sesión), los medios y los estáticos.
  matcher: ["/((?!api|media|_next|favicon|icon|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};
