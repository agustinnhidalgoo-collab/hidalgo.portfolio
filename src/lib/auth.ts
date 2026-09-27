import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./session";

/* ─── Contraseñas (scrypt) ──────────────────────────────────── */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  // Separador ":" (el "$" lo expande el cargador de .env de Next).
  const [algo, n, r, p, saltB64, hashB64] = stored.split(":");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function authConfigProblem(): string | null {
  if (!process.env.ADMIN_EMAIL) return "Falta ADMIN_EMAIL en las variables de entorno.";
  if (!process.env.ADMIN_PASSWORD_HASH) return "Falta ADMIN_PASSWORD_HASH (generalo con `npm run admin:hash`).";
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    return "SESSION_SECRET falta o tiene menos de 32 caracteres.";
  return null;
}

/* ─── Sesión en el servidor ─────────────────────────────────── */

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Protege un route handler de la API privada. Además de la sesión verifica
 * que las peticiones que modifican datos vengan del mismo origen (CSRF).
 */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (req.method !== "GET" && req.method !== "HEAD") {
    const h = await headers();
    const origin = h.get("origin");
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }
  }
  return null;
}

/* ─── Límite de intentos de login (en memoria) ──────────────── */

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function loginRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.until) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function registerFailedLogin(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() > entry.until) attempts.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else entry.count += 1;
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}
