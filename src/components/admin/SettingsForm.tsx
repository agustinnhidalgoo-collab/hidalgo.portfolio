"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Category, type SiteSettings, emptyL10n } from "@/lib/types";
import { newId } from "@/lib/utils";
import { api } from "./api";
import { L10nField, TextField } from "./L10nField";
import { MediaSlot } from "./MediaLibrary";
import { useUi } from "./ui";
import { setUnsaved } from "./unsaved";

function ListControls({ index, total, onMove, onRemove }: { index: number; total: number; onMove: (d: number) => void; onRemove: () => void }) {
  return (
    <div className="a-row">
      <button type="button" className="a-btn a-btn--sm a-btn--icon a-btn--ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Subir">
        ↑
      </button>
      <button type="button" className="a-btn a-btn--sm a-btn--icon a-btn--ghost" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Bajar">
        ↓
      </button>
      <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={onRemove}>
        Quitar
      </button>
    </div>
  );
}

function moveItem<T>(list: T[], i: number, d: number): T[] {
  const to = i + d;
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  [copy[i], copy[to]] = [copy[to], copy[i]];
  return copy;
}

export function SettingsForm() {
  const { toast, confirm } = useUi();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const saved = useRef("");

  useEffect(() => {
    api<{ settings: SiteSettings }>("/api/admin/settings")
      .then((d) => {
        setS(d.settings);
        saved.current = JSON.stringify(d.settings);
      })
      .catch((e) => toast(e.message, { error: true }));
  }, [toast]);

  const dirty = !!s && JSON.stringify(s) !== saved.current;
  useEffect(() => {
    setUnsaved(dirty);
    const h = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  useEffect(() => () => setUnsaved(false), []);

  const save = useCallback(async () => {
    if (!s) return;
    setSaving(true);
    try {
      const d = await api<{ settings: SiteSettings }>("/api/admin/settings", { method: "PUT", json: { settings: s } });
      setS(d.settings);
      saved.current = JSON.stringify(d.settings);
      toast("Ajustes guardados y publicados");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", { error: true });
    } finally {
      setSaving(false);
    }
  }, [s, toast]);

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

  if (!s) return <p className="a-muted">Cargando…</p>;
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS({ ...s, [k]: v });

  return (
    <>
      <div className="a-toolbar">
        <div className="a-row">
          <strong>Ajustes del sitio</strong>
          {dirty ? <span className="a-badge a-badge--dashed">Sin guardar</span> : <span className="a-help">Todo guardado</span>}
        </div>
        <button type="button" className="a-btn a-btn--sm a-btn--solid" onClick={save} disabled={!dirty || saving}>
          {saving ? "Guardando…" : "Guardar y publicar"}
        </button>
      </div>

      <div className="a-editor">
        <p className="a-help">Estos textos se publican al guardar. Los campos vacíos no se muestran en el sitio.</p>

        <section className="a-card">
          <div className="a-card__head">
            <h2>Presentación (Home)</h2>
          </div>
          <div className="a-fields">
            <L10nField label="Introducción" value={s.intro} onChange={(v) => set("intro", v)} multiline rows={3} help="Frase breve arriba a la derecha de la portada." />
            <L10nField label="Declaración" value={s.tagline} onChange={(v) => set("tagline", v)} multiline rows={3} help="Frase grande que se ilumina palabra por palabra al hacer scroll." />
            <div className="a-field">
              <span className="a-label">Disciplinas (cinta en movimiento)</span>
              {s.disciplines.map((d, i) => (
                <div key={i} className="a-row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                  <div style={{ flex: 1 }}>
                    <L10nField label={`Disciplina ${i + 1}`} value={d} onChange={(v) => set("disciplines", s.disciplines.map((x, j) => (j === i ? v : x)))} />
                  </div>
                  <ListControls
                    index={i}
                    total={s.disciplines.length}
                    onMove={(dd) => set("disciplines", moveItem(s.disciplines, i, dd))}
                    onRemove={() => set("disciplines", s.disciplines.filter((_, j) => j !== i))}
                  />
                </div>
              ))}
              <div>
                <button type="button" className="a-btn a-btn--sm" onClick={() => set("disciplines", [...s.disciplines, emptyL10n()])}>
                  + Agregar disciplina
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="a-card">
          <div className="a-card__head">
            <h2>Sobre mí</h2>
          </div>
          <div className="a-fields">
            <L10nField label="Biografía" value={s.bio} onChange={(v) => set("bio", v)} multiline rows={9} help="Separá párrafos con una línea en blanco. **negrita**, *cursiva*, [enlace](https://…)" />
            <MediaSlot label="Retrato (opcional)" value={s.portraitId} onChange={(v) => set("portraitId", v)} />
            <div className="a-grid-2">
              <MediaSlot label="CV en español (PDF)" value={s.cv.es} onChange={(v) => set("cv", { ...s.cv, es: v })} accept={["file"]} />
              <MediaSlot label="CV en inglés (PDF)" value={s.cv.en} onChange={(v) => set("cv", { ...s.cv, en: v })} accept={["file"]} help="Si falta uno, se ofrece el otro." />
            </div>
            <div className="a-field">
              <span className="a-label">Servicios</span>
              {s.services.map((sv, i) => (
                <div key={i} className="a-card" style={{ display: "grid", gap: 10, margin: 0 }}>
                  <div className="a-row" style={{ justifyContent: "space-between" }}>
                    <span className="a-meta">Servicio {i + 1}</span>
                    <ListControls
                      index={i}
                      total={s.services.length}
                      onMove={(d) => set("services", moveItem(s.services, i, d))}
                      onRemove={() => set("services", s.services.filter((_, j) => j !== i))}
                    />
                  </div>
                  <L10nField label="Nombre" value={sv.title} onChange={(v) => set("services", s.services.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
                  <L10nField label="Descripción" value={sv.description} onChange={(v) => set("services", s.services.map((x, j) => (j === i ? { ...x, description: v } : x)))} multiline rows={2} />
                </div>
              ))}
              <div>
                <button type="button" className="a-btn a-btn--sm" onClick={() => set("services", [...s.services, { title: emptyL10n(), description: emptyL10n() }])}>
                  + Agregar servicio
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="a-card">
          <div className="a-card__head">
            <h2>Contacto y enlaces</h2>
          </div>
          <div className="a-fields">
            <div className="a-grid-2">
              <TextField label="Email" type="email" value={s.email} onChange={(v) => set("email", v.trim())} />
              <TextField label="Teléfono (opcional)" value={s.phone} onChange={(v) => set("phone", v)} />
            </div>
            <L10nField label="Ubicación" value={s.location} onChange={(v) => set("location", v)} placeholder="Ciudad, País" />
            <L10nField label="Disponibilidad" value={s.availability} onChange={(v) => set("availability", v)} placeholder="Disponible para proyectos desde…" />
            <TextField
              label="Zona horaria (para el reloj)"
              value={s.timezone}
              onChange={(v) => set("timezone", v)}
              help="Formato IANA, ej.: America/Argentina/Buenos_Aires, Europe/Madrid."
            />
            <div className="a-field">
              <span className="a-label">Enlaces (redes, Behance, etc.)</span>
              {s.links.map((l, i) => (
                <div key={i} className="a-row" style={{ flexWrap: "nowrap", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <TextField label="Nombre" value={l.label} onChange={(v) => set("links", s.links.map((x, j) => (j === i ? { ...x, label: v } : x)))} placeholder="Instagram" />
                  </div>
                  <div style={{ flex: 2 }}>
                    <TextField label="URL" value={l.url} onChange={(v) => set("links", s.links.map((x, j) => (j === i ? { ...x, url: v.trim() } : x)))} placeholder="https://" />
                  </div>
                  <ListControls
                    index={i}
                    total={s.links.length}
                    onMove={(d) => set("links", moveItem(s.links, i, d))}
                    onRemove={() => set("links", s.links.filter((_, j) => j !== i))}
                  />
                </div>
              ))}
              <div>
                <button type="button" className="a-btn a-btn--sm" onClick={() => set("links", [...s.links, { label: "", url: "" }])}>
                  + Agregar enlace
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="a-card">
          <div className="a-card__head">
            <h2>SEO</h2>
          </div>
          <L10nField
            label="Descripción para buscadores y redes"
            value={s.seoDescription}
            onChange={(v) => set("seoDescription", v)}
            multiline
            rows={2}
            help="Unas 150–160 letras. Si está vacía se usa la declaración."
          />
        </section>

        <section className="a-card">
          <div className="a-card__head">
            <h2>Contenido de ejemplo</h2>
          </div>
          <label className="a-check" style={{ width: "fit-content" }}>
            <input
              type="checkbox"
              checked={s.isExample}
              onChange={async (e) => {
                const checked = e.target.checked;
                if (!checked) {
                  const ok = await confirm({
                    title: "¿Ya reemplazaste los textos de ejemplo?",
                    message: <p>Al desmarcar, el sitio deja de avisar que estos textos son de ejemplo.</p>,
                    confirmLabel: "Sí, son mis textos",
                  });
                  if (!ok) return;
                }
                set("isExample", checked);
              }}
            />
            Los textos de ajustes son de ejemplo (muestra un aviso en el sitio)
          </label>
        </section>

        <CategoriesEditor />
      </div>
    </>
  );
}

function CategoriesEditor() {
  const { toast, confirm } = useUi();
  const [list, setList] = useState<Category[] | null>(null);
  const [saving, setSaving] = useState(false);
  const saved = useRef("");

  useEffect(() => {
    api<{ categories: Category[] }>("/api/admin/categories").then((d) => {
      setList(d.categories);
      saved.current = JSON.stringify(d.categories.map(({ id, name }) => ({ id, name })));
    });
  }, []);

  if (!list) return null;
  const payload = list.map(({ id, name }) => ({ id, name }));
  const dirty = JSON.stringify(payload) !== saved.current;

  const save = async () => {
    setSaving(true);
    try {
      const d = await api<{ categories: Category[] }>("/api/admin/categories", { method: "PUT", json: { categories: payload } });
      setList(d.categories);
      saved.current = JSON.stringify(d.categories.map(({ id, name }) => ({ id, name })));
      toast("Categorías guardadas");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", { error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="a-card" id="categorias">
      <div className="a-card__head">
        <h2>Categorías</h2>
        <button type="button" className="a-btn a-btn--sm a-btn--solid" onClick={save} disabled={!dirty || saving}>
          {saving ? "Guardando…" : "Guardar categorías"}
        </button>
      </div>
      <div className="a-fields">
        {list.map((c, i) => (
          <div key={c.id} className="a-row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
            <div style={{ flex: 1 }}>
              <L10nField label={`Categoría ${i + 1}`} value={c.name} onChange={(v) => setList(list.map((x) => (x.id === c.id ? { ...x, name: v } : x)))} />
            </div>
            <ListControls
              index={i}
              total={list.length}
              onMove={(d) => setList(moveItem(list, i, d))}
              onRemove={async () => {
                const ok = await confirm({
                  title: "¿Quitar categoría?",
                  message: <p>Los proyectos que la tengan dejarán de mostrarla. Se aplica al guardar.</p>,
                  confirmLabel: "Quitar",
                  danger: true,
                });
                if (ok) setList(list.filter((x) => x.id !== c.id));
              }}
            />
          </div>
        ))}
        <div>
          <button type="button" className="a-btn a-btn--sm" onClick={() => setList([...list, { id: newId(), name: emptyL10n(), sortOrder: list.length }])}>
            + Agregar categoría
          </button>
        </div>
      </div>
    </section>
  );
}
