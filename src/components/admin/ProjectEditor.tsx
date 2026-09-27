"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Category, type ProjectContent, type ProjectRecord, SLUG_RE } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { api } from "./api";
import { BlocksEditor } from "./BlockEditor";
import { L10nField, TextField } from "./L10nField";
import { MediaSlot } from "./MediaLibrary";
import { StatusBadge } from "./ProjectsList";
import { useUi } from "./ui";
import { confirmLeave, setUnsaved } from "./unsaved";

type Row = ProjectRecord & { hasChanges: boolean };

export function ProjectEditor({ id }: { id: string }) {
  const router = useRouter();
  const { confirm, toast } = useUi();
  const [project, setProject] = useState<Row | null>(null);
  const [draft, setDraft] = useState<ProjectContent | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savedJson = useRef("");

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      api<{ project: Row }>(`/api/admin/projects/${id}`),
      api<{ categories: Category[] }>("/api/admin/categories"),
    ]);
    setProject(p.project);
    setDraft(p.project.draft);
    savedJson.current = JSON.stringify(p.project.draft);
    setCategories(c.categories);
  }, [id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const dirty = !!draft && JSON.stringify(draft) !== savedJson.current;

  useEffect(() => {
    setUnsaved(dirty);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => () => setUnsaved(false), []);

  const save = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!draft) return false;
      if (!SLUG_RE.test(draft.slug)) {
        toast("El slug solo admite minúsculas, números y guiones.", { error: true });
        return false;
      }
      setBusy("save");
      try {
        const data = await api<{ project: Row }>(`/api/admin/projects/${id}`, { method: "PUT", json: { draft } });
        setProject(data.project);
        savedJson.current = JSON.stringify(data.project.draft);
        setDraft(data.project.draft);
        if (!silent) toast("Borrador guardado");
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : "Error al guardar", { error: true });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [draft, id, toast],
  );

  // Ctrl/Cmd + S guarda el borrador.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const preview = async (locale: "es" | "en") => {
    const win = window.open("about:blank", "_blank");
    if (dirty && !(await save(true))) {
      win?.close();
      return;
    }
    const url = `/${locale}/preview/${id}`;
    if (win) win.location.href = url;
    else window.location.href = url;
  };

  const publish = async () => {
    if (dirty && !(await save(true))) return;
    const missing = draft && (!draft.title.en.trim() || (!draft.summary.en.trim() && draft.summary.es.trim()));
    if (missing) {
      const ok = await confirm({
        title: "Faltan traducciones",
        message: <p>Algunos campos no tienen versión en inglés. En el sitio en inglés se mostrará el texto en español. ¿Publicar igual?</p>,
        confirmLabel: "Publicar igual",
      });
      if (!ok) return;
    }
    setBusy("publish");
    try {
      await api(`/api/admin/projects/${id}/publish`, { method: "POST" });
      toast("¡Publicado!");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", { error: true });
    } finally {
      setBusy(null);
    }
  };

  const unpublish = async () => {
    const ok = await confirm({
      title: "¿Despublicar?",
      message: <p>El proyecto dejará de verse en el sitio. El borrador se conserva y podés volver a publicarlo.</p>,
      confirmLabel: "Despublicar",
    });
    if (!ok) return;
    await api(`/api/admin/projects/${id}/publish`, { method: "DELETE" });
    toast("Despublicado");
    await load();
  };

  const discard = async () => {
    const ok = await confirm({
      title: "¿Descartar cambios?",
      message: <p>El borrador volverá a ser igual a la versión publicada. Se pierden los cambios no publicados.</p>,
      confirmLabel: "Descartar cambios",
      danger: true,
    });
    if (!ok) return;
    await api(`/api/admin/projects/${id}/discard`, { method: "POST" });
    toast("Cambios descartados");
    await load();
  };

  const remove = async () => {
    const ok = await confirm({
      title: "¿Eliminar proyecto?",
      message: <p>Se borrará de forma permanente, incluida su versión publicada. Los archivos de la biblioteca no se borran.</p>,
      confirmLabel: "Eliminar definitivamente",
      danger: true,
    });
    if (!ok) return;
    await api(`/api/admin/projects/${id}`, { method: "DELETE" });
    setUnsaved(false);
    toast("Proyecto eliminado");
    router.push("/admin");
  };

  if (error) return <p className="a-error">{error}</p>;
  if (!project || !draft) return <p className="a-muted">Cargando…</p>;

  const set = <K extends keyof ProjectContent>(key: K, value: ProjectContent[K]) => setDraft({ ...draft, [key]: value });
  const slugValid = SLUG_RE.test(draft.slug);

  return (
    <>
      <div className="a-toolbar">
        <div className="a-row">
          <Link href="/admin" className="a-btn a-btn--sm a-btn--ghost" onClick={(e) => !confirmLeave() && e.preventDefault()}>
            ← Proyectos
          </Link>
          <StatusBadge p={project} />
          {dirty ? <span className="a-badge a-badge--dashed">Sin guardar</span> : <span className="a-help">Todo guardado</span>}
        </div>
        <div className="a-row">
          <button type="button" className="a-btn a-btn--sm" onClick={() => save()} disabled={!dirty || !!busy} title="Ctrl/Cmd + S">
            {busy === "save" ? "Guardando…" : "Guardar borrador"}
          </button>
          <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={() => preview("es")}>
            Vista previa ES
          </button>
          <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={() => preview("en")}>
            EN
          </button>
          {(project.status !== "published" || project.hasChanges || dirty) && (
            <button type="button" className="a-btn a-btn--sm a-btn--solid" onClick={publish} disabled={!!busy}>
              {busy === "publish" ? "Publicando…" : project.status === "published" ? "Publicar cambios" : "Publicar"}
            </button>
          )}
        </div>
      </div>

      <div className="a-editor">
        <div className="a-page-head" style={{ marginBottom: 8 }}>
          <div>
            <p className="a-meta a-muted">Editar proyecto</p>
            <h1 className="a-display">{draft.title.es || draft.title.en || "(Sin título)"}</h1>
          </div>
        </div>

        <section className="a-card">
          <div className="a-card__head">
            <h2>Datos del proyecto</h2>
          </div>
          <div className="a-fields">
            <L10nField label="Título" value={draft.title} onChange={(v) => set("title", v)} required />
            <div className="a-field">
              <label className="a-label" htmlFor="slug">
                <span>Slug (dirección web)</span>
                {!slugValid && <span className="a-missing">Solo minúsculas, números y guiones</span>}
              </label>
              <div className="a-row" style={{ flexWrap: "nowrap" }}>
                <input id="slug" className="a-input" value={draft.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} />
                <button type="button" className="a-btn a-btn--sm" onClick={() => set("slug", slugify(draft.title.es || draft.title.en) || draft.slug)}>
                  Generar desde el título
                </button>
              </div>
              <p className="a-help">
                Se verá como /work/{draft.slug || "…"}
                {project.status === "published" && draft.slug !== project.slug && " — el cambio de dirección se aplica al publicar."}
              </p>
            </div>
            <L10nField
              label="Resumen"
              value={draft.summary}
              onChange={(v) => set("summary", v)}
              multiline
              rows={4}
              help="Introducción breve que aparece arriba del proyecto y en buscadores."
            />
            <div className="a-grid-2">
              <TextField label="Año" value={draft.year} onChange={(v) => set("year", v)} placeholder="2026" />
              <div />
            </div>
            <L10nField label="Cliente (opcional)" value={draft.client} onChange={(v) => set("client", v)} help="Solo si es real y podés mostrarlo." />
            <L10nField label="Rol (opcional)" value={draft.role} onChange={(v) => set("role", v)} placeholder="Dirección de arte, identidad" />
            <div className="a-field">
              <span className="a-label">
                <span>Categorías</span>
                <Link href="/admin/settings#categorias" className="a-help">
                  Administrar categorías
                </Link>
              </span>
              <div className="a-row">
                {categories.length === 0 && <span className="a-help">No hay categorías. Creálas en Ajustes.</span>}
                {categories.map((c) => (
                  <label key={c.id} className="a-check">
                    <input
                      type="checkbox"
                      checked={draft.categoryIds.includes(c.id)}
                      onChange={(e) =>
                        set("categoryIds", e.target.checked ? [...draft.categoryIds, c.id] : draft.categoryIds.filter((x) => x !== c.id))
                      }
                    />
                    {c.name.es || c.name.en}
                  </label>
                ))}
              </div>
            </div>
            <MediaSlot
              label="Imagen de portada"
              value={draft.coverId}
              onChange={(v) => set("coverId", v)}
              help="Se usa en el índice, en la grilla y arriba del proyecto. Ideal: horizontal, 2400 px de ancho o más."
            />
            <label className="a-check" style={{ width: "fit-content" }}>
              <input type="checkbox" checked={draft.isExample} onChange={(e) => set("isExample", e.target.checked)} />
              Marcar como contenido de ejemplo
            </label>
          </div>
        </section>

        <section className="a-card">
          <div className="a-card__head">
            <h2>Contenido</h2>
            <span className="a-help">Bloques en el orden en que se ven. Arrastrá desde ⠿ o usá ↑ ↓.</span>
          </div>
          <BlocksEditor blocks={draft.blocks} onChange={(blocks) => set("blocks", blocks)} />
        </section>

        <section className="a-card">
          <div className="a-card__head">
            <h2>Zona de acciones</h2>
          </div>
          <div className="a-row">
            {project.status === "published" && (
              <button type="button" className="a-btn a-btn--sm" onClick={unpublish}>
                Despublicar
              </button>
            )}
            {project.status === "published" && project.hasChanges && (
              <button type="button" className="a-btn a-btn--sm" onClick={discard}>
                Descartar cambios no publicados
              </button>
            )}
            <button type="button" className="a-btn a-btn--sm a-btn--danger" onClick={remove}>
              Eliminar proyecto
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
