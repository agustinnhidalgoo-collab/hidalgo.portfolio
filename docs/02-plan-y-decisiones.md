# HIDALGO — Plan de trabajo y registro de decisiones

## Estado de fases

| Fase | Estado |
|---|---|
| 1 · Auditoría | ✅ Entregada: `docs/01-auditoria-fase-1.md` |
| 2 · Dirección de arte | ⏳ Espera respuestas del bloque A |
| 3 · Arquitectura | 🔒 Requiere aprobar la Fase 2 |
| 4 · Implementación | 🔒 Requiere aprobar el stack |
| 5 · Calidad | 🔒 |
| 6 · Entrega | 🔒 No se despliega ni se generan gastos sin aprobación |

## Plan por fase (resumen)

- **Fase 2:** 2 rutas visuales derivadas de las referencias, con tipografía, paleta, grilla y motion. Wireframes de Home, Work, Proyecto, About y Panel como página navegable privada. Se elige una ruta y se cierra el sistema.
- **Fase 3:** propuesta de stack con costos. La opción de partida se cierra en la Fase 3; la tendencia es una sola app (framework web con renderizado en servidor), base de datos gestionada, almacenamiento de objetos para medios y autenticación de un solo administrador. Se incluyen modelo de datos (proyectos, bloques, traducciones y estados), backups y variables de entorno.
- **Fase 4:** sistema visual → páginas públicas → panel y persistencia → i18n → motion → optimización. Hitos con demo verificable.
- **Fase 5:** checklist de QA con resultados reales.
- **Fase 6:** README, `.env.example`, guía del panel, backup y despliegue con dominio propio.

## Registro de decisiones

| # | Decisión | Estado | Origen |
|---|---|---|---|
| D1 | Nombre: HIDALGO — Graphic Designer | Confirmado | Hidalgo |
| D2 | Bilingüe ES/EN con traducciones administrables | Confirmado | Hidalgo |
| D3 | Panel privado con editor por bloques, borradores y vista previa | Confirmado | Hidalgo |
| D4 | Cursor personalizado con alternativa nativa; respetar `prefers-reduced-motion` | Confirmado | Hidalgo |
| D5 | Paleta derivada de refs: rojo plano + negro + blanco roto | **Propuesto** | Auditoría §3 |
| D6 | Lenguaje duro/editorial (sin redondeos SaaS de R1) | **Propuesto** | Auditoría §4 |
| D7 | Una familia display variable (ancho + peso) + una de texto | **Propuesto** | Auditoría §4 |
| D8 | Concepto “Registro en movimiento” | **Propuesto** | Auditoría §6 |
| D9 | No usar logos ni clientes ni textos de terceros presentes en las refs | Regla | Prompt |
