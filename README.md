# HIDALGO — Graphic Designer

Portfolio bilingüe (ES/EN) con panel privado para administrar proyectos, medios y textos sin tocar código.

> **Estado:** base funcional con **contenido de ejemplo** (marcado como tal en el sitio y en el panel).
> Se reemplaza desde `/admin`. Ver `docs/` para decisiones, arquitectura y guías.

## Qué incluye

**Sitio público** (`/es`, `/en`)
- Home con palabra cinética “HIDALGO”: las letras cambian de ancho y peso según la cercanía del cursor (en táctiles, una onda automática).
- Índice de proyectos destacados con vista previa que sigue al cursor.
- Página de proyectos con filtros animados y vista grilla/lista.
- Página de cada proyecto armada con bloques.
- About con servicios y CV descargable, y página de contacto.
- Transiciones entre páginas, cursor propio, scroll suave, textos que se revelan por líneas, parallax, cinta de disciplinas que reacciona al scroll, grano analógico.
- Respeta `prefers-reduced-motion`: sin animaciones, sin precarga y con cursor nativo. En táctiles también se usa el cursor nativo.

**Panel privado** (`/admin`)
- Proyectos:
  - Crear, editar, reordenar arrastrando y destacar.
  - Publicar, despublicar, descartar cambios y eliminar.
  - Se guardan borradores y se puede previsualizar antes de publicar.
- Editor por bloques reordenables: texto, imagen, imagen a ancho completo, galería, dos columnas y video (archivo o YouTube/Vimeo).
- Todos los textos en ES y EN lado a lado, con aviso si falta una traducción.
- Biblioteca de medios:
  - Subida múltiple con progreso.
  - Texto alternativo bilingüe.
  - Aviso antes de borrar un archivo que está en uso.
- Ajustes: intro, declaración, bio, disciplinas, servicios, contacto, enlaces, retrato, CV ES/EN, SEO y categorías.
- Confirmación antes de toda acción destructiva y aviso de cambios sin guardar.

## Requisitos

- Node.js **22.9 o superior**
- npm

## Ejecutar en local

```bash
npm install
cp .env.example .env.local        # completar los valores (ver abajo)
npm run admin:hash -- "tu-contraseña-segura"   # pegar el resultado en .env.local
npm run db:seed                   # opcional: carga contenido de EJEMPLO
npm run dev                       # http://localhost:3000
```

Panel: <http://localhost:3000/admin>.

### Variables de entorno (`.env.local`)

| Variable | Qué es |
|---|---|
| `SITE_URL` | URL pública, para SEO y sitemap. |
| `DATABASE_URL` | `file:./data/hidalgo.db` (SQLite local) o `libsql://…` (Turso). |
| `DATABASE_AUTH_TOKEN` | Solo con Turso. |
| `MEDIA_DIR` | Carpeta de archivos subidos (por defecto `./storage/media`). |
| `ADMIN_EMAIL` | Email con el que entrás al panel. |
| `ADMIN_PASSWORD_HASH` | Hash de tu contraseña (`npm run admin:hash`). La contraseña nunca se guarda en texto plano. |
| `SESSION_SECRET` | Cadena aleatoria de 32+ caracteres (comando en `.env.example`). |

`.env.local`, la base de datos (`data/`), los archivos subidos (`storage/`) y los backups (`backups/`) están en `.gitignore`: **nunca se suben al repositorio**.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` + `npm start` | Compilación y servidor de producción. |
| `npm run typecheck` | Verificación de tipos. |
| `npm run db:seed` | Carga contenido de ejemplo (solo sobre una base vacía). |
| `npm run admin:hash -- "…"` | Genera el hash de la contraseña del panel. |
| `npm run backup` | Copia base de datos y archivos a `backups/AAAA-MM-DD-…/`. |

## Documentación

- `docs/01-auditoria-fase-1.md`: auditoría de referencias.
- `docs/02-plan-y-decisiones.md`: plan, **registro de decisiones**, resultados de QA y pendientes.
- `docs/03-arquitectura.md`: stack, modelo de datos, seguridad y backups.
- `docs/04-guia-del-panel.md`: cómo administrar el contenido.
- `docs/05-despliegue.md`: opciones de hosting y dominio propio (requiere tu aprobación antes de generar costos).
