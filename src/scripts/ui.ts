/* Interacción base (siempre disponible): índice accesible, revelados y pasos de los tramos 3D. */

const root = document.documentElement;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Paneles modales (menú en pantallas angostas y «Sobre mí»): <dialog> con foco atrapado,
   Escape, clic afuera y retorno del foco. El scroll suave se pausa mientras están abiertos. ---------- */
function modal(dlg: HTMLDialogElement | null, closeSel: string) {
  if (!dlg || typeof dlg.showModal !== 'function') return null;
  let opener: HTMLElement | null = null;
  let restoreFocus = true;
  dlg.addEventListener('close', () => {
    opener?.setAttribute('aria-expanded', 'false');
    dispatchEvent(new CustomEvent('portfolio:modal', { detail: false }));
    if (restoreFocus) opener?.focus();
  });
  dlg.querySelector(closeSel)?.addEventListener('click', () => dlg.close());
  // Un enlace del panel lo cierra y deja seguir la navegación (el foco lo mueve el destino)
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
  return (from: HTMLElement | null) => {
    if (dlg.open) return;
    opener = from;
    restoreFocus = true;
    dlg.showModal();
    from?.setAttribute('aria-expanded', 'true');
    dispatchEvent(new CustomEvent('portfolio:modal', { detail: true }));
    dlg.querySelector<HTMLElement>(closeSel)?.focus();
  };
}

const openMenu = modal(document.getElementById('index-dialog') as HTMLDialogElement | null, '[data-menu-close]');
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
if (openMenu && menuBtn) menuBtn.addEventListener('click', () => openMenu(menuBtn));

// «Sobre mí»: sin JS el enlace lleva a /sobre-mi; con JS abre el panel encima de lo que se está viendo
const openAbout = modal(document.getElementById('about-panel') as HTMLDialogElement | null, '[data-about-close]');
if (openAbout) {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLElement>('[data-about-open]');
    if (!a || (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey || (e as MouseEvent).shiftKey) return;
    e.preventDefault();
    // Desde el menú (pantallas angostas): el menú se cierra primero y el foco vuelve a su botón
    openAbout(a.closest('dialog') ? menuBtn : a);
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

/* ---------- Tramo de cada mundo: 1 = la pieza se arma, 2 = gira (suena hacia adelante o atrás) ---------- */
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
      const step = p < 0.55 ? '1' : '2';
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
type WorldName = 'studio' | 'cellar' | 'barber' | 'press';
const ORDER: WorldName[] = ['studio', 'cellar', 'barber', 'press'];
const ENTER = document.getElementById('enter');
let enterT = 0;
let lastEnter = -1e9;
/** Cartel breve al cruzar a un mundo: «Entrando a la bodega». Decorativo, no bloquea y se omite con «reducir movimiento». */
function announce(w: Exclude<WorldName, 'studio'>) {
  if (!ENTER || calm || !root.classList.contains('gl-try') || performance.now() - lastEnter < 4000) return;
  lastEnter = performance.now();
  const stage = document.querySelector<HTMLElement>(`.pstage[data-world="${w}"]`);
  const name = [...(stage?.querySelectorAll('.ptitle > span') ?? [])].map((t) => t.textContent).join(' ').trim();
  const title = { cellar: 'La bodega', barber: 'La barbería', press: 'La imprenta' }[w];
  const hand = 'entrando a';
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

/* ---------- Portada como escena ----------
   La pantalla queda fijada y el scroll avanza la escena: --p (0 → 1) mueve los textos por CSS, «Sobre mí» se
   revela palabra por palabra y la escena 3D lleva al avatar a su segundo lugar. Sin 3D no hay escena fijada. */
const intro = document.querySelector<HTMLElement>('.intro');
let introP = 0;
if (intro) {
  const words = [...intro.querySelectorAll<HTMLElement>('.intro__bio .w')];
  let raf = 0;
  const update = () => {
    raf = 0;
    const r = intro.getBoundingClientRect();
    const span = Math.max(1, r.height - innerHeight);
    introP = Math.min(1, Math.max(0, -r.top / span));
    intro.style.setProperty('--p', introP.toFixed(4));
    intro.classList.toggle('is-about', introP > 0.55);
    // Palabra por palabra entre el 42 % y el 85 % del recorrido (cada una aparece en su propio tramo)
    const q = ((introP - 0.42) / 0.43) * (words.length + 4);
    words.forEach((w, i) => w.style.setProperty('--o', (0.14 + 0.86 * Math.min(1, Math.max(0, q - i))).toFixed(3)));
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();

  // Rueda de disciplinas: arriba la anterior (contorno), abajo la actual; gira sola cada 2,6 s
  const wheel = intro.querySelector<HTMLElement>('.intro__wheel');
  if (wheel) {
    const items = [...wheel.children] as HTMLElement[];
    const n = items.length / 3;
    let k = n - 1; // arriba la última, abajo la primera
    const paint = () => {
      wheel.style.setProperty('--k', String(k));
      items.forEach((el, i) => el.classList.toggle('is-on', i === k + 1));
    };
    paint();
    if (!calm) {
      setInterval(() => {
        if (document.hidden || introP > 0.3) return;
        k++;
        paint();
        if (k >= 2 * n - 1) {
          // vuelta completa: se salta a la copia equivalente sin animación (no se nota)
          setTimeout(() => {
            wheel.classList.add('is-reset');
            k -= n;
            paint();
            void wheel.offsetHeight;
            wheel.classList.remove('is-reset');
          }, 750);
        }
      }, 2600);
    }
  }
}

/* ---------- Guiño del avatar: un gesto, no un tic ----------
   Al entrar con el puntero a la cara o al tocarla. La cara está en el recuadro del avatar que corresponde al
   momento de la escena (al centro, o a la izquierda con «Sobre mí»). Con 3D lo dibuja la escena. */
const winkEl = document.querySelector<HTMLElement>('[data-wink]');
const winkTo = document.querySelector<HTMLElement>('[data-wink-to]');
if (winkEl) {
  let lastWink = 0;
  let tid = 0;
  const wink = () => {
    const now = performance.now();
    if (now - lastWink < 1200) return;
    lastWink = now;
    dispatchEvent(new CustomEvent('portfolio:wink'));
    winkEl.classList.add('is-wink');
    clearTimeout(tid);
    tid = window.setTimeout(() => winkEl.classList.remove('is-wink'), 380);
  };
  // La cara ocupa la franja central y superior del recuadro del avatar
  const onFace = (x: number, y: number) => {
    const box = winkTo && root.classList.contains('gl-on') && introP > 0.45 ? winkTo : introP < 0.2 ? winkEl : null;
    if (!box) return false;
    const r = box.getBoundingClientRect();
    if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) return false;
    const u = (x - r.left) / r.width, v = (y - r.top) / r.height;
    return u > 0.28 && u < 0.72 && v > 0.02 && v < 0.68;
  };
  let inside = false;
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      const now = onFace(e.clientX, e.clientY);
      if (now && !inside) wink();
      inside = now;
    },
    { passive: true },
  );
  addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch' && onFace(e.clientX, e.clientY)) wink();
    },
    { passive: true },
  );
}

