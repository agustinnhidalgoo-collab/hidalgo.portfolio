/**
 * Firma y verificación de la sesión (JWT HS256). No usa APIs de Node, así que
 * funciona tanto en el middleware (edge) como en los route handlers.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hidalgo_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function secretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function signSession(email: string): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("SESSION_SECRET no está configurado (mínimo 32 caracteres).");
  return new SignJWT({ sub: email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySession(token: string | undefined | null): Promise<{ email: string } | null> {
  const key = secretKey();
  if (!token || !key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.role !== "admin" || typeof payload.sub !== "string") return null;
    if (payload.sub !== process.env.ADMIN_EMAIL) return null;
    return { email: payload.sub };
  } catch {
    return null;
  }
}
