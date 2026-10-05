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

- **Apertura = tu presentación.** Tu nombre en 3D (dos filas a distinta profundidad), tu retrato recortado entre ellas y, abajo, la botella de Cordero asomando. Al bajar, la presentación (`copy.lead`: qué diseño y cómo lo encaro) y una línea chica con el rol del CV y la situación académica. El panel y la página *Sobre mí* profundizan (`copy.about`): qué me interesa, qué muestran los proyectos, formación y experiencia. Cada texto aparece una sola vez.
- **Recorrido conectado.** La portada es solo identidad: nombre en 3D y retrato en capas, sin ningún otro objeto. Al bajar, la botella de Cordero sube desde abajo (sin tocar el retrato) y **se arma con el scroll**, como un diseño que se construye: trazo técnico con guías y regla → vidrio que se levanta con un borde rojo → etiqueta que se dibuja → acabado. Un rótulo «01 Trazo · 02 Volumen · 03 Etiqueta» acompaña el avance. En Be Fresh la protagonista es **solo la capa de barbero** (mockup real): primero el patrón de corte, luego la tela que cae y ondula; ya no hay tarjeta.
- **Un mundo por proyecto, inmersivo.** *Bodega* (Cordero): la sala toma el color del vino (tinto profundo, luz de vela, bóvedas de piedra, tablones, polvo a contraluz), cursor de anillo dorado. *Barbería* (Be Fresh): negro de salón, suelo ajedrezado en perspectiva, espejo y tubo fluorescente que arranca al entrar, cursor en cruz. Al cruzar a cada mundo aparece un cartel breve «entrando a la bodega / la barbería». Se define con `world: cellar | barber | press` en el `.md` del proyecto y también tiñe la página del caso.
- **Acuario (El pulpo que no murió): un mundo que se recorre hojeando el libro.** Después de la barbería se entra al acuario olvidado del relato: oscuridad, una luz pálida que cae desde arriba, reflejos de agua, partículas suspendidas y el vidrio; cursor de burbuja. El fanzine flota como un libro real (las dobles páginas de `src/assets/pulpo/`; la tapa es la mitad izquierda de la primera doble) y pasa las hojas con el scroll, con pausa en cada doble. En la página del proyecto el relato aparece frase por frase arriba del libro (`book.cover.line` y `spreads[].line`), una nota chica de diseño abajo, y el acuario se vacía a medida que se hojea (la luz baja, las partículas se van, sube el rojo; en «Canibalismo» el vidrio se tiñe). Al final el libro se hunde y quedan las frases de `book.closing` («Es un cuento sobre permanecer»); cierra `book.pitch`: qué demuestra la pieza y «Hablemos» (WhatsApp). En la home se abre y pasa dos hojas. Sonido: hoja que pasa (la tapa, más grave). Botones ← →, clic sobre la página y flechas del teclado; sin movimiento se hojea con botones; sin JS, las dobles una debajo de otra. Lógica en `src/scripts/zine.ts`, estilos en `src/styles/zine.css`.
- **Páginas de proyecto = mundos que se recorren** (campo `story` del `.md`). Cada caso tiene la misma forma: entrada al mundo (título bajo su luz + `opening`), la pieza fijada que avanza con el scroll con una frase por paso arriba y una nota chica de diseño abajo, el final (`closing`: la luz del mundo se apaga y quedan las frases) y el cierre que vende (`pitch`: qué demuestra + «Hablemos»). **Bodega (Cordero)**: vela desde abajo, relato manuscrito, cada pieza entra *desgarrada* (concepto «Verdad desgarrada»), sonido de papel. **Barbería (Be Fresh)**: tubo fluorescente que arranca, relato en mayúsculas nítidas, cada pieza entra con un *corte* diagonal, sonido de tijera. **Acuario (El pulpo)**: el libro. Pasos en `story.steps` (`src/components/Reel.astro`); lógica compartida en `src/scripts/zine.ts`, estilos por mundo en `src/styles/story.css`. Las imágenes no se agrandan más de 1,7× su tamaño real: los mockups chicos de Be Fresh (tarjeta, bolsa, cartel, estampado, versiones) quedan fuera hasta tener originales.
- **Sonido (opcional, apagado por defecto): cada sonido responde a algo que se ve.** Grabaciones reales (Freesound CC0 y un ringtone de marimba de Mixkit) para lo físico y dos tonos suaves sintetizados solo para la interfaz (activar el sonido, email copiado). Bajando, la historia suena en orden: **lápiz** (la botella se dibuja) → **vidrio** (toma cuerpo) → **etiqueta** que se pega → **descorche** y **vino servido** → **estallido** de la botella con el vino que salpica → la **capa** se abre (vuelo de tela) → el **tubo fluorescente** de la barbería arranca → **tijera** cuando la capa gira. Al subir no se repite nada (solo el tubo, que vuelve a parpadear en pantalla). Teclado de herramientas: **tecla mecánica** del lado donde está el puntero. Contacto: el **teléfono suena (ringtone de marimba)** al señalar WhatsApp. Ambiente: aire de sótano real en la bodega (también en la página de Cordero); se aparta cuando suena un momento clave; la barbería y la portada son silencio. Volúmenes igualados por jerarquía (momentos clave, detalles, ambiente) y paneo según la posición del objeto. Tecla **M** para silenciar / activar. Página interna `/sonidos` (no enlazada) para escucharlos. La partitura completa está en `src/data/sound-map.ts`.
- **Página Sobre mí (`/sobre-mi`).** Portada con el avatar 3D delante del nombre gigante (guiña al pasar el puntero), párrafo «Qué me interesa» que se enciende palabra por palabra con el scroll, «Cómo lo encaro» en tres pasos, tarjetas de los proyectos, la frase manuscrita en grande y la trayectoria en línea de tiempo (datos del CV). Cierra con el teclado y el contacto, con el muñeco al teléfono como imagen fija. La foto real (`src/assets/portrait/agustin-foto.webp`) ya no se usa; queda en el proyecto por si se quiere volver a ella.
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
| Sonidos y partitura | `public/audio/foley/` (procesados con `scripts/process-sounds.mjs` desde `scripts/sound-sources/`, créditos en `scripts/sound-sources/CREDITOS.md`) y `src/data/sound-map.ts`; prueba en `/sonidos` |
| Escena 3D | `src/scripts/scene/index.ts` |
| Movimiento (scroll, cursor), menú y pasos | `src/scripts/motion.ts`, `src/scripts/ui.ts` |
| Tokens y estilos | `src/styles/global.css` |
| Fuentes locales (licencia OFL) | `src/assets/fonts/` |
| Imagen social | `public/og.jpg` (provisional) |

