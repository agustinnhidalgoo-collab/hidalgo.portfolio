"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm({ configProblem }: { configProblem: string | null }) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión.");
        setBusy(false);
        return;
      }
      const next = params.get("next");
      // Solo se permiten redirecciones internas.
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
    } catch {
      setError("Error de red.");
      setBusy(false);
    }
  };

  return (
    <form className="a-login__form" onSubmit={submit} noValidate>
      <div>
        <p className="a-meta a-muted">Acceso privado</p>
        <h1 className="a-display" style={{ fontSize: "2.4rem", marginTop: 6 }}>
          Panel
        </h1>
      </div>
      {configProblem && (
        <div className="a-error" role="alert">
          <p>El acceso no está configurado todavía.</p>
          <p className="a-help" style={{ marginTop: 6 }}>
            {configProblem} Revisá el archivo <code>.env.local</code> (ver README).
          </p>
        </div>
      )}
      <div className="a-field">
        <label className="a-label" htmlFor="email">
          Email
        </label>
        <input id="email" className="a-input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="a-field">
        <label className="a-label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          className="a-input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="a-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="a-btn a-btn--solid" disabled={busy || !email || !password} style={{ minHeight: 48 }}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
      <a href="/" className="a-help">
        ← Volver al sitio
      </a>
    </form>
  );
}
