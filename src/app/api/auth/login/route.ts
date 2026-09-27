import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  authConfigProblem,
  clearLoginAttempts,
  loginRateLimited,
  registerFailedLogin,
  safeEqual,
  verifyPassword,
} from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";

export async function POST(req: Request) {
  const problem = authConfigProblem();
  if (problem) return NextResponse.json({ error: problem }, { status: 500 });

  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (loginRateLimited(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Probá de nuevo en 15 minutos." }, { status: 429 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const emailOk = safeEqual(email, (process.env.ADMIN_EMAIL ?? "").toLowerCase());
  const passOk = verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);
  if (!emailOk || !passOk) {
    registerFailedLogin(ip);
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  }

  clearLoginAttempts(ip);
  const token = await signSession(process.env.ADMIN_EMAIL!);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
