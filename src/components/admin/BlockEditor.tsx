"use client";

import { useState } from "react";
import { BLOCK_LABELS, type Block, type BlockType, emptyL10n } from "@/lib/types";
import { newId, toEmbedUrl } from "@/lib/utils";
import { L10nField, TextField } from "./L10nField";
import { MediaSlot } from "./MediaLibrary";
import { DragHandle, SortableList, useSortableItem } from "./Sortable";
import { useUi } from "./ui";

export function createBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case "text":
      return { id, type, heading: emptyL10n(), body: emptyL10n() };
    case "image":
      return { id, type, mediaId: null, caption: emptyL10n(), size: "contained" };
    case "full":
      return { id, type, mediaId: null, caption: emptyL10n() };
    case "gallery":
      return { id, type, columns: 2, items: [] };
    case "columns":
      return {
        id,
        type,
        left: { kind: "text", text: emptyL10n(), mediaId: null },
        right: { kind: "image", text: emptyL10n(), mediaId: null },
      };
    case "video":
      return { id, type, source: "upload", mediaId: null, url: "", caption: emptyL10n(), autoplay: true };
  }
}

const ADD_ORDER: BlockType[] = ["text", "image", "full", "gallery", "columns", "video"];

function summary(b: Block): string {
  switch (b.type) {
    case "text":
      return b.heading.es || b.body.es.slice(0, 60) || "";
    case "gallery":
      return `${b.items.length} elementos · ${b.columns} columnas`;
    case "video":
      return b.source === "embed" ? b.url : "";
    default:
      return "";
  }
}

