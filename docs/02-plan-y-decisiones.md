# HIDALGO — Plan de trabajo y registro de decisiones

## Estado de fases

| Fase | Estado |
|---|---|
| 1 · Auditoría | ✅ `docs/01-auditoria-fase-1.md` |
| 2 · Dirección de arte | ✅ Paleta confirmada por Hidalgo; el resto se validó sobre la base navegable |
| 3 · Arquitectura | ✅ `docs/03-arquitectura.md`: todo local, sin cuentas ni costos |
| 4 · Implementación | ✅ Base completa con contenido de ejemplo · ⏳ Falta cargar el contenido real |
| 5 · Calidad | 🟡 Primera ronda hecha (ver abajo) · Falta una ronda con contenido real |
| 6 · Entrega | 🟡 README y guías listos · Despliegue **pendiente de aprobación** (`docs/05-despliegue.md`) |

## Registro de decisiones

| # | Decisión | Estado | Origen |
|---|---|---|---|
| D1 | Nombre: HIDALGO — Graphic Designer | Confirmado | Hidalgo |
| D2 | Bilingüe ES/EN con traducciones administrables | Confirmado | Hidalgo |
| D3 | Panel privado con editor por bloques, borradores y vista previa | Confirmado | Hidalgo |
| D4 | Cursor personalizado con alternativa nativa; respetar `prefers-reduced-motion` | Confirmado | Hidalgo |
| D5 | **Paleta: Whipped Butter `#F2E6B3` + Cookie Crumble `#4B2E21`**. Reemplaza al rojo/negro propuesto en la Fase 1. Todo tono intermedio se deriva de estos dos. | **Confirmado** (2026-09-27) | Hidalgo |
| D6 | No hay brief escrito; la dirección sale de las 5 referencias + la paleta | Confirmado | Hidalgo |
| D7 | Prioridad: muy interactiva, cómoda de usar y que transmita calidad. Primero una base y después se carga el contenido real. | Confirmado | Hidalgo |
| D8 | Tipografía: **Archivo** variable (ancho + peso) como única familia, porque se parece a la grotesca pesada de la muestra de paleta y permite la interacción por ejes. | Propuesto (aplicado) | Dirección de arte |
| D9 | Concepto “Registro en movimiento”: marcas de registro, tipografía que se estira o comprime, secciones que alternan claro y oscuro, grano | Propuesto (aplicado) | Auditoría |
| D10 | Imágenes en listados con **duotono de la paleta**, que recuperan su color al pasar el cursor. Dentro del proyecto se ven en color real. | Propuesto (aplicado) | Dirección de arte |
| D11 | Stack local sin servicios externos: Next.js + SQLite/libSQL + disco | Propuesto (aplicado) | Arquitectura |
| D12 | Zona horaria del reloj por defecto: `America/Argentina/Buenos_Aires` (supuesto; editable en Ajustes) | **A confirmar** | Supuesto |
| D13 | Favicon provisorio: “H” en la paleta (hasta tener logo propio) | **A confirmar** | Supuesto |
| D14 | No usar logos, clientes ni textos de terceros presentes en las referencias | Regla | Prompt |

## Resultados de QA (2026-09-27, ejecutados de verdad)

**Flujo completo del panel contra el servidor de producción (22/22 pasaron):**
- Login incorrecto → rechazado.
- Login sin Origin → 403.
- Login correcto → cookie `HttpOnly`.
- Crear proyecto.
- Subir un archivo falso → rechazado por firma binaria.
- Subir una imagen → se generan variantes 480/960/1440/1800.
- Guardar borrador.
- Slug inválido → rechazado.
- Proyecto no publicado → 404 público.
- Vista previa con sesión → 200.
- Publicar → 200 público.
- `<script>` y `javascript:` inyectados → no aparecen en el HTML.
- Editar tras publicar → el público mantiene la versión publicada y la vista previa muestra la edición.
- Descartar cambios.
- Destacar → aparece en la Home.
- Borrar un medio en uso → 409 con la lista de dónde se usa.
- Despublicar → 404.
- Rango HTTP → 206.
- Eliminar proyecto.
- Borrado forzado del medio → se borran todas sus variantes.
- Email inválido en Ajustes → rechazado.
- Logout → 401.

**Rutas:**
- `/` → `/es`.
- `/admin` y `/es/preview/*` sin sesión → login.
- `/api/admin/*` sin sesión → 401.
- Intentos de salir de la carpeta en `/media` → 404.
- Borrador `/es/work/proyecto-ejemplo-05` → 404.
- `sitemap.xml` y `robots.txt` → 200.

**Navegador (Chromium, escritorio 1440 px y móvil 390 px táctil):**
- Sin errores de consola.
- Transición de página funcionando.
- Filtro de categorías funcionando.
- Menú móvil funcionando.
- Palabra cinética reaccionando al cursor.
- Editor: aviso “Sin guardar”, Ctrl+S guarda, diálogo de confirmación al eliminar.
- Con `prefers-reduced-motion: reduce`: sin precarga, 0 elementos ocultos y cursor nativo.

**Corregido durante el QA:**
- El header tomaba el color de la precarga.
- Interlineado de la introducción.
- El footer no animaba.
- Acentos recortados por la máscara de líneas.
- Índice en móvil.
- Botones del panel con texto invisible.
- `$` del hash de contraseña expandido por el cargador de `.env`.

**No verificado todavía:**
- Lighthouse (rendimiento y SEO).
- Lectores de pantalla reales.
- Safari/iOS y Firefox.
- Subida de videos grandes.
- Contraste con fotos reales.

## Pendientes que necesito de Hidalgo

- [ ] Textos reales: intro, declaración, biografía (ES/EN), servicios, disciplinas.
- [ ] Proyectos reales con imágenes y videos en alta calidad.
- [ ] Email, enlaces (redes, Behance…), ubicación y disponibilidad.
- [ ] CV en PDF (ES y/o EN).
- [ ] Retrato (opcional).
- [ ] Confirmar la zona horaria (D12) y el favicon (D13), o enviar un logo propio.
- [ ] Elegir la opción de hosting y el dominio (`docs/05-despliegue.md`). **No se contrata nada sin aprobación.**
