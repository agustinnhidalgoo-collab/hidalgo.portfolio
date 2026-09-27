"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media-url";
import type { MediaRecord } from "@/lib/types";
import { prefersReducedMotion } from "./motion";

interface Props {
  media: MediaRecord;
  autoplay: boolean;
  label: string;
  labels: { play: string; pause: string; soundOn: string; soundOff: string };
}

/**
 * Video subido. Con autoplay se reproduce en silencio solo mientras está en
 * pantalla; con movimiento reducido nunca arranca solo y muestra controles.
 */
export function Video({ media, autoplay, label, labels }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const r = prefersReducedMotion();
    setReduce(r);
    if (!autoplay || r) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [autoplay]);

  const manual = !autoplay || reduce;
  return (
    <div className="video media" data-reveal="image">
      <video
        ref={ref}
        src={mediaUrl(media.file)}
        muted={muted}
        loop={!manual}
        playsInline
        preload="metadata"
        controls={manual}
        aria-label={label || undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!manual && (
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
          <button
            type="button"
            className="video__toggle"
            style={{ position: "static" }}
            aria-pressed={!muted}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? labels.soundOn : labels.soundOff}
          </button>
        </div>
      )}
    </div>
  );
}
