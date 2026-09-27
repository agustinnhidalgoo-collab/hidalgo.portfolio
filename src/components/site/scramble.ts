"use client";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>_-+=";
const running = new WeakMap<HTMLElement, number>();

/**
 * Decodifica el texto de un elemento: cada letra pasa por caracteres al azar
 * hasta fijarse, de izquierda a derecha. Respeta espacios y el texto original.
 */
export function scramble(el: HTMLElement, duration = 520, text?: string) {
  if (typeof window === "undefined") return;
  if (text !== undefined) {
    el.dataset.scrambleText = text;
    el.textContent = text;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const original = el.dataset.scrambleText ?? el.textContent ?? "";
  el.dataset.scrambleText = original;
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  const start = performance.now();
  const chars = Array.from(original);
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const fixed = Math.floor(p * chars.length);
    let out = "";
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (i < fixed || c === " " || c === "\n") out += c;
      else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) running.set(el, requestAnimationFrame(tick));
    else {
      el.textContent = original;
      running.delete(el);
    }
  };
  running.set(el, requestAnimationFrame(tick));
}
