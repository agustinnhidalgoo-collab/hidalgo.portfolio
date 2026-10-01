/* Escena 3D del portfolio (Three.js).
   Recorrido: apertura con el nombre en 3D y el retrato en capas (una fila de letras detrás y otra delante),
   sin nada más. Al bajar, la botella de «Cordero con piel de lobo» sube desde abajo y se ARMA con el scroll
   (trazo técnico → vidrio → etiqueta → acabado). En Be Fresh la protagonista es solo la capa de barbero,
   que también se arma (patrón → tela) y ondula.

   Principios:
   - El estado de la escena es una FUNCIÓN PURA de la posición de scroll y del layout actual:
     recargar a mitad de página, retroceder, redimensionar o saltar a un ancla dan el mismo resultado.
   - La composición sale del HTML: cada objeto se coloca sobre elementos `[data-slot]`; el CSS decide
     dónde va cada pieza en escritorio, tablet y móvil.
   - El canvas es transparente y decorativo. Todo el texto vive en el DOM.
   - Solo se dibuja cuando algo cambia y hay un objeto a la vista. */
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  Group,
  Matrix4,
  LineBasicMaterial,
  LineSegments,
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
  SpotLight,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from '../../assets/3d/anton-subset.json';
import bottleProfile from '../../assets/3d/bottle-profile.json';
import labelFrontUrl from '../../assets/3d/label-front.webp?url';
import labelBackUrl from '../../assets/3d/label-back.webp?url';
import { createAvatar, AVATAR_ASPECT } from './avatar';
import { createCloth } from './cloth';
import { createPhoneAvatar, PHONE_ASPECT } from './phone';
import { createSplash, E_BREAK, makeFracture, patchCapeForm, patchShatter, shatterGeometry, type BurstUniforms } from './burst';
import capeUrl from '../../assets/3d/capa.webp?url';

type Tier = 'high' | 'mid' | 'low';
/** Pose en px de viewport. s: alto (botella/retrato/máquina), ancho (tarjeta) o escala de glifo (nombre). */
interface Pose { x: number; y: number; s: number; ry: number; rx: number; rz: number }
interface Key { y: number; v: Pose; lin?: boolean }
interface Track { keys: Key[] }
interface SlotRect { cx: number; cy: number; w: number; h: number; i: number }

