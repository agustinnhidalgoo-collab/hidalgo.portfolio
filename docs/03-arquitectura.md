# HIDALGO — Arquitectura

## Stack

| Pieza | Elección | Por qué | Costo |
|---|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript** | Sitio público renderizado en servidor (bueno para SEO), panel y API en un solo proyecto y un solo despliegue. | 0 |
| Base de datos | **SQLite vía libSQL** (`@libsql/client`) + Drizzle ORM | Un archivo en local. En producción puede ser el mismo archivo en un disco persistente o **Turso** (libSQL gestionado) sin cambiar código. | 0 local · Turso tiene capa gratuita |
| Archivos | Disco (`MEDIA_DIR`), servidos por `/media/*` con soporte de rangos (video) | Simple de operar y de respaldar. | incluido en el hosting |
| Imágenes | **sharp**: variantes WEBP (480–2800 px) + difuminado de carga | Carga rápida sin depender de servicios externos. | 0 |
| Autenticación | Un administrador: email + hash **scrypt** en variables de entorno; sesión **JWT HS256** en cookie `httpOnly` | No depende de terceros y no hay contraseñas en la base. | 0 |
| Motion | **GSAP** (ScrollTrigger, SplitText, Flip) + **Lenis** | Estándar de la industria; GSAP es gratuito, incluidos sus plugins. | 0 |
| Tipografía | **Archivo** variable (ejes de ancho 62–125 y peso 100–900), autoalojada con `@fontsource-variable/archivo` | Una sola familia cubre titulares extendidos y pesados, texto e interacción por ejes variables. Licencia OFL. | 0 |
| Reordenar | `@dnd-kit` | Accesible por teclado. | 0 |

No hay servicios externos conectados. Todo corre en local sin cuentas.

## Estructura

```
src/
  app/
    (site)/[locale]/…      sitio público (es / en)
    (admin)/admin/…        panel: login + (panel) protegido
    api/auth/*             login / logout
    api/admin/*            API privada (proyectos, medios, ajustes, categorías)
    media/[...path]        entrega de archivos subidos
    sitemap.ts, robots.ts
  components/site/         header, cursor, transiciones, palabra cinética, índice…
  components/admin/        editor, bloques, biblioteca, ajustes…
  lib/                     tipos + validación (zod), base de datos, auth, medios, i18n
  styles/                  tokens.css (paleta), site.css, admin.css
  middleware.ts            idioma por defecto + protección de /admin y vistas previas
scripts/                   seed, hash de contraseña, backup
```

## Modelo de datos

- **projects**: `id`, `slug` (URL pública), `status` (`draft` | `published`), `featured`, `sort_order`, `draft` (JSON), `published` (JSON o null), fechas.
  - **Borrador y publicado son dos copias.** Editar y guardar modifica solo `draft`. Publicar copia `draft` → `published`. El sitio solo lee `published`, así que un proyecto publicado se puede seguir editando sin afectar lo que ve el público. “Descartar cambios” vuelve `draft` a `published`.
- **Contenido de un proyecto** (`ProjectContent`): `slug`, `title`, `summary`, `year`, `client`, `role`, `categoryIds`, `coverId`, `blocks[]`, `isExample`. Cada texto es `{ es, en }`.
- **Bloques**: `text`, `image` (contenida o ancha), `full`, `gallery` (2 o 3 columnas), `columns` (texto o imagen en cada lado), `video` (archivo o YouTube/Vimeo).
- **media**: archivo, tipo, tamaño, dimensiones, variantes, difuminado y `alt { es, en }`.
- **categories**: `name { es, en }`, orden.
- **settings**: un documento JSON (`site`) con los textos generales, contacto, enlaces, retrato, CV ES/EN, SEO y zona horaria.

## Seguridad

- `/admin/*` y `/{es,en}/preview/*` están protegidos dos veces: en el middleware y, de nuevo, en el servidor antes de renderizar.
- Cada endpoint de `/api/admin/*` verifica la sesión, y los que modifican datos exigen además que la petición venga del **mismo origen** (protección CSRF).
- Login con comparación en tiempo constante, pausa ante errores y **límite de 5 intentos cada 15 minutos por IP** (en memoria).
- Cookie `httpOnly`, `SameSite=Lax` y `Secure` en producción; la sesión dura 7 días.
- Subidas:
  - El tipo se valida por **firma binaria**, no por la extensión.
  - Límites de tamaño por tipo.
  - Se renombran con un id aleatorio.
  - No se aceptan SVG, porque pueden incluir scripts.
- Texto enriquecido: formato mínimo (párrafos, **negrita**, *cursiva*, enlaces http/https/mailto) convertido a elementos React. **Nunca se inserta HTML**, así que no hay XSS desde el contenido. Probado con `<script>` y enlaces `javascript:`.
- Embeds: solo YouTube (dominio sin cookies) y Vimeo (`dnt=1`).
- La ruta `/media/*` solo sirve nombres simples dentro de `MEDIA_DIR`, lo que bloquea los intentos de salir de esa carpeta.
- Encabezados de seguridad: `nosniff`, `Referrer-Policy`, `X-Frame-Options` y `Permissions-Policy`. `robots.txt` excluye `/admin`, `/api` y las vistas previas.

## Idiomas

- Las rutas son `/es/...` y `/en/...`; la raíz redirige según el idioma del navegador.
- El contenido editorial se escribe en ambos idiomas desde el panel. Si falta un idioma, se muestra el otro.
- Los textos fijos de la interfaz (menú, botones) están en `src/lib/i18n.ts`.

## Backups

- `npm run backup` genera una copia consistente de la base (`VACUUM INTO`) y de la carpeta de medios en `backups/<fecha>/`.
- Recomendación: backup semanal, y siempre antes de cambios grandes, guardado **fuera del servidor**.
- Con Turso: `turso db shell <db> .dump > backup.sql`, además de copiar la carpeta de medios.

## Límites conocidos

- Los archivos se guardan en disco, así que el hosting necesita **almacenamiento persistente** (ver `05-despliegue.md`). Para Vercel u otro serverless habría que agregar un adaptador S3/R2; queda pendiente.
- El límite de intentos de login vive en memoria: se reinicia si se reinicia el servidor. Alcanza para un solo administrador.
- Los videos pesados (más de 100 MB) conviene subirlos a Vimeo y usar el bloque de embed.
