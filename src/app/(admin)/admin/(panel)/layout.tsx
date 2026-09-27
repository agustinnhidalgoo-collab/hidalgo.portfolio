import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

/** Segunda barrera (además del middleware): sin sesión válida no se renderiza nada del panel. */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
