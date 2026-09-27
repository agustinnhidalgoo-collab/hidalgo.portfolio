"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Media } from "@/lib/types";
import { Clock } from "./Clock";
import { KineticWord } from "./KineticWord";
import { gsap, hasFinePointer, prefersReducedMotion, ScrollTrigger, whenReady } from "./motion";

interface Props {
  world?: Media;
  roles: string[];
  intro: string;
  role: string;
  location: string;
  timezone: string;
  locale: string;
  projectsLabel: string;
  enterLabel: string;
}

/**
 * Entrada inmersiva de la Home.
 * 1. Puerta: pantalla cacao con “HIDALGO” calado; a través de las letras se ve el mundo.
 * 2. Al hacer scroll, la cámara atraviesa las letras y el mundo ocupa la pantalla.
 * 3. Aparecen los roles escalonados y sube la franja con la presentación y el nombre.
 */
export function HeroWorld({ world, roles, intro, role, location, timezone, locale, projectsLabel, enterLabel }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = prefersReducedMotion();
    root.dataset.mode = reduce ? "static" : "motion";
    if (reduce) return;

    const ctx = gsap.context(() => {}, root);
    let removeMove: (() => void) | null = null;

    const stop = whenReady(() => {
      ctx.add(() => {
        const gate = gateRef.current!;
        const text = textRef.current!;
        const lines = rolesRef.current ? Array.from(rolesRef.current.children) : [];

        // Punto de fuga: el centro del trazo de la “I”, así la cámara entra por dentro de una letra.
        const origin = () => {
          try {
            const box = text.getExtentOfChar(1);
            const m = gate.getScreenCTM();
            const r = gate.getBoundingClientRect();
            if (!m) return "50% 50%";
            const pt = new DOMPoint(box.x + box.width / 2, box.y + box.height * 0.55).matrixTransform(m);
            return `${pt.x - r.left}px ${pt.y - r.top}px`;
          } catch {
            return "50% 50%";
          }
        };

        // y: 0 explícito: el estado inicial viene de CSS y no debe sumarse a la animación.
        gsap.set(lines, { yPercent: 110, y: 0, opacity: 0 });
        gsap.set(bandRef.current, { yPercent: 100, y: 0 });

        // Entrada al cargar
        gsap.fromTo(gate, { scale: 1.15, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: "expo.out" });
        gsap.fromTo(hintRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 0.8 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: stageRef.current,
            start: "top top",
            end: "+=240%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        tl.to(hintRef.current, { opacity: 0, duration: 0.08 }, 0)
          .fromTo(
            gate,
            { scale: 1, transformOrigin: origin },
            { scale: 70, ease: "power3.in", duration: 0.55, immediateRender: false },
            0,
          )
          .to(gate, { opacity: 0, duration: 0.05 }, 0.5)
          .fromTo(sceneRef.current, { scale: 1.35 }, { scale: 1, ease: "power2.out", duration: 0.6 }, 0)
          .to(lines, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.2, ease: "power2.out" }, 0.5)
          .to(bandRef.current, { yPercent: 0, duration: 0.3, ease: "power2.out" }, 0.72);

        // Parallax suave del mundo con el mouse: las letras funcionan como ventanas.
        if (hasFinePointer()) {
          const inner = sceneRef.current!.querySelector<HTMLElement>(".world__depth");
          if (inner) {
            const xTo = gsap.quickTo(inner, "x", { duration: 1.2, ease: "power3.out" });
            const yTo = gsap.quickTo(inner, "y", { duration: 1.2, ease: "power3.out" });
            const move = (e: PointerEvent) => {
              xTo((e.clientX / window.innerWidth - 0.5) * -40);
              yTo((e.clientY / window.innerHeight - 0.5) * -28);
            };
            window.addEventListener("pointermove", move, { passive: true });
            removeMove = () => window.removeEventListener("pointermove", move);
          }
        }
        ScrollTrigger.refresh();
      });
    });

    return () => {
      stop();
      removeMove?.();
      ctx.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className="world" data-theme="dark" data-mode="static" aria-label="Hidalgo">
      <div ref={stageRef} className="world__stage">
        {/* El mundo */}
        <div ref={sceneRef} className="world__scene">
          <div className="world__depth">
            {world?.type === "image" && (
              <Image src={world.src} alt="" fill priority sizes="100vw" placeholder="blur" className="world__media" />
            )}
            {world?.type === "video" && (
              <video className="world__media" src={world.src} poster={world.poster?.src} autoPlay muted loop playsInline aria-hidden="true" />
            )}
            {!world && <div className="world__studio" aria-hidden="true" />}
            <div className="world__vignette" aria-hidden="true" />
          </div>
          <div ref={rolesRef} className="world__roles" aria-label={roles.join(", ")}>
            {roles.map((r, i) => {
              const [first, ...rest] = r.split(" ");
              return (
                <p key={i} className="world__role" style={{ marginLeft: `${i * 1.6}em` }} aria-hidden="true">
                  <span className="world__role-soft">{first}</span> {rest.join(" ")}
                </p>
              );
            })}
          </div>
        </div>

        {/* La puerta: cacao con el nombre calado */}
        <svg ref={gateRef} className="world__gate" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <mask id="world-gate-mask" maskUnits="userSpaceOnUse" x="-20000" y="-20000" width="41000" height="40400">
              <rect x="-20000" y="-20000" width="41000" height="40400" fill="white" />
              <text
                ref={textRef}
                x="20"
                y="268"
                textLength="960"
                lengthAdjust="spacingAndGlyphs"
                fontSize="236"
                fill="black"
                className="world__gate-text"
              >
                HIDALGO
              </text>
            </mask>
          </defs>
          <rect x="-20000" y="-20000" width="41000" height="40400" fill="var(--cocoa)" mask="url(#world-gate-mask)" />
        </svg>

        <div ref={hintRef} className="world__hint meta">
          <span className="scroll-cue__bar" aria-hidden="true" />
          {enterLabel}
        </div>

        {/* Franja inferior */}
        <div ref={bandRef} className="world__band">
          <div className="world__band-meta meta">
            <span>{role}</span>
            {location && <span>{location}</span>}
            <span>
              <Clock timezone={timezone} locale={locale} />
            </span>
            <span>{projectsLabel}</span>
          </div>
          {intro && <p className="world__intro">{intro}</p>}
          <div className="world__divider" aria-hidden="true">
            <span />
            <i />
            <span />
          </div>
          <KineticWord text="HIDALGO" as="h1" />
        </div>
      </div>
    </section>
  );
}
