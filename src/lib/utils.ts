export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function pad(n: number, size = 2): string {
  return String(n).padStart(size, "0");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Convierte URLs de YouTube o Vimeo a su versión embebible. Devuelve null si no es válida. */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];
      return v ? `https://www.youtube-nocookie.com/embed/${v}?rel=0` : null;
    }
    if (host === "youtu.be") {
      const v = u.pathname.slice(1);
      return v ? `https://www.youtube-nocookie.com/embed/${v}?rel=0` : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const v = u.pathname.match(/(\d+)/)?.[1];
      return v ? `https://player.vimeo.com/video/${v}?dnt=1` : null;
    }
    return null;
  } catch {
    return null;
  }
}
