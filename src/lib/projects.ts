import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;

/** Proyectos publicados y ordenados. Los borradores solo se ven en `npm run dev`. */
export async function getProjects(): Promise<Project[]> {
  const all = await getCollection('projects', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => a.data.order - b.data.order);
}

export const inline = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/** Convierte "a|b" en líneas; sin "|" usa el título completo. */
export const titleLines = (p: Project) => (p.data.titleLines ?? p.data.title).split('|');
