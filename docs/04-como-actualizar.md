# Cómo actualizar el contenido

## Lo que Hidalgo tiene que enviar

**Por cada proyecto:**
- Título (ES y, si puede, EN).
- Año, categoría y rol. Cliente solo si es real y se puede mostrar.
- Un resumen de 1–2 frases y, opcionalmente, un texto más largo sobre el desafío, el proceso y el resultado.
- Imágenes en la mejor calidad disponible (JPG o PNG). Una de ellas es la **portada**, idealmente horizontal.
- Videos: si son largos, un enlace de Vimeo o YouTube. Si son loops cortos (menos de ~15 MB), el archivo MP4.
- Si va destacado en la Home o no.

**Datos generales:**
- Intro breve.
- Declaración: una frase sobre su forma de trabajar.
- Bio.
- Disciplinas y servicios.
- Email, redes y ubicación.
- CV en PDF.
- Retrato (opcional).

## Cómo se carga (para quien edite el repositorio)

1. Copiar las imágenes a `src/content/images/<slug-del-proyecto>/`.
2. En `src/content/projects.ts`, importarlas y agregar el proyecto a la lista. El orden de la lista es el orden en el sitio. Bloques disponibles: `text`, `image`, `full`, `gallery`, `columns`, `embed`.
3. Actualizar `src/content/site.ts` con los datos generales. El CV va en `public/cv/` y se referencia como `/cv/archivo.pdf`.
4. Cuando no quede contenido de ejemplo, quitar `isExample: true`. El aviso “contenido de ejemplo” desaparece solo.
5. Borrar `src/content/images/ejemplos/` y los proyectos de ejemplo.
6. Subir los cambios a GitHub: Vercel publica automáticamente.
