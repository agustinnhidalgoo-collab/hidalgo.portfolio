import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { collectMediaIds, getSettings, listProjects, toMedia } from "@/lib/content";
import { deleteStoredFiles } from "@/lib/media";
import { l10nSchema, t } from "@/lib/types";
import { badRequest, readJson } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Actualiza el texto alternativo (ES/EN). */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await readJson<{ alt?: unknown }>(req);
  const alt = l10nSchema.safeParse(body?.alt);
  if (!alt.success) return badRequest("Texto alternativo inválido");
  const db = await getDb();
  await db
    .update(schema.media)
    .set({ alt: JSON.stringify({ es: alt.data.es.slice(0, 300), en: alt.data.en.slice(0, 300) }) })
    .where(eq(schema.media.id, id));
  const row = await db.select().from(schema.media).where(eq(schema.media.id, id)).limit(1);
  if (!row[0]) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ media: toMedia(row[0]) });
}

/** Dónde se usa un archivo. */
async function usagesOf(id: string): Promise<string[]> {
  const out: string[] = [];
  for (const p of await listProjects()) {
    const ids = new Set([...collectMediaIds(p.draft), ...(p.published ? collectMediaIds(p.published) : [])]);
    if (ids.has(id)) out.push(`Proyecto: ${t(p.draft.title, "es") || p.slug}`);
  }
  const s = await getSettings();
  if (s.portraitId === id) out.push("Ajustes: retrato");
  if (s.cv.es === id || s.cv.en === id) out.push("Ajustes: CV");
  return out;
}

/** Borra el archivo. Si está en uso, responde 409 salvo que venga ?force=1. */
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const force = new URL(req.url).searchParams.get("force") === "1";
  const db = await getDb();
  const row = await db.select().from(schema.media).where(eq(schema.media.id, id)).limit(1);
  if (!row[0]) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const usages = await usagesOf(id);
  if (usages.length && !force) {
    return NextResponse.json({ error: "El archivo está en uso", usages }, { status: 409 });
  }
  const m = toMedia(row[0]);
  await db.delete(schema.media).where(eq(schema.media.id, id));
  await deleteStoredFiles(m.file, m.variants);
  return NextResponse.json({ ok: true });
}
