"use client";

import { usePathname } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { TLink } from "@/components/site/Transition";

export default function NotFound() {
  const pathname = usePathname();
  const locale = pathname.startsWith("/en") ? "en" : "es";
  const dict = getDictionary(locale);
  return (
    <section className="page-head wrap" data-theme="light" style={{ minHeight: "80svh" }}>
      <p className="meta" style={{ marginBottom: 20 }}>
        (404)
      </p>
      <h1 className="display h1">{dict.notFound}</h1>
      <p className="lead" style={{ marginTop: 32, maxWidth: "30ch" }}>
        {dict.notFoundText}
      </p>
      <div style={{ marginTop: 40 }}>
        <TLink href={`/${locale}`} className="btn">
          {dict.goHome}
        </TLink>
      </div>
    </section>
  );
}
