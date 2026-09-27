"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, SplitText, hasFinePointer, prefersReducedMotion, whenReady } from "./motion";

/**
 * Animaciones declarativas: cualquier elemento del sitio puede pedirlas con
 * atributos, sin que las páginas (componentes de servidor) necesiten JS propio.
 *
 *   data-reveal="lines"  → el texto sube línea por línea
 *   data-reveal="rise"   → sube y aparece
 *   data-reveal="fade"   → aparece
 *   data-reveal="image"  → la imagen se descubre de abajo hacia arriba
 *   data-reveal="rule"   → la línea se dibuja de izquierda a derecha
 *   data-reveal="words"  → las palabras se encienden al avanzar el scroll
 *   data-parallax="0.2"  → desplazamiento parallax (fracción de la altura)
 *   data-magnetic        → el elemento es atraído por el cursor
 *   data-delay="0.2"     → retraso extra en segundos
 */
export function ScrollEffects() {
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const isFirst = firstRun.current;
    firstRun.current = false;
    let ctx: gsap.Context | null = null;
    const cleanups: (() => void)[] = [];

    const build = () => {
      ctx = gsap.context(() => {
        // Todo el documento: incluye el footer, que vive fuera de <main>.
        const q = <T extends Element = HTMLElement>(sel: string) =>
          Array.from(document.body.querySelectorAll<T & HTMLElement>(sel));
        const delayOf = (el: HTMLElement) => parseFloat(el.dataset.delay ?? "0") || 0;
        const trigger = (el: Element) => ({ trigger: el, start: "top 88%", once: true });

        q("[data-reveal='lines']").forEach((el) => {
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
            autoSplit: true,
            onSplit(self) {
              gsap.set(el, { visibility: "visible" });
              return gsap.from(self.lines, {
                yPercent: 110,
                duration: 1.2,
                stagger: 0.08,
                delay: delayOf(el),
                scrollTrigger: trigger(el),
              });
            },
          });
        });

        q("[data-reveal='rise']").forEach((el) => {
          gsap.fromTo(
            el,
            { y: 60, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.3, delay: delayOf(el), scrollTrigger: trigger(el) },
          );
        });

        q("[data-reveal='fade']").forEach((el) => {
          gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "power2.out", delay: delayOf(el), scrollTrigger: trigger(el) });
        });

        q("[data-reveal='image']").forEach((el) => {
          const inner = el.querySelector("img, video");
          const tl = gsap.timeline({ scrollTrigger: trigger(el), delay: delayOf(el) });
          tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" });
          if (inner) tl.fromTo(inner, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: "expo.out" }, 0.1);
        });

        q("[data-reveal='rule']").forEach((el) => {
          gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "expo.inOut", delay: delayOf(el), scrollTrigger: trigger(el) });
        });

        q("[data-reveal='words']").forEach((el) => {
          const split = SplitText.create(el, { type: "words", wordsClass: "word" });
          gsap.fromTo(
            split.words,
            { opacity: 0.16 },
            {
              opacity: 1,
              stagger: 0.1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
            },
          );
        });

        // Inclinación según la velocidad del scroll (las imágenes “se arrastran”).
        const skewEls = q("[data-skew]");
        if (skewEls.length) {
          const setters = skewEls.map((el) => gsap.quickSetter(el, "skewY", "deg") as (v: number) => void);
          const proxy = { skew: 0 };
          const clamp = gsap.utils.clamp(-5, 5);
          ScrollTrigger.create({
            onUpdate(self) {
              const skew = clamp(self.getVelocity() / -380);
              if (Math.abs(skew) > Math.abs(proxy.skew)) {
                proxy.skew = skew;
                gsap.to(proxy, {
                  skew: 0,
                  duration: 0.9,
                  ease: "power3",
                  overwrite: true,
                  onUpdate: () => setters.forEach((set) => set(proxy.skew)),
                });
              }
            },
          });
          gsap.set(skewEls, { transformOrigin: "center center", force3D: true });
        }

        q("[data-parallax]").forEach((el) => {
          const amount = parseFloat(el.dataset.parallax ?? "0.15");
          gsap.fromTo(
            el,
            { yPercent: -amount * 50 },
            {
              yPercent: amount * 50,
              ease: "none",
              scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        });
      });

      // Botones magnéticos (solo con mouse).
      if (hasFinePointer()) {
        document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
          const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
          const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
          const strength = parseFloat(el.dataset.magnetic || "0.35") || 0.35;
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            xTo((e.clientX - (r.left + r.width / 2)) * strength);
            yTo((e.clientY - (r.top + r.height / 2)) * strength);
          };
          const leave = () => {
            gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.4)" });
          };
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerleave", leave);
            gsap.set(el, { x: 0, y: 0 });
          });
        });
      }

      ScrollTrigger.refresh();
    };

    let timer = 0;
    const stopWaiting = whenReady(() => {
      // Tras una transición, esperar a que la cortina empiece a retirarse.
      timer = window.setTimeout(build, isFirst ? 0 : 450);
    });

    return () => {
      stopWaiting();
      window.clearTimeout(timer);
      cleanups.forEach((c) => c());
      ctx?.revert();
    };
  }, [pathname]);

  return null;
}
