# HIDALGO — Plan de trabajo y registro de decisiones

## Estado

- ✅ Diseño y sitio completos, con contenido de ejemplo.
- ✅ **Simplificado a sitio estático** (2026-09-27, pedido de Hidalgo): sin panel, sin base de datos, sin servicios.
- ⏳ Publicar en Vercel gratis (`docs/05-publicar-gratis.md`). Lo hace Hidalgo con su cuenta.
- ⏳ Cargar el contenido real (`docs/04-como-actualizar.md`).

## Registro de decisiones

| # | Decisión | Estado | Origen |
|---|---|---|---|
| D1 | Nombre: HIDALGO — Graphic Designer | Confirmado | Hidalgo |
| D2 | Bilingüe ES/EN con traducciones administrables | Confirmado | Hidalgo |
| D3 | ~~Panel privado con editor por bloques~~ → reemplazado por D15 | Descartado | Hidalgo |
| D4 | Cursor personalizado con alternativa nativa; respetar `prefers-reduced-motion` | Confirmado | Hidalgo |
| D5 | **Paleta: Whipped Butter `#F2E6B3` + Cookie Crumble `#4B2E21`**. Reemplaza al rojo/negro propuesto en la Fase 1. Todo tono intermedio se deriva de estos dos. | **Confirmado** (2026-09-27) | Hidalgo |
| D6 | No hay brief escrito; la dirección sale de las 5 referencias + la paleta | Confirmado | Hidalgo |
| D7 | Prioridad: muy interactiva, cómoda de usar y que transmita calidad. Primero una base y después se carga el contenido real. | Confirmado | Hidalgo |
| D8 | Tipografía: **Archivo** variable (ancho + peso) como única familia, porque se parece a la grotesca pesada de la muestra de paleta y permite la interacción por ejes. | Propuesto (aplicado) | Dirección de arte |
| D9 | Concepto “Registro en movimiento”: marcas de registro, tipografía que se estira o comprime, secciones que alternan claro y oscuro, grano | Propuesto (aplicado) | Auditoría |
| D10 | Imágenes en listados con **duotono de la paleta**, que recuperan su color al pasar el cursor. Dentro del proyecto se ven en color real. | Propuesto (aplicado) | Dirección de arte |
| D11 | ~~Next.js + SQLite + disco~~ → sitio estático Next.js (D15) | Reemplazado | Arquitectura |
| D12 | Zona horaria del reloj por defecto: `America/Argentina/Buenos_Aires` (supuesto; editable en Ajustes) | **A confirmar** | Supuesto |
| D13 | Favicon provisorio: “H” en la paleta (hasta tener logo propio) | **A confirmar** | Supuesto |
| D14 | No usar logos, clientes ni textos de terceros presentes en las referencias | Regla | Prompt |
| D15 | **Sin panel de administración:** el objetivo es un portfolio para enviar. El contenido vive en `src/content/` y se actualiza cuando Hidalgo envía material. Reemplaza a D3 y D11. | **Confirmado** (2026-09-27) | Hidalgo |
| D17 | **Entrada inmersiva en la Home** (ref. Ethan Park enviada por Hidalgo): puerta cacao con HIDALGO calado; el scroll atraviesa las letras y se entra al “mundo”; roles escalonados; franja con intro y nombre gigante. El “mundo” será una foto editorial o un video de Hidalgo (**pendiente**); mientras tanto, fondo de estudio en la paleta. | Confirmado (dirección) | Hidalgo |
| D16 | Hosting **gratuito** en Vercel (plan Hobby), sin instalar Node | **Confirmado** (2026-09-27) | Hidalgo |

## Resultados de QA (versión estática, 2026-09-27)

- Build de producción: todas las páginas se generan de antemano (ES/EN, 5 proyectos).
- Rutas:
  - `/`, `/work` → redirigen a `/es`.
  - Proyectos inexistentes, `/admin` e idiomas no soportados → 404.
  - `sitemap.xml` y `robots.txt` → 200.
- Navegador (Chromium, escritorio y móvil táctil): 0 errores de consola y 0 imágenes rotas.
- Funcionan la vista previa al pasar el cursor, las transiciones y el menú móvil.
- QA de la versión anterior (con panel): ver el historial de git.
- **No verificado:** Lighthouse, lectores de pantalla, Safari/iOS y Firefox.

## Pendientes que necesito de Hidalgo

- [ ] Textos reales: intro, declaración, biografía (ES/EN), servicios, disciplinas.
- [ ] Proyectos reales con imágenes y videos en alta calidad.
- [ ] Email, enlaces (redes, Behance…), ubicación y disponibilidad.
- [ ] CV en PDF (ES y/o EN).
- [ ] Retrato (opcional).
- [ ] Confirmar la zona horaria (D12) y el favicon (D13), o enviar un logo propio.
- [ ] **Foto editorial o video corto** para la entrada de la Home (retrato con buena luz, vertical u horizontal).
- [ ] Crear la cuenta gratuita de Vercel y publicar (`docs/05-publicar-gratis.md`).
