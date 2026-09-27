"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, markReady, prefersReducedMotion } from "./motion";
import { scramble } from "./scramble";

const KEY = "hidalgo:loaded";
const SEGMENTS = 32;

/**
 * Precarga tipo “arranque de sistema”, solo en la primera visita de la sesión:
 * líneas de estado que se decodifican, contador y barra segmentada.
 */
export function Preloader({ role, lines }: { role: string; lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {}

    if (seen || prefersReducedMotion() || !ref.current) {
      setShow(false);
      markReady();
      return;
    }

    const counter = { v: 0 };
    const segs = barRef.current ? Array.from(barRef.current.children) : [];
    const items = logRef.current ? Array.from(logRef.current.children) as HTMLElement[] : [];
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const total = 2.2;
    const tl = gsap.timeline({ paused: true });
    tl.to(counter, {
      v: 100,
      duration: total,
      ease: "power2.inOut",
      onUpdate: () => {
        const v = Math.round(counter.v);
        if (countRef.current) countRef.current.textContent = String(v).padStart(3, "0");
        const on = Math.round((v / 100) * SEGMENTS);
        segs.forEach((s, i) => s.classList.toggle("is-on", i < on));
      },
    });
    items.forEach((li, i) => {
      tl.add(() => {
        li.style.opacity = "1";
        const text = li.querySelector<HTMLElement>("[data-line]");
        if (text) scramble(text, 260);
      }, (i / items.length) * total * 0.75);
    });
    tl.add(() => markReady(), "-=0.1")
      .to(ref.current, { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "expo.inOut" })
      .add(() => setShow(false));

    fontsReady.then(() => tl.play());
    return () => {
      tl.kill();
      markReady();
    };
  }, []);

  if (!show) return null;
  return (
    <div ref={ref} className="preloader" data-theme="dark" aria-hidden="true">
      <div className="preloader__top meta">
        <span>HIDALGO / SYS</span>
        <span>{role}</span>
      </div>
      <ol ref={logRef} className="preloader__log meta">
        {lines.map((l, i) => (
          <li key={i} style={{ opacity: 0 }}>
            <span className="preloader__idx">{String(i + 1).padStart(2, "0")}</span>
            <span data-line>{l}</span>
            <span className="preloader__ok">OK</span>
          </li>
        ))}
      </ol>
      <div>
        <span ref={countRef} className="preloader__count">
          000
        </span>
        <div ref={barRef} className="preloader__segments">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
