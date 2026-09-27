import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { hasUnpublishedChanges, listProjects } from "@/lib/content";
import { projectContentSchema } from "@/lib/types";
import { newId } from "@/lib/utils";
import { readJson } from "@/lib/api";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const projects = await listProjects();
  return NextResponse.json({
    projects: projects.map((p) => ({ ...p, hasChanges: hasUnpublishedChanges(p) })),
  });
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await readJson<{ title?: string }>(req);
  const title = (body?.title ?? "").toString().slice(0, 200).trim() || "Nuevo proyecto";

  const existing = await listProjects();
  const used = new Set(existing.map((p) => p.slug));
  let slug = "nuevo-proyecto";
  for (let i = 2; used.has(slug); i++) slug = `nuevo-proyecto-${i}`;

  const draft = projectContentSchema.parse({ slug, title: { es: title, en: "" } });
  const now = Date.now();
  const id = newId();
  const minOrder = existing.reduce((m, p) => Math.min(m, p.sortOrder), 0);
  const db = await getDb();
  await db.insert(schema.projects).values({
    id,
    slug,
    status: "draft",
    featured: false,
    sortOrder: minOrder - 1,
    draft: JSON.stringify(draft),
    published: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ id }, { status: 201 });
}