/* ---------- Contacto ----------
   · El avatar mira la opción que señalás (puntero o teclado) y te guiña al elegir una.
   · El email se copia con un clic (con aviso accesible).
   · WhatsApp, la acción principal, se acerca apenas al cursor. */
const contactEl = document.getElementById('contacto');
if (contactEl) {
  const look = (el: Element | null) => dispatchEvent(new CustomEvent('portfolio:look', { detail: { el } }));
  contactEl.querySelectorAll<HTMLElement>('[data-look]').forEach((el) => {
    el.addEventListener('pointerenter', () => look(el));
    el.addEventListener('pointerleave', () => look(null));
    el.addEventListener('focus', () => look(el));
    el.addEventListener('blur', () => look(null));
  });
  contactEl.querySelectorAll<HTMLAnchorElement>('.contact__body a').forEach((a) =>
    a.addEventListener('click', () => dispatchEvent(new CustomEvent('portfolio:nod'))),
  );
  // WhatsApp señalado: el teléfono suena (ondas junto al teléfono; la vibración la dibuja la escena)
  contactEl.querySelectorAll<HTMLElement>('[data-ring]').forEach((el) => {
    const on = (v: boolean) => {
      // el teléfono vibra (sonido) solo al empezar a sonar, no mientras sigue señalado
      if (v && !contactEl.classList.contains('is-ringing')) dispatchEvent(new CustomEvent('portfolio:ring'));
      contactEl.classList.toggle('is-ringing', v);
    };
    el.addEventListener('pointerenter', () => on(true));
    el.addEventListener('pointerleave', () => on(false));
    el.addEventListener('focus', () => on(true));
    el.addEventListener('blur', () => on(false));
  });

  const toast = contactEl.querySelector<HTMLElement>('.contact__toast');
  let toastT = 0;
  contactEl.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    const label = btn.querySelector<HTMLElement>('.contact__copy-t');
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy || '';
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        // sin permiso de portapapeles (navegadores embebidos, http): selección temporal
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.append(ta);
        ta.select();
        try {
          ok = (document as unknown as { execCommand: (c: string) => boolean }).execCommand('copy');
        } catch {
          ok = false; // el aviso muestra el email para copiarlo a mano
        }
        ta.remove();
      }
      if (toast) {
        toast.textContent = ok ? `Email copiado: ${text}` : `No se pudo copiar. El email es ${text}`;
        toast.classList.add('is-on');
      }
      if (ok) {
        btn.classList.add('is-done');
        if (label) label.textContent = 'Copiado';
        dispatchEvent(new CustomEvent('portfolio:nod'));
        dispatchEvent(new CustomEvent('portfolio:copied'));
      }
      clearTimeout(toastT);
      toastT = window.setTimeout(() => {
        toast?.classList.remove('is-on');
        btn.classList.remove('is-done');
        if (label) label.textContent = 'Copiar';
      }, 2200);
    });
  });

  const magnet = contactEl.querySelector<HTMLElement>('[data-magnet]');
  if (magnet && !calm && matchMedia('(pointer: fine)').matches) {
    addEventListener(
      'pointermove',
      (e) => {
        const r = magnet.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const reach = Math.max(r.width, r.height) * 0.75;
        const near = Math.hypot(dx / (r.width / 2 + reach), dy / (r.height / 2 + reach));
        const k = near < 1 ? (1 - near) * 0.5 : 0;
        magnet.style.setProperty('--mx', `${(dx * k * 0.18).toFixed(1)}px`);
        magnet.style.setProperty('--my', `${(dy * k * 0.3).toFixed(1)}px`);
      },
      { passive: true },
    );
  }
}

/* ---------- Botonera de habilidades (3D): se carga al acercarse; con «reducir movimiento» queda la grilla HTML ---------- */
document.querySelectorAll<HTMLElement>('.skills').forEach((el) => {
  if (calm) return;
  let started = false;
  const start = () => {
    if (started) return;
    const r = el.getBoundingClientRect();
    if (r.top > innerHeight + 700 || r.bottom < -700) return; // todavía lejos
    started = true;
    removeEventListener('scroll', start);
    import('./keys').then((m) => m.startKeys(el)).catch(() => {});
  };
  addEventListener('scroll', start, { passive: true });
  start();
});
