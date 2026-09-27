import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { collectMediaIds, getMediaMap, getProject, listCategories } from "@/lib/content";
import { isLocale } from "@/lib/types";
import { ProjectView } from "@/components/site/ProjectView";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Vista previa del BORRADOR de un proyecto. Solo con sesión de administrador. */
export default async function PreviewPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await getSession())) redirect("/admin/login");
  const project = await getProject(id);
  if (!project) notFound();
  const dict = getDictionary(locale);
  const [categories, media] = await Promise.all([listCategories(), getMediaMap(collectMediaIds(project.draft))]);

  return (
    <>
      <div className="preview-bar" role="status">
        <span>{dict.preview}</span>
        <a href={`/admin/projects/${id}`}>{dict.exitPreview}</a>
      </div>
      <ProjectView content={project.draft} media={media} categories={categories} locale={locale} dict={dict} number={1} total={1} />
    </>
  );
}
