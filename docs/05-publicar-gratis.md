# Publicar el portfolio gratis

**Costo: 0.** Plan Hobby de Vercel, sin tarjeta. No hace falta instalar nada.

## Pasos

1. Entrar a **vercel.com**, elegir **Sign Up**, luego **Hobby**, y **Continue with GitHub**, con la misma cuenta de GitHub donde está este repositorio.
2. Botón **Add New… → Project**. Si no aparece el repositorio `hidalgo.portfolio`, usar **Adjust GitHub App Permissions** y darle acceso.
3. **Import** en `hidalgo.portfolio`. Vercel detecta Next.js solo: no hay que tocar ninguna configuración.
4. (Solo mientras la versión final esté en la rama de trabajo) En **Settings → Git → Production Branch**, poner `claude/hidalgo-designer-portfolio-nisasj`. Lo recomendable es fusionar esa rama en `main`, y entonces no hace falta este paso.
5. **Deploy.** En uno o dos minutos queda un enlace del tipo `hidalgo-portfolio.vercel.app`: ese es el que se envía.

Cada vez que se sube un cambio al repositorio, Vercel vuelve a publicar solo.

## Nombre del enlace

En **Settings → Domains** se puede cambiar el subdominio gratuito por otro disponible, por ejemplo `hidalgo-design.vercel.app`.

## Dominio propio (opcional, pago aparte)

Un dominio como `hidalgo.com` cuesta unos 10–15 USD por año en cualquier registrador. Se agrega en **Settings → Domains** siguiendo las instrucciones de Vercel. El certificado HTTPS es gratis.

## Límites del plan gratuito

- Es para uso personal y no comercial: un portfolio personal entra.
- El tráfico incluido alcanza de sobra para un portfolio.
- La optimización de imágenes tiene una cuota mensual gratuita suficiente para este caso.
