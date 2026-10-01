/* Prepara el «títere» del avatar 3D a partir de src/assets/portrait/avatar.webp:
   - avatar-base.webp: el avatar sin iris (el blanco del ojo completado), base sobre la que se mueven los ojos.
   - avatar-iris.webp: solo los iris (con la parte tapada por los párpados reconstruida), para desplazarlos.
   - avatar-ojos.png: datos de los ojos. R = abertura del ojo (máscara), G = posición vertical dentro
     de la abertura (0 párpado superior → 1 inferior), B = alto de la abertura en px / 128 (para el parpadeo).
   Uso: node scripts/build-avatar-rig.mjs [carpeta-de-vista-previa] */
import sharp from 'sharp';

const SRC = 'src/assets/portrait/avatar.webp';
const OUT = 'src/assets/portrait';
const preview = process.argv[2];

/** Geometría medida a mano sobre avatar.webp (px), con una grilla ampliada 6×:
 *  borde del párpado superior e inferior (de comisura a comisura) e iris (centro y radio). */
const EYES = [
  {
    name: 'izq',
    top: [[474.5, 477], [476, 471], [480, 463], [485, 455], [490, 449], [498, 442], [505, 437], [512, 433], [520, 431], [530, 430], [540, 430], [550, 431], [558, 433], [565, 438], [571, 446], [576, 453], [580, 462], [582, 470], [582.5, 474]],
    bot: [[474.5, 477], [480, 478.5], [490, 479.5], [510, 480], [530, 480.5], [550, 480], [565, 478.5], [575, 476.5], [582.5, 474]],
    iris: { x: 537, y: 456, r: 28.5 },
  },
  {
    name: 'der',
    top: [[687, 456], [689, 446], [695, 436], [703, 427], [711, 420], [718, 415], [728, 411.5], [740, 410], [752, 410.5], [760, 411.5], [769, 414], [782, 420], [795, 427.5], [802, 435], [806, 442]],
    bot: [[687, 456], [695, 458], [705, 459.3], [722, 460], [740, 459.5], [755, 457], [765, 454.5], [775, 450.5], [789, 446], [799, 442.8], [806, 442]],
    iris: { x: 740, y: 438, r: 28.75 },
  },
];

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };

/** Interpolación lineal de una polilínea [[x, y], ...] ordenada por x. */
const curve = (pts) => (x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return pts[pts.length - 1][1];
};
const rigs = EYES.map((e) => ({ ...e, xl: e.top[0][0], xr: e.top[e.top.length - 1][0], top: curve(e.top), bot: curve(e.bot) }));

// ---------- Máscara de la abertura (con borde suave) y coordenada vertical ----------
const eyeData = Buffer.alloc(N * 3);
const open = new Float32Array(N); // 0..1
for (const e of rigs) {
  for (let x = Math.floor(e.xl) - 2; x <= Math.ceil(e.xr) + 2; x++) {
    const t = e.top(x), b = e.bot(x);
    if (!(b > t)) continue;
    const h = b - t;
    for (let y = Math.floor(t) - 2; y <= Math.ceil(b) + 2; y++) {
      // cobertura: distancia (en px) al borde más cercano, suavizada 1 px; afinada en las comisuras
      const d = Math.min(y + 0.5 - t, b - (y + 0.5), x + 0.5 - e.xl, e.xr - (x + 0.5));
      const a = Math.max(0, Math.min(1, d + 0.5));
      if (a <= 0) continue;
      const p = y * W + x;
      open[p] = Math.max(open[p], a);
      eyeData[p * 3] = Math.round(open[p] * 255);
      eyeData[p * 3 + 1] = Math.round(Math.max(0, Math.min(1, (y + 0.5 - t) / h)) * 255);
      eyeData[p * 3 + 2] = Math.round(Math.min(1, h / 128) * 255);
    }
  }
}

