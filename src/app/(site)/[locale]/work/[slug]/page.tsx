import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { getProject, projects } from "@/lib/content";
import { LOCALES, isLocale, t } from "@/lib/types";
import { ProjectView } from "@/components/site/ProjectView";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const found = getProject(slug);
  if (!found) return {};
  const p = found.project;
  return {
    title: t(p.title, locale),
    description: t(p.summary, locale).slice(0, 300) || undefined,
    alternates: {
      canonical: `/${locale}/work/${slug}`,
      languages: { es: `/es/work/${slug}`, en: `/en/work/${slug}` },
    },
    openGraph: { images: [{ url: p.cover.src.src }] },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const found = getProject(slug);
  if (!found) notFound();
  const dict = getDictionary(locale);
  const { project, index, next } = found;

  return (
    <ProjectView
      content={project}
      locale={locale}
      dict={dict}
      number={index + 1}
      total={projects.length}
      next={next ? { href: `/${locale}/work/${next.slug}`, title: t(next.title, locale), cover: next.cover } : null}
    />
  );
}