## Añadir un proyecto (sin tocar componentes)

1. Copiá `src/content/projects/be-fresh.md` → `src/content/projects/mi-proyecto.md` (el nombre del archivo es la URL: `/proyectos/mi-proyecto`).
2. Poné las imágenes en `src/assets/mi-proyecto/` y referencialas con `../../assets/mi-proyecto/x.jpg`.
3. Obligatorios: `title`, `order`, `descriptor`, `summary`, `cover` (con `alt`). El resto es opcional. `draft: true` lo oculta en producción.
4. `scene: book` + `book: { opening, cover, spreads, closing, pitch }` (dobles páginas en orden, cada una con su frase del relato, `title` y `note`) lo convierte en un libro que se hojea, en la home y en su página, sin 3D. `scene: bottle | cape` le da un tramo 3D en la home (hoy existen la botella y la capa; requiere `stageImages` con 3 imágenes reales). Sin `scene`, aparece como bloque editorial.
5. `sections` acepta `figure`, `text`, `gallery` (`size: s|m|l`), `palette`, `type`, `annotated`.
6. `npm.cmd run build` valida el esquema y falla con un mensaje claro si algo falta.

## Verificaciones y datos

- Contacto: WhatsApp `+54 9 11 7007-1828` (número del CV, prefijo confirmado por Agustín), email `agustinn.hidalgoo@gmail.com` (CV), Instagram `@agustinhidalgo.desing` (grafía del video, confirmada).
- CV: formación y experiencia transcriptas sin agregados (`cvData`); el «Perfil» de Sobre mí es una reescritura breve con los mismos datos. No se afirma si los proyectos fueron encargos, académicos o personales; los textos de los casos solo describen decisiones visibles en las piezas y aclaran que las aplicaciones de Be Fresh son mockups.
- Los recursos de proyecto vienen del PDF de envases y del zip de Be Fresh entregados. Las etiquetas 3D son recortes de las fotografías del PDF.

## Pendiente / limitaciones

- **Originales que mejorarían el resultado**: etiqueta plana de Cordero (frente y dorso) en alta resolución; fotografías originales de botella y caja sin compresión; mockups originales de Be Fresh (tarjeta con relieve, bolsa, cartel, uniforme); retrato original recortado; rol de cada proyecto.
- Las fotos del PDF miden ~525 px de ancho: por eso la botella nunca se muestra por encima de ~720 px de alto ni con primeros planos. No hay reverso inventado: solo se muestran las dos caras con información real.
- La capa es una imagen real con deformación de tela (efecto visual, no una simulación física ni un modelo 3D). El armado de la botella (trazo, guías, regla) es una animación decorativa sobre la silueta medida de la foto real.
- Los sonidos se eligieron y mezclaron con medición (volumen percibido, picos, ruido de fondo, espectrograma) y se verificó en un navegador que cada uno se dispara en su momento y en orden, en escritorio y en móvil; el timbre final lo juzga el oído (`/sonidos`). Para cambiar uno: editar `scripts/sound-sources/sounds.json` y volver a correr `scripts/process-sounds.mjs`.
- Publicado en Vercel: https://hidalgo-portfolio-two.vercel.app (se actualiza solo con cada push a `main`). Con un dominio propio, cambiar la dirección en `astro.config.mjs` (o la variable `SITE_URL`) y en `public/robots.txt`.
- Sin versión en inglés (sin evidencia que la justifique).
- El rendimiento se midió en laboratorio (Chromium con render por software); no en un teléfono real.
- Para pruebas: `/?snap` desactiva el suavizado de la escena y `window.__lenis` expone el scroll.

## Cambios recientes (octubre 2026)

- **Libro (El pulpo)**: se hojea como uno de verdad. Cada hoja se dobla en diagonal desde la esquina (geometría 2D: pliegue = mediatriz entre la esquina y el punto de arrastre; el dorso se refleja sobre el pliegue), se agarra y se arrastra con mouse o dedo, la esquina se levanta al pasar el puntero, y también pasan las hojas el scroll, los botones, el clic y las flechas. La tapa aparece una sola vez (al abrirla queda la guarda) y el libro cierra con la contratapa. `src/scripts/zine.ts`.
- **Cordero**: estante horizontal de presentación de producto (`story.shelf`, `src/components/Shelf.astro`, `src/scripts/shelf.ts`): fotos a la misma altura sobre una tabla, paneles de texto entre grupos y la frase final.
- **Be Fresh**: sin la tarjeta en relieve; logotipo, isotipo y capa.
- **Barbería**: sin el poste de colores en el borde.
- **Botonera**: logos oficiales (`src/assets/logos/`, descargados de Wikimedia Commons) que cubren cada tecla.
- **Transiciones**: el contenido de cada mundo se funde al entrar y al salir (`--vis`, `src/scripts/ui.ts`); la página nueva entra con un leve ascenso.
