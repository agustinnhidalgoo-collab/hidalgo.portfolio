import fs from "node:fs";
import { Readable } from "node:stream";
import { resolveMediaPath } from "@/lib/media";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  pdf: "application/pdf",
};

/** Sirve los archivos subidos. Soporta rangos (necesario para reproducir y adelantar videos). */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  if (parts.length !== 1) return new Response("Not found", { status: 404 });
  const full = resolveMediaPath(parts[0]);
  if (!full) return new Response("Not found", { status: 404 });

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(full);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = parts[0].split(".").pop()!.toLowerCase();
  const baseHeaders: Record<string, string> = {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };
  if (ext === "pdf") {
    const name = new URL(req.url).searchParams.get("name");
    const safe = name?.replace(/[^\w.-]+/g, "_") || parts[0];
    baseHeaders["Content-Disposition"] = `inline; filename="${safe}"`;
  }

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start = m[1] ? parseInt(m[1], 10) : 0;
      let end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (!m[1] && m[2]) {
        start = Math.max(0, stat.size - parseInt(m[2], 10));
        end = stat.size - 1;
      }
      if (start >= stat.size || start > end) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      }
      end = Math.min(end, stat.size - 1);
      const stream = fs.createReadStream(full, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
  }

  const stream = fs.createReadStream(full);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: { ...baseHeaders, "Content-Length": String(stat.size) },
  });
}
