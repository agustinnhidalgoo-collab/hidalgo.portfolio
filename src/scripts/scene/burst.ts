/* Transición entre mundos: la botella de Cordero estalla y, en el splash, el vino se convierte en la capa de Be Fresh.
   Todo es función del avance `e` (0 → 1) del tramo fijado #estallido: se puede ver en cámara lenta, detener o
   rebobinar con el scroll, y vuelve exactamente al mismo estado.
     0.00–0.12  grietas rojas que se propagan desde un punto de impacto (siguen las líneas de fractura reales)
     0.12       estallido: destello y el vidrio (con su etiqueta) se parte en fragmentos que salen girando
     0.12–0.45  el vino sale disparado en gotas brillantes
     0.34–0.86  las gotas vuelan y se posan sobre la silueta de la capa, que se materializa roja
     0.70–1.00  la capa (y la luz del fondo) pasa del rojo vino al blanco y negro de Be Fresh */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from 'three';

export const E_BREAK = 0.12;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Aleatorio determinista: los fragmentos y las gotas son siempre los mismos (el estado depende solo del scroll). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Fractura: celdas de Voronoi sobre la superficie de la botella (ángulo × altura) ---------- */
export interface Fracture {
  seeds: Vector2[]; // (θ, y)
  R: number; // radio con el que se mide el ángulo (arco)
  cell: (theta: number, y: number) => number;
  center: Vector3[]; // centro de cada fragmento (espacio de la botella)
  vel: Vector3[]; // desplazamiento total del fragmento (alturas de botella)
  spin: { axis: Vector3; turn: number }[];
}

export function makeFracture(tier: 'high' | 'mid' | 'low', R: number, radiusAt: (y: number) => number): Fracture {
  const [rows, cols] = tier === 'high' ? [9, 8] : tier === 'mid' ? [7, 7] : [5, 6];
  const r = rng(20251);
  const seeds: Vector2[] = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    // grilla con desorden: fragmentos de tamaños parecidos pero irregulares
    const y = 0.02 + ((i + 0.5 + (r() - 0.5) * 1.15) / rows) * 0.96;
    const th = -Math.PI + ((j + 0.5 + (r() - 0.5) * 1.2 + (i % 2) * 0.5) / cols) * Math.PI * 2;
    seeds.push(new Vector2(th, clamp(y, 0.01, 0.99)));
  }
  // alrededor del impacto (frente de la etiqueta) el vidrio se astilla en pedazos más chicos
  const extra = tier === 'low' ? 4 : 10;
  for (let k = 0; k < extra; k++) seeds.push(new Vector2((r() - 0.5) * 1.1, clamp(0.42 + (r() - 0.5) * 0.36, 0.05, 0.95)));
  const cell = (theta: number, y: number) => {
    let best = 0, bd = Infinity;
    for (let k = 0; k < seeds.length; k++) {
      let dt = Math.abs(theta - seeds[k].x);
      dt = Math.min(dt, Math.PI * 2 - dt);
      const d = (dt * R) ** 2 + (y - seeds[k].y) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  };
  const center: Vector3[] = [], vel: Vector3[] = [], spin: Fracture['spin'] = [];
  for (const s of seeds) {
    const rr = radiusAt(s.y);
    center.push(new Vector3(Math.sin(s.x) * rr, s.y, Math.cos(s.x) * rr));
    // hacia afuera del eje, un poco hacia arriba y hacia la cámara; lo de arriba sale con más fuerza
    const out = new Vector3(Math.sin(s.x), 0, Math.cos(s.x));
    const v = out.multiplyScalar(0.55 + r() * 0.75);
    v.y += 0.18 + r() * 0.5 + (s.y - 0.35) * 0.45;
    v.z += 0.06;
    v.x += (r() - 0.5) * 0.35;
    vel.push(v);
    spin.push({ axis: new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), turn: (r() * 2 - 1) * 9 });
  }
  return { seeds, R, cell, center, vel, spin };
}

/** Geometría lista para partirse: cada triángulo pertenece al fragmento de su celda.
 *  `toBottle` lleva del espacio local de la malla al de la botella (las etiquetas están giradas/desplazadas). */
