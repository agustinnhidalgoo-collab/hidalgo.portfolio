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
- **Recorrido conectado.** La portada es solo identidad: nombre en 3D y retrato en capas, sin ningún otro objeto. Al bajar, la botella de Cordero sube desde abajo (sin tocar el retrato) y **se arma con el scroll**, como un diseño que se construye: trazo técnico con guías y regla → vidrio que se levanta con un borde rojo → etiqueta que se dibuja → acabado. Un rótulo «01 Trazo · 02 Volumen · 03 Etiqueta» acompaña el avance. En Be Fresh la protagonista es **solo la capa de barbero** (mockup real): primero el patrón de corte, luego la tela que cae y ondula; ya no hay tarjeta.
- **Un mundo por proyecto, inmersivo.** *Bodega* (Cordero): la sala toma el color del vino (tinto profundo, luz de vela, bóvedas de piedra, tablones, polvo a contraluz), cursor de anillo dorado. *Barbería* (Be Fresh): negro de salón, poste de barbero en el borde, suelo ajedrezado en perspectiva, espejo y tubo fluorescente que arranca al entrar, cursor en cruz. Al cruzar a cada mundo aparece un cartel breve «entrando a la bodega / la barbería». Se define con `world: cellar | barber` en el `.md` del proyecto y también tiñe la página del caso.
- **Sonido (opcional, apagado por defecto), rediseñado: menos y con sentido.** Se eliminaron los clics y el hover. Suena lo que pasa en escena: **vino** en la bodega (brindis de copas, descorche al terminar de armarse la botella, vino que se sirve al entrar, glug al volver, papel de la etiqueta al dibujarse) y **capa y tijera** en la barbería (la capa se abre al entrar, sacudida al retroceder, dos cortes de tijera al cambiar de paso, roce de tela que crece con el scroll). Ambiente: aire de bodega con gotas lejanas; la portada es silencio. Los sonidos son **propios**: están sintetizados con `scripts/make-sounds.py` (sin muestras de terceros, sin licencias). Tecla **M** para silenciar / activar. Página interna `/sonidos` (no enlazada) para escucharlos. Todo se ajusta en `src/data/sound-map.ts`.
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
| Sonidos y mapa de sonidos | `public/audio/foley/` (generados con `scripts/make-sounds.py`) y `src/data/sound-map.ts`; prueba en `/sonidos` |
| Escena 3D | `src/scripts/scene/index.ts` |
| Movimiento (scroll, cursor), menú y pasos | `src/scripts/motion.ts`, `src/scripts/ui.ts` |
| Tokens y estilos | `src/styles/global.css` |
| Fuentes locales (licencia OFL) | `src/assets/fonts/` |
| Imagen social | `public/og.jpg` (provisional) |

## Añadir un proyecto (sin tocar componentes)

1. Copiá `src/content/projects/be-fresh.md` → `src/content/projects/mi-proyecto.md` (el nombre del archivo es la URL: `/proyectos/mi-proyecto`).
2. Poné las imágenes en `src/assets/mi-proyecto/` y referencialas con `../../assets/mi-proyecto/x.jpg`.
3. Obligatorios: `title`, `order`, `descriptor`, `summary`, `cover` (con `alt`). El resto es opcional. `draft: true` lo oculta en producción.
4. `scene: bottle | cape` le da un tramo 3D en la home (hoy existen la botella y la capa; requiere `stageImages` con 3 imágenes reales). Sin `scene`, aparece como bloque editorial.
5. `sections` acepta `figure`, `text`, `gallery` (`size: s|m|l`), `palette`, `type`, `annotated`.
6. `npm.cmd run build` valida el esquema y falla con un mensaje claro si algo falta.

## Verificaciones y datos

- Contacto: WhatsApp `+54 9 11 7007-1828` (número del CV, prefijo confirmado por Agustín), email `agustinn.hidalgoo@gmail.com` (CV), Instagram `@agustinhidalgo.desing` (grafía del video, confirmada).
- CV: formación y experiencia transcriptas sin agregados. No se afirma si los proyectos fueron encargos, académicos o personales, ni el rol exacto.
- Los recursos de proyecto vienen del PDF de envases y del zip de Be Fresh entregados. Las etiquetas 3D son recortes de las fotografías del PDF.

## Pendiente / limitaciones

- **Originales que mejorarían el resultado**: etiqueta plana de Cordero (frente y dorso) en alta resolución; fotografías originales de botella y caja sin compresión; mockups originales de Be Fresh (tarjeta con relieve, bolsa, cartel, uniforme); retrato original recortado; rol de cada proyecto.
- Las fotos del PDF miden ~525 px de ancho: por eso la botella nunca se muestra por encima de ~720 px de alto ni con primeros planos. No hay reverso inventado: solo se muestran las dos caras con información real.
- La capa es una imagen real con deformación de tela (efecto visual, no una simulación física ni un modelo 3D). El armado de la botella (trazo, guías, regla) es una animación decorativa sobre la silueta medida de la foto real.
- Los sonidos son sintéticos (no grabaciones reales) y no se pudieron escuchar al prepararlos: se verificó que cada uno se dispara en el momento correcto y que los niveles son moderados (pico ≈ −9 dBFS), pero el timbre hay que juzgarlo en `/sonidos`. Si alguno no convence, se ajusta en `scripts/make-sounds.py` o se reemplaza por una grabación real (por ejemplo, grabada por vos con el celular: corcho, copa, tijera).
- Sin dominio confirmado: no hay canonical ni sitemap con URLs. Al publicar: `SITE_URL=https://tu-dominio npm run build`.
- Sin versión en inglés (sin evidencia que la justifique).
- El rendimiento se midió en laboratorio (Chromium con render por software); no en un teléfono real.
- Para pruebas: `/?snap` desactiva el suavizado de la escena y `window.__lenis` expone el scroll.
