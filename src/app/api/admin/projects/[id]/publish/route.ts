import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getProject } from "@/lib/content";
import { badRequest } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Publica: copia el borrador a la versión pública. */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const d = project.draft;
  if (!d.title.es.trim() && !d.title.en.trim()) return badRequest("El proyecto necesita un título para publicarse.");

  const db = await getDb();
  const clash = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(eq(schema.projects.slug, d.slug), ne(schema.projects.id, id)))
    .limit(1);
  if (clash.length) return badRequest(`El slug “${d.slug}” ya lo usa otro proyecto.`);

  const now = Date.now();
  await db
    .update(schema.projects)
    .set({ status: "published", published: JSON.stringify(d), slug: d.slug, publishedAt: now, updatedAt: now })
    .where(eq(schema.projects.id, id));
  return NextResponse.json({ ok: true });
}

/** Despublica: deja de mostrarse en el sitio. El borrador se conserva. */
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const db = await getDb();
  await db
    .update(schema.projects)
    .set({ status: "draft", published: null, updatedAt: Date.now() })
    .where(eq(schema.projects.id, id));
  return NextResponse.json({ ok: true });
}
