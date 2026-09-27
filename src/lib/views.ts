import { categoryNames } from "./content";
import { type Locale, type Project, t } from "./types";

/** Datos de tarjetas / filas del índice para los componentes de cliente. */
export function buildIndexItems(list: Project[], locale: Locale) {
  return list.map((p) => ({
    id: p.slug,
    href: `/${locale}/work/${p.slug}`,
    title: t(p.title, locale),
    year: p.year,
    categoryIds: p.categories,
    categories: categoryNames(p, locale),
    cover: p.cover,
    isExample: !!p.isExample,
  }));
}