// ---------- Base sin iris ----------
// El blanco del ojo tiene sombreado: más oscuro bajo el párpado superior y hacia las comisuras.
// Se mide su color real a cada lado del iris, por franjas de altura dentro de la abertura (t: 0 arriba, 1 abajo),
// y el hueco del iris se rellena mezclando ambos perfiles a lo ancho.
const base = Buffer.from(data);
const BINS = 12;
for (const e of rigs) {
  const { x: cx, y: cy, r } = e.iris;
  const R = r + 2.5; // un poco más que el iris: se lleva también su borde oscuro
  const prof = [0, 1].map(() => Array.from({ length: BINS }, () => [0, 0, 0, 0]));
  for (let x = Math.floor(e.xl); x <= Math.ceil(e.xr); x++) {
    const t0 = e.top(x), b0 = e.bot(x), h = b0 - t0;
    if (h < 6) continue;
    for (let y = Math.ceil(t0 + 1.5); y <= Math.floor(b0 - 1.5); y++) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R + 1.5) continue;
      const t = (y + 0.5 - t0) / h, k = Math.min(BINS - 1, Math.floor(t * BINS));
      const side = x < cx ? 0 : 1, q = (y * W + x) * 4;
      // pesa más lo cercano al iris: es lo que continúa por detrás
      const wgt = 1 / (1 + Math.abs(Math.abs(x - cx) - R) / 8);
      const P = prof[side][k];
      P[0] += data[q] * wgt; P[1] += data[q + 1] * wgt; P[2] += data[q + 2] * wgt; P[3] += wgt;
    }
  }
  // franjas vacías: se completan desde la vecina; un lado sin datos toma el otro
  for (const side of prof) {
    for (let k = 0; k < BINS; k++) if (!side[k][3]) { const n = side.slice(k + 1).find((b) => b[3]) || side.slice(0, k).reverse().find((b) => b[3]); if (n) side[k] = [...n]; }
  }
  const col = (side, t) => {
    const f = Math.max(0, Math.min(BINS - 1, t * BINS - 0.5)), k = Math.floor(f), u = f - k, k2 = Math.min(BINS - 1, k + 1);
    const A = prof[side][k], B = prof[side][k2];
    if (!A[3] && !B[3]) return null;
    return [0, 1, 2].map((i) => (A[i] / A[3]) * (1 - u) + (B[i] / B[3]) * u);
  };
  for (let y = Math.floor(cy - R - 3); y <= Math.ceil(cy + R + 3); y++) for (let x = Math.floor(cx - R - 3); x <= Math.ceil(cx + R + 3); x++) {
    const p = y * W + x, a = open[p];
    if (a <= 0) continue;
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    const cover = Math.max(0, Math.min(1, (R + 3 - d) / 5)); // iris y un anillo de transición: sin costura
    if (cover <= 0) continue;
    const t = (y + 0.5 - e.top(x)) / Math.max(1, e.bot(x) - e.top(x));
    const L = col(0, t), Rr = col(1, t);
    const u = Math.max(0, Math.min(1, (x + 0.5 - (cx - R)) / (2 * R)));
    const c = L && Rr ? L.map((v, i) => v * (1 - u) + Rr[i] * u) : (L || Rr);
    const q = p * 4, m = cover * a;
    for (let i = 0; i < 3; i++) base[q + i] = Math.round(data[q + i] * (1 - m) + c[i] * m);
  }
}

// ---------- Iris: disco completo; lo tapado por los párpados se reconstruye desde lo visible ----------
const iris = Buffer.alloc(N * 4);
for (const e of rigs) {
  const { x: cx, y: cy, r } = e.iris;
  const R = r + 1.5, EXT = 5; // arriba y abajo el iris se prolonga bajo los párpados: al moverse nunca deja un hueco
  for (let y = Math.floor(cy - R - EXT - 1); y <= Math.ceil(cy + R + EXT + 1); y++) for (let x = Math.floor(cx - R - 1); x <= Math.ceil(cx + R + 1); x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dist = Math.hypot(dx, dy);
    const Rt = R + EXT * (dist ? (Math.abs(dy) / dist) ** 10 : 0); // solo en la vertical estricta (lo que siempre tapan los párpados)
    const a = Math.max(0, Math.min(1, Rt - dist + 0.5));
    if (a <= 0) continue;
    const p = y * W + x;
    let c;
    if (open[p] > 0.85 && dist <= R) c = px(x, y); // fuera del disco real (prolongación) siempre se reconstruye
    else {
      // Reconstrucción radial: mismo radio (respeta el aro oscuro del borde), girando hacia la horizontal
      // hasta encontrar un punto visible. Así el iris sigue redondo cuando se mueve y deja ver lo tapado.
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.min(Math.hypot(dx, dy), r - 0.5);
      let th = Math.atan2(dy, dx), found = null;
      const toward = Math.abs(th) < Math.PI / 2 ? 0 : Math.sign(th) * Math.PI; // horizontal más cercana
      for (let k = 0; k < 90 && !found; k++) {
        th += (toward - th) * 0.06 + Math.sign(toward - th) * 0.004;
        const sx = Math.round(cx + d * Math.cos(th) - 0.5), sy = Math.round(cy + d * Math.sin(th) - 0.5);
        if (open[sy * W + sx] > 0.95) found = px(sx, sy);
      }
      c = (found || [40, 22, 14]).map((v) => v * 0.94);
    }
    const q = p * 4;
    iris[q] = c[0]; iris[q + 1] = c[1]; iris[q + 2] = c[2]; iris[q + 3] = Math.round(a * 255);
  }
}

await sharp(base, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`${OUT}/avatar-base.webp`);
await sharp(iris, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 6 }).toFile(`${OUT}/avatar-iris.webp`);
await sharp(eyeData, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/avatar-ojos.png`);

if (preview) {
  // Vista de control: párpados medidos (puntos), curvas ajustadas e iris
  let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  for (const e of rigs) {
    let dT = '', dB = '';
    for (let x = e.xl; x <= e.xr; x++) { dT += `${x === e.xl ? 'M' : 'L'}${x},${e.top(x).toFixed(1)} `; dB += `${x === e.xl ? 'M' : 'L'}${x},${e.bot(x).toFixed(1)} `; }
    svg += `<path d="${dT}" stroke="#ff0" fill="none" stroke-width="0.6"/><path d="${dB}" stroke="#0f0" fill="none" stroke-width="0.6"/>`;
    svg += `<circle cx="${e.iris.x}" cy="${e.iris.y}" r="${e.iris.r}" stroke="#f00" fill="none" stroke-width="0.6"/>`;
  }
  svg += '</svg>';
  const crop = { left: 455, top: 390, width: 380, height: 110 };
  const marked = await sharp(SRC).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  await sharp(marked).extract(crop).resize({ width: crop.width * 3, kernel: 'nearest' }).toFile(`${preview}/rig-lids.png`);
  await sharp(base, { raw: { width: W, height: H, channels: 4 } }).extract(crop).resize({ width: crop.width * 3 }).png().toFile(`${preview}/rig-base.png`);
}
console.log('ok');
