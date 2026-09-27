"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, markReady, prefersReducedMotion } from "./motion";

const KEY = "hidalgo:loaded";

/** Precarga breve, solo en la primera visita de la sesión. */
export function Preloader({ role }: { role: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
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
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const tl = gsap.timeline({ paused: true });
    tl.to(counter, {
      v: 100,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        if (countRef.current) countRef.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
      },
    })
      .to(barRef.current, { scaleX: 1, duration: 1.5, ease: "power2.inOut" }, 0)
      .add(() => markReady(), "-=0.15")
      .to(ref.current, { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "expo.inOut" }, "-=0.1")
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
      <div className="meta" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Hidalgo</span>
        <span>{role}</span>
      </div>
      <div>
        <span ref={countRef} className="preloader__count" style={{ display: "block", textAlign: "right" }}>
          000
        </span>
        <div className="preloader__bar" style={{ marginTop: 20 }}>
          <span ref={barRef} />
        </div>
      </div>
    </div>
  );
}
