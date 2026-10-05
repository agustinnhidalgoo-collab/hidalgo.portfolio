/* La pieza que avanza en la página de cada mundo:
   - El libro (src/components/Zine.astro): se hojea como uno de verdad. Cada hoja se dobla en diagonal desde una
     esquina: la línea del pliegue es la mediatriz entre la esquina y el punto adonde se la lleva; lo que queda del lado
     del lomo es el frente, lo plegado se refleja sobre el pliegue y muestra el dorso, y debajo aparece la hoja
     siguiente. Se arrastra con el puntero o el dedo (soltando pasada la mitad, la hoja termina de pasar), la esquina se
     levanta al pasar el puntero, y también pasan las hojas el scroll, los botones, el clic y las flechas.
   - Los pasos de un mundo (src/components/Reel.astro): cada imagen entra con la transición de su mundo.
   Con la sección fijada (movimiento permitido) el estado es función del scroll; arrastrar o usar los botones
   anima la hoja y después deja el scroll en la página correspondiente. Sin fijar, se hojea con botones y gestos. */

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const outCubic = (x: number) => 1 - (1 - x) ** 3;
const pad = (k: number) => String(k).padStart(2, '0');

type Lenis = { scrollTo: (y: number, o?: Record<string, unknown>) => void };
type Pt = { x: number; y: number };

