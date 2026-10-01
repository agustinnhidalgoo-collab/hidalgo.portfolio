/* Avatar 3D de la portada: un «títere» hecho a partir de la imagen del muñeco.
   - La imagen se monta sobre una malla con relieve (cabeza, nariz, cuello, pecho). La cabeza gira sobre el
     cuello de verdad: la nariz se desplaza más que las orejas, como en un modelo 3D.
   - Los ojos se mueven aparte: el iris se desliza sobre el blanco reconstruido (scripts/build-avatar-rig.mjs)
     y los párpados lo recortan. También parpadea: el párpado superior baja sobre el ojo.
   - Mira a donde está el puntero; sin puntero mira alrededor, solo. Al bajar, mira hacia el botón.
   Los ojos van primero y la cabeza los sigue más lenta, como una mirada real. */
import {
  BufferAttribute,
  LinearFilter,
  Mesh,
  NoColorSpace,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import baseUrl from '../../assets/portrait/avatar-base.webp?url';
import irisUrl from '../../assets/portrait/avatar-iris.webp?url';
import eyesUrl from '../../assets/portrait/avatar-ojos.png?url';
import winkUrl from '../../assets/portrait/avatar-guino.webp?url';

/** Medidas de avatar.webp (px): todo el relieve se describe en este sistema. */
const IW = 1328, IH = 1167;
export const AVATAR_ASPECT = IW / IH;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((y - cy) ** 2) / (2 * sy * sy)));
/** Máximo suave: une cabeza, cuello y pecho sin pliegues. */
const smax = (a: number, b: number, k = 28) => k * Math.log(Math.exp(a / k) + Math.exp(b / k));

/** Relieve (px hacia la cámara) en un punto de la imagen. */
function depthAt(x: number, y: number) {
  // Cabeza: elipsoide de frente achatado (las caras no son esferas)
  const q = ((x - 640) / 318) ** 2 + ((y - 405) / 388) ** 2;
  // Relieve moderado y sin pendientes bruscas: la imagen es una sola vista, si se exagera la cara se deforma
  let head = q < 1 ? 185 * Math.pow(1 - q, 0.62) : 0;
  if (head > 0) {
    head += 22 * gauss(x, y, 640, 560, 48, 70); // nariz
    head += 8 * gauss(x, y, 648, 690, 110, 55); // boca y mentón
    head -= 6 * gauss(x, y, 537, 456, 50, 30) + 6 * gauss(x, y, 740, 438, 50, 30); // cuencas
  }
  // Cuello: cilindro detrás del mentón
  const neck = y > 640 ? 120 * Math.sqrt(Math.max(0, 1 - ((x - 677) / 185) ** 2)) * sstep(640, 720, y) : 0;
  // Pecho y hombros
  const chest = 140 * Math.sqrt(Math.max(0, 1 - ((x - 664) / 720) ** 2)) * sstep(760, 900, y);
  return smax(head, smax(neck, chest));
}

const VERT = /* glsl */ `
  uniform float uYaw;
  uniform float uPitch;
  uniform float uRoll;
  uniform float uBodyYaw;
  uniform float uBreath;
  uniform float uFlat;
  uniform vec3 uPivot;
  attribute float aHead;
  varying vec2 vUv;
  mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
  void main() {
    vUv = uv;
    vec3 q = position - uPivot;
    vec3 head = rotY(uYaw) * rotX(uPitch) * rotZ(uRoll) * q;
    vec3 body = rotY(uBodyYaw) * q;
    vec3 p = mix(body, head, aHead) + uPivot;
    p.y += uBreath * (0.4 + 0.6 * aHead); // respiración: el pecho sube apenas y arrastra la cabeza
    p.z *= uFlat; // el giro usa el relieve completo; la perspectiva, uno más plano (no agranda la cara)
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uBase;
  uniform sampler2D uIris;
  uniform sampler2D uEyes;
  uniform sampler2D uWink;
  uniform vec2 uLook;
  uniform float uBlink;
  uniform float uWinkOn;
  uniform float uTexH;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    vec4 col;
    if (uWinkOn > 0.5) {
      col = texture2D(uWink, uv);
    } else {
      col = texture2D(uBase, uv);
      vec3 e = texture2D(uEyes, uv).rgb; // r: abertura · g: altura dentro del ojo · b: alto del ojo
      if (e.r > 0.004) {
        float h = e.b * 128.0 / uTexH;
        if (e.g < uBlink) {
          // Parpadeo: el párpado baja. En su borde viaja la línea de pestañas original;
          // por encima, piel lisa del párpado (tomada justo sobre las pestañas, sin repetir el pliegue).
          float lidTop = uv.y + e.g * h;               // borde superior del ojo en esta columna (uv)
          float d = (uBlink - e.g) * h * uTexH;        // px por encima del borde que baja
          float LASH = 5.0;
          vec2 src = vec2(uv.x, lidTop + (d < LASH ? d + 0.5 : LASH + 5.0 + (d - LASH) * 0.12) / uTexH);
          vec3 lid = texture2D(uBase, src).rgb * (d < LASH ? 1.0 : 0.94);
          col.rgb = mix(col.rgb, lid, e.r);
        } else {
          vec4 ir = texture2D(uIris, uv - uLook); // premultiplicado: el borde filtrado no deja halo
          col.rgb = col.rgb * (1.0 - ir.a * e.r) + ir.rgb * e.r;
          // sombra del párpado sobre el ojo mientras baja
          col.rgb *= 1.0 - 0.35 * uBlink * smoothstep(0.12, 0.0, e.g - uBlink) * e.r;
        }
      }
    }
    // Fundidos: el torso se disuelve abajo y en los hombros (sin cortes rectos)
    col.a *= smoothstep(0.0, 0.2, uv.y) * smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x);
    if (col.a < 0.01) discard;
    gl_FragColor = col;
    #include <colorspace_fragment>
  }
`;

