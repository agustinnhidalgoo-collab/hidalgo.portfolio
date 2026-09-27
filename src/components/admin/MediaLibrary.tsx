"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { mediaUrl } from "@/lib/media-url";
import type { MediaKind, MediaRecord } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { api, ApiError, uploadFile } from "./api";
import { L10nField } from "./L10nField";
import { useUi } from "./ui";

/* ─── Contexto: la biblioteca se carga una vez y se comparte ─── */

interface MediaCtx {
  items: MediaRecord[];
  byId: Record<string, MediaRecord>;
  loading: boolean;
  refresh: () => Promise<void>;
  upsert: (m: MediaRecord) => void;
  remove: (id: string) => void;
}
const Ctx = createContext<MediaCtx | null>(null);

export function MediaProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ media: MediaRecord[] }>("/api/admin/media");
      setItems(data.media);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);
  const byId = useMemo(() => Object.fromEntries(items.map((m) => [m.id, m])), [items]);
  const upsert = useCallback((m: MediaRecord) => setItems((list) => [m, ...list.filter((x) => x.id !== m.id)]), []);
  const remove = useCallback((id: string) => setItems((list) => list.filter((x) => x.id !== id)), []);
  return <Ctx.Provider value={{ items, byId, loading, refresh, upsert, remove }}>{children}</Ctx.Provider>;
}

export function useMedia() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMedia fuera de MediaProvider");
  return c;
}

/* ─── Miniatura ─────────────────────────────────────────────── */

export function thumbUrl(m: MediaRecord): string {
  const small = [...m.variants].sort((a, b) => a.w - b.w)[0];
  return mediaUrl(small ? small.file : m.file);
}

export function MediaThumb({ media }: { media?: MediaRecord | null }) {
  if (!media) return <span>Sin archivo</span>;
  if (media.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={thumbUrl(media)} alt="" loading="lazy" />;
  }
  if (media.kind === "video") return <video src={`${mediaUrl(media.file)}#t=0.5`} muted preload="metadata" />;
  return <span>PDF</span>;
}

/* ─── Subida ────────────────────────────────────────────────── */

interface UploadState {
  name: string;
  progress: number;
  error?: string;
}