export function BlocksEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const { confirm } = useUi();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const update = (id: string, next: Block) => onChange(blocks.map((b) => (b.id === id ? next : b)));
  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= blocks.length) return;
    const copy = [...blocks];
    const [item] = copy.splice(index, 1);
    copy.splice(to, 0, item);
    onChange(copy);
  };
  const duplicate = (index: number) => {
    const copy = [...blocks];
    copy.splice(index + 1, 0, { ...structuredClone(blocks[index]), id: newId() });
    onChange(copy);
  };
  const remove = async (b: Block) => {
    const ok = await confirm({
      title: "¿Eliminar bloque?",
      message: <p>Se quitará el bloque “{BLOCK_LABELS[b.type]}” del borrador. Podés deshacerlo si no guardás.</p>,
      confirmLabel: "Eliminar bloque",
      danger: true,
    });
    if (ok) onChange(blocks.filter((x) => x.id !== b.id));
  };
  const add = (type: BlockType) => {
    const block = createBlock(type);
    onChange([...blocks, block]);
    window.setTimeout(() => document.getElementById(`block-${block.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {blocks.length === 0 && <div className="a-empty a-muted">Este proyecto todavía no tiene bloques. Agregá el primero abajo.</div>}
      <SortableList items={blocks} onReorder={onChange}>
        <div style={{ display: "grid", gap: 12 }}>
          {blocks.map((b, i) => (
            <BlockCard
              key={b.id}
              block={b}
              index={i}
              total={blocks.length}
              collapsed={!!collapsed[b.id]}
              onToggle={() => setCollapsed((c) => ({ ...c, [b.id]: !c[b.id] }))}
              onChange={(next) => update(b.id, next)}
              onMove={(d) => move(i, d)}
              onDuplicate={() => duplicate(i)}
              onRemove={() => remove(b)}
            />
          ))}
        </div>
      </SortableList>
      <div className="a-add" role="group" aria-label="Agregar bloque">
        <span className="a-meta a-muted" style={{ width: "100%" }}>
          Agregar bloque
        </span>
        {ADD_ORDER.map((t) => (
          <button key={t} type="button" className="a-btn a-btn--sm" onClick={() => add(t)}>
            + {BLOCK_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockCard({
  block,
  index,
  total,
  collapsed,
  onToggle,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  block: Block;
  index: number;
  total: number;
  collapsed: boolean;
  onToggle: () => void;
  onChange: (b: Block) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { setNodeRef, style, handleProps, isDragging } = useSortableItem(block.id);
  const s = summary(block);
  return (
    <section
      ref={setNodeRef}
      id={`block-${block.id}`}
      style={style}
      className="a-block"
      data-collapsed={collapsed}
      data-dragging={isDragging}
      aria-label={`Bloque ${index + 1}: ${BLOCK_LABELS[block.type]}`}
    >
      <div className="a-block__head">
        <DragHandle {...handleProps} />
        <span className="a-meta a-muted">{String(index + 1).padStart(2, "0")}</span>
        <span className="a-block__title">
          {BLOCK_LABELS[block.type]}
          {s && <span className="a-muted" style={{ textTransform: "none", fontWeight: 500 }}> — {s}</span>}
        </span>
        <button type="button" className="a-btn a-btn--sm a-btn--icon a-btn--ghost" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Subir bloque">
          ↑
        </button>
        <button type="button" className="a-btn a-btn--sm a-btn--icon a-btn--ghost" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Bajar bloque">
          ↓
        </button>
        <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={onDuplicate}>
          Duplicar
        </button>
        <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={onToggle} aria-expanded={!collapsed}>
          {collapsed ? "Abrir" : "Cerrar"}
        </button>
        <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={onRemove} aria-label="Eliminar bloque">
          ✕
        </button>
      </div>
      {!collapsed && (
        <div className="a-block__body">
          <BlockFields block={block} onChange={onChange} />
        </div>
      )}
    </section>
  );
}

function BlockFields({ block: b, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const textHelp = "Separá párrafos con una línea en blanco. Formato: **negrita**, *cursiva*, [texto](https://enlace).";
  switch (b.type) {
    case "text":
      return (
        <div className="a-fields">
          <L10nField label="Título del bloque (opcional)" value={b.heading} onChange={(heading) => onChange({ ...b, heading })} />
          <L10nField label="Texto" value={b.body} onChange={(body) => onChange({ ...b, body })} multiline rows={7} help={textHelp} />
        </div>
      );
    case "image":
      return (
        <div className="a-fields">
          <MediaSlot label="Imagen" value={b.mediaId} onChange={(mediaId) => onChange({ ...b, mediaId })} accept={["image", "video"]} />
          <div className="a-field">
            <span className="a-label">Tamaño</span>
            <div className="a-row">
              {(["contained", "wide"] as const).map((size) => (
                <label key={size} className="a-check">
                  <input type="radio" name={`size-${b.id}`} checked={b.size === size} onChange={() => onChange({ ...b, size })} />
                  {size === "contained" ? "Contenida (con márgenes amplios)" : "Ancha (márgenes de página)"}
                </label>
              ))}
            </div>
          </div>
          <L10nField label="Pie de imagen (opcional)" value={b.caption} onChange={(caption) => onChange({ ...b, caption })} />
        </div>
      );
    case "full":
      return (
        <div className="a-fields">
          <MediaSlot label="Imagen a ancho completo" value={b.mediaId} onChange={(mediaId) => onChange({ ...b, mediaId })} accept={["image", "video"]} help="Ocupa todo el ancho de la pantalla, sin márgenes." />
          <L10nField label="Pie de imagen (opcional)" value={b.caption} onChange={(caption) => onChange({ ...b, caption })} />
        </div>
      );
    case "gallery":
      return (
        <div className="a-fields">
          <div className="a-field">
            <span className="a-label">Columnas</span>
            <div className="a-row">
              {([2, 3] as const).map((columns) => (
                <label key={columns} className="a-check">
                  <input type="radio" name={`cols-${b.id}`} checked={b.columns === columns} onChange={() => onChange({ ...b, columns })} />
                  {columns} columnas
                </label>
              ))}
            </div>
          </div>
          {b.items.map((item, i) => (
            <div key={i} className="a-card" style={{ display: "grid", gap: 12 }}>
              <div className="a-row" style={{ justifyContent: "space-between" }}>
                <span className="a-meta">Elemento {i + 1}</span>
                <div className="a-row">
                  <button type="button" className="a-btn a-btn--sm a-btn--icon a-btn--ghost" disabled={i === 0} aria-label="Mover antes" onClick={() => {
                    const items = [...b.items];
                    [items[i - 1], items[i]] = [items[i], items[i - 1]];
                    onChange({ ...b, items });
                  }}>←</button>
                  <button type="button" className="a-btn a-btn--sm a-btn--icon a-btn--ghost" disabled={i === b.items.length - 1} aria-label="Mover después" onClick={() => {
                    const items = [...b.items];
                    [items[i + 1], items[i]] = [items[i], items[i + 1]];
                    onChange({ ...b, items });
                  }}>→</button>
                  <button type="button" className="a-btn a-btn--sm a-btn--ghost" onClick={() => onChange({ ...b, items: b.items.filter((_, j) => j !== i) })}>
                    Quitar
                  </button>
                </div>
              </div>
              <MediaSlot
                label="Imagen o video"
                value={item.mediaId}
                accept={["image", "video"]}
                onChange={(mediaId) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, mediaId } : x)) })}
              />
              <L10nField
                label="Pie (opcional)"
                value={item.caption}
                onChange={(caption) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, caption } : x)) })}
              />
            </div>
          ))}
          <div>
            <button type="button" className="a-btn a-btn--sm" onClick={() => onChange({ ...b, items: [...b.items, { mediaId: null, caption: emptyL10n() }] })}>
              + Agregar elemento
            </button>
          </div>
        </div>
      );
    case "columns":
      return (
        <div className="a-grid-2">
          {(["left", "right"] as const).map((side) => {
            const col = b[side];
            const set = (next: typeof col) => onChange({ ...b, [side]: next });
            return (
              <div key={side} className="a-card" style={{ display: "grid", gap: 12, margin: 0 }}>
                <span className="a-meta">{side === "left" ? "Columna izquierda" : "Columna derecha"}</span>
                <div className="a-row">
                  {(["text", "image"] as const).map((kind) => (
                    <label key={kind} className="a-check">
                      <input type="radio" name={`${side}-${b.id}`} checked={col.kind === kind} onChange={() => set({ ...col, kind })} />
                      {kind === "text" ? "Texto" : "Imagen / video"}
                    </label>
                  ))}
                </div>
                {col.kind === "text" ? (
                  <L10nField label="Texto" value={col.text} onChange={(text) => set({ ...col, text })} multiline rows={6} help={textHelp} />
                ) : (
                  <MediaSlot label="Imagen o video" value={col.mediaId} onChange={(mediaId) => set({ ...col, mediaId })} accept={["image", "video"]} />
                )}
              </div>
            );
          })}
        </div>
      );
    case "video": {
      const embedOk = !b.url || !!toEmbedUrl(b.url);
      return (
        <div className="a-fields">
          <div className="a-row">
            {(["upload", "embed"] as const).map((source) => (
              <label key={source} className="a-check">
                <input type="radio" name={`src-${b.id}`} checked={b.source === source} onChange={() => onChange({ ...b, source })} />
                {source === "upload" ? "Archivo subido" : "YouTube / Vimeo"}
              </label>
            ))}
          </div>
          {b.source === "upload" ? (
            <>
              <MediaSlot label="Video" value={b.mediaId} onChange={(mediaId) => onChange({ ...b, mediaId })} accept={["video"]} />
              <label className="a-check" style={{ width: "fit-content" }}>
                <input type="checkbox" checked={b.autoplay} onChange={(e) => onChange({ ...b, autoplay: e.target.checked })} />
                Reproducir en loop y sin sonido al aparecer (ideal para piezas de motion)
              </label>
            </>
          ) : (
            <>
              <TextField label="URL del video" value={b.url} onChange={(url) => onChange({ ...b, url })} placeholder="https://vimeo.com/123456789" />
              {!embedOk && <p className="a-error">La URL no es de YouTube o Vimeo, o no es válida.</p>}
            </>
          )}
          <L10nField label="Pie (opcional)" value={b.caption} onChange={(caption) => onChange({ ...b, caption })} />
        </div>
      );
    }
  }
}
