/* Estante (src/components/Shelf.astro): con la sección fijada, el scroll vertical lo mueve en horizontal.
   El alto de la sección se calcula a partir del largo del estante, así el recorrido dura lo que tiene que durar.
   Sin fijar (reducir movimiento, pantallas muy bajas), el estante se desplaza a mano. */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

document.querySelectorAll<HTMLElement>('[data-shelf-track]').forEach((track) => {
  const pin = track.querySelector<HTMLElement>('[data-shelf-pin]')!;
  const shelf = track.querySelector<HTMLElement>('[data-shelf]')!;
  const row = track.querySelector<HTMLElement>('[data-shelf-row]')!;
  const bar = track.querySelector<HTMLElement>('[data-shelf-bar]');
  let dist = 0;
  const pinned = () => getComputedStyle(pin).position === 'sticky';

  function layout() {
    if (!pinned()) {
      track.style.height = '';
      row.style.transform = '';
      return;
    }
    dist = Math.max(0, row.scrollWidth - shelf.clientWidth);
    // un poco de pausa al entrar y al salir, para leer el primer y el último panel
    track.style.height = `${pin.clientHeight + dist + innerHeight * 0.35}px`;
    update();
  }
  function update() {
    if (!pinned()) return;
    const span = Math.max(1, track.offsetHeight - pin.clientHeight);
    const p = clamp((-track.getBoundingClientRect().top - innerHeight * 0.12) / (span - innerHeight * 0.24));
    row.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
  }
  let raf = 0;
  addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(() => ((raf = 0), update()));
  }, { passive: true });
  addEventListener('resize', layout);
  // las imágenes cambian el largo del estante al cargar
  row.querySelectorAll('img').forEach((im) => im.complete || im.addEventListener('load', layout, { once: true }));
  layout();
  track.classList.add('is-ready');
});
export {};
