"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale, MediaRecord } from "@/lib/types";
import { DuoPicture, Picture, imageSources } from "./Picture";
import { TLink } from "./Transition";
import { gsap, hasFinePointer, prefersReducedMotion } from "./motion";

export interface IndexItem {
  id: string;
  href: string;
  title: string;
  year: string;
  categories: string[];
  cover: MediaRecord | null;
  isExample: boolean;
}

interface Props {
  items: IndexItem[];
  locale: Locale;
  viewLabel: string;
  exampleLabel: string;
}

/**
 * Índice de proyectos. Con mouse, la portada del proyecto sigue al cursor y
 * cambia con una cortina al pasar de una fila a otra. En táctiles, cada fila
 * muestra su miniatura.
 */
export function ProjectIndex({ items, locale, viewLabel, exampleLabel }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    setEnabled(hasFinePointer() && !prefersReducedMotion() && window.innerWidth >= 900);
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || !enabled) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });
    let lastX = 0;
    const onMove = (e: PointerEvent) => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      xTo(e.clientX - w / 2);
      yTo(e.clientY - h / 2);
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      gsap.to(el, { rotation: gsap.utils.clamp(-4, 4, dx * 0.15), duration: 0.6, ease: "power3.out" });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || !enabled) return;
    const itemsEls = el.querySelectorAll<HTMLElement>(".hover-preview__item");
    if (active === null) {
      gsap.to(el, { scale: 0.6, autoAlpha: 0, duration: 0.45, ease: "power3.out" });
    } else {
      if (prev.current === null) gsap.fromTo(el, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: "expo.out" });
      const target = itemsEls[active];
      if (target) {
        gsap.set(target, { zIndex: 2 });
        itemsEls.forEach((it, i) => i !== active && gsap.set(it, { zIndex: 1 }));
        gsap.fromTo(target, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "expo.out" });
        gsap.fromTo(target.querySelector("img"), { scale: 1.3 }, { scale: 1, duration: 1.1, ease: "expo.out" });
      }
    }
    prev.current = active;
  }, [active, enabled]);

  return (
    <>
      <ul className="index-list" onPointerLeave={() => setActive(null)}>
        {items.map((item, i) => (
          <li key={item.id} className="index-row" data-reveal="rise" data-delay={String(Math.min(i, 5) * 0.05)}>
            <TLink
              href={item.href}
              className="index-row__link"
              transitionLabel={item.title}
              data-cursor="view"
              data-cursor-label={viewLabel}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(null)}
            >
              <span className="index-row__thumb" aria-hidden="true">
                <DuoPicture media={item.cover} locale={locale} sizes="100vw" fill alt="" />
              </span>
              <span className="index-row__num meta">{String(i + 1).padStart(2, "0")}</span>
              <span className="index-row__title">{item.title}</span>
              <span className="index-row__info meta muted">
                {item.categories.join(" / ")}
                {item.isExample && <span className="tag-example">{exampleLabel}</span>}
              </span>
              <span className="index-row__year meta" style={{ textAlign: "right" }}>
                {item.year}
              </span>
            </TLink>
          </li>
        ))}
      </ul>

      {enabled && (
        <div ref={previewRef} className="hover-preview" aria-hidden="true">
          {items.map((item) => (
            <div key={item.id} className="hover-preview__item">
              {item.cover && item.cover.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img {...imageSources(item.cover)} sizes="420px" alt="" loading="lazy" decoding="async" />
              ) : (
                <Picture media={null} locale={locale} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
