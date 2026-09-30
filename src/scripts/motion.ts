/* Capa de movimiento: scroll con inercia (Lenis) + efectos ligados al scroll propios.
   Solo se carga con movimiento permitido. Sin ella, el contenido queda estático y completo.
   Todo trabaja «bajo demanda»: sin interacción ni scroll no hay ningún bucle en marcha. */
import Lenis from 'lenis';

const root = document.documentElement;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends HTMLElement>(s: string, c: ParentNode = document) => c.querySelector<T>(s);
const $$ = <T extends HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll<T>(s)];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- Scroll con inercia (el scroll sigue siendo nativo: teclado, rueda, táctil, barra) ---------- */
const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95, anchors: false, autoRaf: false });
(window as unknown as { __lenis: Lenis }).__lenis = lenis; // gancho para pruebas de QA

let raf = 0;
let quiet = 0;
const loop = (t: number) => {
  raf = 0;
  lenis.raf(t);
  if (lenis.isScrolling || Math.abs(lenis.velocity) > 0.01) quiet = 0;
  if (++quiet < 60) raf = requestAnimationFrame(loop); // ~1 s de margen y se detiene
};
const wake = () => {
  quiet = 0;
  if (!raf) raf = requestAnimationFrame(loop);
};
['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown', 'scroll', 'resize'].forEach((ev) => addEventListener(ev, wake, { passive: true }));
wake();

const dlg = document.getElementById('index-dialog') as HTMLDialogElement | null;
dlg?.addEventListener('close', () => lenis.start());
document.querySelector('[data-menu-open]')?.addEventListener('click', () => lenis.stop());

/* ---------- Anclas: desplazamiento suave hasta el destino y foco accesible ---------- */
const ease = (x: number) => 1 - Math.pow(1 - x, 4);
function goTo(hash: string, immediate = false) {
  const t = hash ? document.querySelector<HTMLElement>(hash) : null;
  if (!t) return false;
  wake();
  lenis.start(); // si el índice estaba abierto, Lenis sigue detenido: se reanuda antes de desplazar
  lenis.scrollTo(t, { duration: immediate ? 0 : 1.2, easing: ease, immediate, force: true, onComplete: () => focusTarget(t) });
  return true;
}
function focusTarget(t: HTMLElement) {
  if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
  t.focus({ preventScroll: true });
}
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target === '_blank' || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !url.hash) return;
  const same = url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');
  if (same && goTo(url.hash)) {
    e.preventDefault();
    history.pushState(null, '', url.hash);
  }
});
// Entrada directa con ancla (o recarga con ancla): esperar a que el layout esté asentado
if (location.hash) {
  addEventListener('load', () => requestAnimationFrame(() => goTo(location.hash, true)), { once: true });
}

/* ---------- Efectos ligados al scroll (un único manejador, medido por fotograma) ---------- */
function splitWords(el: HTMLElement) {
  const words = (el.textContent ?? '').split(/(\s+)/);
  el.textContent = '';
  const out: HTMLElement[] = [];
  for (const w of words) {
    if (/^\s+$/.test(w) || !w) {
      el.append(document.createTextNode(' '));
      continue;
    }
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    el.append(s);
    out.push(s);
  }
  return out;
}
const bar = $('.progress');
const heroInfo = $('.hero__info');
const hero = $('#inicio');
const manifestos = $$('[data-scrub]').map((el) => ({ el, words: $$('.line > span', el).flatMap((s) => splitWords(s)) }));
const parallax = $$('[data-parallax]').map((img) => ({ img, k: Number(img.dataset.parallax || 6), box: img.parentElement! }));
parallax.forEach(({ img }) => (img.style.scale = '1.12'));

let tick = 0;
function update() {
  tick = 0;
  const y = scrollY;
  const vh = innerHeight;
  if (bar) {
    const max = root.scrollHeight - vh;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;
  }
  // La información de la portada se retira antes de que la botella pase a su columna
  if (hero && heroInfo) {
    const p = clamp(y / (hero.offsetHeight * 0.3));
    heroInfo.style.opacity = String(1 - p);
    heroInfo.style.transform = `translateY(${-24 * p}px)`;
  }
  // Manifiesto: las palabras se «llenan» a medida que se lee
  for (const { el, words } of manifestos) {
    const r = el.getBoundingClientRect();
    const p = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.35));
    const n = Math.round(p * (words.length + 1));
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }
  // Parallax leve de imágenes
  for (const { img, k, box } of parallax) {
    const r = box.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    const p = clamp((vh - r.top) / (vh + r.height));
    img.style.translate = `0 ${(p - 0.5) * 2 * k}%`;
  }
}
const req = () => {
  if (!tick) tick = requestAnimationFrame(update);
};
addEventListener('scroll', req, { passive: true });
addEventListener('resize', req);
update();

/* ---------- Cursor con información (solo ratón; nunca sustituye la señal de «clicable») ---------- */
if (fine) {
  const cur = document.createElement('div');
  cur.className = 'cursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<div class="cursor__c"><span class="cursor__l"></span></div>';
  document.body.append(cur);
  const c = $('.cursor__c', cur)!;
  const l = $('.cursor__l', cur)!;
  let shown = false;
  addEventListener(
    'pointermove',
    (e) => {
      if (!shown) {
        shown = true;
        root.classList.add('has-cursor');
      }
      cur.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    },
    { passive: true },
  );
  document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
  document.addEventListener('mouseenter', () => shown && root.classList.add('has-cursor'));
  const state = (size: number, label = '') => {
    c.style.width = c.style.height = `${size}px`;
    c.style.transform = `translate(${-size / 2}px, ${-size / 2}px)`;
    l.textContent = label;
    c.classList.toggle('is-label', !!label);
  };
  state(14);
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    const d = t.closest<HTMLElement>('[data-cursor]');
    if (d) return state(88, d.dataset.cursor);
    if (t.closest('a, button, summary')) return state(40);
    state(14);
  });
}