export function shatterGeometry(geo: BufferGeometry, toBottle: Matrix4, fr: Fracture) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const n = pos.count;
  const inv = toBottle.clone().invert();
  const rot = new Matrix3().setFromMatrix4(inv);
  const aC = new Float32Array(n * 3), aV = new Float32Array(n * 3), aS = new Float32Array(n * 4);
  const c = new Vector3(), tmp = new Vector3();
  for (let i = 0; i < n; i += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.add(tmp.fromBufferAttribute(pos, i + k));
    c.divideScalar(3).applyMatrix4(toBottle);
    const id = fr.cell(Math.atan2(c.x, c.z), c.y);
    const ctr = fr.center[id].clone().applyMatrix4(inv);
    const v = fr.vel[id].clone().applyMatrix3(rot);
    const ax = fr.spin[id].axis.clone().applyMatrix3(rot).normalize();
    for (let k = 0; k < 3; k++) {
      const j = i + k;
      aC.set([ctr.x, ctr.y, ctr.z], j * 3);
      aV.set([v.x, v.y, v.z], j * 3);
      aS.set([ax.x, ax.y, ax.z, fr.spin[id].turn], j * 4);
    }
  }
  g.setAttribute('aCenter', new BufferAttribute(aC, 3));
  g.setAttribute('aVel', new BufferAttribute(aV, 3));
  g.setAttribute('aSpin', new BufferAttribute(aS, 4));
  return g;
}

export interface BurstUniforms {
  uBurst: { value: number };
  uCrack: { value: number };
  uGlow: { value: number }; // intensidad de las grietas: se apaga en el instante del estallido
}

/** Agrega a un material de la botella el estallido (vértices) y las grietas que brillan (fragmento).
 *  Se encadena con el onBeforeCompile que ya tenga (el armado por scroll). */
