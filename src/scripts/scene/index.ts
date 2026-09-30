/* Escena 3D persistente del portfolio (Three.js).
   Un único canvas fijo; los objetos cambian de estado según el scroll:
   nombre (hero) → introducción → botella de Cordero (tramo fijado breve).
   Todo el texto vive en el HTML; el canvas es solo ambiente y objetos. */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
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
  SRGBColorSpace,
  SpotLight,
  TextureLoader,
  Vector2,
  Vector3,
  Box3,
  WebGLRenderer,
} from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from '../../assets/3d/anton-subset.json';
import bottleProfile from '../../assets/3d/bottle-profile.json';
import labelFrontUrl from '../../assets/3d/label-front.png?url';
import labelBackUrl from '../../assets/3d/label-back.png?url';
import bfSvg from '../../assets/3d/bf-isologo.svg?raw';

gsap.registerPlugin(ScrollTrigger);

type Tier = 'high' | 'mid' | 'low';
const $ = (s: string) => document.querySelector<HTMLElement>(s);
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

/** Estado objetivo de la escena. Las fracciones son de la altura/anchura visible. */
const S = {
  // nombre
  tx: 0, ty: 0.02, tz: 0, try: 0, ts: 1, to: 1,
  // botella
  bx: 0.27, by: -1.3, bry: -0.35, bs: 1, bo: 0,
  // tarjeta (Be Fresh)
  cx: 0.26, cy: -1.3, crx: 0.18, cry: -0.45, cs: 1, co: 0,
  mono: 0,
  // ambiente
  wall: 1, glow: 0.4,
};

