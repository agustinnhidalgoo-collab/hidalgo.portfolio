import type { Category } from "@/lib/types";

/** Categorías para filtrar proyectos. El orden de esta lista es el orden de los filtros. */
export const categories: Category[] = [
  { id: "identidad", name: { es: "Identidad", en: "Identity" } },
  { id: "editorial", name: { es: "Editorial", en: "Editorial" } },
  { id: "motion", name: { es: "Motion", en: "Motion" } },
  { id: "poster", name: { es: "Póster", en: "Poster" } },
];
