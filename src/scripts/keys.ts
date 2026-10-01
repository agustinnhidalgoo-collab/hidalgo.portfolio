/* Botonera 3D de habilidades: un teclado mecánico en vista isométrica, una tecla por herramienta.
   - Lee las teclas del HTML (.skills__key): color, ícono o monograma, nombre y frase. El HTML es la versión accesible.
   - Al entrar a la vista, las teclas caen y se arman (con rebote). Pasar el puntero o tocar una la hunde (con su clic)
     y muestra su nombre y su frase; con el teclado (Tab) pasa lo mismo.
   - Solo dibuja mientras la botonera está a la vista. Respeta «reducir movimiento» (ahí ni se carga: queda el HTML). */
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const COLS = 6;
const U = 1; // tamaño de una tecla
const GAP = 0.14;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const outBack = (t: number) => { const c = 1.55; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

interface KeyDef { id: string; name: string; desc: string; bg: string; bg2: string; fg: string; path?: string; text?: string; sub?: string; script: boolean; small: boolean; display: boolean; btn: HTMLButtonElement }

/** Cara superior de una tecla: fondo de la marca (con degradado si tiene dos colores) e ícono o monograma. */
function keyTop(k: KeyDef) {
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, S, S, 0);
  g.addColorStop(0, k.bg2);
  g.addColorStop(1, k.bg);
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  // brillo suave arriba (plástico)
  const hl = c.createLinearGradient(0, 0, 0, S);
  hl.addColorStop(0, 'rgba(255,255,255,0.10)');
  hl.addColorStop(0.5, 'rgba(255,255,255,0)');
  c.fillStyle = hl;
  c.fillRect(0, 0, S, S);
  c.fillStyle = k.fg;
  const cy = k.sub ? S * 0.44 : S * 0.5;
  if (k.path) {
    const p = new Path2D(k.path);
    const sz = S * (k.sub ? 0.44 : 0.56), s = sz / 24;
    const draw = (dx: number, dy: number, col: string) => {
      c.save();
      c.translate(S / 2 - sz / 2 + dx, cy - sz / 2 + dy);
      c.scale(s, s);
      c.fillStyle = col;
      c.fill(p);
      c.restore();
    };
    if (k.id === 'tiktok') { draw(-7, -5, '#25F4EE'); draw(7, 5, '#FE2C55'); }
    draw(0, 0, k.fg);
  } else if (k.text) {
    const fam = k.display ? "'Anton', Impact, sans-serif" : "'Inter Variable', Inter, system-ui, sans-serif";
    const size = k.small ? S * 0.23 : k.text.length > 2 ? S * 0.3 : S * 0.42;
    c.font = `${k.script ? 'italic ' : ''}${k.display ? 400 : 800} ${size}px ${fam}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(k.text, S / 2, cy + size * 0.04);
  }
  if (k.sub) {
    c.font = `700 ${S * 0.1}px 'Inter Variable', Inter, system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(k.sub.toUpperCase(), S / 2, S * 0.76);
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function startKeys(root: HTMLElement): boolean {
  const pad = root.querySelector<HTMLElement>('[data-keypad]');
  const canvas = pad?.querySelector('canvas');
  const btns = [...root.querySelectorAll<HTMLButtonElement>('.skills__key')];
  if (!pad || !canvas || !btns.length) return false;
  const nameEl = root.querySelector<HTMLElement>('[data-skill-name]');
  const descEl = root.querySelector<HTMLElement>('[data-skill-desc]');
  const hintEl = root.querySelector<HTMLElement>('[data-skill-hint]');
  const defName = nameEl?.textContent ?? '', defDesc = descEl?.textContent ?? '';
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (hintEl && coarse) hintEl.textContent = '(tocá una tecla)';

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return false;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const pm = new PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  pm.dispose();
  scene.add(new HemisphereLight(0xffffff, 0x220606, 0.45));
  const sun = new DirectionalLight(0xfff3ea, 1.9);
  sun.position.set(-4, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -6;
  sun.shadow.camera.right = sun.shadow.camera.top = 6;
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const rim = new DirectionalLight(0xff3a2a, 1.4); // contraluz rojo: el color del sitio
  rim.position.set(6, 2, -5);
  scene.add(rim);

  const defs: KeyDef[] = btns.map((b) => {
    const cs = getComputedStyle(b);
    const mono = b.querySelector('.skills__mono');
    return {
      id: b.dataset.key!, name: b.dataset.name!, desc: b.dataset.desc!,
      bg: cs.getPropertyValue('--bg').trim(), bg2: cs.getPropertyValue('--bg2').trim(), fg: cs.getPropertyValue('--fg').trim(),
      path: b.querySelector('path')?.getAttribute('d') ?? undefined, text: mono?.textContent ?? undefined,
      sub: b.querySelector('small')?.textContent ?? undefined,
      script: !!mono?.classList.contains('is-script'), small: !!mono?.classList.contains('is-small'), display: !!mono?.classList.contains('is-display'),
      btn: b,
    };
  });

  /* ---------- Teclado: base y teclas ---------- */
  const rows = Math.ceil(defs.length / COLS);
  const pitch = U + GAP;
  const W = COLS * pitch + 0.42, D = rows * pitch + 0.42;
  const board = new Group();
  scene.add(board);
  const base = new Mesh(new RoundedBoxGeometry(W, 0.42, D, 4, 0.16), new MeshPhysicalMaterial({ color: 0x151515, roughness: 0.55, metalness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.5 }));
  base.position.y = -0.21;
  base.receiveShadow = true;
  base.castShadow = true;
  board.add(base);
  const plate = new Mesh(new RoundedBoxGeometry(W - 0.22, 0.06, D - 0.22, 2, 0.08), new MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.9 }));
  plate.position.y = 0.01;
  plate.receiveShadow = true;
  board.add(plate);

  const capGeo = new RoundedBoxGeometry(U * 0.94, 0.5, U * 0.94, 4, 0.13);
  const topGeo = new PlaneGeometry(U * 0.8, U * 0.8);
  topGeo.rotateX(-Math.PI / 2);
  interface Key { def: KeyDef; g: Group; x: number; z: number; delay: number; press: number; vel: number }
  const keys: Key[] = defs.map((def, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const g = new Group();
    const body = new Mesh(capGeo, new MeshPhysicalMaterial({ color: new Color(def.bg), roughness: 0.38, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35 }));
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.27;
    // la cara impresa conserva los colores exactos de la marca (sin tono de cámara); el relieve lo da la tecla
    const top = new Mesh(topGeo, new MeshPhysicalMaterial({ map: keyTop(def), roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3, toneMapped: false, envMapIntensity: 0.15 }));
    top.position.y = 0.523;
    g.add(body, top);
    body.userData.i = top.userData.i = i;
    const x = (col - (COLS - 1) / 2) * pitch, z = (row - (rows - 1) / 2) * pitch;
    g.position.set(x, 0, z);
    board.add(g);
    return { def, g, x, z, delay: (col + row) * 0.055 + (i % 3) * 0.02, press: 0, vel: 0 };
  });
  const pickables = keys.flatMap((k) => k.g.children);

  /* ---------- Cámara: vista isométrica (como un teclado sobre la mesa), encuadrada al recuadro ---------- */
  const camera = new PerspectiveCamera(24, 1, 0.1, 100);
  board.rotation.y = -0.62;
  const R = Math.hypot(W, D) / 2 + 0.5;
  function fit() {
    const w = pad!.clientWidth, h = pad!.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // distancia para que el teclado entero entre (en el lado más chico del recuadro)
    const vFov = (camera.fov * Math.PI) / 180;
    const fitH = R / Math.sin(vFov / 2);
    const fitW = R / Math.sin(Math.atan(Math.tan(vFov / 2) * camera.aspect));
    const dist = Math.max(fitH, fitW) * (camera.aspect < 1.4 ? 0.68 : 0.7); // en vertical, más cerca
    camera.position.set(0, dist * Math.sin(0.92), dist * Math.cos(0.92));
    camera.lookAt(0, -0.2, 0);
    camera.updateProjectionMatrix();
    need = true;
    kick();
  }

  /* ---------- Interacción ---------- */
  const ray = new Raycaster(), mouse = new Vector2();
  let hover = -1, focused = -1, tapped = -1;
  const show = (i: number) => {
    if (!nameEl || !descEl) return;
    if (i < 0) { nameEl.textContent = defName; descEl.textContent = defDesc; return; }
    nameEl.textContent = keys[i].def.name;
    descEl.textContent = keys[i].def.desc;
  };
  const active = () => (hover >= 0 ? hover : focused >= 0 ? focused : tapped);
  let lastActive = -1;
  const sync = () => {
    const a = active();
    if (a !== lastActive) {
      if (a >= 0) dispatchEvent(new CustomEvent('portfolio:key'));
      lastActive = a;
      show(a);
      canvas.style.cursor = hover >= 0 ? 'pointer' : '';
    }
    need = true;
    kick();
  };
  const pick = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    mouse.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? (hit.object.userData.i as number) : -1;
  };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (e.pointerType !== 'touch') { hover = pick(e.clientX, e.clientY); sync(); } else kick();
  });
  canvas.addEventListener('pointerleave', () => { hover = -1; tilt.tx = tilt.ty = 0; sync(); });
  canvas.addEventListener('pointerdown', (e) => {
    const i = pick(e.clientX, e.clientY);
    if (i >= 0) { tapped = i; keys[i].vel -= 4; sync(); } // un toque: la tecla se hunde de golpe y rebota
  });
  btns.forEach((b, i) => {
    b.addEventListener('focus', () => { focused = i; sync(); });
    b.addEventListener('blur', () => { focused = -1; sync(); });
    b.addEventListener('click', () => { tapped = i; keys[i].vel -= 4; sync(); });
  });

  /* ---------- Bucle: las teclas caen al entrar; solo se dibuja mientras se ve ---------- */
  let visible = false, built = -1, need = true, raf = 0, last = 0;
  const io = new IntersectionObserver((es) => {
    for (const en of es) {
      visible = en.isIntersecting;
      if (visible) kick();
    }
  }, { threshold: [0, 0.3, 0.6] });
  io.observe(pad);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  // respaldo del IntersectionObserver (algunos navegadores embebidos no lo disparan): se mide con el scroll
  const checkVis = () => {
    const r = pad.getBoundingClientRect();
    const v = r.bottom > 0 && r.top < innerHeight;
    if (v !== visible) { visible = v; if (v) kick(); }
  };
  addEventListener('scroll', checkVis, { passive: true });
  addEventListener('resize', checkVis);
  checkVis();
  new ResizeObserver(fit).observe(pad);
  fit();
  pad.classList.add('is-3d');

  function kick() {
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  function frame(now: number) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = clamp((now - (last || now - 16)) / 1000, 0.001, 0.05);
    last = now;
    let moving = false;
    // caída de las teclas (una vez): arranca cuando un tercio del teclado está en pantalla
    if (built < 0) {
      const r = pad!.getBoundingClientRect();
      const seen = (Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / Math.max(1, r.height);
      if (seen > 0.33) built = now;
    }
    const t0 = built < 0 ? -1 : (now - built) / 1000;
    const a = active();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const t = t0 < 0 ? 0 : clamp((t0 - k.delay) / 0.55, 0, 1);
      const drop = t0 < 0 ? 1 : 1 - outBack(t);
      if (t0 >= 0 && t < 1) moving = true;
      // tecla señalada: se hunde con un resorte (con un pequeño rebote al soltarla)
      const target = i === a ? -0.2 : 0;
      k.vel += ((target - k.press) * 260 - k.vel * 22) * dt;
      k.press += k.vel * dt;
      if (Math.abs(k.vel) > 0.002 || Math.abs(target - k.press) > 0.002) moving = true;
      k.g.position.y = drop * 3.2 + k.press;
      k.g.visible = t0 >= 0 || drop < 1;
    }
    // el teclado sigue apenas al puntero
    tilt.x += (tilt.tx - tilt.x) * (1 - Math.exp(-5 * dt));
    tilt.y += (tilt.ty - tilt.y) * (1 - Math.exp(-5 * dt));
    if (Math.abs(tilt.tx - tilt.x) > 0.002 || Math.abs(tilt.ty - tilt.y) > 0.002) moving = true;
    board.rotation.set(tilt.y * 0.05, -0.62 + tilt.x * 0.07, 0);
    if (moving || need) {
      renderer.render(scene, camera);
      need = false;
    }
    if (moving || t0 < 0) raf = requestAnimationFrame(frame); // quieto: el bucle se detiene hasta la próxima interacción
  }
  // los monogramas usan las tipografías del sitio: se redibujan cuando terminan de cargar
  document.fonts?.ready.then(() => {
    keys.forEach((k) => {
      const top = k.g.children[1] as Mesh;
      const m = top.material as MeshPhysicalMaterial;
      m.map?.dispose();
      m.map = keyTop(k.def);
      m.needsUpdate = true;
    });
    need = true;
    kick();
  });
  return true;
}
