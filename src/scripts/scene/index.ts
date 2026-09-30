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
  Group,
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
  WebGLRenderer,
} from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontJson from '../../assets/3d/anton-subset.json';
import bottleProfile from '../../assets/3d/bottle-profile.json';
import labelFrontUrl from '../../assets/3d/label-front.webp?url';
import labelBackUrl from '../../assets/3d/label-back.webp?url';
import portraitUrl from '../../assets/portrait/agustin.webp?url';
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
  const ROW_Z = [-0.9, 0.7]; // AGUSTÍN detrás del retrato, HIDALGO delante (unidades de mundo)
  ['AGUSTÍN', 'HIDALGO'].forEach((t) => {
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
  const blockW = Math.max(...lineWidths);
  const blockH = capOf * (1 + LINE);

  /* ---------- Retrato (recorte original) como capa con profundidad ---------- */
  const portImg = new Image();
  portImg.decoding = 'async';
  portImg.src = portraitUrl;
  const portTex = new CanvasTexture(document.createElement('canvas'));
  portTex.colorSpace = SRGBColorSpace;
  portTex.anisotropy = tier === 'low' ? 1 : 4;
  const portMat = new MeshBasicMaterial({ map: portTex, transparent: false, alphaTest: 0.4, toneMapped: false });
  if (tier !== 'low') portMat.alphaToCoverage = true;
  const portrait = new Mesh(new PlaneGeometry(1, 1), portMat);
  scene.add(portrait);
  let portAspect = 1; // proporción del plano (ancho/alto)
  let portKey = '';
  const buildPortrait = (slotAspect: number) => {
    if (!portImg.naturalWidth) return;
    const ia = portImg.naturalWidth / portImg.naturalHeight;
    // Con el recuadro más ancho que la foto se muestra la parte superior (cara y torso) con fundido inferior
    const crop = slotAspect > ia * 1.05 ? ia / slotAspect : 1;
    const key2 = crop.toFixed(3);
    if (key2 === portKey) return;
    portKey = key2;
    const cw = Math.min(portImg.naturalWidth, 1000);
    const sc = cw / portImg.naturalWidth;
    const srcH = portImg.naturalHeight * crop;
    const cv = portTex.image as HTMLCanvasElement;
    cv.width = cw;
    cv.height = Math.round(srcH * sc);
    const c = cv.getContext('2d')!;
    c.clearRect(0, 0, cv.width, cv.height);
    c.drawImage(portImg, 0, 0, portImg.naturalWidth, srcH, 0, 0, cv.width, cv.height);
    if (crop < 1) {
      const g = c.createLinearGradient(0, cv.height * 0.72, 0, cv.height);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = g;
      c.fillRect(0, cv.height * 0.72, cv.width, cv.height * 0.28);
      c.globalCompositeOperation = 'source-over';
    }
    portAspect = cv.width / cv.height;
    portTex.needsUpdate = true;
  };
  let ready = false; // el layout solo puede ejecutarse cuando todo el estado está declarado
  portImg.onload = () => {
    portKey = '';
    if (ready) layout();
  };

  /* ---------- Botella de Cordero ----------
     Silueta: perfil medido sobre la fotografía real del frente. Etiquetas: recortes reales del PDF de envases. */
  const bottle = new Group();
  const prof = (bottleProfile as [number, number][]).map(([y, r]) => new Vector2(r, y));
  const CAP_Y = 0.79;
  const glass = new MeshPhysicalMaterial({ color: 0x070908, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.9, ior: 1.5 });
  const bodyPts = [new Vector2(0, 0), new Vector2(prof[0].x * 0.85, 0), ...prof.filter((p) => p.y <= CAP_Y + 0.01)];
  cutMat(glass, bU, 'position.y');
  bottle.add(new Mesh(new LatheGeometry(bodyPts, seg), glass));
  const capMat = new MeshPhysicalMaterial({ color: 0x4a0f22, roughness: 0.3, metalness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.22, envMapIntensity: 1.5 });
  const capPts = [...prof.filter((p) => p.y >= CAP_Y).map((p) => new Vector2(p.x * 1.035, p.y)), new Vector2(prof[prof.length - 1].x * 1.035, 1), new Vector2(0, 1)];
  cutMat(capMat, bU, 'position.y');
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
    const mat = new MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0, bumpMap: tex, bumpScale: 1.1, alphaTest: 0.4 });
    cutMat(mat, lU, `position.y + ${((y0 + y1) / 2).toFixed(4)}`);
    const m = new Mesh(g, mat);
    m.position.y = (y0 + y1) / 2;
    if (flip) m.rotation.y = PI;
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

  /* ---------- Be Fresh: la capa de barbero es la única protagonista (se construye al acercarse) ---------- */
  let cape: Mesh | null = null;
  const capeU = { uTime: { value: 0 }, uAmp: { value: 0.3 } };
  let barberBuilding = false;
  const buildBarber = async () => {
    if (cape || barberBuilding) return;
    barberBuilding = true;
    // Capa de barbero: mockup real del proyecto, como plano con ondulación de tela (deformación de vértices + brillo)
    const capeTex = await loadTex(capeUrl);
    const ca = capeTex.image.width / capeTex.image.height;
    const capeMat = new MeshBasicMaterial({ map: capeTex, transparent: true, depthWrite: false, toneMapped: false });
    capeMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = capeU.uTime;
      sh.uniforms.uAmp = capeU.uAmp;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;\nvarying float vShade;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float hem = 1.0 - uv.y;
          float a1 = uv.x * 7.0 + uTime * 1.7 + uv.y * 2.0;
          float a2 = uv.x * 13.0 - uTime * 2.3 + uv.y * 5.0;
          float fl = sin(a1) * 0.6 + sin(a2) * 0.4;
          transformed.x += fl * 0.014 * uAmp * hem;
          transformed.y += sin(a2) * 0.010 * uAmp * hem * hem;
          transformed.z += fl * 0.05 * uAmp * hem;
          vShade = (cos(a1) * 4.2 + cos(a2) * 5.2) * 0.012 * uAmp * hem;`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vShade;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb += vec3(vShade);');
      applyCut(sh, cU, '(1.0 - uv.y)', true); // la tela "cae" de arriba hacia abajo
    };
    cape = new Mesh(new PlaneGeometry(1, 1 / ca, 36, 26), capeMat);

    // Patrón de corte: contorno y cuadrícula finas que se dibujan antes que la tela
    const gridMat = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false });
    const edgeMat = new LineBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
    cutMat(gridMat, gU, `(0.5 - position.y * ${ca.toFixed(4)})`, false);
    cutMat(edgeMat, gU, `(0.5 - position.y * ${ca.toFixed(4)})`, false);
    const hh = 0.5 / ca, hw = 0.5;
    const gl: number[] = [], el: number[] = [];
    const L = (a: number[], x0: number, y0: number, x1: number, y1: number) => a.push(x0, y0, 0.004, x1, y1, 0.004);
    L(el, -hw, -hh, hw, -hh); L(el, hw, -hh, hw, hh); L(el, hw, hh, -hw, hh); L(el, -hw, hh, -hw, -hh);
    for (let i = 1; i < 14; i++) L(gl, -hw + (i / 14) * 2 * hw, -hh, -hw + (i / 14) * 2 * hw, hh);
    for (let i = 1; i < 10; i++) L(gl, -hw, -hh + (i / 10) * 2 * hh, hw, -hh + (i / 10) * 2 * hh);
    const mk = (arr: number[], m: LineBasicMaterial) => {
      const b = new BufferGeometry();
      b.setAttribute('position', new Float32BufferAttribute(arr, 3));
      return new LineSegments(b, m);
    };
    cape.add(mk(gl, gridMat), mk(el, edgeMat));
    capeGrid = [gridMat, edgeMat];
    scene.add(cape);
    kick();
  };
  let capeGrid: LineBasicMaterial[] = [];

  /* ---------- Layout: poses a partir de los elementos [data-slot] ---------- */
  const heroEl = $('#inicio');
  const parkEl = $('[data-slot="park"]');
  const bottleStage = $('#stage-bottle');
  const capeStage = $('#stage-cape');
  const note = $<HTMLElement>('.buildnote');
  const nameEl = $('[data-slot="name"]');
  const portEl = $('[data-slot="portrait"]');
  let W = 0, H = 0, ppu = 1, lk = 1;
  let bottleTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let capeTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let nameTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let portTrack: Track = { keys: [{ y: 0, v: OFF }] };
  let monoTrack: { y: number; v: number }[] = [{ y: 0, v: 0 }];
  let capeStageEnter = Infinity;
  let bBuild = { a: 0, b: 1 }; // tramo de scroll en que se arma la botella
  let cBuild = { a: 0, b: 1 }; // ídem, la capa
  let bottleTop = Infinity;

  const docTop = (el: HTMLElement) => el.getBoundingClientRect().top + scrollY;
  const rel = (el: HTMLElement, ref: HTMLElement, i: number): SlotRect => {
    const a = el.getBoundingClientRect(), r = ref.getBoundingClientRect();
    return { cx: a.left - r.left + a.width / 2, cy: a.top - r.top + a.height / 2, w: a.width, h: a.height, i };
  };
  const P = (x: number, y: number, s: number, ry = 0, rx = 0, rz = 0): Pose => ({ x, y, s, ry, rx, rz });
  const bp = (r: SlotRect, ry: number, dy = 0, rx = 0): Pose => P(r.cx, r.cy + dy, Math.min(r.h, BOTTLE_MAX), ry, rx);
  // La capa, como la botella, ocupa el recuadro de cada paso y gira de uno a otro
  const kp = (r: SlotRect, ry: number, dy = 0, rx = 0): Pose => P(r.cx, r.cy - r.h * 0.02 + dy, Math.min(r.w * 1.04, r.h * 1.46), ry, rx);

  /** Tramo de un proyecto: entrada 1:1 con la sección, 3 pasos y salida 1:1. */
  function stageKeys(stage: HTMLElement, slots: string[], make: (r: SlotRect, ry: number, dy?: number, rx?: number) => Pose, ry0: number, ryBack: number, attach: boolean, ry3 = ryBack + PI): { keys: Key[]; enter: number; pinned: boolean; T: number; L: number; vh: number } {
    const steps = [1, 2, 3].map((n) => $(`.step-${n}`, stage)!);
    const pos = slots.map((s, i) => rel($(`[data-slot="${s}"]`, steps[i])!, steps[i], i));
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
      keys.push({ y: at(0.74), v: make(pos[2], ry3) });
      keys.push({ y: at(1), v: make(pos[2], ry3 + 0.14) });
    } else {
      // Pantallas bajas: pasos apilados sin fijar; la pose sigue la posición de cada paso
      const t = steps.map(docTop);
      keys.push({ y: T, v: make(pos[0], ry0), lin: attach });
      keys.push({ y: Math.max(T + 1, t[1] - 0.55 * vh), v: make(pos[0], ry0 + 0.16) });
      keys.push({ y: t[1] + 0.05 * vh, v: make(pos[1], ryBack) });
      keys.push({ y: Math.max(t[1] + 0.1 * vh, t[2] - 0.55 * vh), v: make(pos[1], ryBack + 0.18) });
      keys.push({ y: t[2] + 0.05 * vh, v: make(pos[2], ry3) });
      keys.push({ y: Math.max(t[2] + 0.1 * vh, release), v: make(pos[2], ry3 + 0.14) });
    }
    keys.push({ y: T + Hs, v: make(pos[2], ry3 + 0.14, -vh), lin: true });
    keys.sort((a, b) => a.y - b.y);
    for (let i = 1; i < keys.length; i++) if (keys[i].y <= keys[i - 1].y) keys[i].y = keys[i - 1].y + 0.5;
    return { keys, enter, pinned, T, L: Math.max(1, Hs - vh), vh };
  }

  function layout() {
    W = host!.clientWidth || innerWidth;
    H = host!.clientHeight || innerHeight;
    ppu = H / UNITS_H;
    const vh = innerHeight;
    const off = (dy: number, p: Pose): Pose => ({ ...p, y: p.y + dy });
    const Hh = heroEl!.offsetHeight;
    const exit = Hh + vh; // el nombre y el retrato están fijos a la página: salen con ella

    // Apertura: nombre + retrato adheridos a sus recuadros
    if (nameEl) {
      const r = nameEl.getBoundingClientRect();
      const s = Math.min(r.width / blockW, r.height / blockH);
      const p = P(r.left + r.width / 2, r.top + scrollY + r.height / 2, s);
      nameTrack = { keys: [{ y: 0, v: p, lin: true }, { y: exit, v: off(-exit, p), lin: true }] };
    }
    if (portEl) {
      const r = portEl.getBoundingClientRect();
      if (r.width > 0) {
        buildPortrait(r.width / r.height);
        const h = Math.min(r.height, r.width / portAspect);
        const p = P(r.left + r.width / 2, r.top + scrollY + r.height - h / 2, h);
        portTrack = { keys: [{ y: 0, v: p, lin: true }, { y: exit, v: off(-exit, p), lin: true }] };
      } else portTrack = { keys: [{ y: 0, v: OFF }] };
    }

    // Botella: la apertura es solo identidad (nombre + retrato). Al bajar, la botella sube desde abajo,
    // se estaciona junto al texto mientras se arma con el scroll y luego entra en su tramo.
    const pr = parkEl?.getBoundingClientRect();
    const wideLayout = !!pr && pr.width > 0;
    if (bottleStage) bottleTop = docTop(bottleStage);
    const first = bottleStage ? stageKeys(bottleStage, ['b1', 'b2', 'b3'], bp, -0.22, PI + 0.1, !wideLayout) : null;
    const bKeys: Key[] = [];
    if (wideLayout && first) {
      const parked = (ry: number): Pose => P(pr!.left + pr!.width / 2, vh / 2, Math.min(vh * 0.66, BOTTLE_MAX), ry);
      const below: Pose = { ...parked(-0.62), y: vh * 1.55 };
      const r0 = Hh * 0.8;
      const r1 = Math.max(r0 + 2, Hh * 1.25);
      const b = Math.max(r1 + 2, first.enter);
      bKeys.push({ y: 0, v: below }, { y: r0, v: below }, { y: r1, v: parked(-0.5) });
      bKeys.push({ y: (r1 + b) / 2, v: parked(-0.28) }, { y: b, v: parked(-0.4) });
      const a0 = Hh;
      bBuild = { a: a0, b: Math.max(a0 + 2, b - a0 > vh * 0.9 ? a0 + (b - a0) * 0.9 : b) };
    } else if (first) {
      // Vertical: la botella llega con su sección (entrada 1:1 desde abajo) y se arma al entrar
      bKeys.push({ y: 0, v: OFF });
      bBuild = { a: first.enter + vh * 0.25, b: Math.max(first.enter + vh * 0.25 + 2, first.pinned ? first.T + first.L * 0.22 : first.T + vh * 0.5) };
    }
    if (first) bKeys.push(...first.keys);
    bottleTrack = { keys: bKeys.length ? bKeys : [{ y: 0, v: OFF }] };

    // Be Fresh: la capa entra 1:1 con su sección mientras la botella sale con la suya
    const monos: { y: number; v: number }[] = [{ y: 0, v: 0 }];
    if (capeStage) {
      const k = stageKeys(capeStage, ['c1', 'c2', 'c3'], kp, -0.34, 0.4, true, -0.2);
      capeTrack = { keys: k.keys };
      const pin = $('.pstage__pin', capeStage);
      const pinH = getComputedStyle(pin!).position === 'sticky' ? pin!.clientHeight : vh;
      monos.push({ y: k.enter - 1, v: 0 }, { y: k.enter + pinH, v: 1 });
      capeStageEnter = k.enter;
      cBuild = { a: k.enter + vh * 0.3, b: Math.max(k.enter + vh * 0.3 + 2, k.pinned ? k.T + k.L * 0.22 : k.T + vh * 0.5) };
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
  const cur = { b: null as Pose | null, k: null as Pose | null, mono: 0, px: 0, py: 0, vib: 0 };
  let raf = 0;
  let last = 0;
  let frames = 0, slow = 0;
  let idleFrames = 0;
  let firstRender = true;
  let prevY = scrollY;
  let running = !document.hidden;
  let buildPhase = 0;
  const onScreen = (p: Pose, half: number) => p.y + half > -20 && p.y - half < H + 20 && p.x > -half * 2 && p.x < W + half * 2;
  const follow = (curP: Pose | null, tgt: Pose, half: number, dt: number, initRy?: number): Pose => {
    if (!curP) return { ...tgt, ry: initRy ?? tgt.ry };
    // Si el objeto (o su destino) está fuera de pantalla se coloca directamente: nunca cruza la pantalla en vuelo
    if (!onScreen(curP, half) || !onScreen(tgt, half)) return { ...tgt };
    return { x: damp(curP.x, tgt.x, K, dt), y: damp(curP.y, tgt.y, K, dt), s: damp(curP.s, tgt.s, K, dt), ry: damp(curP.ry, tgt.ry, K * 0.7, dt), rx: damp(curP.rx, tgt.rx, K, dt), rz: damp(curP.rz, tgt.rz, K, dt) };
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
    const tb = sample(bottleTrack, y);
    const tk = cape ? sample(capeTrack, y) : null;
    const heroTop = y < 40;
    cur.b = follow(cur.b, tb, tb.s / 2, dt, firstRender && heroTop ? 0 : undefined);
    cur.k = tk ? follow(cur.k, tk, tk.s / 2, dt) : null;
    cur.mono = damp(cur.mono, monoAt(y), K * 0.6, dt);
    cur.px = damp(cur.px, ptr.x, 6, dt);
    cur.py = damp(cur.py, ptr.y, 6, dt);

    // Nombre (dos filas) y retrato: adheridos a la página, con parallax distinto del puntero
    const nOn = onScreen(tn, (tn.s * blockH) / 2) && tn.y > -9000;
    rowGroups.forEach((grp, i) => {
      grp.visible = nOn;
      if (!nOn) return;
      // Cada fila se coloca por separado: así, pese a estar a distinta profundidad, ambas quedan alineadas con el texto del DOM
      const cxRow = tn.x - (blockW * tn.s) / 2 + (lineWidths[i] * tn.s) / 2;
      const cyRow = tn.y - (blockH / 2 - capOf - i * capOf * LINE + capOf / 2) * tn.s;
      place(grp, cxRow, cyRow, ROW_Z[i], tn.s);
      grp.rotation.set(0.03 + cur.py * 0.05, -0.1 + cur.px * 0.14, 0);
    });
    const pOn = onScreen(tp, tp.s / 2) && tp.y > -9000;
    portrait.visible = pOn;
    if (pOn) {
      const k = 1;
      place(portrait, tp.x + cur.px * 14, tp.y + cur.py * 6, 0, tp.s);
      portrait.scale.set((tp.s / ppu) * portAspect * k, (tp.s / ppu) * k, 1);
    }

    // Botella
    const bOn = onScreen(cur.b, cur.b.s / 2) && cur.b.y > -9000;
    bottleRoot.visible = shadow.visible = bOn;
    if (bOn) {
      const p = cur.b;
      const sc = p.s / ppu;
      bottleRoot.position.set((p.x + cur.px * 10 - W / 2) / ppu, (H / 2 - p.y) / ppu, 0.6);
      bottleRoot.scale.setScalar(sc);
      bottleRoot.rotation.set(p.rx + cur.py * 0.05, p.ry + cur.px * 0.16, -0.035 + cur.px * 0.015);
      shadow.position.set(bottleRoot.position.x, bottleRoot.position.y - sc * 0.5 - sc * 0.02, -0.2);
      shadow.scale.set(sc * 1.15, sc * 1.0, 1);
      shadowMat.opacity = 0.9;
    }

    // Armado de la botella según el scroll (trazo → vidrio → etiqueta → acabado)
    const pb = clamp((y - bBuild.a) / (bBuild.b - bBuild.a), 0, 1);
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
    const kOn = !!cur.k && !!cape && onScreen(cur.k, cur.k.s / 2) && cur.k.y > -9000;
    if (cape) cape.visible = kOn;
    if (kOn && cur.k && cape) {
      const p = cur.k;
      const wPx = p.s; // ancho en px
      cape.position.set((p.x + cur.px * 14 - W / 2) / ppu, (H / 2 - p.y) / ppu, 0.3);
      cape.scale.setScalar(wPx / ppu);
      cape.rotation.set(p.rx + cur.py * 0.06, p.ry + cur.px * 0.2, 0);
      capeU.uTime.value = snap ? 0 : now / 1000; // ?snap congela la ondulación (pruebas)
      capeU.uAmp.value = 0.32 + cur.vib * 1.1; // brisa suave en reposo; el desplazamiento la agita
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
    const gp = heroVisible && tp.y > -9000 ? tp : kOn && cur.k && (!bOn || cur.mono > 0.5) ? cur.k : cur.b;
    if (gp) {
      host!.style.setProperty('--gx', `${((gp.x / W) * 100).toFixed(2)}%`);
      host!.style.setProperty('--gy', `${((heroVisible && gp === tp ? gp.y - gp.s * 0.15 : gp.y) / H * 100).toFixed(2)}%`);
    }
    host!.style.setProperty('--mono', cur.mono.toFixed(3));

    if (bOn || kOn || nOn || pOn) {
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
      (!cur.k || !tk || (Math.abs(cur.k.x - tk.x) < 0.2 && Math.abs(cur.k.y - tk.y) < 0.2 && Math.abs(cur.k.ry - tk.ry) < 0.002)) &&
      !kOn && // la capa ondula mientras está a la vista
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