function Uploader({ accept, onUploaded }: { accept?: MediaKind[]; onUploaded: (m: MediaRecord) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const acceptAttr = (accept ?? ["image", "video", "file"])
    .map((k) => (k === "image" ? "image/jpeg,image/png,image/webp,image/avif,image/gif" : k === "video" ? "video/mp4,video/webm,video/quicktime" : "application/pdf"))
    .join(",");

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const offset = uploads.length;
    setUploads((u) => [...u, ...list.map((f) => ({ name: f.name, progress: 0 }))]);
    for (let i = 0; i < list.length; i++) {
      const idx = offset + i;
      try {
        const { media } = await uploadFile(list[i], (p) =>
          setUploads((u) => u.map((x, j) => (j === idx ? { ...x, progress: p } : x))),
        );
        onUploaded(media);
        setUploads((u) => u.map((x, j) => (j === idx ? { ...x, progress: 1 } : x)));
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Error al subir";
        setUploads((u) => u.map((x, j) => (j === idx ? { ...x, error: msg } : x)));
      }
    }
    window.setTimeout(() => setUploads((u) => u.filter((x) => x.error || x.progress < 1)), 1500);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        className="a-dropzone"
        data-over={over}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files);
        }}
      >
        <strong>Arrastrá archivos acá o hacé clic para elegir</strong>
        <span className="a-help">Imágenes JPG/PNG/WEBP/AVIF/GIF (máx. 25 MB) · Videos MP4/WEBM/MOV (máx. 300 MB) · PDF (máx. 20 MB)</span>
        <input ref={inputRef} type="file" hidden multiple accept={acceptAttr} onChange={(e) => (handle(e.target.files), (e.target.value = ""))} />
      </div>
      {uploads.map((u, i) => (
        <div key={i} style={{ display: "grid", gap: 4 }}>
          <div className="a-row" style={{ justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span>{u.name}</span>
            <span>{u.error ? u.error : `${Math.round(u.progress * 100)}%`}</span>
          </div>
          {!u.error && (
            <div className="a-progress">
              <span style={{ width: `${u.progress * 100}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Biblioteca ────────────────────────────────────────────── */

const KIND_LABEL: Record<MediaKind, string> = { image: "Imágenes", video: "Videos", file: "PDF" };

interface LibraryProps {
  mode: "manage" | "pick";
  accept?: MediaKind[];
  onPick?: (m: MediaRecord) => void;
}

export function MediaLibrary({ mode, accept, onPick }: LibraryProps) {
  const { items, loading, upsert, remove } = useMedia();
  const { confirm, toast } = useUi();
  const [kind, setKind] = useState<MediaKind | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const kinds = accept ?? (["image", "video", "file"] as MediaKind[]);
  const visible = items.filter(
    (m) => kinds.includes(m.kind) && (kind === "all" || m.kind === kind) && m.originalName.toLowerCase().includes(query.toLowerCase()),
  );
  const current = items.find((m) => m.id === selected) ?? null;

  const del = async (m: MediaRecord) => {
    const ok = await confirm({
      title: "¿Eliminar archivo?",
      message: <p>Se borrará “{m.originalName}” de forma permanente.</p>,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/media/${m.id}`, { method: "DELETE" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const usages = (err.data.usages as string[]) ?? [];
        const force = await confirm({
          title: "Este archivo está en uso",
          message: (
            <>
              <p>Se usa en:</p>
              <ul>
                {usages.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p>Si lo eliminás, esos lugares quedarán sin imagen. ¿Eliminar igual?</p>
            </>
          ),
          confirmLabel: "Eliminar igual",
          danger: true,
        });
        if (!force) return;
        await api(`/api/admin/media/${m.id}?force=1`, { method: "DELETE" });
      } else {
        toast(err instanceof Error ? err.message : "Error", { error: true });
        return;
      }
    }
    remove(m.id);
    setSelected(null);
    toast("Archivo eliminado");
  };

  return (
    <div className={mode === "manage" ? "a-split" : ""} style={mode === "pick" ? { display: "grid", gap: 14 } : undefined}>
      <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
        <Uploader
          accept={accept}
          onUploaded={(m) => {
            upsert(m);
            if (mode === "pick" && onPick && kinds.includes(m.kind)) onPick(m);
            else setSelected(m.id);
          }}
        />
        <div className="a-row" style={{ justifyContent: "space-between" }}>
          <div className="a-row">
            {kinds.length > 1 && (
              <>
                <button type="button" className={`a-btn a-btn--sm ${kind === "all" ? "a-btn--solid" : ""}`} onClick={() => setKind("all")}>
                  Todos
                </button>
                {kinds.map((k) => (
                  <button key={k} type="button" className={`a-btn a-btn--sm ${kind === k ? "a-btn--solid" : ""}`} onClick={() => setKind(k)}>
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </>
            )}
          </div>
          <input className="a-input" style={{ maxWidth: 240, minHeight: 34 }} placeholder="Buscar por nombre…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar archivos" />
        </div>
        {loading ? (
          <p className="a-muted">Cargando…</p>
        ) : visible.length === 0 ? (
          <div className="a-empty a-muted">No hay archivos todavía.</div>
        ) : (
          <div className="a-media-grid">
            {visible.map((m) => (
              <button
                key={m.id}
                type="button"
                className="a-media-tile"
                aria-pressed={selected === m.id}
                onClick={() => (mode === "pick" ? onPick?.(m) : setSelected(m.id))}
                title={m.originalName}
              >
                <span className="a-media-tile__img">
                  <MediaThumb media={m} />
                </span>
                <span className="a-media-tile__name">{m.originalName}</span>
                {m.kind === "image" && !m.alt.es && !m.alt.en && (
                  <span className="a-media-tile__flag a-badge a-badge--solid">Sin alt</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "manage" && (
        <aside>
          {current ? (
            <MediaDetails key={current.id} media={current} onSaved={upsert} onDelete={() => del(current)} />
          ) : (
            <div className="a-card a-muted">Elegí un archivo para ver sus detalles y editar su texto alternativo.</div>
          )}
        </aside>
      )}
    </div>
  );
}

function MediaDetails({ media, onSaved, onDelete }: { media: MediaRecord; onSaved: (m: MediaRecord) => void; onDelete: () => void }) {
  const { toast } = useUi();
  const [alt, setAlt] = useState(media.alt);
  const [saving, setSaving] = useState(false);
  const dirty = alt.es !== media.alt.es || alt.en !== media.alt.en;

  const save = async () => {
    setSaving(true);
    try {
      const data = await api<{ media: MediaRecord }>(`/api/admin/media/${media.id}`, { method: "PATCH", json: { alt } });
      onSaved(data.media);
      toast("Texto alternativo guardado");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error", { error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="a-card" style={{ display: "grid", gap: 14 }}>
      <div className="a-media-slot__preview" style={{ aspectRatio: "4 / 3" }}>
        {media.kind === "video" ? <video src={mediaUrl(media.file)} controls preload="metadata" /> : <MediaThumb media={media} />}
      </div>
      <div style={{ fontSize: "0.82rem", display: "grid", gap: 2 }}>
        <strong style={{ wordBreak: "break-all" }}>{media.originalName}</strong>
        <span className="a-muted">
          {media.mime} · {formatBytes(media.size)}
          {media.width ? ` · ${media.width}×${media.height}` : ""}
        </span>
      </div>
      {media.kind !== "file" && (
        <L10nField
          label="Texto alternativo"
          value={alt}
          onChange={setAlt}
          multiline
          rows={2}
          help="Describe la imagen para lectores de pantalla y buscadores. Ej.: “Afiche tipográfico impreso en serigrafía”."
        />
      )}
      <div className="a-row">
        {media.kind !== "file" && (
          <button type="button" className="a-btn a-btn--solid a-btn--sm" onClick={save} disabled={!dirty || saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        )}
        <a className="a-btn a-btn--sm" href={mediaUrl(media.file)} target="_blank" rel="noreferrer">
          Abrir ↗
        </a>
        <button type="button" className="a-btn a-btn--sm a-btn--danger" onClick={onDelete}>
          Eliminar
        </button>
      </div>
    </div>
  );
}

/* ─── Selector (campo que abre la biblioteca) ──────────────── */

export function MediaSlot({
  label,
  value,
  onChange,
  accept = ["image"],
  help,
}: {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  accept?: MediaKind[];
  help?: string;
}) {
  const { byId } = useMedia();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const media = value ? byId[value] : null;

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [open]);

  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
      <div className="a-media-slot">
        <div className="a-media-slot__preview">
          {value && !media ? <span>Archivo no encontrado</span> : <MediaThumb media={media} />}
        </div>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          {media && <span style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{media.originalName}</span>}
          <div className="a-row">
            <button type="button" className="a-btn a-btn--sm" onClick={() => setOpen(true)}>
              {media ? "Cambiar" : "Elegir o subir"}
            </button>
            {value && (
              <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={() => onChange(null)}>
                Quitar
              </button>
            )}
          </div>
          {help && <p className="a-help">{help}</p>}
        </div>
      </div>
      <dialog ref={dialogRef} className="a-dialog a-dialog--wide" onClose={() => setOpen(false)} aria-label={`Elegir: ${label}`}>
        {open && (
          <>
            <div className="a-dialog__body" style={{ maxHeight: "70vh", overflow: "auto" }}>
              <h2 className="a-display" style={{ fontSize: "1.5rem" }}>
                {label}
              </h2>
              <MediaLibrary
                mode="pick"
                accept={accept}
                onPick={(m) => {
                  onChange(m.id);
                  setOpen(false);
                }}
              />
            </div>
            <div className="a-dialog__foot">
              <button type="button" className="a-btn a-btn--ghost" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
