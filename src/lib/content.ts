import { categories } from "@/content/categories";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { type Locale, type Project, t } from "./types";

export { categories, projects, site };

export function getProject(slug: string) {
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null;
  return { project: projects[index], index, next };
}

export function featuredProjects(): Project[] {
  const featured = projects.filter((p) => p.featured);
  return (featured.length ? featured : projects).slice(0, 8);
}

export function categoryNames(project: Project, locale: Locale): string[] {
  return project.categories
    .map((id) => categories.find((c) => c.id === id))
    .filter((c) => !!c)
    .map((c) => t(c!.name, locale));
}

export const hasExampleContent = site.isExample || projects.some((p) => p.isExample);
