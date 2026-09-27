"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

let registered = false;
export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, useGSAP);
  gsap.defaults({ ease: "expo.out", duration: 1 });
  registered = true;
}
registerGsap();

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Evento que se dispara cuando termina la precarga (o de inmediato si no hay). */
export const READY_EVENT = "hidalgo:ready";

export function whenReady(cb: () => void): () => void {
  const w = window as unknown as { __hidalgoReady?: boolean };
  if (w.__hidalgoReady) {
    cb();
    return () => {};
  }
  const handler = () => cb();
  window.addEventListener(READY_EVENT, handler, { once: true });
  return () => window.removeEventListener(READY_EVENT, handler);
}

export function markReady() {
  const w = window as unknown as { __hidalgoReady?: boolean };
  if (w.__hidalgoReady) return;
  w.__hidalgoReady = true;
  window.dispatchEvent(new Event(READY_EVENT));
}

export { gsap, ScrollTrigger, SplitText, Flip, useGSAP };
