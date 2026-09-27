"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Oculta su contenido cuando la ruta termina en `suffix`. */
export function HideOnPath({ suffix, children }: { suffix: string; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.endsWith(suffix)) return null;
  return <>{children}</>;
}