export async function startScene(): Promise<boolean> {
  const host = $('#gl');
  const canvas = host?.querySelector('canvas') as HTMLCanvasElement | null;
  if (!host || !canvas) return false;

  /* ---------- Calidad adaptable ---------- */
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const tier: Tier = coarse || mem <= 4 || cores <= 4 ? (mem <= 2 || cores <= 2 ? 'low' : 'mid') : 'high';
  let dpr = Math.min(devicePixelRatio, tier === 'high' ? 2 : tier === 'mid' ? 1.5 : 1.15);

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: tier !== 'low', alpha: false, powerPreference: 'high-performance' });
  } catch {
    return false;
  }
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  const shadows = tier === 'high';
  if (shadows) {
    renderer.shadowMap.enabled = true;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  const FOV = 28;
  const dist = 5 / Math.tan((FOV / 2) * (Math.PI / 180)); // 10 unidades de alto visibles en z=0
  camera.position.set(0, 0, dist);

  /* ---------- Entorno de estudio (reflejos): softboxes blanco y rojo ---------- */
  const envScene = new Scene();
  const room = new Mesh(new BoxGeometry(40, 30, 40), new MeshBasicMaterial({ color: 0x050505, side: 1 }));
  envScene.add(room);
  const panel = (w: number, h: number, c: number, k: number, x: number, y: number, z: number, ry: number) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(c).multiplyScalar(k), side: 2 }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    envScene.add(m);
  };
  panel(14, 9, 0xffffff, 9, -12, 7, 8, 0.9); // softbox principal, arriba a la izquierda
  panel(2.2, 20, 0xff2a1a, 11, 13, 2, -2, -1.2); // tira roja lateral
  panel(18, 2, 0xffffff, 3, 0, 13, 4, 0); // luz cenital fina
  panel(12, 6, 0x7c0000, 3, 0, -12, 3, 0); // rebote rojo desde abajo
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(envScene, 0.035).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;

  /* ---------- Luces ---------- */
  const key = new SpotLight(0xfff1e4, 420, 60, 0.42, 1, 1.4);
  key.position.set(-8, 7, 14);
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 5;
    key.shadow.camera.near = 8;
    key.shadow.camera.far = 40;
  }
  const rim = new PointLight(0xff1e14, 70, 22, 2);
  rim.position.set(9, 1, -0.6);
  scene.add(rim);
  // Luz rasante para el relieve de la tarjeta (solo se enciende en Be Fresh)
  const rake = new SpotLight(0xffffff, 0, 60, 0.42, 1, 1.4);
  rake.position.set(-11, -4, 5);
  rake.target.position.set(0, 0, 0);
  scene.add(rake, rake.target);
  const fill = new DirectionalLight(0xffffff, 0.35);
  fill.position.set(4, 3, 10);
  scene.add(fill);

  /* ---------- Muro de estudio (cicloramas): da profundidad y recibe sombras ---------- */
  const wallMat = new MeshStandardMaterial({ color: 0x1b0505, roughness: 1, metalness: 0, transparent: true, envMapIntensity: 0.12 });
  const wall = new Mesh(new PlaneGeometry(90, 60), wallMat);
  wall.position.z = -6.5;
  wall.receiveShadow = true;
  scene.add(wall);

  /* ---------- Nombre en 3D ---------- */
  const font = new Font(fontJson as never);
  const faceMat = new MeshPhysicalMaterial({ color: 0xeae6df, roughness: 0.5, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.4, transparent: true, envMapIntensity: 0.7 });
  const sideMat = new MeshPhysicalMaterial({ color: 0x8a0000, roughness: 0.28, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15, transparent: true });
  const letters = new Group();
  const lineDefs = ['AGUSTÍN', 'HIDALGO'];
  const capOf = (() => {
    const g = new TextGeometry('H', { font, size: 1, depth: 0.1, curveSegments: 4 });
    g.computeBoundingBox();
    return g.boundingBox!.max.y;
  })();
  const lineWidths: number[] = [];
  lineDefs.forEach((t, i) => {
    const g = new TextGeometry(t, {
      font, size: 1, depth: 0.26, curveSegments: shadows ? 8 : 5,
      bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.014, bevelSegments: 2,
    });
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    g.translate(-bb.min.x, 0, 0);
    lineWidths.push(bb.max.x - bb.min.x);
    const m = new Mesh(g, [faceMat, sideMat]);
    m.castShadow = shadows;
    m.position.y = -i * capOf * 1.075;
    letters.add(m);
  });
  const blockW = Math.max(...lineWidths);
  const blockH = capOf * (1 + 1.075);
  // Centrado del bloque (alineado a la izquierda entre líneas)
  letters.children.forEach((m) => {
    m.position.x = -blockW / 2;
    m.position.y += blockH / 2 - capOf;
  });
  scene.add(letters);

  /* ---------- Botella de Cordero ----------
     Geometría: perfil de revolución medido sobre la fotografía real del frente (silueta).
     Etiquetas: recortes fotográficos reales del PDF (frente y dorso) con su borde rasgado. */
  const bottle = new Group();
  const H = 1;
  const prof = (bottleProfile as [number, number][]).map(([y, r]) => new Vector2(r, y * H));
  const CAP_Y = 0.79;
  const glass = new MeshPhysicalMaterial({
    color: 0x070908, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04,
    envMapIntensity: 2.8, ior: 1.5, specularIntensity: 1,
  });
  const bodyPts = [new Vector2(0, 0), new Vector2(prof[0].x * 0.85, 0), ...prof.filter((p) => p.y <= CAP_Y + 0.01)];
  const body = new Mesh(new LatheGeometry(bodyPts, 72), glass);
  body.castShadow = shadows;
  bottle.add(body);
  const capMat = new MeshPhysicalMaterial({ color: 0x4a0f22, roughness: 0.34, metalness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const capPts = [...prof.filter((p) => p.y >= CAP_Y).map((p) => new Vector2(p.x * 1.035, p.y)), new Vector2(prof[prof.length - 1].x * 1.035, 1), new Vector2(0, 1)];
  const cap = new Mesh(new LatheGeometry(capPts, 48), capMat);
  cap.castShadow = shadows;
  bottle.add(cap);

  const loader = new TextureLoader();
  const [texF, texB] = await Promise.all([loader.loadAsync(labelFrontUrl), loader.loadAsync(labelBackUrl)]);
  [texF, texB].forEach((t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
  });
  const bodyR = Math.max(...bodyPts.map((p) => p.x));
  const makeLabel = (tex: typeof texF, y0: number, y1: number, half: number, flip: boolean) => {
    const arc = half * 2;
    const g = new CylinderGeometry(bodyR + 0.0012, bodyR + 0.0012, y1 - y0, 64, 1, true, -half, arc);
    // La foto es una proyección del cilindro: u = sen(ángulo) reproduce fielmente la curvatura.
    const pos = g.attributes.position;
    const uv: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const phi = Math.atan2(pos.getX(i), pos.getZ(i));
      uv.push((Math.sin(phi) / Math.sin(half) + 1) / 2, (pos.getY(i) / (y1 - y0) + 0.5));
    }
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    const m = new Mesh(g, new MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0, bumpMap: tex, bumpScale: 1.2, alphaTest: 0.4 }));
    m.position.y = (y0 + y1) / 2;
    if (flip) m.rotation.y = Math.PI;
    return m;
  };
  bottle.add(makeLabel(texF, 0.1664, 0.6352, 1.36, false)); // frente
  bottle.add(makeLabel(texB, 0.1754, 0.6365, 1.36, true)); // dorso
  bottle.position.y = -H * 0.5;
  const bottleRoot = new Group();
  bottleRoot.add(bottle);
  scene.add(bottleRoot);

  /* ---------- Tarjeta de Be Fresh: isologo vectorial extruido (archivo original) ---------- */
  const cardMat = new MeshStandardMaterial({ color: 0x060607, roughness: 0.88, metalness: 0.04, transparent: true, envMapIntensity: 0.3 });
  const bfMat = new MeshStandardMaterial({ color: 0x2a2a2d, roughness: 0.2, metalness: 0.7, transparent: true });
  const card = new Group();
  const CW = 1, CH = 0.78, CD = 0.03;
  const cs = new Shape();
  cs.moveTo(-CW / 2, -CH / 2); cs.lineTo(CW / 2, -CH / 2); cs.lineTo(CW / 2, CH / 2); cs.lineTo(-CW / 2, CH / 2); cs.closePath();
  const cardGeo = new ExtrudeGeometry(cs, { depth: CD, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
  cardGeo.translate(0, 0, -CD / 2);
  const cardMesh = new Mesh(cardGeo, cardMat);
  cardMesh.castShadow = shadows;
  cardMesh.receiveShadow = shadows;
  card.add(cardMesh);
  const svg = new SVGLoader().parse(bfSvg);
  const bfGroup = new Group();
  svg.paths.forEach((p) => {
    p.toShapes().forEach((shape) => {
      const g = new ExtrudeGeometry(shape, { depth: 5, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.7, bevelSegments: 3, curveSegments: 10 });
      const m = new Mesh(g, bfMat);
      m.castShadow = shadows;
      bfGroup.add(m);
    });
  });
  {
    // Centrar y escalar el isologo (el SVG tiene el eje Y hacia abajo → se invierte al escalar)
    const box = new Box3().setFromObject(bfGroup);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    bfGroup.children.forEach((c) => c.position.sub(center));
    const k = (CW * 0.5) / size.x;
    bfGroup.scale.set(k, -k, k);
    bfGroup.position.z = CD / 2 + 0.001;
  }
  card.add(bfGroup);
  const cardRoot = new Group();
  cardRoot.add(card);
  scene.add(cardRoot);

  // Halo de luz bajo la botella (decal aditivo, no una superficie inventada)
  const glowCv = document.createElement('canvas');
  glowCv.width = glowCv.height = 128;
  const gx = glowCv.getContext('2d')!;
  const grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,40,30,0.85)');
  grd.addColorStop(0.45, 'rgba(140,0,0,0.35)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  gx.fillStyle = grd;
  gx.fillRect(0, 0, 128, 128);
  const glowMat = new MeshBasicMaterial({ map: new CanvasTexture(glowCv), blending: AdditiveBlending, transparent: true, depthWrite: false });
  const glow = new Mesh(new PlaneGeometry(1, 1), glowMat);
  glow.position.z = -1.5;
  scene.add(glow);

  /* ---------- Tamaño / composición por dispositivo ---------- */
  let vw = 10, vh = 10, mobile = false, baseScale = 1, bottleScale = 1, cardScale = 1, lk = 1;
  const resize = () => {
    const w = host.clientWidth || innerWidth;
    const h = host.clientHeight || innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    vh = 10;
    vw = 10 * camera.aspect;
    mobile = camera.aspect < 0.85;
    lk = Math.min(1, camera.aspect / 1.6); // las luces se acercan al encuadre en pantallas angostas
    const fitW = (vw * (mobile ? 0.9 : 0.86)) / blockW;
    const fitH = (vh * (mobile ? 0.3 : 0.64)) / blockH;
    baseScale = Math.min(fitW, fitH);
    bottleScale = vh * (mobile ? 0.5 : 0.74);
    cardScale = Math.min(vh * (mobile ? 0.4 : 0.62), vw * (mobile ? 0.8 : 0.4));
    ScrollTrigger.refresh();
  };
  addEventListener('resize', resize);
  resize();

  /* ---------- Puntero ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!coarse) {
    addEventListener('pointermove', (e) => {
      ptr.tx = (e.clientX / innerWidth) * 2 - 1;
      ptr.ty = (e.clientY / innerHeight) * 2 - 1;
    });
  }

  /* ---------- Recorrido: estados vinculados al scroll ----------
     nombre → introducción → botella (frente, dorso) → tarjeta Be Fresh → salida. */
  const hasBottle = !!$('#stage-bottle');
  const hasCard = !!$('#stage-card');
  const firstStage = hasBottle ? '#stage-bottle' : '#stage-card';
  const mm = gsap.matchMedia();
  // Todos los tramos declaran su valor inicial: el estado depende solo del scroll,
  // no de la historia (recargar a mitad de página o saltar a un ancla da el mismo resultado).
  const FT = (trigger: string, start: string, end: string, from: gsap.TweenVars, to: gsap.TweenVars) =>
    gsap.fromTo(S, from, { ...to, ease: 'none', immediateRender: false, scrollTrigger: { trigger, start, end, scrub: 0.9 } });
  const stageTL = (id: string) =>
    gsap.timeline({ scrollTrigger: { trigger: id, start: 'top top', end: 'bottom bottom', scrub: 0.9 }, defaults: { ease: 'power1.inOut' } });
  const TAU = Math.PI * 2;

  const build = (desk: boolean) => {
    const introTo = desk ? { tx: 0.27, ty: 0.03, try: -0.5, ts: 0.5, to: 0.75 } : { tx: 0, ty: 0.34, try: 0, ts: 0.46, to: 0.8 };
    FT('#introduccion', 'top 90%', 'top 30%', { tx: 0, ty: 0.02, try: 0, ts: 1, to: 1 }, introTo);
    FT(firstStage, 'top 85%', 'top 30%', { tz: 0, to: introTo.to }, { tz: -4.5, to: 0 });
    if (hasBottle) {
      const b0 = desk ? { by: -1.3, bo: 0, bx: 0.26, bry: -0.6, bs: 1, glow: 0 } : { by: 0.9, bo: 0, bx: 0, bry: -0.6, bs: 0.82, glow: 0 };
      const b1 = desk ? { by: 0, bo: 1, bx: 0.26, bry: -0.32, bs: 1, glow: 1 } : { by: 0.2, bo: 1, bx: 0, bry: -0.3, bs: 0.82, glow: 1 };
      FT('#stage-bottle', 'top 85%', 'top 30%', b0, b1);
      const tl = stageTL('#stage-bottle');
      const bs0 = desk ? 1 : 0.82;
      tl.fromTo(S, { bry: b1.bry }, { bry: -0.08, duration: 2.8, ease: 'none', immediateRender: false }, 0)
        .fromTo(S, desk ? { bx: 0.26, bs: bs0 } : { bs: bs0 }, desk ? { bx: 0, bry: Math.PI + 0.1, bs: 0.92, duration: 1.4, immediateRender: false } : { bry: Math.PI + 0.1, bs: 0.74, duration: 1.4, immediateRender: false }, 2.8)
        .to(S, { bry: Math.PI + 0.3, duration: 2.0, ease: 'none' }, 4.2)
        .to(S, desk ? { bx: 0.26, bry: TAU + 0.12, bs: 1, duration: 1.5 } : { bry: TAU + 0.12, bs: 0.82, duration: 1.5 }, 6.2)
        .to(S, { bry: TAU + 0.22, duration: 2.3, ease: 'none' }, 7.7);
    }
    if (hasCard) {
      const c1 = { cy: desk ? 0 : 0.2, co: 1, cx: desk ? 0.26 : 0, cry: -0.45, crx: 0.18, cs: desk ? 1 : 0.86, mono: 1 };
      const c0 = { cy: desk ? -1.3 : 0.9, co: 0, cx: c1.cx, cry: -0.8, crx: 0.18, cs: c1.cs, mono: 0 };
      FT('#stage-card', 'top 90%', 'top 35%', c0, c1);
      if (hasBottle) {
        const bEnd = { by: desk ? 0 : 0.2, bo: 1, glow: 1 };
        FT('#stage-card', 'top 90%', 'top 35%', bEnd, { by: 1.4, bo: 0, glow: 0 });
      }
      const tl = stageTL('#stage-card');
      tl.fromTo(S, { cry: c1.cry, crx: c1.crx }, { cry: -0.25, crx: 0.16, duration: 2.8, ease: 'none', immediateRender: false }, 0)
        .fromTo(S, desk ? { cx: 0.26, cs: 1 } : { cs: 0.86 }, desk ? { cx: -0.03, cry: 0.42, crx: 0.32, cs: 0.76, duration: 1.4, immediateRender: false } : { cry: 0.42, crx: 0.32, cs: 0.8, duration: 1.4, immediateRender: false }, 2.8)
        .to(S, { cry: 0.55, duration: 2.0, ease: 'none' }, 4.2)
        .to(S, desk ? { cx: 0.26, cry: -0.2, crx: 0.14, cs: 1, duration: 1.5 } : { cry: -0.2, crx: 0.14, cs: 0.86, duration: 1.5 }, 6.2)
        .to(S, { cry: -0.1, duration: 2.3, ease: 'none' }, 7.7);
    }
    if ($('#scene-end')) {
      // Salida hacia el resto de la página
      if (hasCard) FT('#scene-end', 'top bottom', 'top 30%', { cy: desk ? 0 : 0.2, co: 1 }, { cy: 1.4, co: 0 });
      else FT('#scene-end', 'top bottom', 'top 30%', { by: desk ? 0 : 0.2, bo: 1, glow: 1 }, { by: 1.4, bo: 0, glow: 0 });
    }
  };
  mm.add('(min-aspect-ratio: 17/20)', () => build(true));
  mm.add('(max-aspect-ratio: 16.99/20)', () => build(false));

  // Paso activo de cada tramo fijado (solo cambia texto HTML)
  ['#stage-bottle', '#stage-card'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: id,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const step = self.progress < 0.34 ? '1' : self.progress < 0.68 ? '2' : '3';
        if (el.dataset.step !== step) el.dataset.step = step;
      },
    });
  });

  /* ---------- Bucle ---------- */
  const cur = { ...S };
  let running = true;
  let visible = true;
  let last = performance.now();
  let slow = 0, frames = 0;
  const redC = new Color(0x1b0505), greyC = new Color(0x0d0d0e), rimRed = new Color(0xff1e14), rimWhite = new Color(0xdfe4ff);
  const updateVisibility = () => {
    const end = $('#scene-end');
    const past = end ? end.getBoundingClientRect().top < -innerHeight * 0.2 : false;
    visible = !past;
    host.classList.toggle('is-off', past);
  };
  addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    last = performance.now();
    if (running) requestAnimationFrame(frame);
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    document.documentElement.classList.remove('gl-on');
    document.documentElement.classList.add('gl-fail');
  });

  function frame(now: number) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible) {
      last = now;
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.12);
    last = now;
    // Calidad adaptable: si el dispositivo no sostiene ~40 fps, baja la resolución de render
    frames++;
    if (dt > 0.026) slow++;
    if (frames === 90) {
      if (slow > 45 && dpr > 0.9) {
        dpr = Math.max(0.9, dpr * 0.8);
        resize();
      }
      frames = 0;
      slow = 0;
    }
    ptr.x = damp(ptr.x, ptr.tx, 3, dt);
    ptr.y = damp(ptr.y, ptr.ty, 3, dt);
    (Object.keys(S) as (keyof typeof S)[]).forEach((k) => (cur[k] = damp(cur[k], S[k], 6, dt)));

    // Nombre
    letters.visible = cur.to > 0.01;
    letters.position.set(cur.tx * vw, cur.ty * vh, cur.tz);
    letters.rotation.set(0.04 + ptr.y * 0.06, cur.try - 0.13 + ptr.x * 0.14, 0);
    letters.scale.setScalar(baseScale * cur.ts);
    faceMat.opacity = sideMat.opacity = cur.to;
    // Botella
    bottleRoot.visible = cur.bo > 0.01;
    bottleRoot.position.set(cur.bx * vw, cur.by * vh, 0);
    bottleRoot.scale.setScalar(bottleScale * cur.bs);
    bottleRoot.rotation.set(0, cur.bry + ptr.x * 0.16, -0.05 + ptr.x * 0.02);
    glow.visible = cur.bo > 0.01;
    glow.position.set(cur.bx * vw, cur.by * vh - bottleScale * cur.bs * 0.5, -1.4);
    glow.scale.setScalar(bottleScale * 1.6);
    glowMat.opacity = cur.bo * cur.glow * 0.55;
    // Tarjeta
    cardRoot.visible = cur.co > 0.01;
    cardRoot.position.set(cur.cx * vw, cur.cy * vh, 0);
    cardRoot.scale.setScalar(cardScale * cur.cs);
    cardRoot.rotation.set(cur.crx - ptr.y * 0.08, cur.cry + ptr.x * 0.16, 0);
    cardMat.opacity = bfMat.opacity = cur.co;
    // Ambiente: rojo (Cordero) → monocromo (Be Fresh)
    wallMat.color.copy(redC).lerp(greyC, cur.mono);
    rim.color.copy(rimRed).lerp(rimWhite, cur.mono);
    // Luz clave: sigue suavemente al puntero para "barrer" el material
    key.position.x = (-8 + ptr.x * 4.5) * (0.35 + 0.65 * lk);
    rim.position.x = 9 * (0.28 + 0.72 * lk);
    key.position.y = 7 - ptr.y * 2.5;
    const objects = Math.max(cur.bo, cur.co);
    rim.intensity = (70 + objects * 70 + cur.co * 60) * (1 + (1 - lk) * (1.4 - cur.mono * 1.1));
    key.intensity = 420 * (1 - cur.co * 0.65);
    scene.environmentIntensity = 0.55 - cur.mono * 0.22;
    rake.intensity = cur.co * 230 * lk * lk;
    fill.intensity = 0.35 + cur.bo * (1.9 + (1 - lk) * 1.6) + cur.co * 0.5 * lk;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // Render inicial antes de mostrar el canvas para evitar un fogonazo vacío
  renderer.render(scene, camera);
  return true;
}
