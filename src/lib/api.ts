import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function zodMessage(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Datos inválidos";
  const where = issue.path.join(" › ");
  return where ? `${issue.message} (${where})` : issue.message;
}

export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
