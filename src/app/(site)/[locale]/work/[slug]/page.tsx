import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { collectMediaIds, getMediaMap, getPublishedProjectBySlug, listCategories, listPublishedProjects } from "@/lib/content";
import { imageSources } from "@/components/site/Picture";
import { isLocale, t } from "@/lib/types";
import { ProjectView } from "@/components/site/ProjectView";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const found = await getPublishedProjectBySlug(slug);
  if (!found) return {};
  const c = found.project.content;
  const media = await getMediaMap([c.coverId]);
  const cover = c.coverId ? media[c.coverId] : undefined;
  const image = cover?.kind === "image" ? imageSources(cover).src : undefined;
  return {
    title: t(c.title, locale),
    description: t(c.summary, locale).slice(0, 300) || undefined,
    alternates: {
      canonical: `/${locale}/work/${slug}`,
      languages: { es: `/es/work/${slug}`, en: `/en/work/${slug}` },
    },
    openGraph: image ? { images: [{ url: image }] } : undefined,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const found = await getPublishedProjectBySlug(slug);
  if (!found) notFound();
  const dict = getDictionary(locale);
  const { project, next } = found;
  const all = await listPublishedProjects();
  const categories = await listCategories();
  const media = await getMediaMap([...collectMediaIds(project.content), next?.content.coverId]);

  return (
    <ProjectView
      content={project.content}
      media={media}
      categories={categories}
      locale={locale}
      dict={dict}
      number={all.findIndex((p) => p.id === project.id) + 1}
      total={all.length}
      next={
        next
          ? {
              href: `/${locale}/work/${next.slug}`,
              title: t(next.content.title, locale),
              cover: next.content.coverId ? media[next.content.coverId] ?? null : null,
            }
          : null
      }
    />
  );
}
