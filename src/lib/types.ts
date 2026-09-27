import type { StaticImageData } from "next/image";

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/* ─── Texto bilingüe ─────────────────────────────────────────── */

export type L10n = { es: string; en: string };

/** Devuelve el texto en el idioma pedido o, si está vacío, en el otro. */
export function t(value: L10n | undefined | null, locale: Locale): string {
  if (!value) return "";
  if (value[locale]?.trim()) return value[locale];
  return value[locale === "es" ? "en" : "es"] ?? "";
}

/* ─── Medios ─────────────────────────────────────────────────── */

/** Imagen importada desde src/content/images (Next calcula tamaño y difuminado). */
export interface ImageMedia {
  type: "image";
  src: StaticImageData;
  alt: L10n;
}

/** Video corto guardado en /public (ej. "/videos/loop.mp4"). Para videos largos, usar un bloque de YouTube/Vimeo. */
export interface VideoMedia {
  type: "video";
  src: string;
  alt: L10n;
  poster?: StaticImageData;
}

export type Media = ImageMedia | VideoMedia;

/* ─── Bloques de un proyecto ────────────────────────────────── */

export type Block =
  | { type: "text"; heading?: L10n; body: L10n }
  | { type: "image"; media: Media; caption?: L10n; size?: "contained" | "wide" }
  | { type: "full"; media: Media; caption?: L10n }
  | { type: "gallery"; items: { media: Media; caption?: L10n }[]; columns?: 2 | 3 }
  | { type: "columns"; left: Media | L10n; right: Media | L10n }
  | { type: "embed"; url: string; caption?: L10n };

/* ─── Proyecto ──────────────────────────────────────────────── */

export interface Project {
  slug: string;
  title: L10n;
  summary: L10n;
  year: string;
  client?: L10n;
  role?: L10n;
  categories: string[];
  cover: ImageMedia;
  /** Aparece en la lista de la Home. */
  featured?: boolean;
  blocks: Block[];
  /** Marca el contenido de ejemplo que todavía hay que reemplazar. */
  isExample?: boolean;
}

export interface Category {
  id: string;
  name: L10n;
}

/* ─── Datos generales del sitio ─────────────────────────────── */

export interface SiteContent {
  intro: L10n;
  tagline: L10n;
  bio: L10n;
  location: L10n;
  availability: L10n;
  disciplines: L10n[];
  services: { title: L10n; description?: L10n }[];
  email: string;
  phone?: string;
  links: { label: string; url: string }[];
  portrait?: ImageMedia;
  /** Foto o video que se ve “a través” de HIDALGO al entrar al sitio. */
  world?: Media;
  /** PDFs dentro de /public, ej. "/cv/CV-Hidalgo-ES.pdf" */
  cv: { es?: string; en?: string };
  seoDescription: L10n;
  timezone: string;
  isExample?: boolean;
}

export function isMedia(value: Media | L10n): value is Media {
  return "type" in value;
}