/* ---------- Geometría del pliegue ---------- */
/** Recorta un polígono con el semiplano (X − M)·n ≥ 0 (o ≤ 0) */
function clipHalf(poly: Pt[], M: Pt, n: Pt, positive: boolean): Pt[] {
  const s = (p: Pt) => ((p.x - M.x) * n.x + (p.y - M.y) * n.y) * (positive ? 1 : -1);
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const sa = s(a), sb = s(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}
const poly = (p: Pt[]) => (p.length < 3 ? 'polygon(0 0, 0 0, 0 0)' : `polygon(${p.map((q) => `${q.x.toFixed(1)}px ${q.y.toFixed(1)}px`).join(',')})`);
/** El papel no se estira: la esquina no puede alejarse del lomo más que el ancho (o la diagonal) de la hoja */
function constrain(C: Pt, P: Pt, w: number, h: number): Pt {
  const near = { x: 0, y: C.y }, far = { x: 0, y: h - C.y };
  const lim = (p: Pt, c: Pt, r: number) => {
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
    return d > r ? { x: c.x + (dx / d) * r, y: c.y + (dy / d) * r } : p;
  };
  return lim(lim(P, near, w), far, Math.hypot(w, h));
}
/** Recorrido de la esquina cuando la hoja pasa sola (scroll, botones): se levanta en arco y cae del otro lado */
const pathP = (t: number, w: number, h: number): Pt => ({ x: w - 2 * w * t, y: h - h * 0.24 * Math.sin(Math.PI * t) });

interface Leaf {
  el: HTMLElement;
  front: HTMLElement;
  shade: HTMLElement;
  drop: HTMLElement;
  dropI: HTMLElement;
  back: HTMLElement;
  backIn: HTMLElement;
  curl: HTMLElement;
  key: string; // último dibujo (evita repetir)
}
/** Dibuja una hoja con la esquina C llevada al punto P (coordenadas de la hoja: lomo en x = 0, ancho w, alto h) */
function drawLeaf(L: Leaf, w: number, h: number, C: Pt, P: Pt) {
  const key = `${w}|${h}|${C.y}|${P.x.toFixed(1)}|${P.y.toFixed(1)}`;
  if (key === L.key) return;
  L.key = key;
  const dx = C.x - P.x, dy = C.y - P.y, d = Math.hypot(dx, dy);
  if (d < 0.5) {
    // Hoja plana a la derecha
    L.front.style.clipPath = '';
    L.front.style.visibility = '';
    L.back.style.visibility = 'hidden';
    L.drop.style.visibility = 'hidden';
    L.shade.style.opacity = '0';
    L.el.classList.remove('is-folded');
    return;
  }
  const n = { x: dx / d, y: dy / d };
  const M = { x: (C.x + P.x) / 2, y: (C.y + P.y) / 2 };
  const page: Pt[] = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  const fr = clipHalf(page, M, n, false); // del lado del lomo: frente
  const fo = clipHalf(page, M, n, true); // plegado: se ve el dorso
  L.el.classList.add('is-folded');
  L.front.style.visibility = fr.length < 3 ? 'hidden' : '';
  L.front.style.clipPath = poly(fr);
  // Dorso: reflejo sobre el pliegue (A = I − 2nnᵀ) de la hoja espejada (x → w − x)
  const axx = 1 - 2 * n.x * n.x, axy = -2 * n.x * n.y, ayy = 1 - 2 * n.y * n.y;
  const a = -axx, b = -axy, c = axy, dd = ayy;
  const ex = axx * w + M.x - (axx * M.x + axy * M.y);
  const ey = axy * w + M.y - (axy * M.x + ayy * M.y);
  L.back.style.visibility = fo.length < 3 ? 'hidden' : 'visible';
  L.back.style.transform = `matrix(${a},${b},${c},${dd},${ex.toFixed(2)},${ey.toFixed(2)})`;
  L.backIn.style.clipPath = poly(fo.map((q) => ({ x: w - q.x, y: q.y })));
  // Sombras: sobre la hoja de abajo (junto al pliegue), en el frente que se levanta y en la curva del dorso
  const k = clamp(d / (w * 0.5)) * clamp((2 * w - d) / (w * 0.5));
  const ang = Math.atan2(n.y, n.x);
  L.drop.style.visibility = fo.length < 3 ? 'hidden' : 'visible';
  L.drop.style.clipPath = poly(fo);
  L.dropI.style.transform = `translate(${M.x.toFixed(1)}px,${M.y.toFixed(1)}px) rotate(${ang}rad) translateY(-50%)`;
  L.dropI.style.opacity = k.toFixed(3);
  L.shade.style.transform = `translate(${M.x.toFixed(1)}px,${M.y.toFixed(1)}px) rotate(${ang + Math.PI}rad) translateY(-50%)`;
  L.shade.style.opacity = (k * 0.9).toFixed(3);
  L.curl.style.transform = `translate(${(w - M.x).toFixed(1)}px,${M.y.toFixed(1)}px) rotate(${Math.atan2(n.y, -n.x)}rad) translateY(-50%)`;
  L.curl.style.opacity = (0.35 + k * 0.65).toFixed(3);
}

function init(z: HTMLElement) {
  const reel = z.querySelector<HTMLElement>('[data-rl]');
  const book = z.querySelector<HTMLElement>('[data-zb]') ?? reel;
  if (!book) return;
  // Unidades que avanzan: las hojas del libro o, en los pasos, cada imagen que entra (la primera ya está)
  const steps = reel ? [...reel.querySelectorAll<HTMLElement>('.rl__step')] : [];
  const leafEls = reel ? steps.slice(1) : [...book.querySelectorAll<HTMLElement>('.zb__leaf')];
  const leaves: Leaf[] = reel
    ? []
    : leafEls.map((el) => ({
        el,
        front: el.querySelector<HTMLElement>('.zb__front')!,
        shade: el.querySelector<HTMLElement>('.zb__shade')!,
        drop: el.querySelector<HTMLElement>('.zb__drop')!,
        dropI: el.querySelector<HTMLElement>('.zb__drop i')!,
        back: el.querySelector<HTMLElement>('.zb__back')!,
        backIn: el.querySelector<HTMLElement>('.zb__back-in')!,
        curl: el.querySelector<HTMLElement>('.zb__curl')!,
        key: '',
      }));
  const inner = book.querySelector<HTMLElement>('.zb__in') ?? book;
  const n = leafEls.length;
  const max = clamp(Number(z.dataset.max) || n, 1, n);
  // Tramo final (página del proyecto): después de la última página el libro se hunde y quedan las frases de cierre
  const END = Number(z.dataset.end) || 0;
  const total = max + END;
  const world = z.dataset.zine === 'case'; // la página maneja su mundo: se oscurece (--depth) y se apaga al final (--end)
  const html = document.documentElement;
  const track = z.closest<HTMLElement>('[data-zine-track]');
  const pin = track?.querySelector<HTMLElement>('[data-zine-pin]') ?? null;
  const caps = [...z.querySelectorAll<HTMLElement>('[data-zb-cap]')];
  const count = z.querySelector<HTMLElement>('[data-zb-count]');
  const btnPrev = z.querySelector<HTMLButtonElement>('.zb-nav [data-zb-go="-1"]');
  const btnNext = z.querySelector<HTMLButtonElement>('.zb-nav [data-zb-go="1"]');
  const side = leafEls.map(() => false); // hoja i pasada (del lado izquierdo)
  const ts = leafEls.map(() => 0); // avance de cada hoja (0 → 1)

  /** Fijada = el estado lo maneja el scroll */
  const pinned = () => !!pin && !!track && getComputedStyle(pin).position === 'sticky';
  const span = () => Math.max(1, track!.offsetHeight - pin!.clientHeight);
  const progress = () => clamp(-track!.getBoundingClientRect().top / span());

  let W = 1, H = 1; // tamaño de una hoja (px)
  const measure = () => {
    W = Math.max(1, inner.offsetWidth / 2);
    H = Math.max(1, inner.offsetHeight);
  };
  measure();

  // Hoja manejada a mano (arrastre, esquina levantada o animación): se dibuja con su propio punto
  let hand: { i: number; C: Pt; P: Pt } | null = null;

  let state = -1;
  function settle(s: number) {
    if (s === state) return;
    state = s;
    z.dataset.state = String(s);
    if (world) html.dataset.zstate = String(s);
    caps.forEach((c) => c.toggleAttribute('data-on', Number(c.dataset.zbCap) === s));
    if (count) count.textContent = reel ? pad(s + 1) : s === 0 ? 'Tapa' : s > n - 1 ? 'Fin' : pad(s);
    if (btnPrev) btnPrev.disabled = s <= 0;
    if (btnNext) btnNext.disabled = s >= max;
  }

  /** Avance de cada unidad según la posición p (0 … max); por scroll hay pausa entre una y otra */
  const tOf = (p: number, i: number, scrolled: boolean) => (scrolled ? ease(clamp((p - i - 0.16) / 0.68)) : ease(clamp(p - i)));

  function paint() {
    const turning = hand ? 1 : ts.some((t) => t > 0.001 && t < 0.999) ? 1 : 0;
    if (reel) {
      steps.forEach((st, j) => {
        if (j > 0) st.style.setProperty('--r', ts[j - 1].toFixed(4));
        st.style.setProperty('--o', (j < n ? 1 - ts[j] : 1).toFixed(4));
      });
    } else {
      leaves.forEach((L, i) => {
        const own = hand && hand.i === i;
        const C = own ? hand!.C : { x: W, y: H };
        const P = own ? hand!.P : constrain(C, pathP(ts[i], W, H), W, H);
        drawLeaf(L, W, H, C, P);
        const t = own ? clamp((W - hand!.P.x) / (2 * W)) : ts[i];
        const moving = own || (t > 0.001 && t < 0.999);
        L.el.style.zIndex = String(moving ? 2 * n + 2 : t >= 0.5 ? i + 1 : 2 * n - i);
        L.el.classList.toggle('is-moving', !!moving);
        if (own) ts[i] = t;
      });
      // Abrir la tapa centra el lomo; cerrar la contratapa vuelve a centrar el libro cerrado
      const open = ts[0], shut = n > 1 ? ts[n - 1] : 0;
      inner.style.transform = `translateX(${(-25 * (1 - open) + 25 * shut).toFixed(3)}%)`;
      book!.style.setProperty('--open', open.toFixed(3));
      book!.style.setProperty('--shut', shut.toFixed(3));
    }
    book!.classList.toggle('is-turning', !!turning);
    // Sonido: cada hoja que cae hacia adelante (solo al cruzar la mitad)
    ts.forEach((t, i) => {
      const left = t >= 0.5;
      if (left !== side[i]) {
        side[i] = left;
        dispatchEvent(new CustomEvent(reel ? 'portfolio:reel' : 'portfolio:page', { detail: { i, dir: left ? 1 : -1 } }));
      }
    });
    if (!hand) settle(side.filter(Boolean).length);
  }

  function fromScroll() {
    const raw = progress() * total;
    const p = Math.min(raw, max);
    const end = END ? clamp((raw - max) / END) : 0;
    z.style.setProperty('--end', end.toFixed(3));
    if (world) {
      html.style.setProperty('--depth', clamp(raw / total).toFixed(3));
      html.style.setProperty('--end', end.toFixed(3));
    }
    ts.forEach((_, i) => (ts[i] = tOf(p, i, true)));
    paint();
  }

  /* ---------- Bucle: solo mientras hace falta ---------- */
  let busy = false; // una hoja se está animando o arrastrando: el scroll no la pisa
  let raf = 0;
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      const pin = pinned();
      z.classList.toggle('is-pinned', pin);
      if (pin && !busy) fromScroll();
      else paint();
    });
  };

  /** Deja el scroll en la página k (sin animar: la hoja ya está donde corresponde) */
  function syncScroll(k: number) {
    if (!pinned()) return;
    const y = scrollY + track!.getBoundingClientRect().top + span() * (k / total);
    const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else scrollTo(0, y);
  }

  /** Suelta la hoja i: desde su punto actual cae del lado que corresponde y queda asentada */
  let anim = 0;
  function release(i: number, C: Pt, from: Pt, done: boolean, ms = 420) {
    cancelAnimationFrame(anim);
    const to: Pt = done ? { x: -W, y: C.y } : { x: W, y: C.y };
    const t0 = performance.now();
    busy = true;
    const step = (now: number) => {
      const u = calm ? 1 : clamp((now - t0) / ms);
      const e = outCubic(u);
      // cae en arco suave, como el papel
      const lift = Math.sin(Math.PI * e) * H * 0.06 * (C.y === 0 ? -1 : 1);
      hand = { i, C, P: constrain(C, { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - lift }, W, H) };
      paint();
      if (u < 1) anim = requestAnimationFrame(step);
      else {
        hand = null;
        ts[i] = done ? 1 : 0;
        busy = false;
        paint();
        syncScroll(side.filter(Boolean).length);
      }
    };
    anim = requestAnimationFrame(step);
  }

  /** Pasa una hoja entera sola (botones, clic, flechas) */
  function flip(dir: 1 | -1) {
    if (busy) return;
    const s = Math.max(0, state);
    if ((dir > 0 && s >= max) || (dir < 0 && s <= 0)) return;
    const i = dir > 0 ? s : s - 1;
    busy = true;
    const t0 = performance.now(), ms = reel ? 650 : 760;
    const from = ts[i];
    const step = (now: number) => {
      const u = calm ? 1 : clamp((now - t0) / ms);
      const t = dir > 0 ? from + (1 - from) * ease(u) : from * (1 - ease(u));
      if (reel) ts[i] = t;
      // Libro: la esquina de abajo recorre el arco completo
      else hand = { i, C: { x: W, y: H }, P: constrain({ x: W, y: H }, pathP(t, W, H), W, H) };
      paint();
      if (u < 1) anim = requestAnimationFrame(step);
      else {
        hand = null;
        ts[i] = dir > 0 ? 1 : 0;
        busy = false;
        paint();
        syncScroll(side.filter(Boolean).length);
      }
    };
    anim = requestAnimationFrame(step);
  }

  z.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('.zb-nav [data-zb-go]');
    if (!b || (b as HTMLButtonElement).disabled) return;
    flip(Number(b.dataset.zbGo) > 0 ? 1 : -1);
  });
  // Flechas del teclado: con la pieza a la vista
  if (world) {
    addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable], dialog[open]')) return;
      const r = book!.getBoundingClientRect();
      if (r.bottom < innerHeight * 0.3 || r.top > innerHeight * 0.7) return;
      e.preventDefault();
      flip(e.key === 'ArrowRight' ? 1 : -1);
    });
  }

  /* ---------- Gestos ---------- */
  if (reel) {
    // Pasos: clic en la mitad derecha avanza, en la izquierda vuelve
    book.addEventListener('click', (e) => {
      const r = book.getBoundingClientRect();
      flip(e.clientX > r.left + r.width / 2 ? 1 : -1);
    });
  } else {
    // Libro: agarrar la esquina y arrastrar; la esquina se levanta al pasar el puntero
    const local = (e: PointerEvent): Pt => {
      const r = inner.getBoundingClientRect();
      return { x: e.clientX - (r.left + r.width / 2), y: e.clientY - r.top };
    };
    let drag: { i: number; C: Pt; P0: Pt; x0: number; y0: number; moved: boolean; id: number; fwd: boolean } | null = null;
    let peel: { i: number; C: Pt; P: Pt } | null = null;
    let peelGoal: Pt | null = null;
    let peelRaf = 0;
    const rest = (i: number, cy: number): Pt => (side[i] ? { x: -W, y: cy } : { x: W, y: cy });

    book.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || (busy && !peel)) return;
      measure();
      const q = local(e);
      const s = Math.max(0, state);
      const fwd = q.x > 0;
      if ((fwd && s >= max) || (!fwd && s <= 0)) return;
      const i = fwd ? s : s - 1;
      const cy = q.y < H / 2 ? 0 : H; // se agarra la esquina más cercana (arriba o abajo)
      const C = { x: W, y: cy };
      cancelAnimationFrame(peelRaf);
      const P0 = peel && peel.i === i && peel.C.y === cy ? peel.P : rest(i, cy);
      peel = null;
      drag = { i, C, P0, x0: e.clientX, y0: e.clientY, moved: false, id: e.pointerId, fwd };
      busy = true;
      book.setPointerCapture(e.pointerId);
      book.classList.add('is-dragging');
    });
    book.addEventListener('pointermove', (e) => {
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        if (Math.hypot(dx, dy) > 4) drag.moved = true;
        hand = { i: drag.i, C: drag.C, P: constrain(drag.C, { x: drag.P0.x + dx, y: drag.P0.y + dy }, W, H) };
        paint();
        return;
      }
      if (!fine || e.pointerType !== 'mouse' || (busy && !peel)) return;
      // Cerca de una esquina de afuera, la hoja se despega un poco hacia el puntero
      const q = local(e);
      const s = Math.max(0, state);
      const fwd = q.x > 0;
      const cy = q.y < H / 2 ? 0 : H;
      const corner = { x: fwd ? W : -W, y: cy };
      const dist = Math.hypot(q.x - corner.x, q.y - corner.y);
      const zone = W * 0.34;
      if (dist > zone || (fwd && s >= max) || (!fwd && s <= 0)) return lift(null);
      const amt = (1 - dist / zone) * Math.min(W, H) * 0.22 + 14;
      const i = fwd ? s : s - 1;
      const goal = { x: corner.x + (fwd ? -1 : 1) * amt * 0.85, y: corner.y + (cy === 0 ? 1 : -1) * amt * 0.55 };
      lift({ i, C: { x: W, y: cy }, P: goal });
    });
    function lift(target: { i: number; C: Pt; P: Pt } | null) {
      if (drag) return;
      if (target && peel && (peel.i !== target.i || peel.C.y !== target.C.y)) target = null; // primero vuelve la anterior
      if (!target && !peel) return;
      if (target && !peel) peel = { i: target.i, C: target.C, P: rest(target.i, target.C.y) };
      peelGoal = target ? target.P : rest(peel!.i, peel!.C.y);
      busy = true;
      cancelAnimationFrame(peelRaf);
      const tick = () => {
        if (!peel || !peelGoal) return;
        peel.P = { x: peel.P.x + (peelGoal.x - peel.P.x) * 0.2, y: peel.P.y + (peelGoal.y - peel.P.y) * 0.2 };
        hand = { ...peel, P: constrain(peel.C, peel.P, W, H) };
        paint();
        if (Math.hypot(peelGoal.x - peel.P.x, peelGoal.y - peel.P.y) > 0.3) peelRaf = requestAnimationFrame(tick);
        else if (!target) {
          // de vuelta en su lugar: se suelta
          hand = null;
          peel = null;
          busy = false;
          paint();
        }
      };
      peelRaf = requestAnimationFrame(tick);
    }
    const end = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      book.classList.remove('is-dragging');
      if (!d.moved) {
        // Un clic: la hoja pasa entera hacia ese lado
        hand = null;
        busy = false;
        flip(d.fwd ? 1 : -1);
        return;
      }
      const P = hand?.P ?? d.P0;
      release(d.i, d.C, P, P.x < 0);
    };
    book.addEventListener('pointerup', end);
    book.addEventListener('pointercancel', end);
    book.addEventListener('pointerleave', () => lift(null));
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
  addEventListener('resize', () => {
    measure();
    leaves.forEach((L) => (L.key = ''));
    kick();
  });
  // Estado inicial sin sonido: lo que ya está pasado al cargar (recarga a mitad de página) no «suena»
  z.classList.toggle('is-pinned', pinned());
  if (pinned()) {
    const p = Math.min(progress() * total, max);
    ts.forEach((_, i) => {
      ts[i] = tOf(p, i, true);
      side[i] = ts[i] >= 0.5;
    });
    fromScroll();
  } else paint();
  z.classList.add('is-ready');
}

document.querySelectorAll<HTMLElement>('[data-zine]').forEach(init);
export {};
