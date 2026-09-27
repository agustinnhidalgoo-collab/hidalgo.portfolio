import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import {
  type Category,
  type MediaRecord,
  type ProjectContent,
  type ProjectRecord,
  type SiteSettings,
  projectContentSchema,
  siteSettingsSchema,
} from "./types";

/* ─── Serialización ─────────────────────────────────────────── */

type ProjectRow = typeof schema.projects.$inferSelect;
type MediaRow = typeof schema.media.$inferSelect;

function parseContent(json: string | null): ProjectContent | null {
  if (!json) return null;
  try {
    return projectContentSchema.parse(JSON.parse(json));
  } catch {
    return null;
  }
}

function toProject(row: ProjectRow): ProjectRecord {
  const draft =
    parseContent(row.draft) ??
    projectContentSchema.parse({ slug: row.slug, title: { es: "", en: "" } });
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    featured: row.featured,
    sortOrder: row.sortOrder,
    draft,
    published: parseContent(row.published),
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toMedia(row: MediaRow): MediaRecord {
  let variants: MediaRecord["variants"] = [];
  let alt = { es: "", en: "" };
  try {
    variants = JSON.parse(row.variants);
  } catch {}
  try {
    alt = { es: "", en: "", ...JSON.parse(row.alt) };
  } catch {}
  return { ...row, kind: row.kind, variants, alt };
}

export function hasUnpublishedChanges(p: ProjectRecord): boolean {
  if (!p.published) return true;
  return JSON.stringify(p.draft) !== JSON.stringify(p.published);
}

/* ─── Proyectos ─────────────────────────────────────────────── */

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.projects).orderBy(asc(schema.projects.sortOrder));
  return rows.map(toProject);
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
  return rows[0] ? toProject(rows[0]) : null;
}

/** Proyecto público: una versión publicada lista para mostrar. */
export interface PublicProject {
  id: string;
  slug: string;
  featured: boolean;
  content: ProjectContent;
}

export async function listPublishedProjects(): Promise<PublicProject[]> {
  const all = await listProjects();
  return all
    .filter((p) => p.status === "published" && p.published)
    .map((p) => ({ id: p.id, slug: p.slug, featured: p.featured, content: p.published! }));
}

export async function getPublishedProjectBySlug(slug: string) {
  const all = await listPublishedProjects();
  const index = all.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  const next = all.length > 1 ? all[(index + 1) % all.length] : null;
  return { project: all[index], next };
}

/* ─── Medios ────────────────────────────────────────────────── */

export async function listMedia(): Promise<MediaRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.media);
  return rows.map(toMedia).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMediaMap(ids: (string | null | undefined)[]): Promise<Record<string, MediaRecord>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return {};
  const db = await getDb();
  const rows = await db.select().from(schema.media).where(inArray(schema.media.id, unique));
  return Object.fromEntries(rows.map((r) => [r.id, toMedia(r)]));
}

/** Todos los ids de medios referenciados por un proyecto. */
export function collectMediaIds(content: ProjectContent): string[] {
  const ids: (string | null)[] = [content.coverId];
  for (const b of content.blocks) {
    switch (b.type) {
      case "image":
      case "full":
        ids.push(b.mediaId);
        break;
      case "gallery":
        b.items.forEach((i) => ids.push(i.mediaId));
        break;
      case "columns":
        ids.push(b.left.mediaId, b.right.mediaId);
        break;
      case "video":
        if (b.source === "upload") ids.push(b.mediaId);
        break;
    }
  }
  return ids.filter((x): x is string => !!x);
}

/* ─── Categorías ────────────────────────────────────────────── */

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder));
  return rows.map((r) => {
    let name = { es: "", en: "" };
    try {
      name = { ...name, ...JSON.parse(r.name) };
    } catch {}
    return { id: r.id, name, sortOrder: r.sortOrder };
  });
}

/* ─── Ajustes ───────────────────────────────────────────────── */

export async function getSettings(): Promise<SiteSettings> {
  const db = await getDb();
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, "site")).limit(1);
  let raw: unknown = {};
  if (rows[0]) {
    try {
      raw = JSON.parse(rows[0].value);
    } catch {}
  }
  const parsed = siteSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : siteSettingsSchema.parse({});
}

export async function saveSettings(value: SiteSettings) {
  const db = await getDb();
  const json = JSON.stringify(value);
  const now = Date.now();
  await db
    .insert(schema.settings)
    .values({ key: "site", value: json, updatedAt: now })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: json, updatedAt: now } });
}
