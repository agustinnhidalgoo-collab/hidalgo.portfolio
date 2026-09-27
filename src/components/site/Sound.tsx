"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Sonido de interfaz sintetizado en el navegador (sin archivos de audio).
 * Apagado por defecto; la preferencia se recuerda en este dispositivo.
 */
type Kind = "hover" | "click" | "enter";
const SoundContext = createContext<{ on: boolean; toggle: () => void; play: (k: Kind) => void } | null>(null);
const KEY = "hidalgo:sound";

export function SoundProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const last = useRef(0);

  useEffect(() => {
    try {
      setOn(localStorage.getItem(KEY) === "on");
    } catch {}
  }, []);

  const audio = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

  const play = useCallback(
    (k: Kind) => {
      if (!on) return;
      const now = performance.now();
      if (k === "hover" && now - last.current < 60) return;
      last.current = now;
      const ac = audio();
      if (!ac) return;
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 3200;
      if (k === "hover") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(1800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.04);
        gain.gain.setValueAtTime(0.018, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      } else if (k === "click") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.exponentialRampToValueAtTime(420, t + 0.9);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.05, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      }
      osc.connect(filter).connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    },
    [on],
  );

  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v;
      try {
        localStorage.setItem(KEY, next ? "on" : "off");
      } catch {}
      if (next) audio();
      return next;
    });
  }, []);

  // Sonido en toda la interfaz: hover y clic sobre elementos interactivos.
  useEffect(() => {
    if (!on) return;
    const over = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element).closest("a, button, [data-cursor]");
      const from = (e.relatedTarget as Element | null)?.closest?.("a, button, [data-cursor]");
      if (el && el !== from) play("hover");
    };
    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest("a, button")) play("click");
    };
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerdown", down, { passive: true });
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", down);
    };
  }, [on, play]);

  return <SoundContext.Provider value={{ on, toggle, play }}>{children}</SoundContext.Provider>;
}

export function useSound() {
  return useContext(SoundContext) ?? { on: false, toggle: () => {}, play: () => {} };
}

export function SoundToggle({ labels }: { labels: { on: string; off: string } }) {
  const { on, toggle } = useSound();
  return (
    <button type="button" className="sound-toggle" onClick={toggle} aria-pressed={on} aria-label={on ? labels.off : labels.on} data-scramble>
      <span className="sound-toggle__bars" aria-hidden="true" data-on={on}>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sound-toggle__label">{on ? "SND ON" : "SND OFF"}</span>
    </button>
  );
}
