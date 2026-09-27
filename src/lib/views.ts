import "server-only";
import { getMediaMap, type PublicProject } from "./content";
import { type Category, type Locale, t } from "./types";

/** Prepara los datos de tarjetas / filas de índice para los componentes de cliente. */
export async function buildIndexItems(projects: PublicProject[], categories: Category[], locale: Locale) {
  const media = await getMediaMap(projects.map((p) => p.content.coverId));
  return projects.map((p) => ({
    id: p.id,
    href: `/${locale}/work/${p.slug}`,
    title: t(p.content.title, locale),
    year: p.content.year,
    categoryIds: p.content.categoryIds,
    categories: p.content.categoryIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is Category => !!c)
      .map((c) => t(c.name, locale)),
    cover: p.content.coverId ? media[p.content.coverId] ?? null : null,
    isExample: p.content.isExample,
  }));
}
