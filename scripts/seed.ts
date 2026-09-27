/**
 * Carga contenido de EJEMPLO para ver la base funcionando.
 *   npm run db:seed
 * Todo lo que crea queda marcado como ejemplo (en el panel y con un aviso en
 * el sitio). No se ejecuta si ya hay proyectos o ajustes cargados.
 */
import sharp from "sharp";
import { getDb, schema } from "../src/lib/db";
import { storeUpload } from "../src/lib/media";
import { type Block, type L10n, projectContentSchema, siteSettingsSchema } from "../src/lib/types";
import { newId } from "../src/lib/utils";

const BUTTER = "#F2E6B3";
const COCOA = "#4B2E21";

const l = (es: string, en: string): L10n => ({ es, en });

/** Composición tipo póster en la paleta, rotulada como imagen de ejemplo. */
function placeholderSvg(n: number, w: number, h: number, variant: number): string {
  const dark = variant % 2 === 0;
  const bg = dark ? COCOA : BUTTER;
  const fg = dark ? BUTTER : COCOA;
  const shapes = [
    `<circle cx="${w * 0.62}" cy="${h * 0.45}" r="${Math.min(w, h) * 0.3}" fill="${fg}"/>
     <circle cx="${w * 0.62}" cy="${h * 0.45}" r="${Math.min(w, h) * 0.12}" fill="${bg}"/>`,
    Array.from({ length: 9 }, (_, i) => `<rect x="${w * 0.08 + i * w * 0.095}" y="${h * 0.18}" width="${w * 0.05}" height="${h * (0.2 + ((i * 37) % 50) / 100)}" fill="${fg}"/>`).join(""),
    `<rect x="${w * 0.1}" y="${h * 0.14}" width="${w * 0.8}" height="${h * 0.5}" fill="none" stroke="${fg}" stroke-width="${w * 0.012}"/>
     <line x1="${w * 0.1}" y1="${h * 0.14}" x2="${w * 0.9}" y2="${h * 0.64}" stroke="${fg}" stroke-width="${w * 0.012}"/>`,
    `<path d="M0 ${h * 0.7} Q ${w * 0.25} ${h * 0.1} ${w * 0.5} ${h * 0.45} T ${w} ${h * 0.25} V ${h} H 0 Z" fill="${fg}"/>`,
    Array.from({ length: 6 }, (_, i) => `<circle cx="${w * 0.5}" cy="${h * 0.42}" r="${Math.min(w, h) * (0.06 + i * 0.055)}" fill="none" stroke="${fg}" stroke-width="${w * 0.006}"/>`).join(""),
    `<rect x="${w * 0.55}" y="0" width="${w * 0.2}" height="${h}" fill="${fg}"/><rect x="0" y="${h * 0.3}" width="${w}" height="${h * 0.08}" fill="${fg}"/>`,
  ];
  const reg = (x: number, y: number) =>
    `<g stroke="${fg}" stroke-width="2"><line x1="${x - 14}" y1="${y}" x2="${x + 14}" y2="${y}"/><line x1="${x}" y1="${y - 14}" x2="${x}" y2="${y + 14}"/></g>`;
  const fs = Math.round(Math.min(w, h) * 0.34);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="100%" height="100%" fill="${bg}"/>
    ${shapes[variant % shapes.length]}
    ${reg(40, 40)}${reg(w - 40, 40)}${reg(40, h - 40)}${reg(w - 40, h - 40)}
    <text x="${w * 0.06}" y="${h * 0.93}" font-family="Archivo, Helvetica, Arial, sans-serif" font-weight="900" font-size="${fs}" fill="${fg}" letter-spacing="-${fs * 0.04}">${String(n).padStart(2, "0")}</text>
    <text x="${w - 70}" y="${h * 0.9}" text-anchor="end" font-family="Archivo, Helvetica, Arial, sans-serif" font-weight="700" font-size="${Math.round(w * 0.018)}" fill="${fg}" letter-spacing="2">IMAGEN DE EJEMPLO · SAMPLE IMAGE</text>
  </svg>`;
}

async function makeImage(db: Awaited<ReturnType<typeof getDb>>, name: string, n: number, w: number, h: number, variant: number, alt: L10n) {
  const buf = await sharp(Buffer.from(placeholderSvg(n, w, h, variant))).jpeg({ quality: 88 }).toBuffer();
  const stored = await storeUpload(buf);
  await db.insert(schema.media).values({
    id: stored.id,
    kind: stored.kind,
    originalName: `${name}.jpg`,
    file: stored.file,
    mime: stored.mime,
    size: stored.size,
    width: stored.width,
    height: stored.height,
    blur: stored.blur,
    variants: JSON.stringify(stored.variants),
    alt: JSON.stringify(alt),
    createdAt: Date.now(),
  });
  return stored.id;
}

async function main() {
  const db = await getDb();
  const existing = await db.select({ id: schema.projects.id }).from(schema.projects).limit(1);
  const existingSettings = await db.select({ key: schema.settings.key }).from(schema.settings).limit(1);
  if (existing.length || existingSettings.length) {
    console.log("Ya hay contenido cargado; no se agrega nada. (El seed solo corre sobre una base vacía.)");
    return;
  }

  console.log("Generando imágenes de ejemplo…");

  const cats = [
    { id: "identidad", name: l("Identidad", "Identity") },
    { id: "editorial", name: l("Editorial", "Editorial") },
    { id: "motion", name: l("Motion", "Motion") },
    { id: "poster", name: l("Póster", "Poster") },
  ];
  for (let i = 0; i < cats.length; i++) {
    await db.insert(schema.categories).values({ id: cats[i].id, name: JSON.stringify(cats[i].name), sortOrder: i });
  }

  const sampleAlt = (n: number, what: string) => l(`Imagen de ejemplo ${n}: ${what}`, `Sample image ${n}: ${what}`);

  const projectsDef = [
    { n: 1, cats: ["identidad"], year: "2026", featured: true, publish: true },
    { n: 2, cats: ["editorial"], year: "2025", featured: true, publish: true },
    { n: 3, cats: ["motion", "poster"], year: "2025", featured: true, publish: true },
    { n: 4, cats: ["poster"], year: "2024", featured: true, publish: true },
    { n: 5, cats: ["identidad", "editorial"], year: "2024", featured: false, publish: false },
  ];

  const text = (heading: L10n, body: L10n): Block => ({ id: newId(), type: "text", heading, body });
  const lorem = l(
    "Texto de ejemplo. Acá va el contexto del proyecto: cuál era el desafío, para quién y qué se buscaba comunicar.\n\nUn segundo párrafo puede contar el proceso, las decisiones tipográficas o de color y el resultado. Se edita desde el panel, bloque por bloque.",
    "Sample text. This is where the project context goes: the challenge, the audience and what needed to be communicated.\n\nA second paragraph can describe the process, typographic or colour decisions and the outcome. It's edited from the admin panel, block by block.",
  );

  let order = 0;
  for (const def of projectsDef) {
    const v = def.n;
    const cover = await makeImage(db, `ejemplo-${v}-portada`, v, 2400, 1600, v, sampleAlt(v, "portada"));
    const a = await makeImage(db, `ejemplo-${v}-a`, v, 1600, 2000, v + 1, sampleAlt(v, "vertical"));
    const b = await makeImage(db, `ejemplo-${v}-b`, v, 1600, 2000, v + 2, sampleAlt(v, "vertical"));
    const c = await makeImage(db, `ejemplo-${v}-c`, v, 2400, 1350, v + 3, sampleAlt(v, "horizontal"));

    const blocks: Block[] = [
      text(l("El desafío", "The brief"), lorem),
      { id: newId(), type: "full", mediaId: c, caption: l("Pie de imagen de ejemplo.", "Sample caption.") },
      { id: newId(), type: "gallery", columns: 2, items: [{ mediaId: a, caption: l("", "") }, { mediaId: b, caption: l("", "") }] },
      {
        id: newId(),
        type: "columns",
        left: { kind: "text", text: l("Bloque de dos columnas: texto de un lado, imagen del otro. Útil para explicar un detalle.", "Two-column block: text on one side, image on the other. Useful to explain a detail."), mediaId: null },
        right: { kind: "image", text: l("", ""), mediaId: a },
      },
      { id: newId(), type: "image", mediaId: c, caption: l("", ""), size: "contained" },
    ];

    const content = projectContentSchema.parse({
      slug: `proyecto-ejemplo-${String(v).padStart(2, "0")}`,
      title: l(`Proyecto ejemplo ${String(v).padStart(2, "0")}`, `Sample project ${String(v).padStart(2, "0")}`),
      summary: l(
        "Resumen de ejemplo: una o dos frases que presenten el proyecto. Reemplazalo desde el panel.",
        "Sample summary: one or two sentences introducing the project. Replace it from the admin panel.",
      ),
      year: def.year,
      client: l("", ""),
      role: l("Ejemplo: dirección de arte", "Sample: art direction"),
      categoryIds: def.cats,
      coverId: cover,
      blocks,
      isExample: true,
    });

    const now = Date.now();
    await db.insert(schema.projects).values({
      id: newId(),
      slug: content.slug,
      status: def.publish ? "published" : "draft",
      featured: def.featured,
      sortOrder: order++,
      draft: JSON.stringify(content),
      published: def.publish ? JSON.stringify(content) : null,
      publishedAt: def.publish ? now : null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✓ ${content.title.es}${def.publish ? "" : " (borrador)"}`);
  }

  const settings = siteSettingsSchema.parse({
    intro: l(
      "Texto de ejemplo. Una o dos líneas que presenten tu práctica: qué hacés, para quién y desde dónde.",
      "Sample text. One or two lines introducing your practice: what you do, for whom and from where.",
    ),
    tagline: l(
      "Texto de ejemplo: una declaración breve sobre tu forma de trabajar, que se ilumina palabra por palabra mientras se hace scroll.",
      "Sample text: a short statement about the way you work, lighting up word by word as you scroll.",
    ),
    bio: l(
      "Biografía de ejemplo. Contá quién sos, cómo llegaste al diseño gráfico y qué tipo de proyectos te interesan.\n\nUn segundo párrafo puede sumar formación, colaboraciones o reconocimientos **reales**. Se edita en Panel → Ajustes.",
      "Sample biography. Tell who you are, how you came to graphic design and which kind of projects interest you.\n\nA second paragraph can add education, collaborations or **real** recognitions. Edit it in Admin → Settings.",
    ),
    disciplines: [
      l("Identidad visual", "Visual identity"),
      l("Diseño editorial", "Editorial design"),
      l("Motion graphics", "Motion graphics"),
      l("Dirección de arte", "Art direction"),
    ],
    services: [
      { title: l("Servicio de ejemplo", "Sample service"), description: l("Descripción breve del servicio.", "Short description of the service.") },
      { title: l("Otro servicio", "Another service"), description: l("Descripción breve del servicio.", "Short description of the service.") },
      { title: l("Tercer servicio", "Third service"), description: l("Descripción breve del servicio.", "Short description of the service.") },
    ],
    email: "email@ejemplo.com",
    isExample: true,
  });
  await db.insert(schema.settings).values({ key: "site", value: JSON.stringify(settings), updatedAt: Date.now() });
  console.log("✓ Ajustes de ejemplo");
  console.log("\nListo. Todo el contenido quedó marcado como EJEMPLO.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
