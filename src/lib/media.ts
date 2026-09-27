import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { MediaKind, MediaVariant } from "./types";

export function mediaDir(): string {
  return path.resolve(process.env.MEDIA_DIR || "./storage/media");
}

/** Resuelve un nombre de archivo dentro de la carpeta de medios, sin permitir salir de ella. */
export function resolveMediaPath(file: string): string | null {
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) return null;
  const root = mediaDir();
  const full = path.resolve(root, file);
  return full.startsWith(root + path.sep) ? full : null;
}

/* ─── Validación por firma binaria (no se confía en la extensión) ─ */

interface Detected {
  kind: MediaKind;
  mime: string;
  ext: string;
}

const LIMITS: Record<MediaKind, number> = {
  image: 25 * 1024 * 1024,
  video: 300 * 1024 * 1024,
  file: 20 * 1024 * 1024,
};

export function detectType(buf: Buffer): Detected | null {
  const hex = (start: number, len: number) => buf.subarray(start, start + len).toString("hex");
  const ascii = (start: number, len: number) => buf.subarray(start, start + len).toString("latin1");

  if (hex(0, 3) === "ffd8ff") return { kind: "image", mime: "image/jpeg", ext: "jpg" };
  if (hex(0, 8) === "89504e470d0a1a0a") return { kind: "image", mime: "image/png", ext: "png" };
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return { kind: "image", mime: "image/gif", ext: "gif" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { kind: "image", mime: "image/webp", ext: "webp" };
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") return { kind: "image", mime: "image/avif", ext: "avif" };
    if (brand === "qt  ") return { kind: "video", mime: "video/quicktime", ext: "mov" };
    return { kind: "video", mime: "video/mp4", ext: "mp4" };
  }
  if (hex(0, 4) === "1a45dfa3") return { kind: "video", mime: "video/webm", ext: "webm" };
  if (ascii(0, 5) === "%PDF-") return { kind: "file", mime: "application/pdf", ext: "pdf" };
  return null;
}

export class UploadError extends Error {}

const VARIANT_WIDTHS = [480, 960, 1440, 2200];

export interface StoredMedia {
  id: string;
  kind: MediaKind;
  file: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  blur: string | null;
  variants: MediaVariant[];
}

/** Valida, procesa y guarda un archivo subido. */
export async function storeUpload(buf: Buffer): Promise<StoredMedia> {
  const detected = detectType(buf);
  if (!detected) {
    throw new UploadError("Formato no admitido. Usá JPG, PNG, WEBP, AVIF, GIF, MP4, WEBM, MOV o PDF.");
  }
  if (buf.length > LIMITS[detected.kind]) {
    const mb = Math.round(LIMITS[detected.kind] / 1024 / 1024);
    throw new UploadError(`El archivo supera el máximo de ${mb} MB para este tipo.`);
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const dir = mediaDir();
  await fs.mkdir(dir, { recursive: true });

  const file = `${id}.${detected.ext}`;
  await fs.writeFile(path.join(dir, file), buf);

  const result: StoredMedia = {
    id,
    kind: detected.kind,
    file,
    mime: detected.mime,
    size: buf.length,
    width: null,
    height: null,
    blur: null,
    variants: [],
  };

  if (detected.kind === "image") {
    try {
      const img = sharp(buf, { animated: false, limitInputPixels: 120_000_000 }).rotate();
      const meta = await img.metadata();
      // Con rotación EXIF 5-8 el ancho y el alto se intercambian.
      const swap = (meta.orientation ?? 1) >= 5;
      result.width = (swap ? meta.height : meta.width) ?? null;
      result.height = (swap ? meta.width : meta.height) ?? null;

      const tiny = await sharp(buf).rotate().resize(24).webp({ quality: 40 }).toBuffer();
      result.blur = `data:image/webp;base64,${tiny.toString("base64")}`;

      // Los GIF se sirven originales para conservar la animación.
      if (detected.mime !== "image/gif" && result.width) {
        const widths = VARIANT_WIDTHS.filter((w) => w < result.width!);
        widths.push(Math.min(result.width, 2800));
        for (const w of [...new Set(widths)]) {
          const vFile = `${id}-${w}.webp`;
          await sharp(buf)
            .rotate()
            .resize({ width: w, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(path.join(dir, vFile));
          result.variants.push({ w, file: vFile });
        }
      }
    } catch {
      await fs.rm(path.join(dir, file), { force: true });
      throw new UploadError("No se pudo procesar la imagen. ¿Está dañada?");
    }
  }

  return result;
}

export async function deleteStoredFiles(file: string, variants: MediaVariant[]) {
  for (const f of [file, ...variants.map((v) => v.file)]) {
    const p = resolveMediaPath(f);
    if (p) await fs.rm(p, { force: true });
  }
}
