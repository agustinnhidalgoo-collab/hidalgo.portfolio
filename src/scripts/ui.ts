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
      if (st.dataset.step !== step) {
        const prev = Number(st.dataset.step || 1);
        st.dataset.step = step;
        // El paso cambia con el scroll: suena hacia adelante o hacia atrás según el sentido
        dispatchEvent(new CustomEvent('portfolio:sfx', { detail: { cue: Number(step) > prev ? 'forward' : 'back' } }));
      }
    }
  };
  const req = () => {
    if (!tick) tick = requestAnimationFrame(update);
  };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  update();
}

/* ---------- Mundos: cada proyecto con 3D cambia el ambiente (fondo, cursor y sonido) ---------- */
type WorldName = 'studio' | 'cellar' | 'barber';
const ORDER: WorldName[] = ['studio', 'cellar', 'barber'];
const ENTER = document.getElementById('enter');
let enterT = 0;
let lastEnter = -1e9;
/** Cartel breve al cruzar a un mundo: «Entrando a la bodega». Decorativo, no bloquea y se omite con «reducir movimiento». */
function announce(w: 'cellar' | 'barber') {
  if (!ENTER || calm || !root.classList.contains('gl-try') || performance.now() - lastEnter < 4000) return;
  lastEnter = performance.now();
  const stage = document.querySelector<HTMLElement>(`.pstage[data-world="${w}"]`);
  const name = [...(stage?.querySelectorAll('.ptitle > span') ?? [])].map((t) => t.textContent).join(' ').trim();
  const [hand, title] = w === 'cellar' ? ['entrando a', 'La bodega'] : ['entrando a', 'La barbería'];
  (ENTER.querySelector('.enter__hand') as HTMLElement).textContent = hand;
  (ENTER.querySelector('.enter__title') as HTMLElement).textContent = title;
  (ENTER.querySelector('.enter__sub') as HTMLElement).textContent = name;
  ENTER.dataset.w = w;
  ENTER.classList.remove('is-on');
  void ENTER.offsetWidth; // reinicia la animación
  ENTER.classList.add('is-on');
  window.clearTimeout(enterT);
  enterT = window.setTimeout(() => ENTER.classList.remove('is-on'), 1900);
}
const worldEls = [...document.querySelectorAll<HTMLElement>('.pstage[data-world]')];
if (worldEls.length) {
  let cur: WorldName = 'studio';
  let tick = 0;
  const update = () => {
    tick = 0;
    const vh = innerHeight;
    let w: WorldName = 'studio';
    let amt = 0;
    for (const el of worldEls) {
      const r = el.getBoundingClientRect();
      // presencia del mundo: entra al acercarse la sección y sale al alejarse (fundido, sin cortes)
      const a = Math.max(0, Math.min(1, (vh * 0.9 - r.top) / (vh * 0.7), (r.bottom - vh * 0.1) / (vh * 0.7)));
      if (a > amt) {
        amt = a;
        if (r.top < vh * 0.55 && r.bottom > vh * 0.45) w = el.dataset.world as WorldName;
      }
    }
    root.style.setProperty('--wa', amt.toFixed(3));
    if (w !== cur) {
      const from = cur;
      cur = w;
      root.dataset.world = w;
      if (w !== 'studio' && ORDER.indexOf(w) > ORDER.indexOf(from)) announce(w);
      dispatchEvent(new CustomEvent('portfolio:world', { detail: { world: w, from } }));
    }
  };
  const req = () => {
    if (!tick) tick = requestAnimationFrame(update);
  };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  update();
}

/* ---------- Sonido (opcional, apagado por defecto; se recuerda durante la sesión) ---------- */
const sndBtn = document.querySelector<HTMLButtonElement>('[data-sound-toggle]');
if (sndBtn && ('AudioContext' in window || 'webkitAudioContext' in window)) {
  const label = sndBtn.querySelector('.snd-btn__t');
  const paint = (on: boolean) => {
    sndBtn.setAttribute('aria-pressed', String(on));
    sndBtn.setAttribute('aria-label', on ? 'Sonido activado. Desactivar sonido' : 'Sonido desactivado. Activar sonido');
    if (label) label.textContent = on ? 'Sonido: sí' : 'Sonido: no';
  };
  let wanted = false;
  try {
    wanted = sessionStorage.getItem('portfolio:sound') === '1';
  } catch {
    /* sin almacenamiento */
  }
  paint(wanted);
  // Las operaciones se encadenan para que un clic rápido no compita con la activación pendiente
  let chain: Promise<unknown> = Promise.resolve();
  const apply = (on: boolean, silent = false) => {
    chain = chain.then(() => import('./sound').then((m) => m.setEnabled(on, { silent }))).catch(() => {});
    return chain;
  };
  if (wanted) {
    // El navegador exige un gesto para iniciar audio: se activa (sin sonido de aviso) con la primera interacción
    const first = () => {
      removeEventListener('pointerdown', first);
      removeEventListener('keydown', first);
      if (wanted) apply(true, true);
    };
    addEventListener('pointerdown', first, { once: true });
    addEventListener('keydown', first, { once: true });
  }
  sndBtn.addEventListener('click', () => {
    wanted = !wanted;
    paint(wanted);
    apply(wanted);
  });
  // Atajo: «M» silencia / activa (no interfiere con campos de texto ni con combinaciones de teclas)
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable]')) return;
    sndBtn.click();
  });
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
