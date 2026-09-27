# Arquitectura (versión simple)

- **Next.js 15 + React 19 + TypeScript.** Todas las páginas se generan de antemano (sitio estático), en `/es/...` y `/en/...`.
- **Contenido en archivos TypeScript** (`src/content/`), con tipos que evitan errores (`src/lib/types.ts`). No hay base de datos, panel, login ni servicios externos.
- **Imágenes:** se importan desde `src/content/images/`. `next/image` genera tamaños responsivos, AVIF/WEBP y el difuminado de carga.
- **Motion:** GSAP (ScrollTrigger, SplitText, Flip) + Lenis. Cada animación se declara con atributos `data-reveal` y `data-parallax` (ver `src/components/site/ScrollEffects.tsx`).
- **3D / WebGL:** Three.js, cargado solo en la Home y en la vista previa de proyectos (`src/components/site/webgl/`). `glass-scene.ts` tiene el vidrio líquido (MeshPhysicalMaterial con transmisión y dispersión, deformación por ruido simplex en el shader) y la placa con el nombre. `distort-preview.ts` tiene la lámina que sigue al cursor. Se renderiza solo cuando está en pantalla; en celulares baja la resolución y la geometría.
- **Interfaz:** HUD (`Hud.tsx`), decodificación de texto (`scramble.ts`, atributo `data-scramble`) y sonido sintetizado con WebAudio (`Sound.tsx`, apagado por defecto).
- **Idiomas:** cada texto es `{ es, en }`. Si falta uno, se muestra el otro. Los textos fijos de la interfaz están en `src/lib/i18n.ts`.
- **SEO:** metadatos por página, `hreflang`, `sitemap.xml` y `robots.txt`.
- **Seguridad:** el texto con formato (`**negrita**`, `*cursiva*`, enlaces) se convierte a elementos React, nunca a HTML crudo. Los embeds se limitan a YouTube (dominio sin cookies) y Vimeo.

Historial: hubo una versión con panel de administración y base de datos (commits `29dc0ee` y siguiente). Se simplificó a pedido de Hidalgo el 2026-09-27: el objetivo es un portfolio para enviar, no un sistema para administrar.
