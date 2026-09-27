import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getProject } from "@/lib/content";
import { badRequest } from "@/lib/api";

/** Descarta los cambios del borrador y vuelve a la versión publicada. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (!project.published) return badRequest("No hay una versión publicada a la que volver.");
  const db = await getDb();
  await db
    .update(schema.projects)
    .set({ draft: JSON.stringify(project.published), updatedAt: Date.now() })
    .where(eq(schema.projects.id, id));
  return NextResponse.json({ ok: true });
}
