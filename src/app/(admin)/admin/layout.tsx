import "@fontsource-variable/archivo/wdth.css";
import "@/styles/tokens.css";
import "@/styles/admin.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Panel — HIDALGO", template: "%s — Panel HIDALGO" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" data-theme="light">
      <body className="admin" data-theme="light">
        {children}
      </body>
    </html>
  );
}
