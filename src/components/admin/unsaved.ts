"use client";

/** Marca global de cambios sin guardar, consultada por la navegación del panel. */
export function setUnsaved(v: boolean) {
  (window as unknown as { __adminDirty?: boolean }).__adminDirty = v;
}

export function confirmLeave(): boolean {
  const dirty = (window as unknown as { __adminDirty?: boolean }).__adminDirty;
  if (!dirty) return true;
  const ok = window.confirm("Hay cambios sin guardar. ¿Salir igual y perderlos?");
  if (ok) setUnsaved(false);
  return ok;
}
