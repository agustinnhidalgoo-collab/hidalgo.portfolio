"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./motion";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/** Scroll suave con inercia (solo escritorio y sin movimiento reducido). */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.__lenis = undefined;
    };
  }, []);
  return null;
}

export function scrollToTop(immediate = false) {
  if (window.__lenis) window.__lenis.scrollTo(0, { immediate, duration: 1.4 });
  else window.scrollTo({ top: 0, behavior: immediate ? "auto" : "smooth" });
}
