import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { badRequest, readJson } from "@/lib/api";

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await readJson<{ ids?: unknown }>(req);
  const ids = body?.ids;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string") || ids.length > 1000) {
    return badRequest("Lista de ids inválida");
  }
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(schema.projects).set({ sortOrder: i }).where(eq(schema.projects.id, ids[i] as string));
    }
  });
  return NextResponse.json({ ok: true });
}
