import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getProject, hasUnpublishedChanges } from "@/lib/content";
import { projectContentSchema } from "@/lib/types";
import { badRequest, readJson, zodMessage } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return NextResponse.json({ project: { ...project, hasChanges: hasUnpublishedChanges(project) } });
}

/** Guarda el borrador. No toca la versión publicada. */
export async function PUT(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const body = await readJson<{ draft?: unknown }>(req);
  const parsed = projectContentSchema.safeParse(body?.draft);
  if (!parsed.success) return badRequest(zodMessage(parsed.error));
  const draft = parsed.data;

  const db = await getDb();
  const clash = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(and(eq(schema.projects.slug, draft.slug), ne(schema.projects.id, id)))
    .limit(1);
  if (clash.length) return badRequest(`El slug “${draft.slug}” ya lo usa otro proyecto.`);

  // Si nunca se publicó, la URL puede cambiar ya; si está publicado, cambia al publicar.
  const slug = project.status === "published" ? project.slug : draft.slug;
  await db
    .update(schema.projects)
    .set({ draft: JSON.stringify(draft), slug, updatedAt: Date.now() })
    .where(eq(schema.projects.id, id));
  const updated = (await getProject(id))!;
  return NextResponse.json({ project: { ...updated, hasChanges: hasUnpublishedChanges(updated) } });
}

/** Cambios de metadatos: destacado. */
export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await readJson<{ featured?: unknown }>(req);
  if (typeof body?.featured !== "boolean") return badRequest("Falta 'featured'");
  const db = await getDb();
  await db.update(schema.projects).set({ featured: body.featured }).where(eq(schema.projects.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const db = await getDb();
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
  return NextResponse.json({ ok: true });
}
