/* Interacción base (siempre disponible): índice accesible, revelados y pasos de los tramos 3D. */

const root = document.documentElement;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Índice (menú): <dialog> modal con foco atrapado, Escape y retorno del foco ---------- */
const dlg = document.getElementById('index-dialog') as HTMLDialogElement | null;
const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');

if (dlg && openBtn && typeof dlg.showModal === 'function') {
  let restoreFocus = true;
  openBtn.addEventListener('click', () => {
    restoreFocus = true;
    dlg.showModal();
    openBtn.setAttribute('aria-expanded', 'true');
    dlg.querySelector<HTMLElement>('[data-menu-close]')?.focus();
  });
  dlg.addEventListener('close', () => {
    openBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) openBtn.focus();
  });
  dlg.querySelector('[data-menu-close]')?.addEventListener('click', () => dlg.close());
  // Un enlace del índice cierra el panel y deja seguir la navegación (el foco lo mueve el destino)
  dlg.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      restoreFocus = false;
      dlg.close();
    }),
  );
  // Clic fuera del contenido (sobre el propio <dialog>) también cierra.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
}

/* ---------- Revelados por visibilidad (una vez) ---------- */
const targets = document.querySelectorAll<HTMLElement>('.reveal, .mask, .wipe, [data-clip]');
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

/* ---------- Paso activo de cada tramo fijado (solo texto: no depende de la escena) ---------- */
const stages = [...document.querySelectorAll<HTMLElement>('.pstage')];
if (stages.length) {
  let tick = 0;
  const update = () => {
    tick = 0;
    if (!root.classList.contains('gl-try')) return;
    for (const st of stages) {
      const pin = st.querySelector<HTMLElement>('.pstage__pin');
      if (!pin || getComputedStyle(pin).position !== 'sticky') continue;
      const r = st.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - pin.clientHeight)));
      const step = p < 0.34 ? '1' : p < 0.68 ? '2' : '3';
      if (st.dataset.step !== step) st.dataset.step = step;
    }
  };
  const req = () => {
    if (!tick) tick = requestAnimationFrame(update);
  };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  update();
}

/* ---------- Capa de movimiento: se carga aparte y solo si el usuario no pidió menos movimiento ---------- */
if (!calm) import('./motion');

/* ---------- Escena 3D (solo home): tras el primer pintado; si falla, queda la versión con fotos ---------- */
if (document.getElementById('gl') && root.classList.contains('gl-try')) {
  const fail = () => root.classList.replace('gl-try', 'gl-fail');
  const boot = () =>
    import('./scene')
      .then((m) => m.startScene())
      .then((ok) => {
        if (!ok) fail();
      })
      .catch(fail);
  if ('requestIdleCallback' in window) (window as unknown as { requestIdleCallback: (f: () => void, o?: { timeout: number }) => void }).requestIdleCallback(boot, { timeout: 1200 });
  else setTimeout(boot, 200);
}
