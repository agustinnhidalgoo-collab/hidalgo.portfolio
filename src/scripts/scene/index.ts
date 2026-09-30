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
  SRGBColorSpace,
  SpotLight,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from '../../assets/3d/anton-subset.json';
import labelUrl from '../../assets/3d/etiqueta-cordero.jpg?url';

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

  /* ---------- Botella de Cordero (modelo simplificado provisional) ---------- */
  const bottle = new Group();
  const H = 1; // altura unitaria
  const prof = [
    [0.0, 0.0], [0.104, 0.0], [0.111, 0.008], [0.1135, 0.02], [0.1135, 0.5],
    [0.111, 0.53], [0.102, 0.57], [0.086, 0.612], [0.068, 0.655], [0.053, 0.7],
    [0.0455, 0.74], [0.0435, 0.78], [0.0435, 0.9], [0.0435, 0.93], [0.0, 0.93],
  ].map(([r, y]) => new Vector2(r, y * H));
  const glass = new MeshPhysicalMaterial({
    color: 0x070908, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04,
    envMapIntensity: 2.8, ior: 1.5, specularIntensity: 1,
  });
  const body = new Mesh(new LatheGeometry(prof, 64), glass);
  body.castShadow = shadows;
  bottle.add(body);
  // Cápsula (color tomado de la cápsula fotografiada)
  const capMat = new MeshPhysicalMaterial({ color: 0x4a0a12, roughness: 0.32, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const cap = new Mesh(new CylinderGeometry(0.0495, 0.0495, 0.19, 48), capMat);
  cap.position.y = 0.89;
  cap.castShadow = shadows;
  bottle.add(cap);
  const capTop = new Mesh(new CylinderGeometry(0.0495, 0.0495, 0.004, 48), capMat);
  capTop.position.y = 0.985;
  bottle.add(capTop);
  // Etiqueta: textura provisional recortada del video (solo cara frontal)
  const tex = await new TextureLoader().loadAsync(labelUrl);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const labelH = 0.31;
  const labelW = labelH * (112 / 225);
  const arc = labelW / 0.1145;
  const labelMat = new MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0, bumpMap: tex, bumpScale: 1.4 });
  const label = new Mesh(new CylinderGeometry(0.1145, 0.1145, labelH, 48, 1, true, -arc / 2, arc), labelMat);
  label.position.y = 0.3;
  bottle.add(label);
  bottle.position.y = -H * 0.5;
  const bottleRoot = new Group();
  bottleRoot.add(bottle);
  scene.add(bottleRoot);

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
  let vw = 10, vh = 10, mobile = false, baseScale = 1, bottleScale = 1, lk = 1;
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

  /* ---------- Recorrido: estados vinculados al scroll ---------- */
  const mm = gsap.matchMedia();
  const T = (trigger: string, start: string, end: string, vars: gsap.TweenVars, at?: string) =>
    gsap.to(S, { ...vars, ease: 'none', immediateRender: false, scrollTrigger: { trigger, start, end, scrub: 0.9, ...(at ? {} : {}) } });

  mm.add('(min-aspect-ratio: 17/20)', () => {
    // Escritorio / horizontal
    T('#introduccion', 'top 90%', 'top 30%', { tx: 0.27, ty: 0.03, try: -0.5, ts: 0.5, to: 0.75 });
    T('#cordero', 'top 85%', 'top 30%', { tz: -4.5, to: 0, by: 0, bo: 1, bx: 0.26, bry: -0.32, glow: 1 });
    const st = { trigger: '#cordero', start: 'top top', end: 'bottom bottom', scrub: 0.9 };
    gsap.timeline({ scrollTrigger: st, defaults: { ease: 'power1.inOut' } })
      .to(S, { bry: -0.08, duration: 2.8, ease: 'none' }, 0)
      .to(S, { bx: 0.0, bry: 0.42, bs: 0.92, duration: 1.3 }, 2.8)
      .to(S, { bry: 0.5, duration: 2.1, ease: 'none' }, 4.1)
      .to(S, { bx: 0.26, bry: 0.12, bs: 1, duration: 1.3 }, 6.2)
      .to(S, { bry: 0.2, duration: 2.5, ease: 'none' }, 7.5);
    T('#cordero-end', 'top bottom', 'top 30%', { by: 1.4, bo: 0, glow: 0 });
  });
  mm.add('(max-aspect-ratio: 16.99/20)', () => {
    // Móvil vertical: composición propia (nombre arriba, botella arriba y texto abajo)
    T('#introduccion', 'top 90%', 'top 35%', { tx: 0, ty: 0.34, try: 0, ts: 0.46, to: 0.8 });
    T('#cordero', 'top 85%', 'top 30%', { tz: -4.5, to: 0, by: 0.2, bo: 1, bx: 0, bry: -0.3, bs: 0.82, glow: 1 });
    const st = { trigger: '#cordero', start: 'top top', end: 'bottom bottom', scrub: 0.9 };
    gsap.timeline({ scrollTrigger: st, defaults: { ease: 'power1.inOut' } })
      .to(S, { bry: -0.08, duration: 2.8, ease: 'none' }, 0)
      .to(S, { bry: 0.42, bs: 0.74, duration: 1.3 }, 2.8)
      .to(S, { bry: 0.5, duration: 2.1, ease: 'none' }, 4.1)
      .to(S, { bry: 0.12, bs: 0.82, duration: 1.3 }, 6.2)
      .to(S, { bry: 0.2, duration: 2.5, ease: 'none' }, 7.5);
    T('#cordero-end', 'top bottom', 'top 30%', { by: 1.4, bo: 0, glow: 0 });
  });

  // Paso activo del tramo fijado (solo cambia texto HTML)
  const stage = $('#cordero');
  ScrollTrigger.create({
    trigger: '#cordero',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const step = self.progress < 0.34 ? '1' : self.progress < 0.68 ? '2' : '3';
      if (stage && stage.dataset.step !== step) stage.dataset.step = step;
    },
  });

  /* ---------- Bucle ---------- */
  const cur = { ...S };
  let running = true;
  let visible = true;
  let last = performance.now();
  let slow = 0, frames = 0;
  const updateVisibility = () => {
    const end = $('#cordero-end');
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
    const dt = Math.min((now - last) / 1000, 0.05);
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
    // Luz clave: sigue suavemente al puntero para "barrer" el material
    key.position.x = (-8 + ptr.x * 4.5) * (0.35 + 0.65 * lk);
    rim.position.x = 9 * (0.28 + 0.72 * lk);
    key.position.y = 7 - ptr.y * 2.5;
    rim.intensity = (70 + cur.bo * 70) * (1 + (1 - lk) * 1.4);
    fill.intensity = 0.35 + cur.bo * (1.9 + (1 - lk) * 1.6);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // Render inicial antes de mostrar el canvas para evitar un fogonazo vacío
  renderer.render(scene, camera);
  return true;
}