export function patchShatter(mat: Material, U: BurstUniforms, fr: Fracture, toBottle: Matrix4, key: string) {
  const prev = mat.onBeforeCompile.bind(mat);
  const seeds = fr.seeds;
  const uToBottle = { value: toBottle.clone() };
  mat.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.uniforms.uBurst = U.uBurst;
    sh.uniforms.uCrack = U.uCrack;
    sh.uniforms.uCrackGlow = U.uGlow;
    sh.uniforms.uSeeds = { value: seeds };
    sh.uniforms.uToBottle = uToBottle;
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aCenter;
        attribute vec3 aVel;
        attribute vec4 aSpin;
        uniform float uBurst;
        uniform mat4 uToBottle;
        varying vec3 vBP;
        vec3 rotA(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
        float burstEase(float t) { return 1.0 - pow(1.0 - t, 2.4); }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        if (uBurst > 0.0) objectNormal = rotA(objectNormal, aSpin.xyz, aSpin.w * burstEase(uBurst));`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vBP = (uToBottle * vec4(position, 1.0)).xyz;
        if (uBurst > 0.0) {
          float tt = burstEase(uBurst);
          float sc = 1.0 - smoothstep(0.18, 0.85, uBurst); // los fragmentos se achican mientras se alejan
          transformed = aCenter + rotA(transformed - aCenter, aSpin.xyz, aSpin.w * tt) * sc + aVel * tt * 1.1 + vec3(0.0, -0.5 * uBurst * uBurst, 0.0);
        }`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        #define NS ${seeds.length}
        uniform vec2 uSeeds[NS];
        uniform float uCrack;
        uniform float uCrackGlow;
        varying vec3 vBP;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        if (uCrack > 0.0 && uCrackGlow > 0.0) {
          // Grietas: bordes de las celdas de Voronoi (las mismas que separan los fragmentos)
          float th = atan(vBP.x, vBP.z);
          float d1 = 1e5, d2 = 1e5;
          for (int k = 0; k < NS; k++) {
            float dt = abs(th - uSeeds[k].x);
            dt = min(dt, 6.2831853 - dt) * ${fr.R.toFixed(4)};
            float d = length(vec2(dt, vBP.y - uSeeds[k].y));
            if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
          }
          float edge = d2 - d1;
          float w = fwidth(edge) * 0.9 + 0.0006;
          // se propagan desde el impacto (frente de la etiqueta)
          float dI = length(vec2(abs(th) * ${fr.R.toFixed(4)}, vBP.y - 0.42));
          float reach = uCrack * uCrack * 1.05;
          float on = smoothstep(reach, reach - 0.08, dI);
          float line = (1.0 - smoothstep(0.0, w, edge)) * on;
          float halo = (1.0 - smoothstep(0.0, w * 5.0, edge)) * on;
          gl_FragColor.rgb += (vec3(1.0, 0.25, 0.14) * line * 1.8 + vec3(0.6, 0.03, 0.02) * halo * 0.22) * uCrackGlow;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `shatter-${key}`;
  mat.needsUpdate = true;
}

/* ---------- Splash: gotas de vino (una sola llamada de dibujo) y destello del estallido ---------- */
export function createSplash(tier: 'high' | 'mid' | 'low') {
  const N = tier === 'high' ? 720 : tier === 'mid' ? 420 : 180;
  const geo = new IcosahedronGeometry(1, tier === 'low' ? 1 : 2);
  const mat = new MeshStandardMaterial({
    color: new Color(0x2c0009),
    emissive: new Color(0x0d0002),
    roughness: 0.07,
    metalness: 0.1,
    envMapIntensity: 2.6,
  });
  const drops = new InstancedMesh(geo, mat, N);
  drops.frustumCulled = false;
  drops.visible = false;

  const r = rng(7781);
  const start: Vector3[] = [], dir: Vector3[] = [], speed: number[] = [], size: number[] = [], delay: number[] = [], swirl: number[] = [], tgt: number[] = [];
  for (let i = 0; i < N; i++) {
    // nace dentro del cuerpo de la botella (donde está el vino)
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.085;
    start.push(new Vector3(Math.sin(a) * rad, 0.12 + r() * 0.5, Math.cos(a) * rad));
    // sale hacia afuera y hacia arriba, con un abanico amplio; algunas gotas hacia la cámara
    const d = new Vector3(Math.sin(a), 0.25 + r() * 0.95, Math.cos(a) + 0.3).normalize();
    dir.push(d);
    // la mayoría queda cerca (el cuerpo del splash); unas pocas salen lejos (spray)
    speed.push(0.18 + Math.pow(r(), 1.8) * 0.95);
    // muchísimas gotas finas, pocas medianas
    size.push(0.0035 + Math.pow(r(), 4) * 0.02);
    delay.push(r());
    swirl.push((r() < 0.5 ? -1 : 1) * (0.08 + r() * 0.22));
    tgt.push(i);
  }

  // Destello del estallido: un halo rojo que se abre y se apaga
  const flash = new Mesh(
    new PlaneGeometry(1, 1),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      uniforms: { uA: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform float uA; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; float g = exp(-d * d * 5.0) + exp(-d * d * 40.0) * 0.8; gl_FragColor = vec4(vec3(1.0, 0.18, 0.08) * g * uA, 1.0); }',
    }),
  );
  flash.visible = false;
  flash.renderOrder = 10;

  let targets: [number, number][] = []; // puntos sobre la silueta de la capa (u, v desde arriba)
  let capeAt: ((u: number, v: number, out: Vector3) => Vector3) | null = null; // posición viva sobre la tela
  /** Muestra la silueta real de la capa (píxeles opacos de su imagen) para que las gotas se posen sobre la tela. */
  function setCapeShape(img: CanvasImageSource & { width: number; height: number }, aspect: number, at: (u: number, v: number, out: Vector3) => Vector3) {
    capeAt = at;
    const w = 96, h = Math.max(8, Math.round(96 / aspect));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true })!;
    c.drawImage(img, 0, 0, w, h);
    const px = c.getImageData(0, 0, w, h).data;
    const opaque: [number, number][] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 140) opaque.push([x, y]);
    if (!opaque.length) return;
    const rr = rng(991);
    targets = Array.from({ length: N }, () => {
      const [x, y] = opaque[Math.floor(rr() * opaque.length)];
      return [(x + rr()) / w, (y + rr()) / h] as [number, number];
    });
    void aspect;
  }

  const m4 = new Matrix4(), q = new Quaternion(), sc = new Vector3(), up = new Vector3(0, 1, 0);
  const p0 = new Vector3(), p1 = new Vector3(), v = new Vector3(), tw = new Vector3(), perp = new Vector3(), zf = new Vector3(0, 0, 1);
  const bm = new Matrix4(), cm = new Matrix4();

  /** Posición de una gota en el avance e (espacio del mundo). */
  function at(i: number, e: number, Hb: number, out: Vector3) {
    const t1 = clamp((e - E_BREAK) / 0.33);
    const ease = 1 - Math.pow(1 - t1, 2.6);
    out.copy(start[i]).applyMatrix4(bm);
    v.copy(dir[i]).transformDirection(bm).multiplyScalar(speed[i] * Hb * ease);
    out.add(v);
    out.y -= 0.22 * Hb * t1 * t1; // el peso del líquido al final del vuelo
    const u = smooth(clamp((e - (0.34 + delay[i] * 0.2)) / 0.3));
    if (u > 0 && targets.length && capeAt) {
      const [tu, tv] = targets[tgt[i] % targets.length];
      capeAt(tu, tv, tw).applyMatrix4(cm);
      // vuela hacia su lugar en la tela con una curva (no en línea recta)
      perp.subVectors(tw, out).cross(zf).normalize().multiplyScalar(Math.sin(Math.PI * u) * swirl[i] * Hb);
      out.lerp(tw, u).add(perp);
    }
    return u;
  }

  /** Avanza el splash. `bottle`: grupo de la botella (alto 1 local); `Hb`: alto de la botella en el mundo. */
  function update(e: number, bottle: Object3D, Hb: number, cape: Object3D | null) {
    const on = e > E_BREAK && e < 0.92;
    drops.visible = on;
    // destello
    const f = e < E_BREAK ? 0 : clamp(1 - (e - E_BREAK) / 0.16);
    flash.visible = f > 0 && e > E_BREAK - 0.005;
    if (flash.visible) {
      bottle.updateWorldMatrix(true, false);
      p0.set(0, 0.42, 0).applyMatrix4(bottle.matrixWorld);
      flash.position.copy(p0);
      const k = 1 - f;
      flash.scale.setScalar(Hb * (0.4 + 1.7 * Math.pow(k, 0.6)));
      (flash.material as ShaderMaterial).uniforms.uA.value = Math.pow(f, 2.2) * 0.65;
    }
    if (!on) return;
    bottle.updateWorldMatrix(true, false);
    bm.copy(bottle.matrixWorld);
    if (cape) {
      cape.updateWorldMatrix(true, false);
      cm.copy(cape.matrixWorld);
    }
    const de = 0.004;
    for (let i = 0; i < N; i++) {
      const u = at(i, e, Hb, p0);
      at(i, e + de, Hb, p1);
      v.subVectors(p1, p0);
      const spd = v.length() / (de * Hb); // alturas de botella por unidad de avance
      const grow = clamp((e - E_BREAK) / 0.03);
      const rad = size[i] * Hb * grow * (1 - smooth(clamp((u - 0.8) / 0.2)));
      // las gotas se estiran en la dirección en que viajan (lectura de líquido, no de confeti)
      const st = 1 + clamp(spd * 0.22, 0, 1.25);
      if (v.lengthSq() > 1e-12) q.setFromUnitVectors(up, v.normalize());
      else q.identity();
      sc.set(rad, rad * st, rad);
      m4.compose(p0, q, sc);
      drops.setMatrixAt(i, m4);
    }
    drops.instanceMatrix.needsUpdate = true;
  }

  return { drops, flash, update, setCapeShape };
}

