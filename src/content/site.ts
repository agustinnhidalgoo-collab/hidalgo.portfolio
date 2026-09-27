/**
 * TEXTOS GENERALES DEL SITIO
 * Todo lo marcado como ejemplo se reemplaza con los datos reales de Hidalgo.
 */
import type { SiteContent } from "@/lib/types";

export const site: SiteContent = {
  isExample: true,

  // Frase breve arriba a la derecha de la portada
  intro: {
    es: "Texto de ejemplo. Una o dos líneas que presenten tu práctica: qué hacés, para quién y desde dónde.",
    en: "Sample text. One or two lines introducing your practice: what you do, for whom and from where.",
  },

  // Frase grande que se ilumina palabra por palabra en la Home
  tagline: {
    es: "Texto de ejemplo: una declaración breve sobre tu forma de trabajar, que se ilumina palabra por palabra mientras se hace scroll.",
    en: "Sample text: a short statement about the way you work, lighting up word by word as you scroll.",
  },

  // Párrafos separados por línea en blanco. **negrita**, *cursiva*, [enlace](https://…)
  bio: {
    es: "Biografía de ejemplo. Contá quién sos, cómo llegaste al diseño gráfico y qué tipo de proyectos te interesan.\n\nUn segundo párrafo puede sumar formación, colaboraciones o reconocimientos **reales**.",
    en: "Sample biography. Tell who you are, how you came to graphic design and which kind of projects interest you.\n\nA second paragraph can add education, collaborations or **real** recognitions.",
  },

  location: { es: "", en: "" },
  availability: { es: "", en: "" },

  // Cinta en movimiento
  disciplines: [
    { es: "Identidad visual", en: "Visual identity" },
    { es: "Diseño editorial", en: "Editorial design" },
    { es: "Motion graphics", en: "Motion graphics" },
    { es: "Dirección de arte", en: "Art direction" },
  ],

  services: [
    { title: { es: "Servicio de ejemplo", en: "Sample service" }, description: { es: "Descripción breve del servicio.", en: "Short description of the service." } },
    { title: { es: "Otro servicio", en: "Another service" }, description: { es: "Descripción breve del servicio.", en: "Short description of the service." } },
    { title: { es: "Tercer servicio", en: "Third service" }, description: { es: "Descripción breve del servicio.", en: "Short description of the service." } },
  ],

  // Foto editorial o video en loop para la entrada (pendiente: la envía Hidalgo).
  // Ej.: world: { type: "image", src: retrato, alt: { es: "…", en: "…" } }
  world: undefined,

  email: "email@ejemplo.com",
  links: [],

  // Ej.: cv: { es: "/cv/CV-Hidalgo-ES.pdf", en: "/cv/CV-Hidalgo-EN.pdf" }
  cv: {},

  seoDescription: {
    es: "Portfolio de Hidalgo, diseñador gráfico.",
    en: "Portfolio of Hidalgo, graphic designer.",
  },

  // Zona horaria del reloj (supuesto, a confirmar)
  timezone: "America/Argentina/Buenos_Aires",
};
