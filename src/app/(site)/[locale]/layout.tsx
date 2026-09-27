import "@fontsource-variable/archivo/wdth.css";
import "@/styles/tokens.css";
import "@/styles/site.css";

import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getDictionary } from "@/lib/i18n";
import { hasExampleContent, site } from "@/lib/content";
import { siteUrl } from "@/lib/site-meta";
import { LOCALES, isLocale, t } from "@/lib/types";
import { Cursor } from "@/components/site/Cursor";
import { ExampleBadge } from "@/components/site/ExampleBadge";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Preloader } from "@/components/site/Preloader";
import { ScrollEffects } from "@/components/site/ScrollEffects";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { TransitionProvider } from "@/components/site/Transition";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#F2E6B3",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const description = t(site.seoDescription, locale) || t(site.tagline, locale) || "Hidalgo — Graphic Designer";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: "HIDALGO — Graphic Designer", template: "%s — HIDALGO" },
    description,
    alternates: { canonical: `/${locale}`, languages: { es: "/es", en: "/en" } },
    openGraph: {
      type: "website",
      siteName: "HIDALGO",
      locale: locale === "es" ? "es_AR" : "en_US",
      title: "HIDALGO — Graphic Designer",
      description,
    },
    twitter: { card: "summary_large_image" },
  };
}

// Se ejecuta antes de pintar: marca si hay JS/movimiento y si se salta la precarga.
const boot = `(function(){var d=document.documentElement;d.classList.add('js');try{var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!r)d.classList.add('js-motion');if(r||sessionStorage.getItem('hidalgo:loaded')==='1')d.classList.add('skip-preload')}catch(e){d.classList.add('skip-preload')}})();`;

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const showExample = hasExampleContent;

  return (
    <html lang={locale} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          {dict.skip}
        </a>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <filter id="duotone" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values=".2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  0 0 0 1 0"
            />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.294 0.949" />
              <feFuncG type="table" tableValues="0.180 0.902" />
              <feFuncB type="table" tableValues="0.129 0.702" />
            </feComponentTransfer>
          </filter>
        </svg>

        <TransitionProvider>
          <Preloader role={dict.role} />
          <Header locale={locale} dict={dict} />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer locale={locale} dict={dict} settings={site} />
        </TransitionProvider>

        <SmoothScroll />
        <ScrollEffects />
        <Cursor />
        <div className="grain" aria-hidden="true" />
        {showExample && (
          <ExampleBadge
            closeLabel={dict.close}
            text={
              locale === "es"
                ? "Base con contenido de ejemplo."
                : "Base with sample content."
            }
          />
        )}
      </body>
    </html>
  );
}
