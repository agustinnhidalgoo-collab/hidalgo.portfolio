/**
 * PROYECTOS
 * El orden de esta lista es el orden en que aparecen en el sitio.
 * Las imágenes van en src/content/images/<proyecto>/ y se importan arriba.
 * `featured: true` → aparece en la lista de la Home.
 */
import type { ImageMedia, L10n, Project } from "@/lib/types";
import type { StaticImageData } from "next/image";

import e01cover from "./images/ejemplos/ejemplo-01-portada.jpg";
import e01a from "./images/ejemplos/ejemplo-01-vertical-a.jpg";
import e01b from "./images/ejemplos/ejemplo-01-vertical-b.jpg";
import e01h from "./images/ejemplos/ejemplo-01-horizontal.jpg";
import e02cover from "./images/ejemplos/ejemplo-02-portada.jpg";
import e02a from "./images/ejemplos/ejemplo-02-vertical-a.jpg";
import e02b from "./images/ejemplos/ejemplo-02-vertical-b.jpg";
import e02h from "./images/ejemplos/ejemplo-02-horizontal.jpg";
import e03cover from "./images/ejemplos/ejemplo-03-portada.jpg";
import e03a from "./images/ejemplos/ejemplo-03-vertical-a.jpg";
import e03b from "./images/ejemplos/ejemplo-03-vertical-b.jpg";
import e03h from "./images/ejemplos/ejemplo-03-horizontal.jpg";
import e04cover from "./images/ejemplos/ejemplo-04-portada.jpg";
import e04a from "./images/ejemplos/ejemplo-04-vertical-a.jpg";
import e04b from "./images/ejemplos/ejemplo-04-vertical-b.jpg";
import e04h from "./images/ejemplos/ejemplo-04-horizontal.jpg";
import e05cover from "./images/ejemplos/ejemplo-05-portada.jpg";
import e05a from "./images/ejemplos/ejemplo-05-vertical-a.jpg";
import e05b from "./images/ejemplos/ejemplo-05-vertical-b.jpg";
import e05h from "./images/ejemplos/ejemplo-05-horizontal.jpg";

const img = (src: StaticImageData, alt: L10n): ImageMedia => ({ type: "image", src, alt });

const sampleText: L10n = {
  es: "Texto de ejemplo. Acá va el contexto del proyecto: cuál era el desafío, para quién y qué se buscaba comunicar.\n\nUn segundo párrafo puede contar el proceso, las decisiones tipográficas o de color y el resultado.",
  en: "Sample text. This is where the project context goes: the challenge, the audience and what needed to be communicated.\n\nA second paragraph can describe the process, typographic or colour decisions and the outcome.",
};