const $ = <T extends HTMLElement>(s: string, c: ParentNode = document) => c.querySelector<T>(s);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const PI = Math.PI;
const OFF: Pose = { x: 0, y: -9999, s: 1, ry: 0, rx: 0, rz: 0 };

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
  const m = (p: number, q: number) => p + (q - p) * t;
  return { x: m(a.v.x, b.v.x), y: m(a.v.y, b.v.y), s: m(a.v.s, b.v.s), ry: m(a.v.ry, b.v.ry), rx: m(a.v.rx, b.v.rx), rz: m(a.v.rz, b.v.rz) };
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
  const DIST = UNITS_H / 2 / Math.tan((FOV / 2) * (PI / 180));
  camera.position.set(0, 0, DIST);

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

  /* ---------- Armado por scroll ----------
     Un recorte por altura (con borde rojo luminoso) deja aparecer cada pieza "como si se dibujara":
     la botella se arma de abajo hacia arriba; la capa, de arriba hacia abajo. Todo es función del scroll. */
  interface Cut { uLim: { value: number }; uGlow: { value: number } }
  const mkCut = (): Cut => ({ uLim: { value: 0 }, uGlow: { value: 0 } });
  const applyCut = (sh: { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string }, u: Cut, expr: string, glow: boolean) => {
    sh.uniforms.uLim = u.uLim;
    sh.uniforms.uGlow = u.uGlow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vCut;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvCut = ${expr};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCut;\nuniform float uLim;\nuniform float uGlow;')
      .replace('void main() {', 'void main() {\n  if (vCut > uLim) discard;');
    if (glow) {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\n  gl_FragColor.rgb += vec3(1.0, 0.17, 0.1) * uGlow * (1.0 - smoothstep(0.0, 0.03, uLim - vCut));',
      );
    }
  };
  const cutMat = (m: { onBeforeCompile: unknown }, u: Cut, expr: string, glow = true) => {
    m.onBeforeCompile = (sh: Parameters<typeof applyCut>[0]) => applyCut(sh, u, expr, glow);
  };
  const part = (a: number, b: number, k: number) => clamp((k - a) / (b - a), 0, 1); // tramo [a,b] de 0 a 1
  const bU = mkCut(), lU = mkCut(), wU = mkCut(); // botella: vidrio/tapa, etiquetas, trazo técnico
  const cU = mkCut(), gU = mkCut(); // capa: tela y patrón

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

  /* ---------- Nombre en 3D: dos filas a distinta profundidad (retrato en medio) ---------- */
  const font = new Font(fontJson as never);
  const faceMat = new MeshPhysicalMaterial({ color: 0xeae6df, roughness: 0.5, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.4, envMapIntensity: 0.7 });
  const sideMat = new MeshPhysicalMaterial({ color: 0x8a0000, roughness: 0.28, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
  const rowGroups: Group[] = [];
  const capOf = (() => {
    const g = new TextGeometry('H', { font, size: 1, depth: 0.1, curveSegments: 4 });
    g.computeBoundingBox();
    const h = g.boundingBox!.max.y;
    g.dispose();
    return h;
  })();
  const LINE = 1.075;
  const lineWidths: number[] = [];
  const ROW_Z = [-0.9, 0.7]; // primera fila detrás del avatar, segunda delante (unidades de mundo)
  // Las filas salen del texto del [data-slot="name"] (hoy: «Muchas gracias», en el cierre de contacto)
  const nameRows = [...(document.querySelector('[data-slot="name"]')?.children ?? [])].map((el) => (el.textContent || '').trim().toUpperCase()).filter(Boolean).slice(0, 2);
  nameRows.forEach((t) => {
    const g = new TextGeometry(t, {
      font, size: 1, depth: 0.26, curveSegments: tier === 'high' ? 8 : 5,
      bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.014, bevelSegments: 2,
    });
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const lw = bb.max.x - bb.min.x;
    g.translate(-bb.min.x - lw / 2, -capOf / 2, -0.13); // origen en el centro de la fila
    lineWidths.push(lw);
    const grp = new Group();
    grp.add(new Mesh(g, [faceMat, sideMat]));
    rowGroups.push(grp);
    scene.add(grp);
  });
  const blockH = capOf * (1 + LINE);

  /* ---------- Avatar 3D: títere con relieve que gira la cabeza, mueve los ojos y parpadea (./avatar.ts) ---------- */
  let ready = false; // el layout solo puede ejecutarse cuando todo el estado está declarado
  const avatar = createAvatar(tier, () => {
    if (ready) layout();
  });
  const portrait = avatar.mesh;
  scene.add(portrait);
  const portAspect = AVATAR_ASPECT; // el recuadro de la portada tiene la proporción de la imagen
  // Cierre (contacto): el muñeco con el teléfono (./phone.ts)
  const phoneAv = createPhoneAvatar(tier, () => {
    if (ready) layout();
  });
  scene.add(phoneAv.mesh);

  /* Guiño: lo dispara ui.ts (al pasar el puntero por la cara o al tocarla) */
  const WINK_MS = 520;
  let winkAt = -Infinity;
  addEventListener('portfolio:wink', () => {
    winkAt = performance.now();
    kick();
  });

  /* ---------- Botella de Cordero ----------
     Silueta: perfil medido sobre la fotografía real del frente. Etiquetas: recortes reales del PDF de envases. */
  const bottle = new Group();
  const prof = (bottleProfile as [number, number][]).map(([y, r]) => new Vector2(r, y));
  const CAP_Y = 0.79;
  const glass = new MeshPhysicalMaterial({ color: 0x070908, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.9, ior: 1.5 });
  const bodyPts = [new Vector2(0, 0), new Vector2(prof[0].x * 0.85, 0), ...prof.filter((p) => p.y <= CAP_Y + 0.01)];
  cutMat(glass, bU, 'position.y');
  const glassMesh = new Mesh<BufferGeometry, MeshPhysicalMaterial>(new LatheGeometry(bodyPts, seg), glass);
  bottle.add(glassMesh);
  const capMat = new MeshPhysicalMaterial({ color: 0x4a0f22, roughness: 0.3, metalness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.22, envMapIntensity: 1.5 });
  const capPts = [...prof.filter((p) => p.y >= CAP_Y).map((p) => new Vector2(p.x * 1.035, p.y)), new Vector2(prof[prof.length - 1].x * 1.035, 1), new Vector2(0, 1)];
  cutMat(capMat, bU, 'position.y');
  const capMesh = new Mesh<BufferGeometry, MeshPhysicalMaterial>(new LatheGeometry(capPts, Math.round(seg * 0.6)), capMat);
  bottle.add(capMesh);
  const bodyR = Math.max(...bodyPts.map((p) => p.x));
  // Fractura (./burst.ts): vidrio, tapa y etiquetas se parten por las mismas líneas, así cada pedazo de etiqueta
  // viaja con su vidrio. Las grietas que brillan antes del estallido son exactamente esas líneas.
  const radiusAt = (y: number) => {
    for (let i = 1; i < prof.length; i++) if (prof[i].y >= y) { const a = prof[i - 1], b = prof[i]; return a.x + ((b.x - a.x) * (y - a.y)) / Math.max(1e-6, b.y - a.y); }
    return prof[prof.length - 1].x;
  };
  const fracture = makeFracture(tier, bodyR, radiusAt);
  const BU: BurstUniforms = { uBurst: { value: 0 }, uCrack: { value: 0 }, uGlow: { value: 1 } };
  const ident = new Matrix4();
  glassMesh.geometry = shatterGeometry(glassMesh.geometry, ident, fracture);
  capMesh.geometry = shatterGeometry(capMesh.geometry, ident, fracture);
  glass.side = capMat.side = DoubleSide; // al partirse se ve el interior de los fragmentos
  patchShatter(glass, BU, fracture, ident, 'glass');
  patchShatter(capMat, BU, fracture, ident, 'cap');
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
    const mat = new MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0, bumpMap: tex, bumpScale: 1.1, alphaTest: 0.4 });
    cutMat(mat, lU, `position.y + ${((y0 + y1) / 2).toFixed(4)}`);
    const m = new Mesh<BufferGeometry, MeshStandardMaterial>(g, mat);
    m.position.y = (y0 + y1) / 2;
    if (flip) m.rotation.y = PI;
    m.updateMatrix();
    m.geometry = shatterGeometry(g, m.matrix, fracture);
    mat.side = DoubleSide;
    patchShatter(mat, BU, fracture, m.matrix, flip ? 'label-back' : 'label-front');
    return m;
  };
  const texF = await loadTex(labelFrontUrl); // lo único imprescindible para la apertura
  bottle.add(makeLabel(texF, 0.1664, 0.6352, 1.36, false));
  bottle.position.y = -0.5;

  /* Trazo técnico: anillos y meridianos de la silueta, guías de corte y regla. Desaparece al terminar el armado. */
  const wireMat = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
  const guideMat = new LineBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.7, toneMapped: false, depthWrite: false });
  cutMat(wireMat, wU, 'position.y', false);
  cutMat(guideMat, wU, 'position.y', false);
  {
    const w: number[] = [];
    const g: number[] = [];
    const N = tier === 'low' ? 40 : 64;
    const line = (a: number[], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => a.push(x0, y0, z0, x1, y1, z1);
    for (let i = 0; i < prof.length; i += 4) {
      const r = prof[i].x * 1.012, y = prof[i].y;
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * PI * 2, a1 = ((k + 1) / N) * PI * 2;
        line(w, Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
      }
    }
    for (let m = 0; m < 16; m++) {
      const a = (m / 16) * PI * 2;
      for (let i = 0; i < prof.length - 2; i += 2) {
        const r0 = prof[i].x * 1.012, r1 = prof[i + 2].x * 1.012;
        line(w, Math.cos(a) * r0, prof[i].y, Math.sin(a) * r0, Math.cos(a) * r1, prof[i + 2].y, Math.sin(a) * r1);
      }
    }
    // guías horizontales (base, etiqueta, hombro/tapa, cima) y regla a la derecha con marcas cada 5 %
    [0.002, 0.1664, 0.6352, CAP_Y, 0.998].forEach((y) => line(g, -0.36, y, 0, 0.36, y, 0));
    line(g, 0.3, 0, 0, 0.3, 1, 0);
    for (let k = 0; k <= 20; k++) line(g, 0.3, k / 20, 0, 0.3 + (k % 5 === 0 ? 0.045 : 0.022), k / 20, 0);
    // contorno de la etiqueta sobre el cilindro
    const rr = bodyR + 0.006, hf = 1.36;
    const pt = (a: number, y: number): [number, number, number] => [Math.sin(a) * rr, y, Math.cos(a) * rr];
    for (let k = 0; k < 28; k++) {
      const a0 = -hf + (k / 28) * hf * 2, a1 = -hf + ((k + 1) / 28) * hf * 2;
      [0.1664, 0.6352].forEach((y) => line(g, ...pt(a0, y), ...pt(a1, y)));
    }
    [-hf, hf].forEach((a) => line(g, ...pt(a, 0.1664), ...pt(a, 0.6352)));
    const geo = (arr: number[]) => {
      const b = new BufferGeometry();
      b.setAttribute('position', new Float32BufferAttribute(arr, 3));
      return b;
    };
    bottle.add(new LineSegments(geo(w), wireMat), new LineSegments(geo(g), guideMat));
  }
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

  /* ---------- Estallido: el vino de la botella se convierte en la capa (./burst.ts) ---------- */
  const splash = createSplash(tier);
  scene.add(splash.drops, splash.flash);
  const capeFormU = { uForm: { value: 1 }, uWine: { value: 0 } };
  let capeAspect = 1.25; // se corrige al cargar la imagen de la capa

  /* ---------- Be Fresh: la capa de barbero es la única protagonista (se construye al acercarse) ---------- */
  let cape: Mesh | null = null;
  let barberBuilding = false;
  const buildBarber = async () => {
    if (cape || barberBuilding) return;
    barberBuilding = true;
    // Capa de barbero: el mockup real del proyecto sobre una tela simulada (./cloth.ts), iluminada como tela
    const capeTex = await loadTex(capeUrl);
    const img = capeTex.image as HTMLImageElement;
    const ca = img.width / img.height;
    capeAspect = ca;
    cloth = createCloth(img, ca, tier);
    splash.setCapeShape(img, ca, cloth.positionAt);
    const capeMat = new MeshPhysicalMaterial({
      map: capeTex,
      color: new Color(0x9a9a9a), // negro de la tela: la foto, un poco más profunda
      emissiveMap: capeTex, // la foto conserva su lectura (logo nítido); la luz de la escena modela los pliegues
      emissive: new Color(0x262626),
      roughness: 0.68,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.45,
      sheenColor: new Color(0x5c5c5c),
      envMapIntensity: 0.35,
      side: DoubleSide,
      alphaTest: 0.5,
    });
    if (tier !== 'low') capeMat.alphaToCoverage = true; // borde suave sin ordenar transparencias
    capeMat.onBeforeCompile = (sh) => {
      applyCut(sh, cU, '(1.0 - uv.y)', true); // sin estallido: la tela "cae" de arriba hacia abajo
      patchCapeForm(sh, capeFormU); // con estallido: se materializa desde el splash, roja de vino
    };
    capeMat.customProgramCacheKey = () => 'cape-cloth';
    capeFabric = capeMat;
    cape = new Mesh(cloth.geometry, capeMat);
    cape.frustumCulled = false;
    scene.add(cape);
    if (ready) layout(); // con la proporción real de la capa
    kick();
  };
  const capeGrid: LineBasicMaterial[] = []; // (patrón de corte: ya no se usa, la capa la forma el vino)
  let cloth: ReturnType<typeof createCloth> | null = null;
  let capeFabric: MeshPhysicalMaterial | null = null;
  const sheenGray = new Color(0x5c5c5c), sheenWine = new Color(0x2a0006);
  const clothInertia = new Vector3();
  const touch = { x: 0, y: 0, at: -Infinity }; // dedo sobre la pantalla (solo para tocar la tela)
  addEventListener('pointermove', (ev) => { if (ev.pointerType === 'touch') Object.assign(touch, { x: ev.clientX, y: ev.clientY, at: performance.now() }); }, { passive: true });
  addEventListener('pointerdown', (ev) => { if (ev.pointerType === 'touch') Object.assign(touch, { x: ev.clientX, y: ev.clientY, at: performance.now() }); }, { passive: true });
  const capeMotion = { x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, init: false, px: 0, py: 0, pvx: 0, pvy: 0 };

  /* ---------- Layout: poses a partir de los elementos [data-slot] ---------- */
  const previewEl = $('[data-slot="preview"]');
  const bottleStage = $('#stage-bottle');
  const capeStage = $('#stage-cape');
  const burstEl = $('#estallido');
  const burstPin = burstEl ? $('.burst__pin', burstEl) : null;
  let burstT = Infinity, burstL = 1; // tramo de scroll del estallido
  const note = $<HTMLElement>('.buildnote');
  const nameEl = $('[data-slot="name"]');
  const portEl = $('[data-slot="portrait"]');
  const introEl = $('.intro');
  const pinEl = introEl ? $('.intro__pin', introEl) : null;
  const portToEl = $('[data-slot="portrait-about"]');
  const bioWords = introEl ? [...introEl.querySelectorAll<HTMLElement>('.intro__bio .w')] : [];
  let introT = 0, introL = 1; // tramo de scroll de la escena de la portada
  const portContactEl = $('[data-slot="portrait-contact"]');
  let contactTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let lookEl: Element | null = null; // opción de contacto señalada: el avatar la mira
  addEventListener('portfolio:look', (ev) => { lookEl = (ev as CustomEvent<{ el: Element | null }>).detail.el; kick(); });
  let W = 0, H = 0, ppu = 1, lk = 1;
  let bottleTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let capeTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let nameTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let rowOff = [{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }]; // centro de cada fila respecto del bloque del nombre (px)
  let portTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let monoTrack: { y: number; v: number }[] = [{ y: 0, v: 0 }];
  let capeStageEnter = Infinity;
  let bBuild: { y: number; v: number }[] = [{ y: 0, v: 0 }]; // avance del armado de la botella según el scroll
  let cBuild = { a: 0, b: 1 }; // tramo de scroll en que se arma la capa
  let bottleTop = Infinity;

  const docTop = (el: HTMLElement) => el.getBoundingClientRect().top + scrollY;
  const rel = (el: HTMLElement, ref: HTMLElement): SlotRect => {
    const a = el.getBoundingClientRect(), r = ref.getBoundingClientRect();
    return { cx: a.left - r.left + a.width / 2, cy: a.top - r.top + a.height / 2, w: a.width, h: a.height, i: 0 };
  };
  const P = (x: number, y: number, s: number, ry = 0, rx = 0, rz = 0): Pose => ({ x, y, s, ry, rx, rz });
  const bp = (r: SlotRect, ry: number, dy = 0, rx = 0): Pose => P(r.cx, r.cy + dy, Math.min(r.h, BOTTLE_MAX), ry, rx);
  // La capa ocupa el recuadro de su mundo y se gira apenas (es un plano: de espaldas se vería espejada)
  const kp = (r: SlotRect, ry: number, dy = 0, rx = 0): Pose => P(r.cx, r.cy - r.h * 0.02 + dy, Math.min(r.w * 1.04, r.h * 1.46), ry, rx);

  /** Mundo de un proyecto: una sola pantalla fijada. Entrada 1:1 con la sección, la pieza se queda en su recuadro
   *  mientras se arma y, en la segunda mitad, gira hacia `ryTurn`; salida 1:1. */
  function stageKeys(stage: HTMLElement, slot: string, make: (r: SlotRect, ry: number, dy?: number, rx?: number) => Pose, ry0: number, ryTurn: number, attach: boolean) {
    const pin = $('.pstage__pin', stage)!;
    const pos = rel($(`[data-slot="${slot}"]`, stage)!, pin);
    // Con el índice 01 / 02 a la derecha, la pieza se centra en el espacio libre entre el texto y el índice
    // (y se achica si no entra): nunca lo pisa, sea cual sea el ancho de la ventana.
    const rail = $('.pstage__rail', stage), text = $('.pstage__text', stage);
    if (rail && text && rail.getBoundingClientRect().width > 0) {
      const rr = rel(rail, pin), tr = rel(text, pin);
      const gap = Math.max(24, W * 0.025);
      const x0 = tr.cx + tr.w / 2 + gap, x1 = rr.cx - rr.w / 2 - gap;
      if (x1 - x0 > 120) {
        const room = x1 - x0;
        pos.cx = (x0 + x1) / 2;
        if (slot.startsWith('b')) pos.h = Math.min(pos.h, room / 0.34); // la botella mide ~1/3 de su alto de ancho
        else { pos.w = Math.min(pos.w, room / 1.04); pos.h = Math.min(pos.h, room / 1.46); } // la capa: su ancho
      }
    }
    const T = docTop(stage), Hs = stage.offsetHeight;
    const pinned = getComputedStyle(pin).position === 'sticky';
    const vh = pinned ? pin.clientHeight : innerHeight;
    const L = Math.max(1, Hs - vh);
    const keys: Key[] = [];
    if (attach) keys.push({ y: T - vh, v: make(pos, ry0, vh), lin: true });
    if (pinned) {
      keys.push({ y: T, v: make(pos, ry0), lin: attach });
      keys.push({ y: T + L * 0.5, v: make(pos, ry0 + 0.16) });
      keys.push({ y: T + L * 0.88, v: make(pos, ryTurn) });
      keys.push({ y: T + L, v: make(pos, ryTurn + 0.1) });
      keys.push({ y: T + Hs, v: make(pos, ryTurn + 0.1, -vh), lin: true });
    } else {
      // Pantallas muy bajas: sin fijar; la pieza acompaña a su sección y gira mientras pasa
      keys.push({ y: T, v: make(pos, ry0), lin: true });
      keys.push({ y: T + Hs, v: make(pos, ryTurn, -Hs), lin: true });
    }
    for (let i = 1; i < keys.length; i++) if (keys[i].y <= keys[i - 1].y) keys[i].y = keys[i - 1].y + 0.5;
    return { keys, enter: T - vh, pinned, T, L, vh };
  }

  function layout() {
    W = host!.clientWidth || innerWidth;
    H = host!.clientHeight || innerHeight;
    ppu = H / UNITS_H;
    const vh = innerHeight;
    const off = (dy: number, p: Pose): Pose => ({ ...p, y: p.y + dy });

    // Apertura: nombre + retrato adheridos a sus recuadros
    if (nameEl) {
      // Cada fila se coloca sobre su propia línea del DOM: el CSS puede separarlas (afiche) o juntarlas
      const r = nameEl.getBoundingClientRect();
      const lines = [...nameEl.children] as HTMLElement[];
      const centered = getComputedStyle(nameEl).textAlign === 'center';
      const s = Math.min(...lines.map((el, i) => {
        const lr = el.getBoundingClientRect();
        return Math.min(lr.height / (blockH / 2), lr.width / lineWidths[i]);
      }));
      const p = P(r.left + r.width / 2, r.top + scrollY + r.height / 2, s);
      rowOff = lines.map((el, i) => {
        const lr = el.getBoundingClientRect();
        const cx = centered ? lr.left + lr.width / 2 : lr.left + (lineWidths[i] * s) / 2;
        return { dx: cx - p.x, dy: lr.top + scrollY + lr.height / 2 - p.y };
      });
      const docEnd = document.documentElement.scrollHeight + vh;
      nameTrack = { keys: [{ y: 0, v: p, lin: true }, { y: docEnd, v: off(-docEnd, p), lin: true }] };
    }
    if (portEl && introEl && pinEl && portToEl) {
      // Portada como escena: con la pantalla fijada, el avatar va del centro a su lugar junto a «Sobre mí»
      const pose = (el: HTMLElement) => {
        const c = rel(el, pinEl);
        const h = Math.min(c.h, c.w / portAspect);
        return P(c.cx, c.cy + c.h / 2 - h / 2, h); // apoyado abajo en su recuadro
      };
      const pc = pose(portEl), pa = pose(portToEl);
      introT = docTop(introEl);
      const pvh = pinEl.clientHeight;
      introL = Math.max(1, introEl.offsetHeight - pvh);
      const T = introT, L = introL;
      const keys: Key[] = [];
      if (T > 0) keys.push({ y: T - pvh, v: off(pvh, pc), lin: true });
      keys.push({ y: T, v: pc }, { y: T + L * 0.14, v: pc }, { y: T + L * 0.58, v: pa }, { y: T + L, v: pa, lin: true }, { y: T + L + pvh, v: off(-pvh, pa), lin: true });
      portTrack = { keys };
    } else portTrack = { keys: [{ y: 0, v: OFF }] };
    if (portContactEl) {
      const r = portContactEl.getBoundingClientRect();
      if (r.width > 0) {
        const h = Math.min(r.height, r.width / PHONE_ASPECT);
        const p = P(r.left + r.width / 2, r.top + scrollY + r.height - h / 2, h); // apoyado abajo en su recuadro
        const docEnd = document.documentElement.scrollHeight + vh;
        contactTrack = { keys: [{ y: 0, v: p, lin: true }, { y: docEnd, v: off(-docEnd, p), lin: true }] };
      } else contactTrack = { keys: [{ y: 0, v: OFF }] };
    }

    // Botella: la portada es solo identidad. En el índice de trabajos la botella sube con la página hasta su
    // recuadro y empieza a armarse (trazo técnico); al entrar a la bodega viaja a su mundo y se termina de armar.
    const pr = previewEl?.getBoundingClientRect();
    const wideLayout = !!pr && pr.width > 0 && pr.height > 0;
    if (bottleStage) bottleTop = docTop(bottleStage);
    const first = bottleStage ? stageKeys(bottleStage, 'b1', bp, -0.22, PI + 0.1, !wideLayout) : null;
    const bKeys: Key[] = [];
    if (wideLayout && first) {
      const cy = pr!.top + scrollY + pr!.height / 2; // centro del recuadro en el documento
      const at = (y: number, ry: number): Pose => P(pr!.left + pr!.width / 2, cy - y, Math.min(pr!.height, BOTTLE_MAX), ry);
      const yA = Math.max(1, Math.min(cy - vh / 2, first.T - 2)); // recuadro centrado en pantalla
      bKeys.push({ y: 0, v: at(0, -0.62), lin: true }, { y: yA, v: at(yA, -0.4), lin: true });
      bKeys.push(...first.keys); // de yA al mundo: viaja del índice a su recuadro en la bodega
      bBuild = [
        { y: Math.max(0, yA - vh * 0.55), v: 0 },
        { y: yA, v: 0.3 },
        { y: Math.max(yA + 1, first.T - vh * 0.35), v: 0.3 },
        { y: Math.max(yA + 2, first.T + first.L * 0.4), v: 1 },
      ];
    } else if (first) {
      // Vertical: la botella llega con su mundo (entrada 1:1 desde abajo) y se arma al entrar
      bKeys.push({ y: 0, v: OFF }, ...first.keys);
      const a = first.enter + vh * 0.25;
      bBuild = [{ y: a, v: 0 }, { y: Math.max(a + 2, first.pinned ? first.T + first.L * 0.4 : first.T + vh * 0.5), v: 1 }];
    }
    const burst = burstEl && burstPin && first && capeStage ? (() => {
      const T = docTop(burstEl), pvh = burstPin.clientHeight;
      return { T, L: Math.max(1, burstEl.offsetHeight - pvh), vh: pvh };
    })() : null;
    if (burst) {
      burstT = burst.T;
      burstL = burst.L;
      // en pantallas angostas, más chica: los fragmentos necesitan aire alrededor
      const ctr = P(W / 2, burst.vh * 0.5, Math.min(burst.vh * 0.62, BOTTLE_MAX, W * 1.05), PI * 2);
      const exitKey = bKeys.findIndex((k) => k.y >= first!.T + first!.L + 1);
      if (exitKey >= 0) bKeys.splice(exitKey); // sin la salida 1:1 con su mundo
      bKeys.push({ y: burst.T, v: ctr }, { y: burst.T + burst.L, v: ctr, lin: true });
    } else burstT = Infinity;
    bKeys.sort((a, b) => a.y - b.y);
    for (let i = 1; i < bKeys.length; i++) if (bKeys[i].y <= bKeys[i - 1].y) bKeys[i].y = bKeys[i - 1].y + 0.5;
    bottleTrack = { keys: bKeys.length ? bKeys : [{ y: 0, v: OFF }] };

    // Be Fresh: la capa entra 1:1 con su mundo mientras la botella sale con el suyo; se arma (patrón → tela)
    const monos: { y: number; v: number }[] = [{ y: 0, v: 0 }];
    if (capeStage && burstT < Infinity) {
      // Con estallido: la capa se forma en el centro (donde estalló la botella) y después viaja a su mundo
      const k = stageKeys(capeStage, 'c1', kp, -0.34, 0.32, false);
      const bvh = burstPin!.clientHeight;
      const wPx = Math.min(W < 700 ? W * 0.9 : W * 0.5, bvh * 0.66 * capeAspect);
      const ctr = P(W / 2, bvh * 0.5, wPx, 0);
      capeTrack = { keys: [{ y: burstT, v: ctr }, { y: burstT + burstL, v: ctr }, ...k.keys] };
      monos.push({ y: burstT + burstL * 0.62, v: 0 }, { y: burstT + burstL, v: 1 });
      capeStageEnter = burstT;
      cBuild = { a: -2, b: -1 }; // ya no se arma por patrón: la forma el vino
    } else if (capeStage) {
      const k = stageKeys(capeStage, 'c1', kp, -0.34, 0.32, true);
      capeTrack = { keys: k.keys };
      monos.push({ y: k.enter - 1, v: 0 }, { y: k.enter + k.vh, v: 1 });
      capeStageEnter = k.enter;
      cBuild = { a: k.enter + vh * 0.3, b: Math.max(k.enter + vh * 0.3 + 2, k.pinned ? k.T + k.L * 0.4 : k.T + vh * 0.5) };
    }
    const contactSec = $('#contacto');
    if (contactSec && monos.length > 1) {
      const cT = docTop(contactSec);
      monos.push({ y: Math.max(monos[monos.length - 1].y + 1, cT - vh * 1.05), v: 1 }, { y: Math.max(monos[monos.length - 1].y + 2, cT - vh * 0.2), v: 0 });
    }
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

  /* ---------- Puntero ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, cx: 0, cy: 0, at: -Infinity };
  if (!coarse) {
    addEventListener(
      'pointermove',
      (e) => {
        ptr.tx = (e.clientX / innerWidth) * 2 - 1;
        ptr.ty = (e.clientY / innerHeight) * 2 - 1;
        ptr.cx = e.clientX;
        ptr.cy = e.clientY;
        ptr.at = performance.now();
        kick();
      },
      { passive: true },
    );
  }

  /* ---------- Bucle: dibuja solo cuando hay cambios y algo visible ---------- */
  const snap = location.search.includes('snap');
  const K = snap ? 1e6 : 16;
  const cur = { b: null as Pose | null, k: null as Pose | null, mono: 0, px: 0, py: 0, vib: 0 };
  let raf = 0;
  let last = 0;
  let frames = 0, slow = 0;
  let idleFrames = 0;
  let firstRender = true;
  let prevY = scrollY;
  let running = !document.hidden;
  let buildPhase = 0;
  let drawn = false; // hay algo dibujado en el lienzo
  let broken = false; // para el sonido del estallido (solo al cruzar el instante)
  const onScreen = (p: Pose, half: number) => p.y + half > -20 && p.y - half < H + 20 && p.x > -half * 2 && p.x < W + half * 2;
  const follow = (curP: Pose | null, tgt: Pose, half: number, dt: number, initRy?: number): Pose => {
    if (!curP) return { ...tgt, ry: initRy ?? tgt.ry };
    // Si el objeto (o su destino) está fuera de pantalla se coloca directamente: nunca cruza la pantalla en vuelo
    if (!onScreen(curP, half) || !onScreen(tgt, half)) return { ...tgt };
    return { x: damp(curP.x, tgt.x, K, dt), y: damp(curP.y, tgt.y, K, dt), s: damp(curP.s, tgt.s, K, dt), ry: damp(curP.ry, tgt.ry, K * 0.7, dt), rx: damp(curP.rx, tgt.rx, K, dt), rz: damp(curP.rz, tgt.rz, K, dt) };
  };
  /** Valor de una pista escalar (lineal entre claves). */
  const trackAt = (m: { y: number; v: number }[], y: number) => {
    if (y <= m[0].y) return m[0].v;
    for (let i = 1; i < m.length; i++) if (y <= m[i].y) return m[i - 1].v + (m[i].v - m[i - 1].v) * clamp((y - m[i - 1].y) / Math.max(1e-6, m[i].y - m[i - 1].y), 0, 1);
    return m[m.length - 1].v;
  };
  const monoAt = (y: number) => {
    const m = monoTrack;
    if (y <= m[0].y) return m[0].v;
    for (let i = 1; i < m.length; i++) if (y <= m[i].y) return m[i - 1].v + (m[i].v - m[i - 1].v) * smooth((y - m[i - 1].y) / Math.max(1e-6, m[i].y - m[i - 1].y));
    return m[m.length - 1].v;
  };
  const redC = new Color(0xff1e14), whiteC = new Color(0xdfe4ff);
  /** Coloca un objeto en px de viewport compensando la perspectiva de su profundidad z. */
  const place = (o: Group | Mesh, x: number, y: number, z: number, scale: number) => {
    const k = (DIST - z) / DIST;
    o.position.set(((x - W / 2) / ppu) * k, ((H / 2 - y) / ppu) * k, z);
    o.scale.setScalar((scale / ppu) * k);
  };

  function kick() {
    idleFrames = 0;
    if (!raf && running) raf = requestAnimationFrame(frame);
  }

  function frame(now: number) {
    raf = 0;
    if (!running) return;
    const dt = clamp((now - (last || now - 16)) / 1000, 0.001, 0.25);
    last = now;
    const y = scrollY;
    ptr.x = damp(ptr.x, ptr.tx, 5, dt);
    ptr.y = damp(ptr.y, ptr.ty, 5, dt);
    const vel = Math.abs(y - prevY) / Math.max(1, dt * 1000); // px/ms
    prevY = y;

    // Cargas diferidas: dorso y capa se preparan al acercarse
    if (bottleStage && y > bottleTop - innerHeight * 3) loadBack();
    if (capeStage && y > capeStageEnter - innerHeight * 2.5) buildBarber();

    const tn = sample(nameTrack, y);
    const tp = sample(portTrack, y);
    const tc = sample(contactTrack, y);
    const tb = sample(bottleTrack, y);
    const tk = cape ? sample(capeTrack, y) : null;
    const heroTop = y < 40;
    cur.b = follow(cur.b, tb, tb.s / 2, dt, firstRender && heroTop ? 0 : undefined);
    cur.k = tk ? follow(cur.k, tk, tk.s / 2, dt) : null;
    cur.mono = damp(cur.mono, monoAt(y), K * 0.6, dt);
    cur.px = damp(cur.px, ptr.x, 6, dt);
    cur.py = damp(cur.py, ptr.y, 6, dt);

    // Nombre (dos filas) y retrato: adheridos a la página, con parallax distinto del puntero
    const nOn = onScreen(tn, Math.max(...rowOff.map((o) => Math.abs(o.dy))) + tn.s * capOf) && tn.y > -9000;
    rowGroups.forEach((grp, i) => {
      grp.visible = nOn;
      if (!nOn) return;
      // Cada fila se coloca por separado: así, pese a estar a distinta profundidad, ambas quedan alineadas con el texto del DOM
      const cxRow = tn.x + rowOff[i].dx;
      const cyRow = tn.y + rowOff[i].dy;
      place(grp, cxRow, cyRow, ROW_Z[i], tn.s);
      grp.rotation.set(0.03 + cur.py * 0.05, -0.1 + cur.px * 0.14, 0);
    });
    const pOn = onScreen(tp, tp.s / 2) && tp.y > -9000;
    portrait.visible = pOn;
    // Guiño: la imagen con el ojo cerrado y un pequeño impulso de la cabeza, como un gesto
    const wt = (now - winkAt) / WINK_MS;
    const winking = wt >= 0 && wt < 1;
    const env = winking ? Math.sin(PI * wt) : 0;
    let alive = false;
    if (pOn && avatar.ready) {
      // Mirada: hacia el puntero si se movió hace poco; si no, mira alrededor solo.
      // Al bajar, la mirada va hacia el botón «Ver proyectos»: acompaña el recorrido.
      const fx = tp.x, fy = tp.y - tp.s * 0.1; // centro de la cara
      const ptrOn = !coarse && now - ptr.at < 3500;
      let gx = 0, gy = 0;
      if (ptrOn) {
        gx = clamp((ptr.cx - fx) / (W * 0.42), -1, 1);
        gy = clamp((ptr.cy - fy) / (H * 0.42), -1, 1);
      }
      // Escena de la portada: mientras se despliega «Sobre mí» el avatar lo lee (mira la palabra que aparece)
      // y al terminar vuelve a mirar a quien está del otro lado de la pantalla.
      const ip = clamp((y - introT) / introL, 0, 1);
      const read = smooth(clamp((ip - 0.24) / 0.22, 0, 1)) * (1 - smooth(clamp((ip - 0.86) / 0.08, 0, 1)));
      if (read > 0 && bioWords.length) {
        const q = ((ip - 0.42) / 0.43) * (bioWords.length + 4);
        const wr = bioWords[clamp(Math.floor(q), 0, bioWords.length - 1)].getBoundingClientRect();
        const lx = clamp((wr.left + wr.width / 2 - fx) / (W * 0.42), -1, 1), ly = clamp((wr.top + wr.height / 2 - fy) / (H * 0.42), -1, 1);
        gx += (lx - gx) * read;
        gy += (ly - gy) * read;
      }
      const atYou = smooth(clamp((ip - 0.86) / 0.08, 0, 1)) * (ptrOn ? 0.5 : 1);
      gx *= 1 - atYou;
      gy *= 1 - atYou;
      alive = avatar.update(dt, now, { gx, gy, pointer: ptrOn || ip > 0.1, winking: winking && wt > 0.12 && wt < 0.8, still: snap });
      place(portrait, tp.x + cur.px * 14, tp.y + cur.py * 6 - env * tp.s * 0.008, 0, tp.s);
      portrait.scale.multiplyScalar(1 + env * 0.018);
    }

    // Cierre: el muñeco del teléfono se inclina hacia la opción señalada (o el cursor) y la llamada suena en WhatsApp
    const cOn = onScreen(tc, tc.s / 2) && tc.y > -9000 && phoneAv.ready;
    phoneAv.mesh.visible = cOn;
    let phoneAlive = false;
    if (cOn) {
      const fx = tc.x, fy = tc.y - tc.s * 0.12;
      let gx = 0, gy = 0;
      const lr = lookEl?.getBoundingClientRect();
      if (lr) {
        gx = clamp((lr.left + lr.width / 2 - fx) / (W * 0.5), -1, 1);
        gy = clamp((lr.top + lr.height / 2 - fy) / (H * 0.5), -1, 1);
      } else if (!coarse && now - ptr.at < 3500) {
        gx = clamp((ptr.cx - fx) / (W * 0.5), -1, 1);
        gy = clamp((ptr.cy - fy) / (H * 0.5), -1, 1);
      }
      phoneAlive = phoneAv.update(dt, now, { gx, gy, ring: !!lookEl?.hasAttribute('data-ring'), still: snap });
      place(phoneAv.mesh, tc.x + cur.px * 12, tc.y + cur.py * 5, 0, tc.s);
    }

    // Estallido: avance del tramo fijado (−1 si no hay)
    const e = burstT < Infinity ? clamp((y - burstT) / burstL, -1, 1.5) : -1;
    const burstOn = e > 0 && e < 1;
    if (e >= 0) {
      const b = e >= E_BREAK - 0.002;
      if (b !== broken) {
        if (!firstRender) dispatchEvent(new CustomEvent('portfolio:burst', { detail: { dir: b ? 1 : -1 } }));
        broken = b;
      }
    }
    BU.uCrack.value = e > 0 ? clamp((e - 0.01) / (E_BREAK - 0.01), 0, 1) : 0;
    BU.uGlow.value = 1 - clamp((e - E_BREAK) / 0.035, 0, 1);
    BU.uBurst.value = e > E_BREAK ? clamp((e - E_BREAK) / 0.5, 0, 1) : 0;

    // Botella
    const bOn = onScreen(cur.b, cur.b.s / 2) && cur.b.y > -9000 && BU.uBurst.value < 1;
    bottleRoot.visible = shadow.visible = bOn;
    if (bOn) {
      const p = cur.b;
      const sc = p.s / ppu;
      // Antes de romperse, la botella tiembla apenas (tensión), cada vez más
      const tense = e > 0 && e < E_BREAK ? Math.pow(e / E_BREAK, 2) : 0;
      const jx = tense * Math.sin(now * 0.061) * 2.2, jy = tense * Math.sin(now * 0.047 + 1.3) * 1.4;
      bottleRoot.position.set((p.x + jx + cur.px * 10 - W / 2) / ppu, (H / 2 - p.y - jy) / ppu, 0.6);
      bottleRoot.scale.setScalar(sc * (1 + tense * 0.025));
      bottleRoot.rotation.set(p.rx + cur.py * 0.05, p.ry + cur.px * 0.16, -0.035 + cur.px * 0.015 + tense * Math.sin(now * 0.053) * 0.012);
      shadow.position.set(bottleRoot.position.x, bottleRoot.position.y - sc * 0.5 - sc * 0.02, -0.2);
      shadow.scale.set(sc * 1.15, sc * 1.0, 1);
      shadowMat.opacity = 0.9 * (1 - clamp((e - E_BREAK) / 0.08, 0, 1));
    }
    // Gotas de vino y destello (siguen a la botella y se posan sobre la capa)
    splash.update(e, bottle, bottleRoot.scale.x, cape);

    // Armado de la botella según el scroll (trazo → vidrio → etiqueta → acabado)
    const pb = trackAt(bBuild, y);
    const lim = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1.06 : t * 1.06);
    const tW = part(0, 0.3, pb), tG = part(0.22, 0.55, pb), tL = part(0.5, 0.82, pb);
    wU.uLim.value = lim(tW);
    bU.uLim.value = lim(tG); bU.uGlow.value = tG > 0 && tG < 1 ? 1 : 0;
    lU.uLim.value = lim(tL); lU.uGlow.value = tL > 0 && tL < 1 ? 1 : 0;
    const fade = 1 - part(0.8, 0.98, pb);
    wireMat.opacity = 0.85 * fade;
    guideMat.opacity = 0.7 * fade;
    wireMat.visible = guideMat.visible = pb < 0.985;
    glass.envMapIntensity = 1.1 + 1.8 * part(0.5, 1, pb);
    const phase = pb <= 0.001 ? 0 : pb < 0.22 ? 1 : pb < 0.5 ? 2 : pb < 0.97 ? 3 : 4;
    if (phase !== buildPhase) {
      if (!firstRender && Math.abs(phase - buildPhase) === 1) dispatchEvent(new CustomEvent('portfolio:build', { detail: { phase, dir: phase > buildPhase ? 1 : -1 } }));
      buildPhase = phase;
    }
    if (note) {
      const showNote = bOn && phase > 0 && phase < 4;
      if (note.dataset.ph !== String(showNote ? phase : 0)) note.dataset.ph = String(showNote ? phase : 0);
      note.style.setProperty('--bp', pb.toFixed(3));
    }

    // La capa vibra con la velocidad del scroll, como tela agitada por el aire
    const inBarber = cur.mono > 0.6;
    cur.vib = damp(cur.vib, inBarber ? clamp(vel / 1.6, 0, 1) : 0, inBarber ? 14 : 6, dt);
    // La capa se materializa desde el splash (roja de vino) y pasa al blanco y negro de Be Fresh
    capeFormU.uForm.value = e < 0 ? (y < burstT ? 0 : 1) : smooth(clamp((e - 0.44) / 0.4, 0, 1));
    capeFormU.uWine.value = e < 0 ? (y < burstT ? 1 : 0) : 1 - smooth(clamp((e - 0.68) / 0.32, 0, 1));
    // el brillo de la tela también es de vino mientras la capa está roja (si no, el rojo se vuelve rosa)
    if (capeFabric) capeFabric.sheenColor.copy(sheenGray).lerp(sheenWine, capeFormU.uWine.value);
    const kOn = !!cur.k && !!cape && onScreen(cur.k, cur.k.s / 2) && cur.k.y > -9000 && capeFormU.uForm.value > 0;
    if (cape) cape.visible = kOn;
    if (kOn && cur.k && cape) {
      const p = cur.k;
      const wPx = p.s; // ancho en px
      const ax = p.x + cur.px * 14, ay = p.y;
      cape.position.set((ax - W / 2) / ppu, (H / 2 - ay) / ppu, 0.3);
      cape.scale.setScalar(wPx / ppu);
      cape.rotation.set(p.rx + cur.py * 0.06, p.ry + cur.px * 0.2, 0);
      if (cloth) {
        // Inercia: cuando la capa viaja (o la página la arrastra) la tela queda atrás y después se acomoda
        const m = capeMotion;
        if (!m.init) Object.assign(m, { x: ax, y: ay, vx: 0, vy: 0, ax: 0, ay: 0, px: ptr.cx, py: ptr.cy, init: true });
        const vx = (ax - m.x) / dt / wPx, vy = -(ay - m.y) / dt / wPx; // anchos de capa por segundo (y hacia arriba)
        m.ax = damp(m.ax, clamp((vx - m.vx) / dt, -60, 60), 10, dt);
        m.ay = damp(m.ay, clamp((vy - m.vy) / dt, -60, 60), 10, dt);
        Object.assign(m, { vx, vy, x: ax, y: ay });
        // Puntero (o dedo): la tela se deja empujar donde la tocás
        const touchOn = now - touch.at < 220;
        const pxp = touchOn ? touch.x : ptr.cx, pyp = touchOn ? touch.y : ptr.cy;
        const pvx = (pxp - m.px) / dt / wPx, pvy = -(pyp - m.py) / dt / wPx;
        m.pvx = damp(m.pvx, pvx, 18, dt);
        m.pvy = damp(m.pvy, pvy, 18, dt);
        m.px = pxp; m.py = pyp;
        const lx = (pxp - ax) / wPx, ly = -(pyp - ay) / wPx;
        const near = (touchOn || (!coarse && now - ptr.at < 220)) && Math.abs(lx) < 0.6 && Math.abs(ly) < 0.5;
        clothInertia.set(-m.ax * 0.55, -m.ay * 0.55, -Math.abs(m.ax) * 0.08);
        cloth.step(snap ? 0 : dt, {
          inertia: clothInertia,
          wind: 0.38 + cur.vib * 3.4, // brisa suave en reposo; el scroll la agita
          pointer: near ? { x: lx, y: ly, vx: m.pvx, vy: m.pvy } : null,
          time: now / 1000,
        });
      }
      const pc = clamp((y - cBuild.a) / (cBuild.b - cBuild.a), 0, 1);
      const tg = part(0, 0.4, pc), tt = part(0.2, 0.85, pc);
      gU.uLim.value = tg <= 0 ? 0 : tg >= 1 ? 1.06 : tg * 1.06;
      cU.uLim.value = tt <= 0 ? 0 : tt >= 1 ? 1.06 : tt * 1.06;
      cU.uGlow.value = tt > 0 && tt < 1 ? 1 : 0;
      const gf = 1 - part(0.8, 1, pc);
      capeGrid.forEach((m, i) => { m.opacity = (i ? 0.85 : 0.5) * gf; m.visible = pc < 0.995; });
    }
    // Iluminación: el rojo de Cordero pasa a luz blanca fría en Be Fresh
    rim.color.copy(redC).lerp(whiteC, cur.mono);
    key.position.x = (-8 + cur.px * 4.5) * (0.35 + 0.65 * lk);
    key.position.y = 7 - cur.py * 2.5;
    rim.position.x = 9 * (0.28 + 0.72 * lk);
    rim.intensity = (130 + cur.mono * 120) * (1 + (1 - lk) * (1.2 - cur.mono));
    key.intensity = 420 * (1 - cur.mono * 0.55);
    fill.intensity = 1.0 + (1 - lk) * 1.4;
    scene.environmentIntensity = 0.62 - cur.mono * 0.2;

    // Fondo CSS: el halo sigue al objeto principal y vira a gris en Be Fresh
    const heroVisible = pOn || nOn;
    const gp = cOn ? tc : heroVisible && tp.y > -9000 ? tp : kOn && cur.k && (!bOn || cur.mono > 0.5) ? cur.k : cur.b;
    if (gp) {
      host!.style.setProperty('--gx', `${((gp.x / W) * 100).toFixed(2)}%`);
      host!.style.setProperty('--gy', `${(((heroVisible && gp === tp) || gp === tc ? gp.y - gp.s * 0.15 : gp.y) / H * 100).toFixed(2)}%`);
    }
    host!.style.setProperty('--mono', cur.mono.toFixed(3));

    if (bOn || kOn || nOn || pOn || burstOn || cOn) {
      renderer.render(scene, camera);
      drawn = true;
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
    } else {
      // Nada a la vista: se deja de dibujar, pero antes se limpia el lienzo (si no, queda congelado el último cuadro)
      if (drawn) {
        renderer.clear();
        drawn = false;
      }
      if (firstRender) {
        firstRender = false;
        root.classList.add('gl-on');
      }
    }

    // ¿Sigue habiendo movimiento? Si todo se asentó, se detiene el bucle (sin consumo en reposo)
    const settled =
      Math.abs(ptr.x - ptr.tx) < 0.002 && Math.abs(ptr.y - ptr.ty) < 0.002 &&
      (!cur.b || (Math.abs(cur.b.x - tb.x) < 0.2 && Math.abs(cur.b.y - tb.y) < 0.2 && Math.abs(cur.b.ry - tb.ry) < 0.002)) &&
      (!cur.k || !tk || (Math.abs(cur.k.x - tk.x) < 0.2 && Math.abs(cur.k.y - tk.y) < 0.2 && Math.abs(cur.k.ry - tk.ry) < 0.002)) &&
      !kOn && // la capa ondula mientras está a la vista
      !alive && // el avatar está vivo (mira, respira, parpadea) mientras se ve
      !phoneAlive &&
      !winking &&
      !(e > 0 && e < E_BREAK) && // la botella tiembla antes de romperse
      Math.abs(cur.mono - monoAt(y)) < 0.002 && cur.vib < 0.004 && Math.abs(vel) < 0.001;
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

  ready = true;
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
