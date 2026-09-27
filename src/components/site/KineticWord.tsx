"use client";

import { useEffect, useRef, type ElementType } from "react";
import { gsap, ScrollTrigger, hasFinePointer, prefersReducedMotion, whenReady } from "./motion";

interface Props {
  text: string;
  as?: ElementType;
  className?: string;
  /** Las letras reaccionan a la cercanía del cursor (o a una onda automática en táctiles). */
  interactive?: boolean;
  /** La palabra se comprime verticalmente al hacer scroll. */
  squash?: boolean;
  /** Animación de entrada de las letras. */
  intro?: boolean;
}

const REST = { w: 100, g: 900 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Palabra que siempre ocupa el ancho completo de su contenedor y cuyas letras
 * cambian de ancho y peso (ejes variables de Archivo) según la cercanía del
 * cursor. La compensación de ancho se hace con scaleX, que además aporta la
 * deformación tipográfica del concepto.
 */
export function KineticWord({ text, as: Tag = "h1", className = "", interactive = true, squash = false, intro = false }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const inner = innerRef.current;
    if (!root || !inner) return;
    const chars = Array.from(inner.querySelectorAll<HTMLSpanElement>(".kinetic__char"));
    const reduce = prefersReducedMotion();
    const fine = hasFinePointer();

    // Ajusta el cuerpo de letra para que la palabra en reposo llene el ancho.
    const fit = () => {
      chars.forEach((c) => {
        c.style.setProperty("--w", String(REST.w));
        c.style.setProperty("--g", String(REST.g));
      });
      inner.style.transform = "none";
      root.style.fontSize = "100px";
      const natural = inner.offsetWidth;
      if (natural > 0) root.style.fontSize = `${(100 * root.clientWidth) / natural}px`;
    };

    const state = chars.map(() => ({ ...REST }));
    const pointer = { x: 0, y: 0, active: false };
    let visible = true;

    const frame = (time: number) => {
      if (!visible) return;
      const rect = root.getBoundingClientRect();
      let px = pointer.x;
      let active = pointer.active;
      if (!fine) {
        // Onda automática en táctiles.
        px = rect.left + rect.width * (0.5 + 0.42 * Math.sin(time * 0.6));
        active = true;
      }
      const radius = rect.width * 0.28;
      chars.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        let tw = REST.w;
        let tg = REST.g;
        if (active) {
          const d = Math.abs(px - cx) / radius;
          const f = Math.exp(-d * d * 1.6);
          tw = lerp(68, 125, f);
          tg = lerp(620, 900, f);
        }
        state[i].w = lerp(state[i].w, tw, 0.11);
        state[i].g = lerp(state[i].g, tg, 0.11);
        c.style.setProperty("--w", state[i].w.toFixed(2));
        c.style.setProperty("--g", state[i].g.toFixed(1));
      });
      inner.style.transform = "none";
      const natural = inner.offsetWidth;
      if (natural > 0) inner.style.transform = `scaleX(${root.clientWidth / natural})`;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = root.getBoundingClientRect();
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      // Activo solo cuando el cursor está en la franja vertical cercana a la palabra.
      pointer.active = e.clientY > r.top - r.height * 2.2 && e.clientY < r.bottom + r.height * 0.6;
    };
    const onLeave = () => (pointer.active = false);

    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let tickerOn = false;
    const tick = () => frame(performance.now() / 1000);
    const ctx = gsap.context(() => {}, root);

    const start = () => {
      fit();
      ro = new ResizeObserver(() => fit());
      ro.observe(root);
      if (reduce) return;

      if (intro) {
        ctx.add(() => {
          gsap.from(chars, { yPercent: 108, duration: 1.4, stagger: 0.06, ease: "expo.out" });
        });
      }
      if (squash) {
        ctx.add(() => {
          gsap.to(root, {
            scaleY: 0.35,
            ease: "none",
            scrollTrigger: { trigger: root, start: "bottom bottom", end: "bottom top", scrub: true },
          });
        });
      }
      if (interactive) {
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
        io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
        io.observe(root);
        gsap.ticker.add(tick);
        tickerOn = true;
      }
      ScrollTrigger.refresh();
    };

    let cancelled = false;
    const stopWaiting = whenReady(() => {
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (!cancelled) start();
      });
    });
    // Ajuste inicial aunque la precarga todavía no haya terminado.
    fit();

    return () => {
      cancelled = true;
      stopWaiting();
      ro?.disconnect();
      io?.disconnect();
      if (tickerOn) gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      ctx.revert();
    };
  }, [interactive, squash, intro, text]);

  return (
    <Tag ref={rootRef} className={`kinetic ${className}`} aria-label={text}>
      <span className="kinetic__mask" aria-hidden="true">
        <span ref={innerRef} className="kinetic__inner">
          {Array.from(text).map((ch, i) => (
            <span key={i} className="kinetic__char">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </span>
      </span>
    </Tag>
  );
}
