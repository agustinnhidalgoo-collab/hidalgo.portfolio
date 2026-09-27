import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { listMedia, toMedia } from "@/lib/content";
import { storeUpload, UploadError } from "@/lib/media";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ media: await listMedia() });
}

/** Sube un archivo (campo "file"). Se valida por firma binaria y tamaño. */
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const stored = await storeUpload(buf);
    const originalName = file.name.replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 160) || stored.file;
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
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Error al guardar el archivo." }, { status: 500 });
  }
}
