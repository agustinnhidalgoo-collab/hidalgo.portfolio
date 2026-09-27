"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ProjectRecord } from "@/lib/types";
import { api } from "./api";
import { MediaThumb, useMedia } from "./MediaLibrary";
import { DragHandle, SortableList, useSortableItem } from "./Sortable";
import { useUi } from "./ui";

type Row = ProjectRecord & { hasChanges: boolean };

export function StatusBadge({ p }: { p: Row }) {
  if (p.status === "published" && p.hasChanges)
    return <span className="a-badge a-badge--dashed">Publicado · cambios sin publicar</span>;
  if (p.status === "published") return <span className="a-badge a-badge--solid">Publicado</span>;
  return <span className="a-badge">Borrador</span>;
}

export function ProjectsList() {
  const router = useRouter();
  const { confirm, toast } = useUi();
  const { byId } = useMedia();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const data = await api<{ projects: Row[] }>("/api/admin/projects");
    setRows(data.projects);
  };
  useEffect(() => {
    load().catch((e) => toast(e.message, { error: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    setCreating(true);
    try {
      const { id } = await api<{ id: string }>("/api/admin/projects", { method: "POST", json: {} });
      router.push(`/admin/projects/${id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", { error: true });
      setCreating(false);
    }
  };

  const reorder = async (next: Row[]) => {
    const prev = rows;
    setRows(next);
    try {
      await api("/api/admin/projects/reorder", { method: "POST", json: { ids: next.map((r) => r.id) } });
      toast("Orden guardado");
    } catch (e) {
      setRows(prev);
      toast(e instanceof Error ? e.message : "Error", { error: true });
    }
  };

  const toggleFeatured = async (p: Row) => {
    setRows((r) => r?.map((x) => (x.id === p.id ? { ...x, featured: !p.featured } : x)) ?? null);
    try {
      await api(`/api/admin/projects/${p.id}`, { method: "PATCH", json: { featured: !p.featured } });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", { error: true });
      load();
    }
  };

  const publish = async (p: Row) => {
    try {
      await api(`/api/admin/projects/${p.id}/publish`, { method: "POST" });
      toast("Proyecto publicado");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", { error: true });
    }
  };

  const unpublish = async (p: Row) => {
    const ok = await confirm({
      title: "¿Despublicar?",
      message: <p>“{p.draft.title.es || p.slug}” dejará de verse en el sitio. El borrador se conserva.</p>,
      confirmLabel: "Despublicar",
    });
    if (!ok) return;
    await api(`/api/admin/projects/${p.id}/publish`, { method: "DELETE" });
    toast("Proyecto despublicado");
    load();
  };

  const remove = async (p: Row) => {
    const ok = await confirm({
      title: "¿Eliminar proyecto?",
      message: (
        <p>
          “{p.draft.title.es || p.slug}” se borrará de forma permanente, incluida su versión publicada. Los archivos de la biblioteca no se borran.
        </p>
      ),
      confirmLabel: "Eliminar definitivamente",
      danger: true,
    });
    if (!ok) return;
    await api(`/api/admin/projects/${p.id}`, { method: "DELETE" });
    toast("Proyecto eliminado");
    load();
  };

  return (
    <>
      <div className="a-page-head">
        <div>
          <p className="a-meta a-muted">Contenido</p>
          <h1 className="a-display">Proyectos</h1>
        </div>
        <button type="button" className="a-btn a-btn--solid" onClick={create} disabled={creating}>
          + Nuevo proyecto
        </button>
      </div>
      <p className="a-help" style={{ marginBottom: 16 }}>
        Arrastrá desde ⠿ para cambiar el orden en que aparecen en el sitio. La estrella ★ marca los destacados de la home (si no hay ninguno, se muestran los primeros).
      </p>

      {!rows ? (
        <p className="a-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="a-empty">
          <p style={{ marginBottom: 12 }}>Todavía no hay proyectos.</p>
          <button type="button" className="a-btn a-btn--solid" onClick={create}>
            Crear el primero
          </button>
        </div>
      ) : (
        <SortableList items={rows} onReorder={reorder}>
          <ul className="a-list">
            {rows.map((p, i) => (
              <ProjectRow
                key={p.id}
                p={p}
                index={i}
                cover={p.draft.coverId ? byId[p.draft.coverId] : undefined}
                onFeature={() => toggleFeatured(p)}
                onPublish={() => publish(p)}
                onUnpublish={() => unpublish(p)}
                onDelete={() => remove(p)}
              />
            ))}
          </ul>
        </SortableList>
      )}
    </>
  );
}

function ProjectRow({
  p,
  index,
  cover,
  onFeature,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  p: Row;
  index: number;
  cover?: import("@/lib/types").MediaRecord;
  onFeature: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, style, handleProps, isDragging } = useSortableItem(p.id);
  const title = p.draft.title.es || p.draft.title.en || "(Sin título)";
  return (
    <li ref={setNodeRef} style={style} className="a-item" data-dragging={isDragging}>
      <DragHandle {...handleProps} />
      <span className="a-thumb">
        <MediaThumb media={cover} />
      </span>
      <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
        <div className="a-row">
          <span className="a-meta a-muted">{String(index + 1).padStart(2, "0")}</span>
          <Link href={`/admin/projects/${p.id}`} className="a-item__title">
            {title}
          </Link>
          {p.draft.isExample && <span className="a-badge a-badge--dashed">Ejemplo</span>}
        </div>
        <div className="a-row">
          <StatusBadge p={p} />
          <span className="a-help">/{p.slug}</span>
        </div>
      </div>
      <div className="a-item__actions">
        <button
          type="button"
          className="a-btn a-btn--sm a-btn--icon a-btn--ghost"
          onClick={onFeature}
          aria-pressed={p.featured}
          aria-label={p.featured ? "Quitar de destacados" : "Destacar en la home"}
          title={p.featured ? "Destacado" : "Destacar"}
        >
          <span className="a-star">{p.featured ? "★" : "☆"}</span>
        </button>
        <Link href={`/admin/projects/${p.id}`} className="a-btn a-btn--sm">
          Editar
        </Link>
        <a href={`/es/preview/${p.id}`} target="_blank" rel="noreferrer" className="a-btn a-btn--sm a-btn--ghost">
          Vista previa
        </a>
        {p.status === "published" && p.hasChanges && (
          <button type="button" className="a-btn a-btn--sm a-btn--solid" onClick={onPublish}>
            Publicar cambios
          </button>
        )}
        {p.status === "published" ? (
          <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={onUnpublish}>
            Despublicar
          </button>
        ) : (
          <button type="button" className="a-btn a-btn--sm a-btn--solid" onClick={onPublish}>
            Publicar
          </button>
        )}
        <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={onDelete} aria-label={`Eliminar ${title}`}>
          Eliminar
        </button>
      </div>
    </li>
  );
}
