/* Capa de Be Fresh como tela simulada (Verlet: partículas + restricciones de distancia).
   - Cuelga del cuello y cae sobre unos hombros invisibles: la forma de reposo tiene volumen (es una capa puesta).
   - Arriba es firme (hombros); hacia el ruedo se suelta: ahí es donde la tela ondula y se arrastra.
   - Se mueve por inercia (cuando la capa viaja, la tela queda atrás), por el aire del scroll y por el puntero
     (la tela se deja empujar donde la tocás). Paso fijo de simulación: estable aunque varíe la frecuencia de cuadros. */
import { BufferAttribute, DynamicDrawUsage, PlaneGeometry, Vector3 } from 'three';

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export interface ClothForces {
  /** Aceleración de inercia en el espacio local (la contraria a la del ancla). */
  inertia: Vector3;
  /** Intensidad del aire (reposo ≈ 0.4; con scroll sube). */
  wind: number;
  /** Puntero sobre la tela (espacio local) y su velocidad; null si no está cerca. */
  pointer: { x: number; y: number; vx: number; vy: number } | null;
  time: number;
}

export function createCloth(img: CanvasImageSource & { width: number; height: number }, aspect: number, tier: 'high' | 'mid' | 'low') {
  const segX = tier === 'high' ? 46 : tier === 'mid' ? 36 : 26;
  const segY = Math.round(segX / aspect);
  const nx = segX + 1, ny = segY + 1, N = nx * ny;
  const Hh = 1 / aspect;
  const geo = new PlaneGeometry(1, Hh, segX, segY);
  const posAttr = geo.attributes.position as BufferAttribute;
  posAttr.setUsage(DynamicDrawUsage);

  /* Silueta: solo se simulan las partículas que tocan la tela (lo transparente no tira de lo visible) */
  const aw = nx * 3, ah = ny * 3;
  const cv = document.createElement('canvas');
  cv.width = aw; cv.height = ah;
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.drawImage(img, 0, 0, aw, ah);
  const alpha = c.getImageData(0, 0, aw, ah).data;
  const active = new Uint8Array(N);
  for (let r = 0; r < ny; r++) for (let q = 0; q < nx; q++) {
    let on = 0;
    for (let dy = -2; dy <= 2 && !on; dy++) for (let dx = -2; dx <= 2 && !on; dx++) {
      const X = clamp(q * 3 + 1 + dx, 0, aw - 1), Y = clamp(r * 3 + 1 + dy, 0, ah - 1);
      if (alpha[(Y * aw + X) * 4 + 3] > 40) on = 1;
    }
    active[r * nx + q] = on;
  }

  /* Forma de reposo: la capa puesta. Cuello en (0.04, arriba); hombros que se abren y un torso que la empuja
     hacia adelante; el ruedo se abre apenas. Medido sobre la foto de la capa (capa.webp). */
  const COLLAR_X = 0.04;
  const rest = new Float32Array(N * 3);
  const stiff = new Float32Array(N); // 1 = fijo (cuello); hacia el ruedo, casi libre
  for (let r = 0; r < ny; r++) for (let q = 0; q < nx; q++) {
    const i = r * nx + q;
    const x = q / segX - 0.5, y = (0.5 - r / segY) * Hh, d = r / segY; // d: 0 cuello → 1 ruedo
    const rx = 0.07 + 0.33 * sstep(0, 0.42, d); // ancho del cuerpo debajo: cuello → hombros
    const zmax = 0.035 + 0.15 * sstep(0, 0.32, d) - 0.05 * sstep(0.55, 1, d);
    const k = (x - COLLAR_X) / rx;
    let z = Math.abs(k) < 1 ? zmax * Math.sqrt(1 - k * k) : 0;
    // fuera del cuerpo, la tela cae y se abre un poco hacia atrás en el ruedo
    if (Math.abs(k) >= 1) z = -0.03 * sstep(1, 1.8, Math.abs(k)) * d;
    rest.set([x, y, z], i * 3);
    const collar = d < 0.075 && Math.abs(x - COLLAR_X) < 0.075 ? 1 : 0;
    stiff[i] = collar ? 1 : 0.42 * Math.pow(1 - d, 2.4) + 0.012;
  }
  const P = Float32Array.from(rest), Q = Float32Array.from(rest);

  /* Restricciones: estructura, corte (diagonales) y flexión (cada dos), solo entre partículas activas */
  const cA: number[] = [], cB: number[] = [], cL: number[] = [], cS: number[] = [];
  const link = (a: number, b: number, s: number) => {
    if (!active[a] || !active[b]) return;
    const dx = rest[a * 3] - rest[b * 3], dy = rest[a * 3 + 1] - rest[b * 3 + 1], dz = rest[a * 3 + 2] - rest[b * 3 + 2];
    cA.push(a); cB.push(b); cL.push(Math.hypot(dx, dy, dz)); cS.push(s);
  };
  for (let r = 0; r < ny; r++) for (let q = 0; q < nx; q++) {
    const i = r * nx + q;
    if (q + 1 < nx) link(i, i + 1, 1);
    if (r + 1 < ny) link(i, i + nx, 1);
    if (q + 1 < nx && r + 1 < ny) { link(i, i + nx + 1, 0.6); link(i + 1, i + nx, 0.6); }
    if (q + 2 < nx) link(i, i + 2, 0.25);
    if (r + 2 < ny) link(i, i + nx * 2, 0.25);
  }
  const NC = cA.length;
  const iters = tier === 'high' ? 4 : 3;

  const STEP = 1 / 60;
  let acc = 0;
  function substep(f: ClothForces) {
    const h2 = STEP * STEP;
    const t = f.time;
    const p = f.pointer;
    for (let i = 0; i < N; i++) {
      if (!active[i] || stiff[i] >= 1) continue;
      const o = i * 3;
      const x = P[o], y = P[o + 1], z = P[o + 2];
      const free = 1 - stiff[i];
      // aire: un campo que viaja por la tela (más fuerte en el ruedo)
      const wv = Math.sin(t * 1.3 + x * 6.0 + y * 3.1) * 0.6 + Math.sin(t * 2.2 - x * 11.0 + y * 7.0) * 0.4;
      let ax = f.inertia.x * free + wv * f.wind * 0.18 * free;
      let ay = f.inertia.y * free + Math.abs(wv) * f.wind * 0.12 * free;
      let az = f.inertia.z * free + wv * f.wind * free;
      if (p) {
        // el puntero empuja la tela hacia adentro y la arrastra en la dirección en que se mueve
        const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
        const R = 0.13;
        if (d2 < R * R) {
          const fall = 1 - Math.sqrt(d2) / R;
          const spd = Math.min(6, Math.hypot(p.vx, p.vy));
          az -= fall * fall * (4 + spd * 9);
          ax += fall * p.vx * 7;
          ay += fall * p.vy * 7;
        }
      }
      const vx = (x - Q[o]) * 0.982, vy = (y - Q[o + 1]) * 0.982, vz = (z - Q[o + 2]) * 0.982;
      Q[o] = x; Q[o + 1] = y; Q[o + 2] = z;
      P[o] = x + vx + ax * h2;
      P[o + 1] = y + vy + ay * h2;
      P[o + 2] = z + vz + az * h2;
      // memoria de forma: vuelve a su caída (firme en los hombros, suelta en el ruedo)
      const k = stiff[i] * 0.5;
      P[o] += (rest[o] - P[o]) * k;
      P[o + 1] += (rest[o + 1] - P[o + 1]) * k;
      P[o + 2] += (rest[o + 2] - P[o + 2]) * k;
    }
    for (let it = 0; it < iters; it++) {
      for (let j = 0; j < NC; j++) {
        const a = cA[j] * 3, b = cB[j] * 3;
        const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = ((d - cL[j]) / d) * 0.5 * cS[j];
        const wa = stiff[cA[j]] >= 1 ? 0 : 1, wb = stiff[cB[j]] >= 1 ? 0 : 1;
        const s = wa + wb;
        if (!s) continue;
        const ka = (diff * 2 * wa) / s, kb = (diff * 2 * wb) / s;
        P[a] += dx * ka; P[a + 1] += dy * ka; P[a + 2] += dz * ka;
        P[b] -= dx * kb; P[b + 1] -= dy * kb; P[b + 2] -= dz * kb;
      }
    }
  }

  /** Avanza la tela `dt` segundos (pasos fijos; si el cuadro tardó mucho, no intenta recuperar todo). */
  function step(dt: number, f: ClothForces) {
    acc = Math.min(acc + dt, STEP * 4);
    let moved = false;
    while (acc >= STEP) {
      substep(f);
      acc -= STEP;
      moved = true;
    }
    if (!moved) return;
    for (let i = 0; i < N; i++) posAttr.setXYZ(i, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }

  /** Posición actual de la tela en un punto (u: 0 izquierda → 1 derecha; v: 0 arriba → 1 abajo), espacio local. */
  function positionAt(u: number, v: number, out: Vector3) {
    const fx = clamp(u) * segX, fy = clamp(v) * segY;
    const q = Math.min(segX - 1, Math.floor(fx)), r = Math.min(segY - 1, Math.floor(fy));
    const tx = fx - q, ty = fy - r;
    const i00 = (r * nx + q) * 3, i10 = i00 + 3, i01 = i00 + nx * 3, i11 = i01 + 3;
    for (let k = 0; k < 3; k++) {
      const a = P[i00 + k] + (P[i10 + k] - P[i00 + k]) * tx;
      const b = P[i01 + k] + (P[i11 + k] - P[i01 + k]) * tx;
      out.setComponent(k, a + (b - a) * ty);
    }
    return out;
  }

  // estado inicial ya con su volumen
  for (let i = 0; i < N; i++) posAttr.setXYZ(i, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
  geo.computeVertexNormals();

  return { geometry: geo, step, positionAt, height: Hh };
}
