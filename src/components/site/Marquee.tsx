"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./motion";

/** Cinta de texto infinita. Acelera y cambia de sentido según el scroll. */
export function Marquee({ items, label }: { items: string[]; label?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersReducedMotion() || !items.length) return;
    const ctx = gsap.context(() => {
      const loop = gsap.to(track, { xPercent: -50, duration: Math.max(18, items.length * 6), ease: "none", repeat: -1 });
      let direction = 1;
      ScrollTrigger.create({
        trigger: track,
        start: "top bottom",
        end: "bottom top",
        onUpdate(self) {
          const v = self.getVelocity();
          if (Math.abs(v) > 20) direction = v > 0 ? 1 : -1;
          const boost = 1 + Math.min(Math.abs(v) / 400, 5);
          gsap.to(loop, { timeScale: direction * boost, duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: direction, duration: 1.2, delay: 0.2, ease: "power2.out" });
        },
      });
    }, track);
    return () => ctx.revert();
  }, [items]);

  if (!items.length) return null;
  const group = (hidden: boolean) => (
    <div className="marquee__group" aria-hidden={hidden || undefined}>
      {[...items, ...items].map((item, i) => (
        <span key={i} className="marquee__item">
          {item}
          <span className="marquee__sep" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="marquee" role="region" aria-label={label}>
      {label && (
        <ul className="sr-only">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
      <div ref={trackRef} className="marquee__track" aria-hidden="true">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}
