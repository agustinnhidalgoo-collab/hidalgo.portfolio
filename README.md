# Portfolio — Agustín Hidalgo

Web editorial estática (Astro 7, sin frameworks de UI, ~1 KB de JS propio) basada en el video de portfolio y el CV.

## Ejecutar

```bash
npm install
npm run dev        # desarrollo (muestra también borradores)
npm run build      # valida el contenido (astro check) y genera dist/
npm run preview    # sirve dist/
```

Dominio: aún no confirmado, por eso no hay canonical ni URLs absolutas en sitemap/OG. Al publicar, compilar con `SITE_URL=https://tu-dominio npm run build` y se emiten canonical, `og:image` absoluta y `sitemap.xml`.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Textos, contacto (WhatsApp, email, Instagram), datos del CV | `src/data/site.ts` |
| CV descargable | `public/Agustin-Hidalgo-CV.pdf` (copia idéntica del original) |
| Proyectos | `src/content/projects/*.md` |
| Imágenes | `src/assets/<proyecto>/` (se optimizan a WebP en el build) |
| Tokens de color/tipografía/movimiento | inicio de `src/styles/global.css` |
| Imagen social | `public/og.jpg` (provisional, hecha con un fotograma) |

## Añadir un proyecto (sin tocar componentes)

1. Copiar `src/content/projects/be-fresh.md` → `src/content/projects/mi-proyecto.md` (el nombre del archivo es la URL: `/proyectos/mi-proyecto`).
2. Poner las imágenes en `src/assets/mi-proyecto/` y referenciarlas con `../../assets/mi-proyecto/x.jpg`.
3. Editar los campos. Obligatorios: `title`, `order`, `descriptor`, `summary`, `cover` (con `alt`). Todo lo demás es opcional (`year`, `type`, `focus`, `category`, `role`, `collaborators`, `links`, `seoTitle`, `seoDescription`, `sections`).
4. `draft: true` lo oculta en producción. `order` controla la posición en la home y el "siguiente proyecto".
5. `sections` admite bloques `figure`, `text`, `gallery`, `palette`, `type`, `annotated` en el orden que se quiera. El texto del cuerpo del .md es "Contexto y concepto".
6. `npm run build` valida el esquema (alt obligatorio, hex válidos, imágenes existentes) y falla con un mensaje claro si algo está mal.

## Decisiones vinculadas a la referencia

- **Tipografía**: display = Anton (muy condensada, pesada; es la más cercana disponible a la del video, cuya fuente exacta no se puede certificar); lectura = Inter (semejante a la del video); anotación = Reenie Beanie (manuscrita). Bebas Neue y Montserrat aparecen solo como datos de cada proyecto (evidencia en las láminas), no se cargan.
- **Color**: negro `#000`, blanco, rojo `#7C0000` (muestreado del video, 124,0,0). Contraste: `#7C0000` sobre negro da 1,9:1, por eso se usa solo en fondos (índice), reglas y sobre blanco (11,3:1). Titulares grandes sobre negro usan `#B42525` (3,2:1) y texto pequeño `#E56464` (6,3:1). En el índice el texto es blanco (el video lo mostraba en negro sobre rojo).
- **Hero** = portada del video (PORTFOLIO monumental, retrato recortado con transparencia real superpuesto, DISEÑO/GRÁFICO manuscritos). Móvil recompuesto: retrato ampliado que pisa el titular.
- **Índice** = menú a pantalla completa en rojo con reglas finas y alternancia imprenta/manuscrita, con `<dialog>` nativo (foco atrapado, Escape, retorno del foco, `aria-expanded`).
- **Separadores "PROJECT 1/2"** = numeración dentro de cada proyecto destacado; no hay pantallas vacías.
- **Movimiento**: revelados por máscara/desvanecido activados por visibilidad (una vez), transición de página nativa (View Transitions), scroll nativo. Con `prefers-reduced-motion` todo aparece estático.
- **Sin sección Servicios**: los archivos no la desarrollan; se omite hasta tener contenido.

## Datos contrastados (video vs. CV)

- Formación coherente: video "estudiante de Comunicación Visual Gráfica y Digital, Univ. de Belgrano"; CV: Licenciatura en Comunicación Visual, Gráfica y Digital, 2024 – Actualidad. Se usó la grafía del CV para el título.
- Erratas del video corregidas en el texto web: "escencia"→"esencia", "codero"→"cordero", tildes en "tensión/fragmentación/simbólica/ilustración". "CREO DISEÑO QUE…" se conserva tal cual.
- Instagram: `@agustinhidalgo.desing` (grafía del video respetada, confirmada por Agustín).
- WhatsApp: `+54 9 11 7007-1828` (número del CV; prefijo confirmado por Agustín).

## Pendiente / limitaciones

- **Assets originales**: el video es 1024×576, así que retrato, botellas, mockups y láminas son recortes de fotogramas (baja resolución, se muestran con escala limitada). Necesito: retrato original recortado (PNG), fotos/mockups originales de ambos proyectos, logos en vector (Be Fresh) y ilustración/etiqueta en alta. Reemplazar los archivos en `src/assets/` con el mismo nombre.
- Sin evidencia: si Be Fresh o Cordero fueron encargos, académicos o personales; rol exacto; colaboradores. No se afirma.
- Sin dominio: no hay canonical/sitemap poblado (ver arriba). Sin inglés: no hay evidencia; contenido preparado en un solo archivo de datos.
- Métricas de rendimiento (LCP/INP/CLS) no medidas; los recursos son estáticos y las imágenes están reservadas con dimensiones.