export const projects: Project[] = [
  {
    isExample: true,
    slug: "proyecto-ejemplo-01",
    title: { es: "Proyecto ejemplo 01", en: "Sample project 01" },
    summary: {
      es: "Resumen de ejemplo: una o dos frases que presenten el proyecto.",
      en: "Sample summary: one or two sentences introducing the project.",
    },
    year: "2026",
    role: { es: "Ejemplo: dirección de arte", en: "Sample: art direction" },
    categories: ["identidad"],
    featured: true,
    cover: img(e01cover, { es: "Imagen de ejemplo 1: portada", en: "Sample image 1: portada" }),
    blocks: [
      { type: "text", heading: { es: "El desafío", en: "The brief" }, body: sampleText },
      { type: "full", media: img(e01h, { es: "Imagen de ejemplo 1: horizontal", en: "Sample image 1: horizontal" }), caption: { es: "Pie de imagen de ejemplo.", en: "Sample caption." } },
      { type: "gallery", columns: 2, items: [{ media: img(e01a, { es: "Imagen de ejemplo 1: vertical", en: "Sample image 1: vertical" }) }, { media: img(e01b, { es: "Imagen de ejemplo 1: vertical", en: "Sample image 1: vertical" }) }] },
      {
        type: "columns",
        left: {
          es: "Bloque de dos columnas: texto de un lado, imagen del otro. Útil para explicar un detalle.",
          en: "Two-column block: text on one side, image on the other. Useful to explain a detail.",
        },
        right: img(e01a, { es: "Imagen de ejemplo 1: vertical", en: "Sample image 1: vertical" }),
      },
      { type: "image", media: img(e01h, { es: "Imagen de ejemplo 1: horizontal", en: "Sample image 1: horizontal" }), size: "contained" },
    ],
  },
  {
    isExample: true,
    slug: "proyecto-ejemplo-02",
    title: { es: "Proyecto ejemplo 02", en: "Sample project 02" },
    summary: {
      es: "Resumen de ejemplo: una o dos frases que presenten el proyecto.",
      en: "Sample summary: one or two sentences introducing the project.",
    },
    year: "2025",
    role: { es: "Ejemplo: dirección de arte", en: "Sample: art direction" },
    categories: ["editorial"],
    featured: true,
    cover: img(e02cover, { es: "Imagen de ejemplo 2: portada", en: "Sample image 2: portada" }),
    blocks: [
      { type: "text", heading: { es: "El desafío", en: "The brief" }, body: sampleText },
      { type: "full", media: img(e02h, { es: "Imagen de ejemplo 2: horizontal", en: "Sample image 2: horizontal" }), caption: { es: "Pie de imagen de ejemplo.", en: "Sample caption." } },
      { type: "gallery", columns: 2, items: [{ media: img(e02a, { es: "Imagen de ejemplo 2: vertical", en: "Sample image 2: vertical" }) }, { media: img(e02b, { es: "Imagen de ejemplo 2: vertical", en: "Sample image 2: vertical" }) }] },
      {
        type: "columns",
        left: {
          es: "Bloque de dos columnas: texto de un lado, imagen del otro. Útil para explicar un detalle.",
          en: "Two-column block: text on one side, image on the other. Useful to explain a detail.",
        },
        right: img(e02a, { es: "Imagen de ejemplo 2: vertical", en: "Sample image 2: vertical" }),
      },
      { type: "image", media: img(e02h, { es: "Imagen de ejemplo 2: horizontal", en: "Sample image 2: horizontal" }), size: "contained" },
    ],
  },
  {
    isExample: true,
    slug: "proyecto-ejemplo-03",
    title: { es: "Proyecto ejemplo 03", en: "Sample project 03" },
    summary: {
      es: "Resumen de ejemplo: una o dos frases que presenten el proyecto.",
      en: "Sample summary: one or two sentences introducing the project.",
    },
    year: "2025",
    role: { es: "Ejemplo: dirección de arte", en: "Sample: art direction" },
    categories: ["motion", "poster"],
    featured: true,
    cover: img(e03cover, { es: "Imagen de ejemplo 3: portada", en: "Sample image 3: portada" }),
    blocks: [
      { type: "text", heading: { es: "El desafío", en: "The brief" }, body: sampleText },
      { type: "full", media: img(e03h, { es: "Imagen de ejemplo 3: horizontal", en: "Sample image 3: horizontal" }), caption: { es: "Pie de imagen de ejemplo.", en: "Sample caption." } },
      { type: "gallery", columns: 2, items: [{ media: img(e03a, { es: "Imagen de ejemplo 3: vertical", en: "Sample image 3: vertical" }) }, { media: img(e03b, { es: "Imagen de ejemplo 3: vertical", en: "Sample image 3: vertical" }) }] },
      {
        type: "columns",
        left: {
          es: "Bloque de dos columnas: texto de un lado, imagen del otro. Útil para explicar un detalle.",
          en: "Two-column block: text on one side, image on the other. Useful to explain a detail.",
        },
        right: img(e03a, { es: "Imagen de ejemplo 3: vertical", en: "Sample image 3: vertical" }),
      },
      { type: "image", media: img(e03h, { es: "Imagen de ejemplo 3: horizontal", en: "Sample image 3: horizontal" }), size: "contained" },
    ],
  },
  {
    isExample: true,
    slug: "proyecto-ejemplo-04",
    title: { es: "Proyecto ejemplo 04", en: "Sample project 04" },
    summary: {
      es: "Resumen de ejemplo: una o dos frases que presenten el proyecto.",
      en: "Sample summary: one or two sentences introducing the project.",
    },
    year: "2024",
    role: { es: "Ejemplo: dirección de arte", en: "Sample: art direction" },
    categories: ["poster"],
    featured: true,
    cover: img(e04cover, { es: "Imagen de ejemplo 4: portada", en: "Sample image 4: portada" }),
    blocks: [
      { type: "text", heading: { es: "El desafío", en: "The brief" }, body: sampleText },
      { type: "full", media: img(e04h, { es: "Imagen de ejemplo 4: horizontal", en: "Sample image 4: horizontal" }), caption: { es: "Pie de imagen de ejemplo.", en: "Sample caption." } },
      { type: "gallery", columns: 2, items: [{ media: img(e04a, { es: "Imagen de ejemplo 4: vertical", en: "Sample image 4: vertical" }) }, { media: img(e04b, { es: "Imagen de ejemplo 4: vertical", en: "Sample image 4: vertical" }) }] },
      {
        type: "columns",
        left: {
          es: "Bloque de dos columnas: texto de un lado, imagen del otro. Útil para explicar un detalle.",
          en: "Two-column block: text on one side, image on the other. Useful to explain a detail.",
        },
        right: img(e04a, { es: "Imagen de ejemplo 4: vertical", en: "Sample image 4: vertical" }),
      },
      { type: "image", media: img(e04h, { es: "Imagen de ejemplo 4: horizontal", en: "Sample image 4: horizontal" }), size: "contained" },
    ],
  },
  {
    isExample: true,
    slug: "proyecto-ejemplo-05",
    title: { es: "Proyecto ejemplo 05", en: "Sample project 05" },
    summary: {
      es: "Resumen de ejemplo: una o dos frases que presenten el proyecto.",
      en: "Sample summary: one or two sentences introducing the project.",
    },
    year: "2024",
    role: { es: "Ejemplo: dirección de arte", en: "Sample: art direction" },
    categories: ["identidad", "editorial"],
    featured: false,
    cover: img(e05cover, { es: "Imagen de ejemplo 5: portada", en: "Sample image 5: portada" }),
    blocks: [
      { type: "text", heading: { es: "El desafío", en: "The brief" }, body: sampleText },
      { type: "full", media: img(e05h, { es: "Imagen de ejemplo 5: horizontal", en: "Sample image 5: horizontal" }), caption: { es: "Pie de imagen de ejemplo.", en: "Sample caption." } },
      { type: "gallery", columns: 2, items: [{ media: img(e05a, { es: "Imagen de ejemplo 5: vertical", en: "Sample image 5: vertical" }) }, { media: img(e05b, { es: "Imagen de ejemplo 5: vertical", en: "Sample image 5: vertical" }) }] },
      {
        type: "columns",
        left: {
          es: "Bloque de dos columnas: texto de un lado, imagen del otro. Útil para explicar un detalle.",
          en: "Two-column block: text on one side, image on the other. Useful to explain a detail.",
        },
        right: img(e05a, { es: "Imagen de ejemplo 5: vertical", en: "Sample image 5: vertical" }),
      },
      { type: "image", media: img(e05h, { es: "Imagen de ejemplo 5: horizontal", en: "Sample image 5: horizontal" }), size: "contained" },
    ],
  },
];
