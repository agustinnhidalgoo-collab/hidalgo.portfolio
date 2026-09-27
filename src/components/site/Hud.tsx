"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { hasFinePointer, prefersReducedMotion } from "./motion";
import { scramble } from "./scramble";

/**
 * Capa HUD: líneas guía que cruzan la pantalla en la posición del cursor,
 * coordenadas en vivo, progreso de scroll y sección actual. También aplica el
 * efecto de decodificación a todo elemento con [data-scramble] al pasar el cursor.
 */
export function Hud({ labels }: { labels: { home: string; work: string; about: string; contact: string } }) {
  const root = useRef<HTMLDivElement>(null);
  const hLine = useRef<HTMLDivElement>(null);
  const vLine = useRef<HTMLDivElement>(null);
  const coords = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const section = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const sectionLabel =
    parts[1] === "work" && parts[2]
      ? `02.${parts[2].replace(/\D/g, "").slice(-2) || "1"} — ${parts[2].replace(/-/g, " ").toUpperCase()}`
      : parts[1] === "work"
        ? `02 — ${labels.work}`
        : parts[1] === "about"
          ? `03 — ${labels.about}`
          : parts[1] === "contact"
            ? `04 — ${labels.contact}`
            : `01 — ${labels.home}`;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const fine = hasFinePointer();
    const reduce = prefersReducedMotion();
    el.dataset.pointer = fine && !reduce ? "fine" : "coarse";

    let raf = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let theme = "light";

    const paint = () => {
      raf = 0;
      if (hLine.current) hLine.current.style.transform = `translate3d(0, ${my}px, 0)`;
      if (vLine.current) vLine.current.style.transform = `translate3d(${mx}px, 0, 0)`;
      if (coords.current) coords.current.textContent = `X ${String(Math.round(mx)).padStart(4, "0")}  Y ${String(Math.round(my)).padStart(4, "0")}`;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (progress.current) progress.current.textContent = `${String(Math.round(p * 100)).padStart(3, "0")}%`;
      if (bar.current) bar.current.style.transform = `scaleY(${p})`;
      // Color según la sección que queda debajo de la esquina inferior izquierda.
      const probe = document.elementsFromPoint(24, window.innerHeight - 24).find((n) => !n.closest(".hud, .cursor, .example-badge"));
      const t = probe?.closest<HTMLElement>("[data-theme]")?.dataset.theme ?? "light";
      if (t !== theme) {
        theme = t;
        el.dataset.theme = t;
      }
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const move = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      request();
    };
    const over = (e: PointerEvent) => {
      if (reduce) return;
      const target = (e.target as Element).closest<HTMLElement>("[data-scramble]");
      if (!target) return;
      const from = (e.relatedTarget as Element | null)?.closest?.("[data-scramble]");
      if (from === target) return;
      const text = target.querySelector<HTMLElement>("[data-scramble-target]") ?? target;
      if (text.children.length === 0) scramble(text);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    document.addEventListener("pointerover", over, { passive: true });
    paint();
    const t = window.setTimeout(paint, 800);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      document.removeEventListener("pointerover", over);
      window.clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Al cambiar de página, la sección se decodifica.
  useEffect(() => {
    if (section.current) {
      scramble(section.current, 700, sectionLabel);
    }
  }, [pathname, sectionLabel]);

  return (
    <div ref={root} className="hud" aria-hidden="true" data-theme="light">
      <div ref={hLine} className="hud__line hud__line--h" />
      <div ref={vLine} className="hud__line hud__line--v" />
      <div className="hud__corner hud__corner--bl meta">
        <span ref={section} className="hud__section">
          {sectionLabel}
        </span>
        <span ref={coords} className="hud__coords">
          X 0000 Y 0000
        </span>
      </div>
      <div className="hud__scroll meta">
        <span ref={progress}>000%</span>
        <span className="hud__track">
          <span ref={bar} />
        </span>
      </div>
    </div>
  );
}
