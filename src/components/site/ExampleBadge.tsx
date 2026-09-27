"use client";

import { useEffect, useState } from "react";

const KEY = "hidalgo:example-badge";

/** Aviso de contenido de ejemplo; se puede cerrar durante la sesión. */
export function ExampleBadge({ text, closeLabel }: { text: string; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(KEY) !== "closed");
    } catch {
      setOpen(true);
    }
  }, []);
  if (!open) return null;
  return (
    <p className="example-badge" role="note">
      <span>{text}</span>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => {
          setOpen(false);
          try {
            sessionStorage.setItem(KEY, "closed");
          } catch {}
        }}
      >
        ✕
      </button>
    </p>
  );
}
