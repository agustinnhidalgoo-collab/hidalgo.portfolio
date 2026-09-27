# HIDALGO — Graphic Designer

Portfolio web bilingüe (ES/EN) para enviar a empresas y estudios.

> **Estado:** diseño completo con **contenido de ejemplo** (marcado como tal). Se reemplaza con los proyectos reales de Hidalgo.

## Cómo es

- **Páginas:** Home, Proyectos (con filtros), página de cada proyecto, Sobre mí (con CV descargable) y Contacto, en español e inglés.
- **Paleta:** Whipped Butter `#F2E6B3` y Cookie Crumble `#4B2E21`. Tipografía Archivo variable.
- **Interacción:**
  - Palabra “HIDALGO” que reacciona al cursor.
  - Vista previa de proyectos que sigue al cursor.
  - Transiciones entre páginas, cursor propio, scroll suave y animaciones al hacer scroll.
- **Accesibilidad:** respeta `prefers-reduced-motion`, y en celulares usa el cursor nativo.
- **Rendimiento:** sitio estático, con imágenes optimizadas automáticamente.

## Publicarlo gratis (sin instalar nada)

Ver **`docs/05-publicar-gratis.md`**: con una cuenta gratuita de Vercel se conecta este repositorio de GitHub y se obtiene un enlace público. Cada cambio que se sube al repositorio se publica solo.

## Dónde está el contenido

| Qué | Archivo |
|---|---|
| Textos generales (intro, bio, servicios, email, redes, CV) | `src/content/site.ts` |
| Proyectos (orden, textos, imágenes, bloques) | `src/content/projects.ts` |
| Categorías de los filtros | `src/content/categories.ts` |
| Imágenes | `src/content/images/<proyecto>/` |
| CV en PDF / videos cortos | `public/cv/`, `public/videos/` |

Cómo agregar o cambiar contenido: `docs/04-como-actualizar.md`.

## Para desarrolladores (opcional)

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # verificación de producción
```
