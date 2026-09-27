import { redirect } from "next/navigation";
import { Suspense } from "react";
import { authConfigProblem, getSession } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <main className="a-login">
      <div className="a-login__art" data-theme="dark" style={{ background: "var(--cocoa)", color: "var(--butter)" }}>
        <span className="a-meta">Hidalgo — Graphic Designer</span>
        <span className="a-display" aria-hidden="true">
          Hida
          <br />
          lgo
        </span>
      </div>
      <Suspense>
        <LoginForm configProblem={authConfigProblem()} />
      </Suspense>
    </main>
  );
}
