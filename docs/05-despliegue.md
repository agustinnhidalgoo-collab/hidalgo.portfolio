# Despliegue con dominio propio

> **No se despliega nada ni se generan gastos sin tu aprobación.** Estas son las opciones para decidir.

El proyecto guarda la base y los archivos en disco, así que necesita un hosting con **almacenamiento persistente**.

| Opción | Qué es | Costo aprox. | Operación |
|---|---|---|---|
| **A. Railway / Render / Fly.io + volumen** (recomendada) | Plataforma que compila desde GitHub, con un disco persistente montado en `/data`. | ~5–10 USD/mes | Despliegue automático con cada push y SSL incluido. |
| B. VPS (Hetzner, DigitalOcean) | Servidor propio con Node + Caddy/Nginx. | ~5 USD/mes | Más control y más mantenimiento (actualizaciones, reinicios). |
| C. Vercel + Turso + Cloudflare R2 | Serverless sin disco. | 0–5 USD/mes | Requiere desarrollar primero el adaptador de almacenamiento R2 (pendiente). |

## Pasos (opción A, genérico)

1. Crear el servicio conectado al repositorio de GitHub.
2. Agregar un volumen persistente montado en `/data`.
3. Variables de entorno:
   ```
   SITE_URL=https://tudominio.com
   DATABASE_URL=file:/data/hidalgo.db
   MEDIA_DIR=/data/media
   ADMIN_EMAIL=…
   ADMIN_PASSWORD_HASH=…     (npm run admin:hash)
   SESSION_SECRET=…          (32+ caracteres aleatorios)
   ```
4. Comando de build: `npm run build`. Comando de inicio: `npm start`.
5. **Dominio propio:** en el panel del hosting, agregá el dominio. En tu registrador (donde lo compraste), creá el registro que te indiquen: normalmente un `CNAME` para `www` y un `A`/`ALIAS` para el dominio raíz. El certificado SSL se genera solo.
6. Entrá a `/admin`, cargá tu contenido y verificá `https://tudominio.com/sitemap.xml`.

## Backups en producción

- Ejecutá `npm run backup` desde la consola del servicio, o copiá `/data` completo.
- Guardá la copia fuera del servidor (disco externo o nube personal).
