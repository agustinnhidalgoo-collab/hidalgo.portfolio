"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
    cache: "no-store",
  });
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {}
  if (res.status === 401) {
    window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw new ApiError((data.error as string) || `Error ${res.status}`, res.status, data);
  return data as T;
}

/** Sube un archivo con progreso (fetch no informa progreso de subida). */
export function uploadFile(file: File, onProgress?: (p: number) => void): Promise<{ media: import("@/lib/types").MediaRecord }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as { media: import("@/lib/types").MediaRecord });
      else reject(new ApiError((data.error as string) || `Error ${xhr.status}`, xhr.status, data));
    };
    xhr.onerror = () => reject(new ApiError("Error de red al subir el archivo.", 0));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
