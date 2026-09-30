# PORTFOLIO CREATIVO WEB — Agustín Hidalgo

Portfolio editorial con escena 3D (Three.js), scroll con inercia (Lenis) y movimiento (GSAP). Web estática hecha con Astro. **No está publicada**: corre solo en tu computadora.

## Abrir y previsualizar (Windows + Visual Studio Code)

1. Instalá [Node.js](https://nodejs.org) LTS (versión 20.3 o superior; se probó con Node 22).
2. En VS Code: **Archivo → Abrir carpeta…** y elegí `PORTFOLIO CREATIVO WEB`.
3. Abrí la terminal (**Terminal → Nueva terminal**) y ejecutá:

```bash
npm.cmd install
npm.cmd run dev
```

4. Abrí `http://localhost:4321` en el navegador.

Si PowerShell bloquea `npm` por la política de scripts, usá `npm.cmd` como arriba (por eso se indica así).

Otros comandos: `npm.cmd run build` (valida y genera `dist/`), `npm.cmd run preview` (sirve `dist/`), `npm.cmd run check`.

> La escena 3D necesita WebGL (cualquier navegador moderno con aceleración por hardware). Sin WebGL, con "reducir movimiento" o si falla, se muestra la versión HTML con fotos.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Textos, contactos (WhatsApp, email, Instagram), datos del CV | `src/data/site.ts` |
| CV descargable | `public/Agustin-Hidalgo-CV.pdf` (copia idéntica del original) |
| Proyectos | `src/content/projects/*.md` |
| Imágenes de proyectos | `src/assets/cordero/`, `src/assets/befresh/` |
| Modelos y texturas 3D | `src/assets/3d/` (perfil de botella, etiquetas frente/dorso, isologo BF en SVG, tipografía 3D) |
| Escena 3D | `src/scripts/scene/index.ts` |
| Movimiento, cursor, scroll | `src/scripts/motion.ts`, `src/scripts/ui.ts` |
| Tokens de color/tipografía y estilos | `src/styles/global.css` |
| Fuentes (locales, licencia OFL) | `src/assets/fonts/` |
| Imagen social | `public/og.jpg` (provisional) |

## Añadir un proyecto (sin tocar componentes)

1. Copiá `src/content/projects/be-fresh.md` → `src/content/projects/mi-proyecto.md` (el nombre del archivo es la URL: `/proyectos/mi-proyecto`).
2. Poné las imágenes en `src/assets/mi-proyecto/` y referenciálas con `../../assets/mi-proyecto/x.jpg`.
3. Obligatorios: `title`, `order`, `descriptor`, `summary`, `cover` (con `alt`). Todo lo demás es opcional. `draft: true` lo oculta en producción.
4. `scene: bottle | card` le da un tramo 3D propio en la home (solo esos dos objetos existen hoy). Sin `scene`, aparece como bloque editorial.
5. `sections` acepta `figure`, `text`, `gallery` (`size: s|m|l`), `palette`, `type`, `annotated`.
6. `npm.cmd run build` valida el esquema y avisa con un error claro si algo falta.

## Decisiones vinculadas a la referencia

- **Identidad**: negro, blanco y rojo `#7C0000` (muestreado del video). Contraste: el rojo sobre negro solo se usa en fondos y reglas; titulares sobre negro `#B42525`, texto pequeño `#E56464`.
- **Tipografía**: Anton (display, la más cercana disponible a la del video), Inter (lectura), Reenie Beanie (manuscrita).
- **Hero**: "AGUSTÍN HIDALGO" como letras 3D extruidas con luz de estudio; recorrido conectado hacia Cordero (botella, frente y dorso) y Be Fresh (tarjeta con isologo BF vectorial).
- **Accesibilidad**: todo el texto es HTML real; el canvas es decorativo. Foco visible, menú con `<dialog>`, movimiento reducido, alternativa sin WebGL.

## Datos verificados

- Contacto: WhatsApp `+54 9 11 7007-1828` (número del CV, prefijo confirmado por Agustín); email `agustinn.hidalgoo@gmail.com` (CV); Instagram `@agustinhidalgo.desing` (grafía del video, confirmada).
- CV: formación y experiencia transcriptas del PDF sin agregados.
- No se afirma si los proyectos fueron encargos, académicos o personales, ni el rol exacto.

## Pendiente / limitaciones

- **Originales que mejorarían el resultado**: etiqueta plana de Cordero (frente y dorso) en alta; fotos originales de botella y caja sin compresión; mockups originales de Be Fresh (tarjeta con relieve, bolsa, cartel, uniforme); retrato original recortado; rol en cada proyecto.
- Las imágenes vienen del PDF de envases (~500 px) y de fotogramas del video (1024×576): se ven bien a tamaño de página pero no admiten primeros planos.
- La tarjeta 3D de Be Fresh es un modelo simplificado; el isologo sí es el vector original.
- Sin dominio confirmado: no hay canonical ni sitemap con URLs. Al publicar, compilar con `SITE_URL=https://tu-dominio npm run build`.
- Sin versión en inglés (no hay evidencia que la justifique).
- El rendimiento en teléfono real no se midió; solo se verificó en Chromium.