/** Agrega a la capa: la materialización (disolución con borde rojo) y el teñido de vino que se va al blanco y negro. */
export function patchCapeForm(sh: { uniforms: Record<string, unknown>; fragmentShader: string }, U: { uForm: { value: number }; uWine: { value: number } }) {
  sh.uniforms.uForm = U.uForm;
  sh.uniforms.uWine = U.uWine;
  sh.fragmentShader = sh.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uForm;
      uniform float uWine;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }`,
    )
    .replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      // vino: conserva los pliegues (luminancia) y los tiñe de rojo profundo
      float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 wine = vec3(0.13, 0.003, 0.012) * (0.25 + lum * 1.3) + vec3(0.3, 0.02, 0.04) * pow(lum, 2.2);
      diffuseColor.rgb = mix(diffuseColor.rgb, wine, uWine);
      if (uForm < 0.999) {
        float n = vn(vMapUv * 7.0) * 0.7 + vn(vMapUv * 21.0) * 0.3;
        float edge = uForm * 1.2 - n;
        if (edge < 0.0) discard;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.03, 0.04), (1.0 - smoothstep(0.0, 0.05, edge)) * 0.9);
      }`,
    )
    // si la tela tiene luz propia (la foto), también se tiñe de vino
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n      totalEmissiveRadiance = mix(totalEmissiveRadiance, wine * 0.5, uWine);');
}
