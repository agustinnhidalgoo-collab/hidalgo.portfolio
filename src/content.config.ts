import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Un proyecto = un archivo .md en src/content/projects/.
 * El nombre del archivo es el slug (URL: /proyectos/<slug>).
 * Los campos marcados como opcionales pueden omitirse sin romper nada.
 */
export const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) => {
    const picture = z.object({ src: image(), alt: z.string().min(3, 'alt obligatorio') });
    const color = z.object({ hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/), name: z.string().optional() });

    const section = z.discriminatedUnion('kind', [
      // Bloque de texto con título.
      z.object({ kind: z.literal('text'), title: z.string(), body: z.string() }),
      // Una imagen grande con pie opcional.
      z.object({
        kind: z.literal('figure'),
        image: image(),
        alt: z.string().min(3),
        caption: z.string().optional(),
        title: z.string().optional(),
        body: z.string().optional(),
      }),
      // Serie de imágenes (aplicaciones, detalles, exploraciones…).
      z.object({
        kind: z.literal('gallery'),
        title: z.string(),
        /** Tamaño de las miniaturas: s (detalles), m, l (fotografías completas). */
        size: z.enum(['s', 'm', 'l']).default('s'),
        body: z.string().optional(),
        items: z.array(z.object({ image: image(), alt: z.string().min(3), label: z.string().optional(), note: z.string().optional() })).min(1),
      }),
      // Paleta de color propia del proyecto (no son los tokens del portfolio).
      z.object({ kind: z.literal('palette'), title: z.string(), body: z.string().optional(), colors: z.array(color).min(1) }),
      // Tipografía del proyecto.
      z.object({
        kind: z.literal('type'),
        title: z.string(),
        family: z.string(),
        body: z.string().optional(),
        uses: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
        image: image().optional(),
        alt: z.string().optional(),
      }),
      // Imagen con anotaciones (composición de una pieza).
      z.object({
        kind: z.literal('annotated'),
        title: z.string(),
        image: image(),
        alt: z.string().min(3),
        notes: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
      }),
    ]);

    return z.object({
      title: z.string(),
      order: z.number().int(),
      draft: z.boolean().default(false),
      descriptor: z.string(),
      summary: z.string(),
      year: z.number().int().optional(),
      type: z.array(z.string()).optional(),
      focus: z.array(z.string()).optional(),
      category: z.array(z.string()).optional(),
      role: z.string().optional(),
      collaborators: z.array(z.string()).optional(),
      /** Escena 3D propia del proyecto (opcional): 'bottle' usa el tramo fijado con botella. */
      scene: z.enum(['bottle', 'cape']).optional(),
      /** Ambiente del proyecto (fondo, cursor y sonido): bodega o barbería. */
      world: z.enum(['cellar', 'barber']).optional(),
      /** Idea central del proyecto (rótulo corto) y foto de apoyo para la escena. */
      concept: z.string().optional(),
      /** Nota breve del paso 2 de la escena (opcional). */
      stageNote: z.string().optional(),
      /** Imágenes reales para cada paso de la escena (vista previa mientras carga el 3D y alternativa sin WebGL). */
      stageImages: z.array(picture).length(3).optional(),
      /** Color del título en la home y en el case study. */
      titleTone: z.enum(['red', 'white']).default('white'),
      /** Saltos de línea dirigidos del título (separados por "|"). */
      titleLines: z.string().optional(),
      cover: picture,
      social: picture.optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      links: z.array(z.object({ label: z.string(), url: z.url() })).optional(),
      sections: z.array(section).default([]),
    });
  },
});

export const collections = { projects };
