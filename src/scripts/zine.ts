/* Libro que se hojea (src/components/Zine.astro).
   - Con la sección fijada (movimiento permitido): el estado es función del scroll. Cada hoja gira en su tramo
     y entre una y otra hay una pausa, así cada doble se puede leer. Recargar a mitad de camino deja el libro en su página.
   - Sin fijar (reducir movimiento, pantallas muy bajas): se hojea con los botones; con «reducir movimiento», sin animación.
   - Botones, clic sobre la página (derecha avanza, izquierda vuelve) y flechas ← → con el lector en pantalla.
   - Cada hoja que cae hacia adelante avisa a la partitura de sonido (portfolio:page). */

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const pad = (k: number) => String(k).padStart(2, '0');

type Lenis = { scrollTo: (y: number, o?: Record<string, unknown>) => void };

function init(z: HTMLElement) {
  const book = z.querySelector<HTMLElement>('[data-zb]');
  if (!book) return;
  const leaves = [...book.querySelectorAll<HTMLElement>('.zb__leaf')];
  const n = leaves.length;
  const max = clamp(Number(z.dataset.max) || n, 1, n);
  // Tramo final (página del proyecto): después de la última doble el libro se hunde y quedan las frases de cierre
  const END = Number(z.dataset.end) || 0;
  const total = max + END;
  const world = z.dataset.zine === 'case'; // el lector maneja el acuario: se oscurece y se vacía a medida que se hojea
  const html = document.documentElement;
  const track = z.closest<HTMLElement>('[data-zine-track]');
  const pin = track?.querySelector<HTMLElement>('[data-zine-pin]') ?? null;
  const caps = [...z.querySelectorAll<HTMLElement>('[data-zb-cap]')];
  const count = z.querySelector<HTMLElement>('[data-zb-count]');
  const btnPrev = z.querySelector<HTMLButtonElement>('.zb-nav [data-zb-go="-1"]');
  const btnNext = z.querySelector<HTMLButtonElement>('.zb-nav [data-zb-go="1"]');
  const hitPrev = book.querySelector<HTMLElement>('.zb__hit--prev');
  const hitNext = book.querySelector<HTMLElement>('.zb__hit--next');
  const side = leaves.map(() => false); // hoja i del lado izquierdo (pasada)

  /** Fijada = el estado lo maneja el scroll */
  const pinned = () => !!pin && !!track && getComputedStyle(pin).position === 'sticky';
  const span = () => Math.max(1, track!.offsetHeight - pin!.clientHeight);
  const progress = () => clamp(-track!.getBoundingClientRect().top / span());

  let pos = 0; // posición mostrada (0 … max, continua)
  let target = 0; // destino en modo botones
  let state = -1; // doble asentada

  function render(raw: number, scrolled: boolean) {
    const p = Math.min(raw, max);
    const end = END ? clamp((raw - max) / END) : 0;
    z.style.setProperty('--end', end.toFixed(3));
    if (world) {
      html.style.setProperty('--depth', clamp(raw / total).toFixed(3));
      html.style.setProperty('--end', end.toFixed(3));
    }
    const turning: number[] = [];
    leaves.forEach((leaf, i) => {
      const u = p - i;
      // Por scroll, cada hoja gira en el centro de su tramo: antes y después, el libro queda quieto
      const t = scrolled ? ease(clamp((u - 0.16) / 0.68)) : ease(clamp(u));
      leaf.style.setProperty('--t', t.toFixed(4));
      leaf.style.setProperty('--lift', Math.sin(Math.PI * t).toFixed(3));
      const moving = t > 0.001 && t < 0.999;
      if (moving) turning.push(i);
      leaf.style.zIndex = String(moving ? 2 * n + 2 : t >= 0.5 ? i + 1 : 2 * n - i);
      const left = t >= 0.5;
      if (left !== side[i]) {
        side[i] = left;
        dispatchEvent(new CustomEvent('portfolio:page', { detail: { i, dir: left ? 1 : -1 } }));
      }
    });
    // Abrir la tapa corre el libro: cerrado, la tapa queda centrada; abierto, el lomo va al centro
    const open = Number(leaves[0].style.getPropertyValue('--t')) || 0;
    book!.style.setProperty('--shift', (-25 * (1 - open)).toFixed(3));
    book!.style.setProperty('--open', open.toFixed(3));
    book!.classList.toggle('is-turning', turning.length > 0);
    const s = side.filter(Boolean).length;
    if (s !== state) {
      state = s;
      z.dataset.state = String(s);
      if (world) html.dataset.zstate = String(s);
      caps.forEach((c) => c.toggleAttribute('data-on', Number(c.dataset.zbCap) === s));
      if (count) count.textContent = s === 0 ? 'Tapa' : pad(s);
      if (btnPrev) btnPrev.disabled = s <= 0;
      if (btnNext) btnNext.disabled = s >= max;
      if (hitPrev) hitPrev.hidden = s <= 0;
      if (hitNext) hitNext.hidden = s >= max;
    }
  }

  /* ---------- Bucle (solo mientras hace falta) ---------- */
  let raf = 0;
  let last = 0;
  function frame(now: number) {
    raf = 0;
    const pin = pinned();
    z.classList.toggle('is-pinned', pin);
    if (pin) {
      pos = progress() * total;
      render(pos, true);
      return;
    }
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (calm) pos = target;
    else pos += (target - pos) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - pos) < 0.002) pos = target;
    render(pos, false);
    if (pos !== target) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  /** Ir a una doble: por scroll si está fijada, si no, girando las hojas */
  function go(k: number) {
    k = clamp(Math.round(k), 0, max);
    if (pinned()) {
      const y = scrollY + track!.getBoundingClientRect().top + span() * (k / total);
      const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
      if (lenis) lenis.scrollTo(y, { duration: 1.1, force: true });
      else scrollTo({ top: y, behavior: calm ? 'auto' : 'smooth' });
    } else {
      target = k;
      kick();
    }
  }
  z.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-zb-go]');
    if (!b || (b as HTMLButtonElement).disabled) return;
    go(Math.max(0, state) + Number(b.dataset.zbGo));
  });
  // Flechas del teclado: solo en el lector a pantalla completa y cuando está a la vista
  if (z.dataset.zine === 'case') {
    addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], dialog[open]')) return;
      const r = book!.getBoundingClientRect();
      if (r.bottom < innerHeight * 0.3 || r.top > innerHeight * 0.7) return;
      e.preventDefault();
      go(Math.max(0, state) + (e.key === 'ArrowRight' ? 1 : -1));
    });
  }

  // Las páginas de adentro se precargan cuando el libro se acerca: al hojear (o saltar) ya están listas
  const imgs = [...book.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')];
  const preload = () => imgs.forEach((im) => (im.loading = 'eager'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        preload();
        io.disconnect();
      }
    }, { rootMargin: '150% 0px' });
    io.observe(track ?? z);
  } else preload();

  addEventListener('scroll', () => pinned() && kick(), { passive: true });
  addEventListener('resize', kick);
  // Estado inicial sin sonido: lo que ya está pasado al cargar (recarga a mitad de página) no «suena»
  z.classList.toggle('is-pinned', pinned());
  pos = target = pinned() ? progress() * total : 0;
  leaves.forEach((_, i) => (side[i] = (pinned() ? ease(clamp((Math.min(pos, max) - i - 0.16) / 0.68)) : 0) >= 0.5));
  render(pos, pinned());
  z.classList.add('is-ready');
}

document.querySelectorAll<HTMLElement>('[data-zine]').forEach(init);
export {};
