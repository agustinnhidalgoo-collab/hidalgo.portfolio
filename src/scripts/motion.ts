/* Capa de movimiento (GSAP + Lenis).
   Solo se ejecuta con movimiento permitido; sin ella el contenido queda estático y completo. */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends HTMLElement>(s: string, c: ParentNode = document) => c.querySelector<T>(s);
const $$ = <T extends HTMLElement>(s: string, c: ParentNode = document) => [...c.querySelectorAll<T>(s)];

/* ---------- Scroll suave ---------- */
const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

const dlg = document.getElementById('index-dialog') as HTMLDialogElement | null;
dlg?.addEventListener('close', () => lenis.start());
document.querySelector('[data-menu-open]')?.addEventListener('click', () => lenis.stop());

/* ---------- Utilidades ---------- */
function splitChars(el: HTMLElement) {
  const text = el.textContent ?? '';
  el.textContent = '';
  const out: HTMLElement[] = [];
  for (const c of text) {
    const w = document.createElement('span');
    w.className = 'chw';
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c === ' ' ? ' ' : c;
    w.append(s);
    el.append(w);
    out.push(s);
  }
  return out;
}
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

/* ---------- Entrada de la portada y cortina de página ---------- */
const curtain = $('.curtain');

function heroIn() {
  const items = $$('.hero3d__role, .hero3d__links, .topbar');
  if (!items.length) return;
  gsap.fromTo(items, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power3.out', delay: 0.3, clearProps: 'transform' });
  gsap.fromTo('.hero3d__note', { clipPath: 'inset(-10% 100% -10% 0)' }, { clipPath: 'inset(-10% -6% -10% -6%)', duration: 1.2, stagger: 0.4, ease: 'power3.inOut', delay: 0.9 });
  if (!root.classList.contains('gl-try')) {
    // Sin escena 3D: el nombre tipográfico entra por máscara.
    gsap.fromTo('.hero3d__fb span', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.12, ease: 'expo.out' });
  }
}

function afterIntro() {
  heroIn();
  ScrollTrigger.refresh();
}

if (root.classList.contains('curtain-on') && curtain) {
  sessionStorage.removeItem('curtain');
  gsap.to(curtain, {
    clipPath: 'inset(0 0 100% 0)',
    duration: 0.9,
    ease: 'power4.inOut',
    delay: 0.1,
    onComplete: () => root.classList.remove('curtain-on'),
  });
  gsap.delayedCall(0.55, afterIntro);
} else {
  afterIntro();
}
addEventListener('pageshow', (e) => {
  if (e.persisted) root.classList.remove('curtain-on');
});

/* ---------- Navegación: anclas con inercia y cortina entre páginas ---------- */
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target === '_blank' || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  const samePage = url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') || (url.pathname === '/' && location.pathname === '/');
  if (samePage && url.hash) {
    const t = document.querySelector(url.hash);
    if (t) {
      e.preventDefault();
      lenis.scrollTo(t as HTMLElement, { duration: 1.4, easing: (x) => 1 - Math.pow(1 - x, 4) });
      history.pushState(null, '', url.hash);
    }
    return;
  }
  if (samePage || /\.(pdf|jpg|png|xml|txt)$/i.test(url.pathname) || !curtain) return;
  e.preventDefault();
  sessionStorage.setItem('curtain', '1');
  gsap.set(curtain, { display: 'block', clipPath: 'inset(100% 0 0 0)' });
  gsap.to(curtain, { clipPath: 'inset(0% 0 0 0)', duration: 0.7, ease: 'power4.inOut', onComplete: () => (location.href = a.href) });
});

/* ---------- Progreso de lectura ---------- */
gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.2 } });

/* ---------- Manifiesto: las palabras se "llenan" al hacer scroll ---------- */
$$('[data-scrub]').forEach((el) => {
  const words = $$('.line > span', el).flatMap((s) => splitWords(s));
  gsap.to(words, {
    color: '#7c0000',
    stagger: 0.12,
    ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
  });
});

/* ---------- Deriva horizontal, parallax y revelados con máscara ---------- */
$$('[data-drift]').forEach((el) => {
  const d = Number(el.dataset.drift);
  gsap.fromTo(el, { xPercent: -d }, { xPercent: d, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
});
$$('[data-parallax]').forEach((img) => {
  const k = Number(img.dataset.parallax || 6);
  gsap.set(img, { scale: 1.12 });
  gsap.fromTo(img, { yPercent: -k }, { yPercent: k, ease: 'none', scrollTrigger: { trigger: img.parentElement!, start: 'top bottom', end: 'bottom top', scrub: true } });
});
$$('[data-clip]').forEach((el) => {
  gsap.fromTo(
    el,
    { clipPath: 'inset(100% 0 0 0)' },
    { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } },
  );
});

/* ---------- Marquee reactiva a la velocidad de scroll ---------- */
$$('.marquee').forEach((m) => {
  const track = $('.marquee__track', m)!;
  let x = 0;
  const dir = m.dataset.dir === 'right' ? 1 : -1;
  gsap.ticker.add(() => {
    const half = track.scrollWidth / 2;
    x += dir * (0.7 + Math.min(Math.abs(lenis.velocity) * 0.35, 14));
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    gsap.set(track, { x });
  });
});

/* ---------- Cursor y botones magnéticos (solo con ratón) ---------- */
if (fine) {
  const cur = document.createElement('div');
  cur.className = 'cursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<div class="cursor__c"><span class="cursor__l"></span></div>';
  document.body.append(cur);
  const c = $('.cursor__c', cur)!;
  const l = $('.cursor__l', cur)!;
  gsap.set(cur, { xPercent: 0 });
  const mx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3.out' });
  const my = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3.out' });
  let shown = false;
  addEventListener('pointermove', (e) => {
    if (!shown) {
      shown = true;
      root.classList.add('has-cursor');
    }
    mx(e.clientX);
    my(e.clientY);
  });
  document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
  document.addEventListener('mouseenter', () => shown && root.classList.add('has-cursor'));
  const state = (size: number, label = '') => {
    gsap.to(c, { width: size, height: size, x: -size / 2, y: -size / 2, duration: 0.45, ease: 'expo.out' });
    l.textContent = label;
    c.classList.toggle('is-label', !!label);
  };
  state(14);
  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element;
    const d = t.closest<HTMLElement>('[data-cursor]');
    if (d) return state(96, d.dataset.cursor);
    if (t.closest('a, button, summary')) return state(46);
    state(14);
  });

  $$('[data-magnetic], .btn, .menu-btn').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.28, y: (e.clientY - (r.top + r.height / 2)) * 0.36, duration: 0.4, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' }));
  });
}

addEventListener('load', () => ScrollTrigger.refresh());
