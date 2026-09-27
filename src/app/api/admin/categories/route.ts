import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { listCategories } from "@/lib/content";
import { l10nSchema } from "@/lib/types";
import { badRequest, readJson, zodMessage } from "@/lib/api";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ categories: await listCategories() });
}

const listSchema = z.array(z.object({ id: z.string().min(1).max(64), name: l10nSchema })).max(50);

/** Reemplaza la lista completa de categorías (el orden del array es el orden). */
export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await readJson<{ categories?: unknown }>(req);
  const parsed = listSchema.safeParse(body?.categories);
  if (!parsed.success) return badRequest(zodMessage(parsed.error));
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(schema.categories);
    for (let i = 0; i < parsed.data.length; i++) {
      const c = parsed.data[i];
      await tx.insert(schema.categories).values({ id: c.id, name: JSON.stringify(c.name), sortOrder: i });
    }
  });
  return NextResponse.json({ categories: await listCategories() });
}
