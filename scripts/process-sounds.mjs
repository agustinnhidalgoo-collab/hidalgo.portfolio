/**
 * Procesa las grabaciones fuente (Freesound, CC0) a los archivos que usa la web.
 *
 * Para cada sonido: recorte → filtro paso alto (quita retumbe que no se oye en parlantes chicos) → fundidos cortos
 * → mono (salvo los ambientes) → nivel igualado por rol → MP3.
 *
 * Igualar por rol: el «volumen» se mide como el máximo de energía en ventanas de 100 ms (lo que el oído percibe
 * en un golpe corto; el LUFS integrado no sirve para sonidos de medio segundo) y se lleva a un objetivo según
 * la importancia del momento. Luego se limita el pico a −1 dBFS. Así el mapa de sonidos solo ajusta matices.
 *
 * Uso: node scripts/process-sounds.mjs <spec.json> <carpeta-fuente> <carpeta-salida>
 *   spec: [{ out, src, start, end, fadeIn?, fadeOut?, role, stereo?, hp?, loop?, limit? }]
 *   Requiere un ffmpeg con encoder MP3 (variable FFMPEG o ffmpeg en el PATH).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FF = process.env.FFMPEG || 'ffmpeg';
const SR = 48000;
/** Energía máxima en 100 ms (dBFS) por rol. hero: momentos clave · mid: acompañan · micro: interfaz · bed: ambiente */
const TARGET = { hero: -13, mid: -17, micro: -21, bed: -30 };

const [specPath, srcDir, outDir] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const decode = (file, ch) =>
  new Float32Array(
    (() => {
      const b = execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-i', file, '-ac', String(ch), '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
    })(),
  );

/** Paso alto de 2.º orden (Butterworth) in situ, canal por canal. */
function highpass(x, ch, fc) {
  const w = Math.tan((Math.PI * fc) / SR), k = Math.SQRT2;
  const n = 1 / (1 + k * w + w * w);
  const b0 = n, b1 = -2 * n, b2 = n, a1 = 2 * (w * w - 1) * n, a2 = (1 - k * w + w * w) * n;
  for (let c = 0; c < ch; c++) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = c; i < x.length; i += ch) {
      const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
    }
  }
}

function maxWindowDb(x, ch) {
  const win = Math.round(SR * 0.1) * ch, hop = Math.round(SR * 0.02) * ch;
  let best = -200;
  for (let i = 0; i + win <= Math.max(win, x.length); i += hop) {
    let s = 0;
    const end = Math.min(x.length, i + win);
    for (let j = i; j < end; j++) s += x[j] * x[j];
    best = Math.max(best, 10 * Math.log10(s / win + 1e-12));
  }
  return best;
}
function meanDb(x) {
  let s = 0;
  for (const v of x) s += v * v;
  return 10 * Math.log10(s / x.length + 1e-12);
}

const report = [];
for (const s of spec) {
  const ch = s.stereo ? 2 : 1;
  const all = decode(path.join(srcDir, s.src), ch);
  const a = Math.round((s.start ?? 0) * SR) * ch;
  const b = s.end ? Math.min(all.length, Math.round(s.end * SR) * ch) : all.length;
  const x = all.slice(a, b);
  highpass(x, ch, s.hp ?? 60);

  // Fundidos: entrada corta (sin clic) y salida suave (coseno)
  const fi = Math.round(((s.fadeIn ?? 3) / 1000) * SR), fo = Math.round(((s.fadeOut ?? 40) / 1000) * SR);
  const frames = x.length / ch;
  for (let f = 0; f < frames; f++) {
    let g = 1;
    if (f < fi) g *= f / fi;
    if (f > frames - fo) g *= 0.5 - 0.5 * Math.cos((Math.PI * (frames - f)) / fo);
    for (let c = 0; c < ch; c++) x[f * ch + c] *= g;
  }

  // Bucle sin costura (ambientes): el final se funde con el comienzo
  let y = x;
  if (s.loop) {
    const xf = Math.round(SR * (s.loop / 1000)) * ch;
    y = x.slice(0, x.length - xf);
    for (let i = 0; i < xf; i++) {
      const t = i / xf;
      y[i] = y[i] * Math.sqrt(t) + x[x.length - xf + i] * Math.sqrt(1 - t);
    }
  }

  // Limitador de picos (opcional, `limit` dB): algunas grabaciones tienen un golpe muy por encima de su cuerpo
  // (el «clic» inicial de un chorro, el cierre de la tijera); se recorta ese exceso para que el cuerpo se oiga.
  // Anticipación de 3 ms (sin distorsión en el ataque) y liberación de 80 ms.
  if (s.limit) {
    let pk = 0;
    for (const v of y) pk = Math.max(pk, Math.abs(v));
    const thr = pk * Math.pow(10, -s.limit / 20);
    const look = Math.round(SR * 0.003), rel = Math.exp(-1 / (SR * 0.08));
    const frames = y.length / ch, g = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
      let m = 0;
      for (let c = 0; c < ch; c++) m = Math.max(m, Math.abs(y[f * ch + c]));
      g[f] = m > thr ? thr / m : 1;
    }
    // mínimo en la ventana de anticipación y suavizado de la recuperación
    const out = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
      let m = 1;
      for (let j = f; j < Math.min(frames, f + look); j++) if (g[j] < m) m = g[j];
      out[f] = m;
    }
    let cur = 1;
    for (let f = 0; f < frames; f++) {
      cur = out[f] < cur ? out[f] : out[f] + (cur - out[f]) * rel;
      for (let c = 0; c < ch; c++) y[f * ch + c] *= cur;
    }
  }

  // Nivel por rol y techo de pico
  const now = s.role === 'bed' ? meanDb(y) : maxWindowDb(y, ch);
  let gain = Math.pow(10, (TARGET[s.role] - now) / 20);
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  const ceil = Math.pow(10, -1 / 20);
  if (peak * gain > ceil) gain = ceil / peak;
  for (let i = 0; i < y.length; i++) y[i] *= gain;

  // WAV temporal → MP3
  const wav = path.join(outDir, s.out + '.wav');
  const pcm = Buffer.alloc(y.length * 2);
  for (let i = 0; i < y.length; i++) pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(y[i] * 32767))), i * 2);
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
  hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(ch, 22); hdr.writeUInt32LE(SR, 24);
  hdr.writeUInt32LE(SR * ch * 2, 28); hdr.writeUInt16LE(ch * 2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(wav, Buffer.concat([hdr, pcm]));
  const mp3 = path.join(outDir, s.out + '.mp3');
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', process.env.MP3_ENCODER || 'libmp3lame', '-b:a', s.role === 'bed' ? '96k' : '128k', mp3]);
  fs.rmSync(wav);
  report.push(`${s.out.padEnd(28)} ${((y.length / ch / SR)).toFixed(2)}s  ${String(Math.round(fs.statSync(mp3).size / 1024)).padStart(4)} KB  gain ${(20 * Math.log10(gain)).toFixed(1)} dB`);
}
console.log(report.join('\n'));
