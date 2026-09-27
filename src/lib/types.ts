import { z } from "zod";

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/* ─── Texto bilingüe ─────────────────────────────────────────── */

export const l10nSchema = z.object({
  es: z.string().max(20000).default(""),
  en: z.string().max(20000).default(""),
});
export type L10n = z.infer<typeof l10nSchema>;

export const emptyL10n = (): L10n => ({ es: "", en: "" });

/** Devuelve el texto en el idioma pedido o, si está vacío, en el otro. */
export function t(value: L10n | undefined | null, locale: Locale): string {
  if (!value) return "";
  const own = value[locale]?.trim();
  if (own) return value[locale];
  return value[locale === "es" ? "en" : "es"] ?? "";
}

/* ─── Bloques de contenido de proyecto ──────────────────────── */

const id = z.string().min(1).max(64);
const mediaRef = z.string().max(64).nullable().default(null);

export const textBlockSchema = z.object({
  id,
  type: z.literal("text"),
  heading: l10nSchema.default(emptyL10n),
  body: l10nSchema.default(emptyL10n),
});

export const imageBlockSchema = z.object({
  id,
  type: z.literal("image"),
  mediaId: mediaRef,
  caption: l10nSchema.default(emptyL10n),
  size: z.enum(["contained", "wide"]).default("contained"),
});

export const fullImageBlockSchema = z.object({
  id,
  type: z.literal("full"),
  mediaId: mediaRef,
  caption: l10nSchema.default(emptyL10n),
});

export const galleryBlockSchema = z.object({
  id,
  type: z.literal("gallery"),
  columns: z.union([z.literal(2), z.literal(3)]).default(2),
  items: z
    .array(z.object({ mediaId: mediaRef, caption: l10nSchema.default(emptyL10n) }))
    .max(60)
    .default([]),
});

export const columnSchema = z.object({
  kind: z.enum(["text", "image"]).default("text"),
  text: l10nSchema.default(emptyL10n),
  mediaId: mediaRef,
});

export const columnsBlockSchema = z.object({
  id,
  type: z.literal("columns"),
  left: columnSchema,
  right: columnSchema,
});

export const videoBlockSchema = z.object({
  id,
  type: z.literal("video"),
  source: z.enum(["upload", "embed"]).default("upload"),
  mediaId: mediaRef,
  url: z.string().max(500).default(""),
  caption: l10nSchema.default(emptyL10n),
  autoplay: z.boolean().default(true),
});

export const blockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  imageBlockSchema,
  fullImageBlockSchema,
  galleryBlockSchema,
  columnsBlockSchema,
  videoBlockSchema,
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: "Texto",
  image: "Imagen",
  full: "Imagen a ancho completo",
  gallery: "Galería",
  columns: "Dos columnas",
  video: "Video",
};

/* ─── Proyecto ──────────────────────────────────────────────── */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const projectContentSchema = z.object({
  slug: z.string().max(120).regex(SLUG_RE, "El slug solo admite minúsculas, números y guiones"),
  title: l10nSchema,
  summary: l10nSchema.default(emptyL10n),
  year: z.string().max(20).default(""),
  client: l10nSchema.default(emptyL10n),
  role: l10nSchema.default(emptyL10n),
  categoryIds: z.array(z.string().max(64)).max(20).default([]),
  coverId: mediaRef,
  blocks: z.array(blockSchema).max(200).default([]),
  isExample: z.boolean().default(false),
});
export type ProjectContent = z.infer<typeof projectContentSchema>;

export type ProjectStatus = "draft" | "published";

export interface ProjectRecord {
  id: string;
  slug: string;
  status: ProjectStatus;
  featured: boolean;
  sortOrder: number;
  draft: ProjectContent;
  published: ProjectContent | null;
  publishedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/* ─── Medios ────────────────────────────────────────────────── */

export type MediaKind = "image" | "video" | "file";

export interface MediaVariant {
  w: number;
  file: string;
}

export interface MediaRecord {
  id: string;
  kind: MediaKind;
  originalName: string;
  file: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  blur: string | null;
  variants: MediaVariant[];
  alt: L10n;
  createdAt: number;
}

/* ─── Categorías ────────────────────────────────────────────── */

export interface Category {
  id: string;
  name: L10n;
  sortOrder: number;
}

/* ─── Ajustes del sitio ─────────────────────────────────────── */

export const siteSettingsSchema = z.object({
  tagline: l10nSchema.default(emptyL10n),
  intro: l10nSchema.default(emptyL10n),
  bio: l10nSchema.default(emptyL10n),
  location: l10nSchema.default(emptyL10n),
  availability: l10nSchema.default(emptyL10n),
  disciplines: z.array(l10nSchema).max(30).default([]),
  services: z
    .array(z.object({ title: l10nSchema, description: l10nSchema.default(emptyL10n) }))
    .max(30)
    .default([]),
  email: z.string().max(200).default(""),
  phone: z.string().max(60).default(""),
  links: z
    .array(z.object({ label: z.string().max(60), url: z.string().max(500) }))
    .max(20)
    .default([]),
  portraitId: mediaRef,
  cv: z.object({ es: mediaRef, en: mediaRef }).default({ es: null, en: null }),
  seoDescription: l10nSchema.default(emptyL10n),
  timezone: z.string().max(60).default("America/Argentina/Buenos_Aires"),
  isExample: z.boolean().default(false),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
