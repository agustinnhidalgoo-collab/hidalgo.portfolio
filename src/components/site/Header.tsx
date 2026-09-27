"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { TLink } from "./Transition";
import { gsap, prefersReducedMotion, whenReady } from "./motion";

interface Props {
  locale: Locale;
  dict: Dictionary;
}

export function Header({ locale, dict }: Props) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hidden, setHidden] = useState(false);

  const items = [
    { href: `/${locale}/work`, label: dict.nav.work },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
  ];

  // Tema según la sección que queda debajo del header + ocultar al bajar.
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const h = headerRef.current?.offsetHeight ?? 64;
      const stack = document.elementsFromPoint(window.innerWidth / 2, h + 2);
      const section = stack.find((el) => !el.closest(".header, .cursor, .mobile-menu, .preloader, .curtain, .example-badge"));
      const t = section?.closest<HTMLElement>("[data-theme]")?.dataset.theme;
      setTheme(t === "dark" ? "dark" : "light");
      if (Math.abs(y - lastY) > 6) {
        setHidden(y > lastY && y > h * 3);
        lastY = y;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    const t = window.setTimeout(update, 900);
    const stopReady = whenReady(() => window.setTimeout(update, 50));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(t);
      stopReady();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Cerrar el menú al navegar.
  useEffect(() => {
    setOpen(false);
    setHidden(false);
  }, [pathname]);

  // Animación del menú móvil + bloqueo de scroll + Escape.
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const reduce = prefersReducedMotion();
    const links = menu.querySelectorAll(".mobile-menu__list a");
    if (open) {
      window.__lenis?.stop();
      document.body.style.overflow = "hidden";
      gsap.set(menu, { visibility: "visible" });
      if (reduce) gsap.set(menu, { clipPath: "inset(0% 0% 0% 0%)" });
      else {
        gsap.to(menu, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.inOut" });
        gsap.fromTo(links, { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.06, delay: 0.35 });
      }
      (links[0] as HTMLElement | undefined)?.focus({ preventScroll: true });
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false);
          btnRef.current?.focus();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
    window.__lenis?.start();
    document.body.style.overflow = "";
    if (reduce) gsap.set(menu, { clipPath: "inset(0% 0% 100% 0%)", visibility: "hidden" });
    else
      gsap.to(menu, {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 0.7,
        ease: "expo.inOut",
        onComplete: () => void gsap.set(menu, { visibility: "hidden" }),
      });
  }, [open]);

  const switchHref = (l: Locale) => pathname.replace(/^\/(es|en)(?=\/|$)/, `/${l}`) || `/${l}`;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const LangSwitch = () => (
    <nav className="lang" aria-label={dict.language}>
      {(["es", "en"] as Locale[]).map((l) => (
        <TLink
          key={l}
          href={switchHref(l)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          transitionLabel={l === "es" ? "Español" : "English"}
        >
          {l.toUpperCase()}
        </TLink>
      ))}
    </nav>
  );

  return (
    <>
      <header
        ref={headerRef}
        className="header"
        data-theme={open ? "dark" : theme}
        data-hidden={hidden && !open ? "true" : "false"}
      >
        <TLink href={`/${locale}`} className="header__brand" transitionLabel="Hidalgo" aria-label={`Hidalgo — ${dict.nav.home}`}>
          <span className="wordmark">Hidalgo</span>
          <span className="header__role meta muted">{dict.role}</span>
        </TLink>

        <div className="header__nav">
          <nav aria-label="Principal" style={{ display: "flex", gap: "inherit" }}>
            {items.map((item, i) => (
              <TLink
                key={item.href}
                href={item.href}
                className="nav-link"
                transitionLabel={item.label}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <sup>0{i + 1}</sup>
                <span className="nav-link__text">
                  <span>{item.label}</span>
                  <span aria-hidden="true">{item.label}</span>
                </span>
              </TLink>
            ))}
          </nav>
          <LangSwitch />
        </div>

        <button
          ref={btnRef}
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span>{open ? dict.close : dict.menu}</span>
          <span className="menu-btn__icon" aria-hidden="true" />
        </button>
      </header>

      <div
        ref={menuRef}
        id="mobile-menu"
        className="mobile-menu"
        data-theme="dark"
        data-open={open}
        aria-hidden={!open}
        {...(!open ? { inert: true } : {})}
      >
        <ul className="mobile-menu__list">
          {[{ href: `/${locale}`, label: dict.nav.home }, ...items].map((item, i) => (
            <li key={item.href}>
              <TLink href={item.href} className="display" transitionLabel={item.label}>
                <span>{item.label}</span>
                <span className="meta">0{i}</span>
              </TLink>
            </li>
          ))}
        </ul>
        <div className="mobile-menu__foot">
          <span className="meta muted">Hidalgo — {dict.role}</span>
          <LangSwitch />
        </div>
      </div>
    </>
  );
}
