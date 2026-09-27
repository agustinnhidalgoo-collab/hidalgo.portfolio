"use client";

import { scrollToTop } from "./SmoothScroll";

export function BackToTop({ label }: { label: string }) {
  return (
    <button type="button" className="u-link meta" onClick={() => scrollToTop()}>
      {label} ↑
    </button>
  );
}
