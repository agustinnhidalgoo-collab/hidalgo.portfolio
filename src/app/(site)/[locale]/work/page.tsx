import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { categories, projects } from "@/lib/content";
import { buildIndexItems } from "@/lib/views";
import { isLocale, t } from "@/lib/types";
import { WorkBrowser } from "@/components/site/WorkBrowser";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: getDictionary(locale).nav.work,
    alternates: { canonical: `/${locale}/work`, languages: { es: "/es/work", en: "/en/work" } },
  };
}

export default async function WorkPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const items = buildIndexItems(projects, locale);

  return (
    <div data-theme="light">
      <header className="page-head wrap">
        <span className="reg reg--tl" aria-hidden="true" />
        <span className="reg reg--tr" aria-hidden="true" />
        <p className="meta" data-reveal="fade" style={{ marginBottom: 20 }}>
          ({dict.index})
        </p>
        <h1 className="display h1" data-reveal="lines">
          {dict.nav.work}
          <sup className="section-head__count">({String(items.length).padStart(2, "0")})</sup>
        </h1>
      </header>
      <section className="wrap" style={{ paddingBottom: "clamp(80px, 12vw, 200px)" }}>
        <WorkBrowser
          items={items}
          categories={categories.map((c) => ({ id: c.id, name: t(c.name, locale) }))}
          locale={locale}
          labels={{
            all: dict.all,
            list: dict.list,
            grid: dict.grid,
            view: dict.view,
            empty: items.length ? dict.noProjectsFilter : dict.noProjects,
            example: dict.exampleContent,
            filter: dict.category,
          }}
        />
      </section>
    </div>
  );
}
