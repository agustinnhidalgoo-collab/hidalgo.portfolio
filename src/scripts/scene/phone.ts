/* Avatar del cierre (contacto): el muñeco con el teléfono en la oreja, guiñando.
   - Relieve 3D (cabeza, nariz, mano delante de la cara, pecho): la cabeza y el cuerpo se inclinan apenas hacia
     el cursor o hacia la opción de contacto que señalás; respira.
   - El teléfono «suena» (la mano con el teléfono vibra) mientras señalás WhatsApp; al elegir una opción, asiente.
   La mano y el teléfono son una capa aparte (avatar-tel-mano.webp) sobre la misma imagen. */
import { BufferAttribute, LinearFilter, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import baseUrl from '../../assets/portrait/avatar-tel.webp?url';
import handUrl from '../../assets/portrait/avatar-tel-mano.webp?url';

const IW = 1328, IH = 1184;
export const PHONE_ASPECT = IW / IH;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((y - cy) ** 2) / (2 * sy * sy)));
const smax = (a: number, b: number, k = 28) => k * Math.log(Math.exp(a / k) + Math.exp(b / k));

/** Contorno de la mano con el teléfono (mismo que la capa): ahí la superficie está delante de la cara. */
const HAND: [number, number][] = [[300, 420], [380, 366], [412, 420], [442, 590], [480, 668], [490, 745], [442, 792], [386, 816], [346, 882], [300, 906], [240, 882], [204, 850], [214, 770], [231, 680], [254, 590], [284, 520], [294, 470]];
function inHand(x: number, y: number) {
  let c = false;
  for (let i = 0, j = HAND.length - 1; i < HAND.length; j = i++) {
    const [xi, yi] = HAND[i], [xj, yj] = HAND[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Relieve moderado (px hacia la cámara): como en el avatar de la portada, sin exagerar para no deformar. */
function depthAt(x: number, y: number) {
  const q = ((x - 630) / 310) ** 2 + ((y - 450) / 395) ** 2;
  let head = q < 1 ? 185 * Math.pow(1 - q, 0.62) : 0;
  if (head > 0) head += 22 * gauss(x, y, 626, 560, 48, 70) + 8 * gauss(x, y, 640, 650, 110, 55);
  const neck = y > 680 ? 120 * Math.sqrt(Math.max(0, 1 - ((x - 655) / 190) ** 2)) * sstep(680, 760, y) : 0;
  const chest = 140 * Math.sqrt(Math.max(0, 1 - ((x - 664) / 720) ** 2)) * sstep(800, 940, y);
  let z = smax(head, smax(neck, chest));
  if (inHand(x, y)) z = Math.max(z, 175); // la mano y el teléfono, delante de la mejilla
  return z;
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
    p.y += uBreath * (0.4 + 0.6 * aHead);
    p.z *= uFlat;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uBase;
  uniform sampler2D uHand;
  uniform vec2 uShake;
  varying vec2 vUv;
  void main() {
    vec4 col = texture2D(uBase, vUv);
    // el teléfono vibra: la capa de la mano se dibuja corrida apenas (premultiplicada: sin halo)
    vec4 hand = texture2D(uHand, vUv - uShake);
    col.rgb = col.rgb * (1.0 - hand.a) + hand.rgb;
    col.a = max(col.a, hand.a);
    col.a *= smoothstep(0.0, 0.2, vUv.y) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    if (col.a < 0.01) discard;
    gl_FragColor = col;
    #include <colorspace_fragment>
  }
`;

export interface PhoneInput {
  gx: number; // hacia dónde inclinarse (−1…1)
  gy: number;
  ring: boolean; // WhatsApp señalado: el teléfono suena
  still?: boolean;
}

export function createPhoneAvatar(tier: 'high' | 'mid' | 'low', onReady: () => void) {
  const segX = tier === 'high' ? 150 : tier === 'mid' ? 110 : 72;
  const segY = Math.round(segX / PHONE_ASPECT);
  const geo = new PlaneGeometry(PHONE_ASPECT, 1, segX, segY);
  const pos = geo.attributes.position, uvs = geo.attributes.uv;
  const head = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = uvs.getX(i) * IW, y = (1 - uvs.getY(i)) * IH;
    pos.setZ(i, depthAt(x, y) / IH);
    head[i] = 1 - sstep(720, 840, y) * (inHand(x, y) ? 0.5 : 1); // la mano acompaña a la cabeza
  }
  geo.setAttribute('aHead', new BufferAttribute(head, 1));
  geo.computeBoundingSphere();

  const loader = new TextureLoader();
  const blank = loader.load('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: true,
    uniforms: {
      uBase: { value: blank }, uHand: { value: blank }, uShake: { value: [0, 0] },
      uYaw: { value: 0 }, uPitch: { value: 0 }, uRoll: { value: 0 }, uBodyYaw: { value: 0 }, uBreath: { value: 0 },
      uFlat: { value: 0.12 }, uPivot: { value: [(655 / IW - 0.5) * PHONE_ASPECT, 0.5 - 790 / IH, 70 / IH] },
    },
  });
  const mesh = new Mesh(geo, mat);
  mesh.visible = false;
  let ready = false;
  const load = (url: string) =>
    loader.loadAsync(url).then((t: Texture) => {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = tier === 'low' ? 1 : 4;
      return t;
    });
  Promise.all([load(baseUrl), load(handUrl)])
    .then(([b, h]) => {
      h.premultiplyAlpha = true;
      h.minFilter = LinearFilter; // la capa se mueve de a fracciones de píxel: sin mipmaps no tiembla el borde
      h.generateMipmaps = false;
      h.needsUpdate = true;
      mat.uniforms.uBase.value = b;
      mat.uniforms.uHand.value = h;
      ready = true;
      onReady();
    })
    .catch(() => {});

  const s = { hx: 0, hy: 0, vx: 0, vy: 0, ring: 0, nodAt: -Infinity };
  addEventListener('portfolio:nod', () => { s.nodAt = performance.now(); });

  function update(dt: number, now: number, inp: PhoneInput) {
    const u = mat.uniforms;
    const k = 22, c = 2 * Math.sqrt(k) * 0.95;
    for (let left = dt; left > 0; left -= 1 / 120) {
      const h = Math.min(left, 1 / 120);
      s.vx += (k * (inp.gx - s.hx) - c * s.vx) * h;
      s.vy += (k * (inp.gy - s.hy) - c * s.vy) * h;
      s.hx += s.vx * h;
      s.hy += s.vy * h;
    }
    s.ring += ((inp.ring ? 1 : 0) - s.ring) * (1 - Math.exp(-(inp.ring ? 10 : 6) * dt));
    const t = now / 1000, sway = inp.still ? 0 : 1;
    // asentir: un gesto corto hacia abajo y de vuelta
    const nt = (now - s.nodAt) / 620;
    const nod = nt >= 0 && nt < 1 ? Math.sin(Math.PI * nt) * Math.sin(Math.PI * nt * 2) * 0.5 + Math.sin(Math.PI * nt) * 0.5 : 0;
    u.uYaw.value = s.hx * 0.13 + sway * 0.012 * Math.sin(t * 0.7);
    u.uPitch.value = s.hy * 0.08 + nod * 0.09 + sway * 0.008 * Math.sin(t * 0.53 + 1.3);
    u.uRoll.value = -s.hx * 0.04 + sway * 0.01 * Math.sin(t * 0.41 + 0.4);
    u.uBodyYaw.value = s.hx * 0.05;
    u.uBreath.value = sway * 0.0035 * Math.sin(t * 1.55);
    // vibración de llamada: ráfagas cortas (como un teléfono que suena), no un temblor continuo
    const burst = Math.sin(t * Math.PI * 1.6) > 0.2 ? 1 : 0.15;
    const amp = s.ring * burst * (2.2 / IW);
    u.uShake.value = [Math.sin(t * 95) * amp, Math.sin(t * 77 + 1) * amp * 0.6];
    return !inp.still;
  }

  return {
    mesh,
    get ready() { return ready; },
    get ringing() { return s.ring > 0.05; },
    update,
  };
}
