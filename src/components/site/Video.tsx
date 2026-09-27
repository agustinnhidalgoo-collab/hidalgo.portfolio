"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

interface Props {
  src: string;
  poster?: string;
  label: string;
  labels: { play: string; pause: string; soundOn: string; soundOff: string };
  className?: string;
}

/**
 * Video corto en loop y sin sonido, que se reproduce solo mientras está en
 * pantalla. Con movimiento reducido no arranca solo y muestra controles.
 */
export function Video({ src, poster, label, labels, className = "" }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const r = prefersReducedMotion();
    setReduce(r);
    if (r) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`video media ${className}`} data-reveal="image">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop={!reduce}
        playsInline
        preload="metadata"
        controls={reduce}
        aria-label={label || undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!reduce && (
        <div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", gap: 8 }}>
          <button
            type="button"
            className="video__toggle"
            style={{ position: "static" }}
            onClick={() => {
              const v = ref.current;
              if (!v) return;
              if (v.paused) v.play().catch(() => {});
              else v.pause();
            }}
          >
            {playing ? labels.pause : labels.play}
          </button>
          <button type="button" className="video__toggle" style={{ position: "static" }} aria-pressed={!muted} onClick={() => setMuted((m) => !m)}>
            {muted ? labels.soundOn : labels.soundOff}
          </button>
        </div>
      )}
    </div>
  );
}
