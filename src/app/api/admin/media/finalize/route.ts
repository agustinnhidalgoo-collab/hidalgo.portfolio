import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { toMedia } from "@/lib/content";
import { LIMITS, newMediaId, storeUpload, UploadError, usingBlob } from "@/lib/media";
import { badRequest, readJson } from "@/lib/api";

export const maxDuration = 60;

/**
 * Después de una subida directa a Blob: descarga el archivo, valida su firma
 * binaria y tamaño, genera las variantes y lo registra en la biblioteca.
 * Si no es válido, se borra de Blob.
 */
export async function POST(req: Request) {
  if (!usingBlob()) return badRequest("Vercel Blob no está configurado.");
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = await readJson<{ url?: unknown; originalName?: unknown }>(req);
  const url = typeof body?.url === "string" ? body.url : "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return badRequest("URL inválida");
  }
  // Solo archivos de este almacenamiento y de la carpeta de subidas.
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
    !parsed.pathname.startsWith("/uploads/")
  ) {
    return badRequest("Origen de archivo no permitido");
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return badRequest("No se pudo leer el archivo subido.");
    const size = Number(res.headers.get("content-length") ?? "0");
    if (size > LIMITS.video) {
      await del(url);
      return badRequest("El archivo es demasiado grande.");
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const id = newMediaId();
    let stored;
    try {
      stored = await storeUpload(buf, { id, file: url });
    } catch (err) {
      await del(url).catch(() => {});
      throw err;
    }
    const raw = typeof body?.originalName === "string" ? body.originalName : "";
    const originalName = raw.replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 160) || "archivo";
    const db = await getDb();
    await db.insert(schema.media).values({
      id: stored.id,
      kind: stored.kind,
      originalName,
      file: stored.file,
      mime: stored.mime,
      size: stored.size,
      width: stored.width,
      height: stored.height,
      blur: stored.blur,
      variants: JSON.stringify(stored.variants),
      alt: JSON.stringify({ es: "", en: "" }),
      createdAt: Date.now(),
    });
    const row = await db.select().from(schema.media).where(eq(schema.media.id, stored.id)).limit(1);
    return NextResponse.json({ media: toMedia(row[0]) }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return badRequest(err.message);
    console.error(err);
    return NextResponse.json({ error: "Error al procesar el archivo." }, { status: 500 });
  }
}
