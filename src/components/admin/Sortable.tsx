"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";

/** Lista reordenable con mouse, táctil y teclado (espacio para tomar, flechas, espacio para soltar). */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  children,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Para mover, presioná espacio. Usá las flechas para cambiar de lugar y espacio para soltar; Escape cancela.",
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function useSortableItem(id: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  const handleProps = { ...attributes, ...listeners };
  return { setNodeRef, style, handleProps, isDragging };
}

export function DragHandle(props: Record<string, unknown>) {
  return (
    <button type="button" className="a-handle" aria-label="Arrastrar para reordenar" {...props}>
      <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden="true">
        {[3, 9, 15].map((y) => (
          <g key={y}>
            <circle cx="3" cy={y} r="1.6" fill="currentColor" />
            <circle cx="9" cy={y} r="1.6" fill="currentColor" />
          </g>
        ))}
      </svg>
    </button>
  );
}
