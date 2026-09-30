# PORTFOLIO CREATIVO WEB — Agustín Hidalgo

Portfolio editorial con una escena 3D (Three.js) en la que **la botella de «Cordero con piel de lobo» es la protagonista**, y una transición hacia el universo de Be Fresh. Web estática hecha con Astro. **No está publicada**: corre solo en tu computadora.

## Abrir y previsualizar

**Windows + Visual Studio Code**

1. Instalá [Node.js](https://nodejs.org) LTS (20.3 o superior; se probó con Node 22).
2. En VS Code: *Archivo → Abrir carpeta…* y elegí `PORTFOLIO CREATIVO WEB`.
3. En la terminal integrada:

```bash
npm.cmd install
npm.cmd run dev
```

4. Abrí `http://localhost:4321`.

**Linux / macOS**: los mismos comandos con `npm` (`npm install` y `npm run dev`).

Otros comandos: `npm.cmd run font` (regenera la tipografía 3D del nombre), `npm.cmd run build` (valida contenidos y genera `dist/`), `npm.cmd run preview` (sirve `dist/`), `npm.cmd run check`.

## Cómo funciona la experiencia

- **Apertura = tu presentación.** Tu nombre en 3D (dos filas a distinta profundidad), tu retrato recortado entre ellas y, abajo, la botella de Cordero asomando. Debajo del nombre: especialidad y estudios (datos del CV). Luego *Sobre mí* (con formación, experiencia y herramientas) e *Introducción*.
- **Recorrido conectado.** Al bajar, el nombre y el retrato salen con la página y la botella sube y se estaciona junto al texto; en su proyecto vuelve a ser protagonista (frente → dorso → frente). En Be Fresh entran la capa de barbero (mockup real, con ondulación de tela) y la tarjeta con el isologo BF extruido desde el vector.
- **Un mundo por proyecto.** Cada proyecto con escena 3D cambia el ambiente completo: fondo, textura, cursor y sonido. *Bodega* (Cordero): luz de vela, grano de madera, cursor de anillo dorado. *Barbería* (Be Fresh): reflejo de espejo, rayas finas de poste de barbero, cursor en cruz. Se define con `world: cellar | barber` en el `.md` del proyecto y también tiñe la página del caso.
- **Sonido (opcional, apagado por defecto).** Botón «Sonido» arriba. Efectos de interfaz CC0 de la biblioteca uisfx con un pack distinto por mundo (studio / organic / mechanical), impactos de transición al cambiar de mundo, sonido al cambiar de paso, ambiente sintetizado por mundo (bodega: bordón y gotas lejanas; barbería: tubo fluorescente) y roce de la capa que crece con el scroll. Se recuerda durante la sesión; el navegador exige un gesto para iniciar audio. **Página interna `/sonidos`** (no enlazada) para escuchar todo y decidir. Se ajusta en `src/data/sound-map.ts`. Créditos: `public/audio/CREDITS.txt`.
- **Composición desde el HTML.** Cada objeto 3D se coloca sobre elementos `[data-slot]`; el CSS decide dónde va en escritorio, tablet, móvil y pantallas bajas. No hay «una versión de escritorio achicada».
- **Estado = función del scroll.** Recargar a mitad de página, retroceder, redimensionar o saltar a un ancla dejan la escena en el estado correcto.
- **Alternativa completa.** Con movimiento reducido, sin WebGL o si el 3D falla se muestran las fotografías reales (retrato, botella, capa) con los mismos textos y el mismo recorrido, apilado y sin fijar. Sin pantalla de carga ni contador.
- **Accesibilidad.** Todo el texto es HTML real (el canvas es decorativo), foco visible, enlace para saltar al contenido, menú con `<dialog>`, `prefers-reduced-motion`, botón de sonido con estado accesible.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Textos, contactos (WhatsApp, email, Instagram), datos del CV | `src/data/site.ts` |
| CV descargable | `public/Agustin-Hidalgo-CV.pdf` (copia idéntica al original) |
| Proyectos | `src/content/projects/*.md` |
| Imágenes de proyectos | `src/assets/cordero/`, `src/assets/befresh/` |
| Modelos, texturas y recortes 3D | `src/assets/3d/` (perfil de la botella, etiquetas frente/dorso, isologo BF en SVG, capa de barbero, tipografía 3D del nombre) |
| Sonidos y mapa de sonidos | `public/audio/` (CC0) y `src/data/sound-map.ts`; prueba en `/sonidos` |
| Escena 3D | `src/scripts/scene/index.ts` |
| Movimiento (scroll, cursor), menú y pasos | `src/scripts/motion.ts`, `src/scripts/ui.ts` |
| Tokens y estilos | `src/styles/global.css` |
| Fuentes locales (licencia OFL) | `src/assets/fonts/` |
| Imagen social | `public/og.jpg` (provisional) |

## Añadir un proyecto (sin tocar componentes)

1. Copiá `src/content/projects/be-fresh.md` → `src/content/projects/mi-proyecto.md` (el nombre del archivo es la URL: `/proyectos/mi-proyecto`).
2. Poné las imágenes en `src/assets/mi-proyecto/` y referencialas con `../../assets/mi-proyecto/x.jpg`.
3. Obligatorios: `title`, `order`, `descriptor`, `summary`, `cover` (con `alt`). El resto es opcional. `draft: true` lo oculta en producción.
4. `scene: bottle | card` le da un tramo 3D en la home (hoy solo existen esos dos objetos; requiere `stageImages` con 3 imágenes reales). Sin `scene`, aparece como bloque editorial.
5. `sections` acepta `figure`, `text`, `gallery` (`size: s|m|l`), `palette`, `type`, `annotated`.
6. `npm.cmd run build` valida el esquema y falla con un mensaje claro si algo falta.

## Verificaciones y datos

- Contacto: WhatsApp `+54 9 11 7007-1828` (número del CV, prefijo confirmado por Agustín), email `agustinn.hidalgoo@gmail.com` (CV), Instagram `@agustinhidalgo.desing` (grafía del video, confirmada).
- CV: formación y experiencia transcriptas sin agregados. No se afirma si los proyectos fueron encargos, académicos o personales, ni el rol exacto.
- Los recursos de proyecto vienen del PDF de envases y del zip de Be Fresh entregados. Las etiquetas 3D son recortes de las fotografías del PDF.

## Pendiente / limitaciones

- **Originales que mejorarían el resultado**: etiqueta plana de Cordero (frente y dorso) en alta resolución; fotografías originales de botella y caja sin compresión; mockups originales de Be Fresh (tarjeta con relieve, bolsa, cartel, uniforme); retrato original recortado; rol de cada proyecto.
- Las fotos del PDF miden ~525 px de ancho: por eso la botella nunca se muestra por encima de ~720 px de alto ni con primeros planos. No hay reverso inventado: solo se muestran las dos caras con información real.
- La tarjeta 3D de Be Fresh es un modelo simplificado; el isologo sí es el vector original. La capa es una imagen real con deformación de tela (efecto visual, no una simulación física ni un modelo 3D).
- El sonido no se pudo escuchar al prepararlo: los niveles se midieron (efectos ≈ −14 dBFS de pico, ambiente ≈ −31 dBFS) pero el timbre hay que juzgarlo en `/sonidos`.
- Sin dominio confirmado: no hay canonical ni sitemap con URLs. Al publicar: `SITE_URL=https://tu-dominio npm run build`.
- Sin versión en inglés (sin evidencia que la justifique).
- El rendimiento se midió en laboratorio (Chromium con render por software); no en un teléfono real.
- Para pruebas: `/?snap` desactiva el suavizado de la escena y `window.__lenis` expone el scroll.
