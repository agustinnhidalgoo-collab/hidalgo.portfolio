"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MediaProvider } from "./MediaLibrary";
import { UiProvider } from "./ui";
import { confirmLeave } from "./unsaved";

const NAV = [
  { href: "/admin", label: "Proyectos", match: (p: string) => p === "/admin" || p.startsWith("/admin/projects") },
  { href: "/admin/media", label: "Biblioteca", match: (p: string) => p.startsWith("/admin/media") },
  { href: "/admin/settings", label: "Ajustes", match: (p: string) => p.startsWith("/admin/settings") },
];

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const logout = async () => {
    if (!confirmLeave()) return;
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };
  return (
    <UiProvider>
      <MediaProvider>
        <div className="a-shell">
          <aside className="a-side">
            <div>
              <div className="a-display a-side__brand">Hidalgo</div>
              <div className="a-meta a-muted">Panel privado</div>
            </div>
            <nav aria-label="Panel">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="a-side__link"
                  aria-current={n.match(pathname) ? "page" : undefined}
                  onClick={(e) => !confirmLeave() && e.preventDefault()}
                >
                  {n.label}
                </Link>
              ))}
              <a href="/es" target="_blank" rel="noreferrer" className="a-side__link">
                Ver sitio ↗
              </a>
            </nav>
            <div className="a-side__foot">
              <span className="a-help" style={{ wordBreak: "break-all" }}>
                {email}
              </span>
              <button type="button" className="a-btn a-btn--sm" onClick={logout} style={{ borderColor: "var(--butter)" }}>
                Cerrar sesión
              </button>
            </div>
          </aside>
          <main className="a-main">{children}</main>
        </div>
      </MediaProvider>
    </UiProvider>
  );
}
