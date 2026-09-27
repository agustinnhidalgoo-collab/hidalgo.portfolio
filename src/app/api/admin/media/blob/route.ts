import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/auth";
import { LIMITS, usingBlob } from "@/lib/media";

const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
];

/**
 * Autoriza subidas directas del navegador a Vercel Blob (evita el límite de
 * 4,5 MB por petición de las funciones de Vercel). Solo para el administrador.
 */
export async function POST(req: Request) {
  if (!usingBlob()) return NextResponse.json({ error: "Vercel Blob no está configurado." }, { status: 400 });
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (body.type !== "blob.generate-client-token") {
    return NextResponse.json({ error: "Operación no admitida" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^uploads\/[a-z0-9-]+\.[a-z0-9]+$/.test(pathname)) throw new Error("Nombre de archivo inválido");
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: LIMITS.video,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 400 });
  }
}
