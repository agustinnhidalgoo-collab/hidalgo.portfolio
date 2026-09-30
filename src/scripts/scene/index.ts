/* Escena 3D del portfolio (Three.js).
   La botella de «Cordero con piel de lobo» es la protagonista desde la apertura y acompaña el
   recorrido; al llegar a Be Fresh cede el lugar a su tarjeta (isologo vectorial extruido).

   Principios:
   - El estado de la escena es una FUNCIÓN PURA de la posición de scroll (y del layout actual):
     recargar a mitad de página, retroceder, cambiar el tamaño o saltar a un ancla dan el mismo resultado.
   - La composición sale del HTML: cada objeto se coloca sobre elementos `[data-slot]`; el CSS decide
     dónde va cada pieza en escritorio, tablet y móvil.
   - El canvas es transparente y decorativo. Todo el texto vive en el DOM.
   - Solo se dibuja cuando algo cambia (scroll, puntero, redimensionado) y hay un objeto a la vista. */
import {
  ACESFilmicToneMapping,
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  Shape,
  SpotLight,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import bottleProfile from '../../assets/3d/bottle-profile.json';
import labelFrontUrl from '../../assets/3d/label-front.webp?url';
import labelBackUrl from '../../assets/3d/label-back.webp?url';
import bfSvg from '../../assets/3d/bf-isologo.svg?raw';

type Tier = 'high' | 'mid' | 'low';
interface Pose { x: number; y: number; s: number; ry: number; rx: number } // px de viewport; s = alto (botella) o ancho (tarjeta) en px
interface Key { y: number; v: Pose; lin?: boolean }
interface Track { keys: Key[] }

const $ = <T extends HTMLElement>(s: string, c: ParentNode = document) => c.querySelector<T>(s);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const PI = Math.PI;

/** Alto máximo de la botella en px CSS: la etiqueta original mide ~340 px de alto; más grande solo la ablanda. */
const BOTTLE_MAX = 720;

function sample(tr: Track, y: number): Pose {
  const k = tr.keys;
  if (y <= k[0].y) return { ...k[0].v };
  const n = k.length - 1;
  if (y >= k[n].y) return { ...k[n].v };
  let i = 0;
  while (i < n - 1 && y > k[i + 1].y) i++;
  const a = k[i], b = k[i + 1];
  const t0 = (y - a.y) / Math.max(1e-6, b.y - a.y);
  const t = b.lin ? t0 : smooth(t0);
  return {
    x: a.v.x + (b.v.x - a.v.x) * t,
    y: a.v.y + (b.v.y - a.v.y) * t,
    s: a.v.s + (b.v.s - a.v.s) * t,
    ry: a.v.ry + (b.v.ry - a.v.ry) * t,
    rx: a.v.rx + (b.v.rx - a.v.rx) * t,
  };
}

export async function startScene(): Promise<boolean> {
  const host = $('#gl');
  const canvas = host?.querySelector('canvas') as HTMLCanvasElement | null;
  const root = document.documentElement;
  if (!host || !canvas) return false;

  /* ---------- Calidad adaptable ---------- */
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const tier: Tier = coarse || mem <= 4 || cores <= 4 ? (mem <= 2 || cores <= 2 ? 'low' : 'mid') : 'high';
  let dpr = Math.min(devicePixelRatio, tier === 'high' ? 2 : tier === 'mid' ? 1.5 : 1.15);
  const seg = tier === 'high' ? 96 : tier === 'mid' ? 64 : 40;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: tier !== 'low', alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  } catch {
    return false;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const FOV = 28;
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const UNITS_H = 10; // unidades de alto visibles en z = 0
  camera.position.set(0, 0, UNITS_H / 2 / Math.tan((FOV / 2) * (PI / 180)));

  /* ---------- Entorno de estudio (solo para reflejos): softboxes blanco y rojo ---------- */
  const envScene = new Scene();
  envScene.add(new Mesh(new BoxGeometry(40, 30, 40), new MeshBasicMaterial({ color: 0x050505, side: 1 })));
  const panel = (w: number, h: number, c: number, k: number, x: number, y: number, z: number, ry: number) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(c).multiplyScalar(k), side: 2 }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    envScene.add(m);
  };
  panel(14, 9, 0xffffff, 9, -12, 7, 8, 0.9); // softbox principal, arriba a la izquierda
  panel(2.4, 24, 0xffffff, 12, -13, 0, 4, 1.0); // tira vertical: línea de luz sobre el vidrio
  panel(2.2, 20, 0xff2a1a, 11, 13, 2, -2, -1.2); // tira roja lateral
  panel(18, 2, 0xffffff, 3, 0, 13, 4, 0); // luz cenital fina
  panel(12, 6, 0x7c0000, 3, 0, -12, 3, 0); // rebote rojo desde abajo
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.035, 0.1, 100, { size: 128 }).texture;
  scene.environmentIntensity = 0.62;
  pmrem.dispose();
  envScene.traverse((o) => {
    const m = o as Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) (m.material as MeshBasicMaterial).dispose();
  });

  /* ---------- Luces (sin sombras proyectadas: no aportan y cuestan) ---------- */
  const key = new SpotLight(0xfff1e4, 420, 60, 0.42, 1, 1.4);
  key.position.set(-8, 7, 14);
  scene.add(key, key.target);
  const rim = new PointLight(0xff1e14, 130, 22, 2);
  rim.position.set(9, 1, -0.6);
  scene.add(rim);
  const fill = new DirectionalLight(0xffffff, 1.0);
  fill.position.set(4, 3, 10);
  scene.add(fill);
  const rake = new SpotLight(0xffffff, 0, 60, 0.42, 1, 1.4); // luz rasante: solo para el relieve de la tarjeta
  rake.position.set(-11, -4, 5);
  scene.add(rake, rake.target);

  /* ---------- Botella de Cordero ----------
     Silueta: perfil medido sobre la fotografía real del frente. Etiquetas: recortes reales del PDF de envases. */
  const bottle = new Group();
  const prof = (bottleProfile as [number, number][]).map(([y, r]) => new Vector2(r, y));
  const CAP_Y = 0.79;
  const glass = new MeshPhysicalMaterial({ color: 0x070908, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.9, ior: 1.5 });
  const bodyPts = [new Vector2(0, 0), new Vector2(prof[0].x * 0.85, 0), ...prof.filter((p) => p.y <= CAP_Y + 0.01)];
  bottle.add(new Mesh(new LatheGeometry(bodyPts, seg), glass));
  const capMat = new MeshPhysicalMaterial({ color: 0x4a0f22, roughness: 0.3, metalness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.22, envMapIntensity: 1.5 });
  const capPts = [...prof.filter((p) => p.y >= CAP_Y).map((p) => new Vector2(p.x * 1.035, p.y)), new Vector2(prof[prof.length - 1].x * 1.035, 1), new Vector2(0, 1)];
  bottle.add(new Mesh(new LatheGeometry(capPts, Math.round(seg * 0.6)), capMat));
  const bodyR = Math.max(...bodyPts.map((p) => p.x));
  const loader = new TextureLoader();
  const loadTex = async (url: string) => {
    const t = await loader.loadAsync(url);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = tier === 'low' ? 1 : 4;
    return t;
  };
  const makeLabel = (tex: Awaited<ReturnType<typeof loadTex>>, y0: number, y1: number, half: number, flip: boolean) => {
    const g = new CylinderGeometry(bodyR + 0.0012, bodyR + 0.0012, y1 - y0, seg, 1, true, -half, half * 2);
    // La foto es una proyección del cilindro: u = sen(ángulo) reproduce fielmente la curvatura.
    const pos = g.attributes.position;
    const uv: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const phi = Math.atan2(pos.getX(i), pos.getZ(i));
      uv.push((Math.sin(phi) / Math.sin(half) + 1) / 2, pos.getY(i) / (y1 - y0) + 0.5);
    }
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    const m = new Mesh(g, new MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0, bumpMap: tex, bumpScale: 1.1, alphaTest: 0.4 }));
    m.position.y = (y0 + y1) / 2;
    if (flip) m.rotation.y = PI;
    return m;
  };
  const texF = await loadTex(labelFrontUrl); // lo único imprescindible para la apertura
  bottle.add(makeLabel(texF, 0.1664, 0.6352, 1.36, false));
  bottle.position.y = -0.5;
  const bottleRoot = new Group();
  bottleRoot.add(bottle);
  scene.add(bottleRoot);
  let backReady = false;
  const loadBack = () => {
    if (backReady) return;
    backReady = true;
    loadTex(labelBackUrl).then((t) => {
      bottle.add(makeLabel(t, 0.1754, 0.6365, 1.36, true));
      kick();
    });
  };

  /* Sombra de contacto suave bajo la botella (decal, no una superficie inventada) */
  const shadowCv = document.createElement('canvas');
  shadowCv.width = shadowCv.height = 128;
  {
    const c = shadowCv.getContext('2d')!;
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  }
  const shadowMat = new MeshBasicMaterial({ map: new CanvasTexture(shadowCv), transparent: true, depthWrite: false });
  const shadow = new Mesh(new PlaneGeometry(1, 0.16), shadowMat);
  scene.add(shadow);

  /* ---------- Tarjeta de Be Fresh (se construye al acercarse; SVGLoader se carga aparte) ---------- */
  let card: Group | null = null;
  let cardMats: MeshStandardMaterial[] = [];
  let cardBuilding = false;
  const buildCard = async () => {
    if (card || cardBuilding) return;
    cardBuilding = true;
    const { SVGLoader } = await import('three/examples/jsm/loaders/SVGLoader.js');
    const cardMat = new MeshStandardMaterial({ color: 0x060607, roughness: 0.88, metalness: 0.04, envMapIntensity: 0.3 });
    const bfMat = new MeshStandardMaterial({ color: 0x2a2a2d, roughness: 0.2, metalness: 0.7 });
    cardMats = [cardMat, bfMat];
    const g = new Group();
    const CW = 1, CH = 0.78, CD = 0.03;
    const cs = new Shape();
    cs.moveTo(-CW / 2, -CH / 2); cs.lineTo(CW / 2, -CH / 2); cs.lineTo(CW / 2, CH / 2); cs.lineTo(-CW / 2, CH / 2); cs.closePath();
    const cg = new ExtrudeGeometry(cs, { depth: CD, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
    cg.translate(0, 0, -CD / 2);
    g.add(new Mesh(cg, cardMat));
    const svg = new SVGLoader().parse(bfSvg);
    const bf = new Group();
    svg.paths.forEach((p) => {
      p.toShapes().forEach((shape) => {
        bf.add(new Mesh(new ExtrudeGeometry(shape, { depth: 5, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.7, bevelSegments: 3, curveSegments: 10 }), bfMat));
      });
    });
    const box = new Box3().setFromObject(bf);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    bf.children.forEach((c) => c.position.sub(center));
    const k = (CW * 0.5) / size.x;
    bf.scale.set(k, -k, k); // el SVG tiene el eje Y hacia abajo
    bf.position.z = CD / 2 + 0.001;
    g.add(bf);
    card = new Group();
    card.add(g);
    scene.add(card);
    kick();
  };

  /* ---------- Layout: poses a partir de los elementos [data-slot] ---------- */
  const heroEl = $('#inicio');
  const introEl = $('#introduccion');
  const bottleStage = $('#stage-bottle');
  const cardStage = $('#stage-card');
  let W = 0, H = 0, ppu = 1;
  let bottleTrack: Track = { keys: [{ y: 0, v: { x: 0, y: -9999, s: 1, ry: 0, rx: 0 } }] };
  let cardTrack: Track = { keys: [{ y: 0, v: { x: 0, y: -9999, s: 1, ry: 0, rx: 0 } }] };
  let monoTrack: { y: number; v: number }[] = [{ y: 0, v: 0 }];
  let pageY = 0;

  const docTop = (el: HTMLElement) => el.getBoundingClientRect().top + scrollY;
  const rel = (el: HTMLElement, ref: HTMLElement) => {
    const a = el.getBoundingClientRect(), r = ref.getBoundingClientRect();
    return { cx: a.left - r.left + a.width / 2, cy: a.top - r.top + a.height / 2, w: a.width, h: a.height };
  };
  const bp = (r: { cx: number; cy: number; h: number }, ry: number, dy = 0, rx = 0): Pose => ({ x: r.cx, y: r.cy + dy, s: Math.min(r.h, BOTTLE_MAX), ry, rx });
  // La tarjeta se ajusta dentro de su slot (ancho y alto), para que nunca sobresalga del encuadre
  const cp = (r: { cx: number; cy: number; w: number; h: number }, ry: number, dy = 0, rx = 0): Pose => ({ x: r.cx, y: r.cy + dy, s: Math.min(r.w, r.h * 1.05), ry, rx });

  /** Tramo de un proyecto: entrada 1:1 con la sección, 3 pasos y salida 1:1. */
  function stageKeys(stage: HTMLElement, slots: string[], make: (r: { cx: number; cy: number; w: number; h: number }, ry: number, dy?: number, rx?: number) => Pose, ry0: number, ryBack: number, attach: boolean): { keys: Key[]; enter: number; exit: number } {
    const steps = [1, 2, 3].map((n) => $(`.step-${n}`, stage)!);
    const pos = slots.map((s, i) => rel($(`[data-slot="${s}"]`, steps[i])!, steps[i]));
    const T = docTop(stage), Hs = stage.offsetHeight;
    const pin = $('.pstage__pin', stage);
    const pinned = getComputedStyle(pin!).position === 'sticky';
    const vh = pinned ? pin!.clientHeight : innerHeight;
    const keys: Key[] = [];
    const enter = T - vh;
    const release = T + Hs - vh;
    if (attach) keys.push({ y: enter, v: make(pos[0], ry0, vh), lin: true });
    if (pinned) {
      const L = Hs - vh;
      const at = (f: number) => T + f * L;
      keys.push({ y: T, v: make(pos[0], ry0), lin: attach });
      keys.push({ y: at(0.3), v: make(pos[0], ry0 + 0.16) });
      keys.push({ y: at(0.4), v: make(pos[1], ryBack) });
      keys.push({ y: at(0.64), v: make(pos[1], ryBack + 0.18) });
      keys.push({ y: at(0.74), v: make(pos[2], ryBack + PI) });
      keys.push({ y: at(1), v: make(pos[2], ryBack + PI + 0.14) });
    } else {
      // Pantallas bajas: pasos apilados sin fijar; la pose sigue la posición de cada paso
      const t = steps.map(docTop);
      keys.push({ y: T, v: make(pos[0], ry0), lin: attach });
      keys.push({ y: Math.max(T + 1, t[1] - 0.55 * vh), v: make(pos[0], ry0 + 0.16) });
      keys.push({ y: t[1] + 0.05 * vh, v: make(pos[1], ryBack) });
      keys.push({ y: Math.max(t[1] + 0.1 * vh, t[2] - 0.55 * vh), v: make(pos[1], ryBack + 0.18) });
      keys.push({ y: t[2] + 0.05 * vh, v: make(pos[2], ryBack + PI) });
      keys.push({ y: Math.max(t[2] + 0.1 * vh, release), v: make(pos[2], ryBack + PI + 0.14) });
    }
    keys.push({ y: T + Hs, v: make(pos[2], ryBack + PI + 0.14, -vh), lin: true });
    // ordenar y garantizar monotonía estricta
    keys.sort((a, b) => a.y - b.y);
    for (let i = 1; i < keys.length; i++) if (keys[i].y <= keys[i - 1].y) keys[i].y = keys[i - 1].y + 0.5;
    return { keys, enter, exit: T + Hs };
  }

  function layout() {
    W = host!.clientWidth || innerWidth;
    H = host!.clientHeight || innerHeight;
    ppu = H / UNITS_H;
    pageY = scrollY;
    const off = (dy: number, p: Pose): Pose => ({ ...p, y: p.y + dy });
    const bKeys: Key[] = [];
    const cKeys: Key[] = [];
    const vh = innerHeight;

    // Apertura: la botella ocupa el slot del hero
    const heroSlot = $('[data-slot="hero"]', heroEl!)!;
    const hr = heroSlot.getBoundingClientRect();
    const hero = bp({ cx: hr.left + hr.width / 2, cy: hr.top + scrollY + hr.height / 2, h: hr.height }, -0.3);
    const Hh = heroEl!.offsetHeight;
    const introSlot = $('[data-slot="intro"]', introEl!);
    const ir = introSlot?.getBoundingClientRect();
    const wideLayout = !!ir && ir.width > 0;
    if (bottleStage) bottleTop = docTop(bottleStage);
    const first = bottleStage ? stageKeys(bottleStage, ['b1', 'b2', 'b3'], bp, -0.22, PI + 0.1, !wideLayout) : null;

    bKeys.push({ y: 0, v: hero });
    if (wideLayout && first) {
      const parked = (ry: number): Pose => ({ x: ir!.left + ir!.width / 2, y: vh / 2, s: Math.min(ir!.height, vh * 0.66, BOTTLE_MAX), ry, rx: 0 });
      const a = Math.max(1, Hh * 0.9);
      const b = Math.max(a + 2, first.enter);
      bKeys.push({ y: a, v: parked(-0.5) });
      bKeys.push({ y: (a + b) / 2, v: parked(-0.28) });
      bKeys.push({ y: b, v: parked(-0.4) });
    } else if (first) {
      // Vertical: la botella pertenece al hero, sale con él (1:1) y vuelve con su sección
      bKeys.push({ y: Math.max(1, Hh), v: off(-Hh, hero), lin: true });
      bKeys.push({ y: Math.max(Hh + 1, first.enter - 1), v: off(-Hh, hero) });
    }
    if (first) bKeys.push(...first.keys);
    bottleTrack = { keys: bKeys };

    // Be Fresh: la tarjeta entra 1:1 con su sección mientras la botella sale con la suya
    const monos: { y: number; v: number }[] = [{ y: 0, v: 0 }];
    if (cardStage) {
      const c = stageKeys(cardStage, ['c1', 'c2', 'c3'], cp, -0.45, -0.25, true);
      cKeys.push(...c.keys);
      const pin = $('.pstage__pin', cardStage);
      const pinH = getComputedStyle(pin!).position === 'sticky' ? pin!.clientHeight : vh;
      monos.push({ y: c.enter - 1, v: 0 }, { y: c.enter + pinH, v: 1 });
      cardStageEnter = c.enter;
    }
    if (cKeys.length) cardTrack = { keys: cKeys };
    monoTrack = monos;

    if (renderer.getPixelRatio() !== dpr || canvas!.width !== Math.round(W * dpr) || canvas!.height !== Math.round(H * dpr)) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
    lk = clamp(camera.aspect / 1.6, 0.25, 1);
    kick();
  }
  let cardStageEnter = Infinity;
  let bottleTop = Infinity;
  let lk = 1;

  /* ---------- Puntero ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!coarse) {
    addEventListener(
      'pointermove',
      (e) => {
        ptr.tx = (e.clientX / innerWidth) * 2 - 1;
        ptr.ty = (e.clientY / innerHeight) * 2 - 1;
        kick();
      },
      { passive: true },
    );
  }

  /* ---------- Bucle: dibuja solo cuando hay cambios y algo visible ---------- */
  const snap = location.search.includes('snap');
  const K = snap ? 1e6 : 16;
  const cur = { b: null as Pose | null, c: null as Pose | null, mono: 0, px: 0, py: 0 };
  let raf = 0;
  let last = 0;
  let frames = 0, slow = 0;
  let idleFrames = 0;
  let firstRender = true;
  const onScreen = (p: Pose, isCard: boolean) => {
    const half = isCard ? p.s * 0.4 : p.s * 0.5;
    return p.y + half > -20 && p.y - half < H + 20 && p.x > -p.s && p.x < W + p.s;
  };
  const follow = (curP: Pose | null, tgt: Pose, isCard: boolean, dt: number, initRy?: number): Pose => {
    if (!curP) return { ...tgt, ry: initRy ?? tgt.ry };
    // Si el objeto (o su destino) está fuera de pantalla se coloca directamente: nunca cruza la pantalla en vuelo
    if (!onScreen(curP, isCard) || !onScreen(tgt, isCard)) return { ...tgt };
    return { x: damp(curP.x, tgt.x, K, dt), y: damp(curP.y, tgt.y, K, dt), s: damp(curP.s, tgt.s, K, dt), ry: damp(curP.ry, tgt.ry, K * 0.7, dt), rx: damp(curP.rx, tgt.rx, K, dt) };
  };
  const monoAt = (y: number) => {
    const m = monoTrack;
    if (y <= m[0].y) return m[0].v;
    for (let i = 1; i < m.length; i++) if (y <= m[i].y) return m[i - 1].v + (m[i].v - m[i - 1].v) * smooth((y - m[i - 1].y) / Math.max(1e-6, m[i].y - m[i - 1].y));
    return m[m.length - 1].v;
  };
  const redC = new Color(0xff1e14), whiteC = new Color(0xdfe4ff);

  function kick() {
    idleFrames = 0;
    if (!raf && running) raf = requestAnimationFrame(frame);
  }
  let running = !document.hidden;

  function frame(now: number) {
    raf = 0;
    if (!running) return;
    const dt = clamp((now - (last || now - 16)) / 1000, 0.001, 0.25);
    last = now;
    const y = scrollY;
    ptr.x = damp(ptr.x, ptr.tx, 5, dt);
    ptr.y = damp(ptr.y, ptr.ty, 5, dt);

    // Cargas diferidas: dorso y tarjeta se preparan al acercarse
    if (bottleStage && y > bottleTop - innerHeight * 3) loadBack();
    if (cardStage && y > cardStageEnter - innerHeight * 2.5) buildCard();

    const tb = sample(bottleTrack, y);
    const tc = card ? sample(cardTrack, y) : null;
    const heroTop = y < 40;
    cur.b = follow(cur.b, tb, false, dt, firstRender && heroTop ? 0 : undefined);
    cur.c = tc ? follow(cur.c, tc, true, dt) : null;
    cur.mono = damp(cur.mono, monoAt(y), K * 0.6, dt);
    cur.px = damp(cur.px, ptr.x, 6, dt);
    cur.py = damp(cur.py, ptr.y, 6, dt);

    const bOn = !!cur.b && onScreen(cur.b, false);
    const cOn = !!cur.c && onScreen(cur.c, true);
    bottleRoot.visible = shadow.visible = bOn;
    if (card) card.visible = cOn;

    if (bOn && cur.b) {
      const p = cur.b;
      const sc = p.s / ppu;
      bottleRoot.position.set((p.x + ptr.x * 10 - W / 2) / ppu, (H / 2 - p.y) / ppu, 0);
      bottleRoot.scale.setScalar(sc);
      bottleRoot.rotation.set(p.rx + ptr.y * 0.05, p.ry + ptr.x * 0.16, -0.035 + ptr.x * 0.015);
      shadow.position.set(bottleRoot.position.x, bottleRoot.position.y - sc * 0.5 - sc * 0.02, -0.2);
      shadow.scale.set(sc * 1.15, sc * 1.0, 1);
      shadowMat.opacity = 0.9;
    }
    if (cOn && cur.c && card) {
      const p = cur.c;
      card.position.set((p.x + ptr.x * 10 - W / 2) / ppu, (H / 2 - p.y) / ppu, 0);
      card.scale.setScalar(p.s / ppu);
      card.rotation.set(p.rx + 0.16 - ptr.y * 0.08, p.ry + ptr.x * 0.16, 0);
    }
    // Iluminación: el rojo de Cordero pasa a luz blanca fría en Be Fresh
    rim.color.copy(redC).lerp(whiteC, cur.mono);
    key.position.x = (-8 + cur.px * 4.5) * (0.35 + 0.65 * lk);
    key.position.y = 7 - cur.py * 2.5;
    rim.position.x = 9 * (0.28 + 0.72 * lk);
    rim.intensity = (130 + cur.mono * 120) * (1 + (1 - lk) * (1.2 - cur.mono));
    key.intensity = 420 * (1 - cur.mono * 0.55);
    fill.intensity = 1.0 + (1 - lk) * 1.4;
    rake.intensity = cur.mono * 230 * lk * lk;
    scene.environmentIntensity = 0.62 - cur.mono * 0.2;

    // Fondo CSS: el halo sigue al objeto principal y vira a gris en Be Fresh
    const gp = cOn && cur.c && (!bOn || cur.mono > 0.5) ? cur.c : cur.b;
    if (gp) {
      host!.style.setProperty('--gx', `${((gp.x / W) * 100).toFixed(2)}%`);
      host!.style.setProperty('--gy', `${((gp.y / H) * 100).toFixed(2)}%`);
    }
    host!.style.setProperty('--mono', cur.mono.toFixed(3));

    if (bOn || cOn) {
      renderer.render(scene, camera);
      if (firstRender) {
        firstRender = false;
        root.classList.add('gl-on');
      }
      // Calidad adaptable: si el dispositivo no sostiene ~40 fps, baja la resolución de render
      frames++;
      if (dt > 0.028 && dt < 0.25) slow++;
      if (frames === 60) {
        if (slow > 30 && dpr > 0.85) {
          dpr = Math.max(0.85, dpr * 0.82);
          layout();
        }
        frames = 0;
        slow = 0;
      }
    } else if (firstRender) {
      firstRender = false;
      root.classList.add('gl-on');
    }

    // ¿Sigue habiendo movimiento? Si todo se asentó, se detiene el bucle (sin consumo en reposo)
    const settled =
      Math.abs(ptr.x - ptr.tx) < 0.002 && Math.abs(ptr.y - ptr.ty) < 0.002 &&
      (!cur.b || (Math.abs(cur.b.x - tb.x) < 0.2 && Math.abs(cur.b.y - tb.y) < 0.2 && Math.abs(cur.b.ry - tb.ry) < 0.002)) &&
      Math.abs(cur.mono - monoAt(y)) < 0.002;
    idleFrames = settled ? idleFrames + 1 : 0;
    if (idleFrames < 3) raf = requestAnimationFrame(frame);
  }

  /* ---------- Eventos (un solo juego, con limpieza) ---------- */
  const onScroll = () => kick();
  let rsz = 0;
  const onResize = () => {
    cancelAnimationFrame(rsz);
    rsz = requestAnimationFrame(layout);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);
  const ro = new ResizeObserver(onResize);
  ro.observe(document.body);
  document.fonts?.ready.then(onResize);
  addEventListener('load', onResize);
  const onVis = () => {
    running = !document.hidden;
    if (running) {
      last = 0;
      kick();
    }
  };
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    root.classList.remove('gl-on', 'gl-try');
    root.classList.add('gl-fail');
  });
  const dispose = () => {
    running = false;
    cancelAnimationFrame(raf);
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onResize);
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    scene.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      const mat = m.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        (x as MeshStandardMaterial).map?.dispose();
        x.dispose();
      });
    });
    renderer.dispose();
  };
  // Al salir: si la página entra en la caché de retroceso se pausa (y se reanuda al volver); si no, se libera todo
  addEventListener('pagehide', (e) => {
    if (e.persisted) running = false;
    else dispose();
  });
  addEventListener('pageshow', (e) => {
    if (e.persisted && !root.classList.contains('gl-fail')) {
      running = true;
      last = 0;
      layout();
    }
  });

  layout();
  // Compilación de shaders en paralelo cuando el navegador lo permite (evita un bloqueo largo del hilo principal)
  if (renderer.extensions.has('KHR_parallel_shader_compile')) {
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      /* se compilará en el primer dibujo */
    }
  }
  kick();
  return true;
}