export interface AvatarInput {
  /** Hacia dónde mirar (−1…1; x a la derecha, y hacia abajo) y si viene del puntero. */
  gx: number;
  gy: number;
  pointer: boolean;
  /** Guiño en curso: 0 nada · 1 ojo cerrado (se usa la imagen del guiño). */
  winking: boolean;
  /** Sin animación propia (movimiento reducido o pruebas). */
  still?: boolean;
}

export function createAvatar(tier: 'high' | 'mid' | 'low', onReady: () => void) {
  /* ---------- Malla con relieve ---------- */
  const segX = tier === 'high' ? 176 : tier === 'mid' ? 128 : 84;
  const segY = Math.round(segX / AVATAR_ASPECT);
  const geo = new PlaneGeometry(AVATAR_ASPECT, 1, segX, segY);
  const pos = geo.attributes.position;
  const uvs = geo.attributes.uv;
  const head = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = uvs.getX(i) * IW, y = (1 - uvs.getY(i)) * IH;
    pos.setZ(i, depthAt(x, y) / IH);
    // La cabeza gira entera por encima del mentón; el cuello hace de bisagra
    head[i] = 1 - sstep(700, 815, y);
  }
  geo.setAttribute('aHead', new BufferAttribute(head, 1));
  geo.computeBoundingSphere();
  const toPlane = (x: number, y: number, z: number): [number, number, number] => [(x / IW - 0.5) * AVATAR_ASPECT, 0.5 - y / IH, z / IH];

  /* ---------- Texturas ---------- */
  const loader = new TextureLoader();
  const blank = loader.load('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: true,
    uniforms: {
      uBase: { value: blank }, uIris: { value: blank }, uEyes: { value: blank }, uWink: { value: blank },
      uLook: { value: [0, 0] }, uBlink: { value: 0 }, uWinkOn: { value: 0 }, uTexH: { value: IH },
      uYaw: { value: 0 }, uPitch: { value: 0 }, uRoll: { value: 0 }, uBodyYaw: { value: 0 }, uBreath: { value: 0 },
      uFlat: { value: 0.12 }, uPivot: { value: toPlane(662, 765, 70) },
    },
  });
  const mesh = new Mesh(geo, mat);
  mesh.visible = false;
  let ready = false;
  const load = (url: string, color: boolean) =>
    loader.loadAsync(url).then((t: Texture) => {
      t.colorSpace = color ? SRGBColorSpace : NoColorSpace;
      if (!color) {
        t.generateMipmaps = false;
        t.minFilter = LinearFilter;
      } else t.anisotropy = tier === 'low' ? 1 : 4;
      return t;
    });
  Promise.all([load(baseUrl, true), load(irisUrl, true), load(eyesUrl, false), load(winkUrl, true)])
    .then(([b, i, e, w]) => {
      const u = mat.uniforms;
      i.premultiplyAlpha = true;
      i.needsUpdate = true;
      u.uBase.value = b; u.uIris.value = i; u.uEyes.value = e; u.uWink.value = w;
      ready = true;
      onReady();
    })
    .catch(() => {});

  /* ---------- Comportamiento ---------- */
  // Giro máximo de la cabeza (rad): dentro de este rango la imagen se sostiene sin deformarse.
  // La sensación de mirar la completan los ojos, que se mueven más.
  const YAW = 0.15, PITCH = 0.085;
  const EYE_X = 13 / IW, EYE_Y = 2.5 / IH; // recorrido máximo del iris (uv)
  const s = {
    gx: 0, gy: 0, // mirada objetivo, ya suavizada
    ex: 0, ey: 0, // ojos (−1…1 respecto del rostro)
    hx: 0, hy: 0, vx: 0, vy: 0, // cabeza (−1…1) con su velocidad: un resorte, no un desliz lineal
    blinkAt: performance.now() + 1800, blinkT: -1,
    idleAt: 0, ix: 0, iy: 0,
  };
  const IDLE = [[0, 0], [-0.55, -0.1], [0.6, 0.05], [0, 0], [-0.35, 0.35], [0.45, -0.3], [0.2, 0.15], [-0.7, 0.1], [0, -0.05]];
  let idleI = 0;

  /** Avanza la animación. Devuelve true mientras haya algo moviéndose (siempre, salvo `still`). */
  function update(dt: number, now: number, inp: AvatarInput) {
    const u = mat.uniforms;
    // Mirada: el puntero manda; sin puntero, mira alrededor por su cuenta cada tanto
    let tx = inp.gx, ty = inp.gy;
    if (!inp.pointer && !inp.still) {
      if (now > s.idleAt) {
        idleI = (idleI + 1 + (Math.random() < 0.3 ? 1 : 0)) % IDLE.length;
        [s.ix, s.iy] = IDLE[idleI];
        s.idleAt = now + 1700 + Math.random() * 2600;
        if (Math.random() < 0.35) s.blinkAt = Math.min(s.blinkAt, now + 60); // un cambio grande de mirada suele venir con un parpadeo
      }
      tx = clamp(tx + s.ix, -1, 1);
      ty = clamp(ty + s.iy, -1, 1);
    }
    if (inp.winking) { tx = 0; ty = 0; }
    // Ojos: sacádicos (rápidos); cabeza: resorte lento que va detrás
    s.gx = tx; s.gy = ty;
    const hxT = 0.65 * s.gx, hyT = 0.6 * s.gy;
    const k = 26, c = 2 * Math.sqrt(k) * 0.92; // casi crítico: llega suave, con un asentamiento mínimo
    // integración en pasos cortos: estable aunque un cuadro tarde (pestaña recién activada)
    for (let left = dt; left > 0; left -= 1 / 120) {
      const h = Math.min(left, 1 / 120);
      s.vx += (k * (hxT - s.hx) - c * s.vx) * h;
      s.vy += (k * (hyT - s.hy) - c * s.vy) * h;
      s.hx += s.vx * h;
      s.hy += s.vy * h;
    }
    const exT = clamp(s.gx - 0.6 * s.hx, -1, 1), eyT = clamp(s.gy - 0.6 * s.hy, -1, 1);
    s.ex = damp(s.ex, exT, inp.winking ? 40 : 30, dt);
    s.ey = damp(s.ey, eyT, inp.winking ? 40 : 30, dt);

    // Parpadeo natural cada 2,5–6 s (cerrar rápido, abrir un poco más lento)
    if (!inp.still && !inp.winking && s.blinkT < 0 && now > s.blinkAt) s.blinkT = 0;
    let blink = 0;
    if (s.blinkT >= 0) {
      s.blinkT += dt * 1000;
      const t = s.blinkT;
      blink = t < 70 ? t / 70 : t < 100 ? 1 : t < 190 ? 1 - (t - 100) / 90 : 0;
      blink = blink * blink * (3 - 2 * blink);
      if (t >= 190) { s.blinkT = -1; s.blinkAt = now + 2500 + Math.random() * 3500; }
    }

    const t = now / 1000;
    const sway = inp.still ? 0 : 1;
    u.uYaw.value = s.hx * YAW + sway * 0.012 * Math.sin(t * 0.7);
    u.uPitch.value = s.hy * PITCH + sway * 0.008 * Math.sin(t * 0.53 + 1.3);
    u.uRoll.value = -s.hx * 0.05 + sway * 0.01 * Math.sin(t * 0.41 + 0.4);
    u.uBodyYaw.value = s.hx * 0.05;
    u.uBreath.value = sway * 0.0035 * Math.sin(t * 1.55);
    u.uLook.value = [s.ex * EYE_X, -s.ey * EYE_Y];
    u.uBlink.value = blink * 1.04; // un poco más que el alto del ojo: cierra del todo
    u.uWinkOn.value = inp.winking ? 1 : 0;
    return !inp.still;
  }

  return {
    mesh,
    get ready() { return ready; },
    update,
  };
}
