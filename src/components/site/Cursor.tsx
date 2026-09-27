"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, hasFinePointer, prefersReducedMotion } from "./motion";

/**
 * Cursor propio: un punto que crece sobre enlaces y se convierte en un
 * círculo con texto sobre proyectos (data-cursor="view" + data-cursor-label).
 * Toma el color del tema de la sección que tiene debajo.
 * En pantallas táctiles o con movimiento reducido se usa el cursor nativo.
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const xTo = gsap.quickTo(el, "x", { duration: 0.22, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.22, ease: "power3.out" });
    let visible = false;

    const setTheme = (target: Element | null) => {
      const theme = target?.closest<HTMLElement>("[data-theme]")?.dataset.theme ?? "light";
      el.style.setProperty("--cursor-color", theme === "dark" ? "var(--butter)" : "var(--cocoa)");
      el.style.setProperty("--cursor-ink", theme === "dark" ? "var(--cocoa)" : "var(--butter)");
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!visible) {
        gsap.set(el, { x: e.clientX, y: e.clientY });
        gsap.to(el, { autoAlpha: 1, duration: 0.3 });
        visible = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
      setTheme(e.target as Element);
    };

    const onOver = (e: PointerEvent) => {
      const target = e.target as Element;
      const interactive = target.closest<HTMLElement>("[data-cursor], a, button, [role='button'], input, textarea, select, label");
      let state = "default";
      let label = "";
      if (interactive) {
        const explicit = interactive.dataset.cursor;
        if (explicit) {
          state = explicit;
          label = interactive.dataset.cursorLabel ?? "";
        } else if (/^(INPUT|TEXTAREA|SELECT)$/.test(interactive.tagName)) state = "hidden";
        else state = "link";
      }
      el.dataset.state = state;
      if (labelRef.current) labelRef.current.textContent = label;
    };

    const onLeave = () => {
      gsap.to(el, { autoAlpha: 0, duration: 0.2 });
      visible = false;
    };
    const onDown = () => (el.dataset.pressed = "true");
    const onUp = () => (el.dataset.pressed = "false");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // Al cambiar de página se vuelve al estado base.
  useEffect(() => {
    if (ref.current) ref.current.dataset.state = "default";
  }, [pathname]);

  return (
    <div ref={ref} className="cursor" aria-hidden="true" style={{ opacity: 0 }}>
      <span className="cursor__dot" />
      <span ref={labelRef} className="cursor__label" />
    </div>
  );
}
