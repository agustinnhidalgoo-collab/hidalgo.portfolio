"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "./motion";
import { scrollToTop } from "./SmoothScroll";
import { scramble } from "./scramble";

const COLS = 12;
const ROWS = 7;

type Navigate = (href: string, label?: string) => void;
const TransitionContext = createContext<Navigate | null>(null);

/**
 * Transición entre páginas: una cortina de color cacao sube con el nombre
 * de la página de destino, se navega y la cortina se retira hacia arriba.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const pending = useRef<{ from: string; timer: number } | null>(null);
  const busy = useRef(false);

  const reveal = useCallback(() => {
    const el = curtain.current;
    if (!el) return;
    if (pending.current) window.clearTimeout(pending.current.timer);
    pending.current = null;
    scrollToTop(true);
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const cells = el.querySelectorAll(".curtain__cell");
      gsap
        .timeline({ onComplete: () => void (busy.current = false) })
        .to(label.current, { opacity: 0, duration: 0.25 })
        .to(cells, {
          scaleY: 0,
          transformOrigin: "50% 0%",
          duration: 0.55,
          ease: "power3.inOut",
          stagger: { grid: [ROWS, COLS], from: "edges", amount: 0.45 },
        }, "-=0.1")
        .set(el, { visibility: "hidden" });
    });
  }, []);

  const navigate = useCallback<Navigate>(
    (href, text = "") => {
      const target = new URL(href, window.location.href);
      if (target.pathname === window.location.pathname) {
        if (target.search !== window.location.search || target.hash) router.push(href);
        else scrollToTop();
        return;
      }
      if (prefersReducedMotion() || busy.current || !curtain.current) {
        router.push(href);
        return;
      }
      busy.current = true;
      router.prefetch(href);
      if (label.current) {
        label.current.textContent = text;
        label.current.dataset.scrambleText = text;
      }
      const el = curtain.current;
      const cells = el.querySelectorAll(".curtain__cell");
      gsap
        .timeline()
        .set(el, { visibility: "visible" })
        .set(cells, { scaleY: 0, transformOrigin: "50% 100%" })
        .set(label.current, { opacity: 0 })
        .to(cells, {
          scaleY: 1,
          duration: 0.5,
          ease: "power3.inOut",
          stagger: { grid: [ROWS, COLS], from: "center", amount: 0.4 },
        })
        .add(() => {
          if (!label.current) return;
          gsap.set(label.current, { opacity: 1 });
          scramble(label.current, 450);
        }, "-=0.25")
        .add(() => {
          pending.current = {
            from: window.location.pathname,
            // Red de seguridad: si la navegación tarda demasiado o falla, se retira igual.
            timer: window.setTimeout(reveal, 5000),
          };
          router.push(href);
        });
    },
    [router, reveal],
  );

  useEffect(() => {
    if (pending.current && pending.current.from !== pathname) reveal();
  }, [pathname, reveal]);

  return (
    <TransitionContext.Provider value={navigate}>
      {children}
      <div ref={curtain} className="curtain" data-theme="dark" aria-hidden="true">
        <div className="curtain__grid">
          {Array.from({ length: ROWS * COLS }, (_, i) => (
            <span key={i} className="curtain__cell" />
          ))}
        </div>
        <div className="curtain__label display">
          <span ref={label} />
        </div>
      </div>
    </TransitionContext.Provider>
  );
}

export function useNavigate(): Navigate {
  const ctx = useContext(TransitionContext);
  const router = useRouter();
  return ctx ?? ((href: string) => router.push(href));
}

type TLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  /** Texto que se muestra en la cortina durante la transición. */
  transitionLabel?: string;
  children: ReactNode;
};

/** Enlace interno con transición de página. */
export function TLink({ href, transitionLabel, onClick, children, ...rest }: TLinkProps) {
  const navigate = useNavigate();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target === "_blank") return;
    e.preventDefault();
    navigate(href, transitionLabel);
  };
  return (
    <Link href={href} onClick={handle} {...rest}>
      {children}
    </Link>
  );
}
