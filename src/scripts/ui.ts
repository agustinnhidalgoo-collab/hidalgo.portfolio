/* Interacción mínima: índice (dialog nativo) y revelados por visibilidad. */

const dlg = document.getElementById('index-dialog') as HTMLDialogElement | null;
const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');

if (dlg && openBtn && typeof dlg.showModal === 'function') {
  openBtn.addEventListener('click', () => {
    dlg.showModal();
    openBtn.setAttribute('aria-expanded', 'true');
    dlg.querySelector<HTMLElement>('[data-menu-close]')?.focus();
  });
  dlg.addEventListener('close', () => {
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.focus();
  });
  dlg.querySelector('[data-menu-close]')?.addEventListener('click', () => dlg.close());
  // Un enlace del índice cierra el panel; la navegación sigue su curso.
  dlg.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => dlg.close()));
  // Clic fuera del contenido (sobre el propio <dialog>) también cierra.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}

const targets = document.querySelectorAll<HTMLElement>('.reveal, .mask, .wipe');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
  targets.forEach((t) => io.observe(t));
} else {
  targets.forEach((t) => t.classList.add('is-in'));
}

// Capa de movimiento: se carga aparte y solo si el usuario no pidió menos movimiento.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) import('./motion');

// Escena 3D (solo home). Se carga después del primer pintado; si falla, queda el diseño tipográfico.
if (document.getElementById('gl') && document.documentElement.classList.contains('gl-try')) {
  const boot = () =>
    import('./scene')
      .then((m) => m.startScene())
      .then((ok) => {
        const d = document.documentElement;
        if (ok) {
          d.classList.add('gl-on');
          dispatchEvent(new Event('resize'));
        }
        else d.classList.replace('gl-try', 'gl-fail');
      })
      .catch(() => document.documentElement.classList.replace('gl-try', 'gl-fail'));
  if ('requestIdleCallback' in window) (window as unknown as { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(boot);
  else setTimeout(boot, 200);
}
