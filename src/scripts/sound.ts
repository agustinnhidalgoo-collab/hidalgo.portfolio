/* Sonido del portfolio (Web Audio). Opcional: apagado hasta que el visitante lo activa.
   - Foley propio (public/audio/foley): vino en la bodega, capa y tijera en la barbería. Sin clics ni hover.
   - Ambiente: aire de bodega con gotas lejanas y el roce de la capa ligado al scroll (sintetizados aquí).
   - Se suspende con la pestaña oculta y nunca arranca sin un gesto del usuario. */
import { AUDIO_BASE, BUILD_CUE, FOLEY, LEVELS, STEP_CUE, WORLD_CUE, type Cue, type World } from '../data/sound-map';

const KEY = 'portfolio:sound';
const root = document.documentElement;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

let ctx: AudioContext | null = null;
let master!: GainNode;
let uiBus!: GainNode;
let ambBus!: GainNode;
let clothBus!: GainNode;
let enabled = false;
let world: World = (root.dataset.world as World) || 'studio';
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<string, number>();

export const isEnabled = () => enabled;

/* ---------- Efectos de interfaz ---------- */
function load(url: string) {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx!.decodeAudioData(b))
      .catch(() => null);
    buffers.set(url, p);
  }
  return p;
}

interface PlayOpts {
  volume?: number;
  rate?: number;
  force?: boolean; // ignora el límite de repetición (página de pruebas)
}

export async function play(cue: Cue, o: PlayOpts = {}) {
  if (!enabled || !ctx || ctx.state !== 'running' || !FOLEY[cue]) return;
  const now = performance.now();
  if (!o.force && now - (lastPlayed.get(cue) ?? -1e9) < 140) return;
  lastPlayed.set(cue, now);
  const buf = await load(`${AUDIO_BASE}/${cue}.mp3`);
  if (!buf || !ctx || !enabled) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() - 0.5) * 0.05); // leve variación: nunca suena idéntico
  const g = ctx.createGain();
  g.gain.value = FOLEY[cue].vol * (o.volume ?? 1);
  src.connect(g).connect(uiBus);
  src.start();
  src.onended = () => {
    src.disconnect();
    g.disconnect();
  };
}

/* ---------- Ambiente sintetizado ---------- */
const beds: Record<World, GainNode> = {} as Record<World, GainNode>;
let buzzGain: GainNode;
let buzzFilter: BiquadFilterNode;
let dripTimer = 0;
let noiseBuf: AudioBuffer;

function noise(): AudioBufferSourceNode {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.loopStart = Math.random() * 0.5;
  return s;
}
function osc(type: OscillatorType, f: number, detune = 0) {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.value = f;
  o.detune.value = detune;
  return o;
}
function lfo(target: AudioParam, rate: number, depth: number) {
  const l = osc('sine', rate);
  const d = ctx!.createGain();
  d.gain.value = depth;
  l.connect(d).connect(target);
  l.start();
}

function buildAmbience() {
  const c = ctx!;
  // Ruido rosado/marrón precalculado (2 s, en bucle)
  noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
  }
  (['studio', 'cellar', 'barber'] as World[]).forEach((w) => {
    beds[w] = c.createGain();
    beds[w].gain.value = 0;
    beds[w].connect(ambBus);
  });

  // Estudio: silencio (la presentación personal no lleva ambiente)

  // Bodega: aire grave de sótano que respira, sin zumbidos; las gotas lejanas lo completan
  {
    const out = beds.cellar;
    const n = noise(), lp = c.createBiquadFilter(), ng = c.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 210; ng.gain.value = 0.7;
    lfo(ng.gain, 0.05, 0.25);
    n.connect(lp).connect(ng).connect(out); n.start();
    const n2 = noise(), bp = c.createBiquadFilter(), g2 = c.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 620; bp.Q.value = 0.5; g2.gain.value = 0.05;
    lfo(g2.gain, 0.07, 0.04);
    n2.connect(bp).connect(g2).connect(out); n2.start();
  }
  // Barbería: aire de sala muy tenue; el roce de la capa (ligado al scroll) es el sonido principal
  {
    const out = beds.barber;
    const n = noise(), bp = c.createBiquadFilter(), ng = c.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.4; ng.gain.value = 0.1;
    n.connect(bp).connect(ng).connect(out); n.start();
    // Capa de barbero: roce de tela; se agita con el desplazamiento (ruido filtrado con pulsos irregulares)
    buzzFilter = c.createBiquadFilter();
    buzzFilter.type = 'bandpass'; buzzFilter.frequency.value = 900; buzzFilter.Q.value = 0.6;
    buzzGain = c.createGain();
    buzzGain.gain.value = 0;
    const am = c.createGain(); am.gain.value = 0.6;
    lfo(am.gain, 7.3, 0.4); // flameo
    lfo(am.gain, 2.1, 0.15);
    const rn = noise();
    rn.connect(buzzFilter).connect(am).connect(buzzGain).connect(clothBus);
    rn.start();
  }
}

function drip() {
  dripTimer = 0;
  if (!enabled || !ctx || world !== 'cellar' || document.hidden) return schedule();
  const c = ctx, t = c.currentTime;
  const f = 1300 + Math.random() * 900;
  const o = osc('sine', f), g = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.frequency.setValueAtTime(f * 1.25, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  dl.delayTime.value = 0.27; fb.gain.value = 0.38; lp.type = 'lowpass'; lp.frequency.value = 2400;
  o.connect(g); g.connect(beds.cellar); g.connect(dl); dl.connect(lp).connect(fb).connect(dl); lp.connect(beds.cellar);
  o.start(t); o.stop(t + 0.3);
  setTimeout(() => { try { dl.disconnect(); fb.disconnect(); lp.disconnect(); } catch { /* ya liberado */ } }, 3500);
  schedule();
}
function schedule() {
  if (!dripTimer) dripTimer = window.setTimeout(drip, 7000 + Math.random() * 9000);
}

function applyWorld(w: World) {
  if (!ctx) return;
  (Object.keys(beds) as World[]).forEach((k) => beds[k].gain.setTargetAtTime(k === w ? 1 : 0, ctx!.currentTime, 0.9));
  if (w === 'cellar') schedule();
}

/* ---------- Roce de la capa ligado a la velocidad del scroll ---------- */
let lastY = scrollY;
let lastT = performance.now();
let vel = 0; // px/ms suavizado
let buzzRaf = 0;
function buzzLoop() {
  buzzRaf = 0;
  if (!enabled || !ctx) return;
  const now = performance.now();
  const y = scrollY;
  const dt = Math.max(1, now - lastT);
  const inst = Math.abs(y - lastY) / dt;
  lastY = y;
  lastT = now;
  vel += (inst - vel) * (inst > vel ? 0.35 : 0.07);
  const k = world === 'barber' ? clamp(vel / 1.6) : 0;
  const t = ctx.currentTime;
  buzzGain.gain.setTargetAtTime(LEVELS.cloth * k, t, 0.06);
  buzzFilter.frequency.setTargetAtTime(600 + k * 2200, t, 0.08);
  if (k > 0.002 || inst > 0.01) buzzRaf = requestAnimationFrame(buzzLoop);
}
const wakeBuzz = () => {
  if (enabled && !buzzRaf) {
    lastY = scrollY;
    lastT = performance.now();
    buzzRaf = requestAnimationFrame(buzzLoop);
  }
};
addEventListener('scroll', wakeBuzz, { passive: true });

/* ---------- Activar / desactivar ---------- */
function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: 'interactive' });
  master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.18;
  master.connect(comp).connect(ctx.destination);
  if (location.search.includes('qa')) {
    // Gancho de medición para pruebas (?qa): nivel de salida sin necesidad de escuchar
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    comp.connect(an);
    const buf = new Float32Array(an.fftSize);
    (window as unknown as { __snd: unknown }).__snd = {
      level: () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0, peak = 0;
        for (const v of buf) { sum += v * v; peak = Math.max(peak, Math.abs(v)); }
        return { rms: Math.sqrt(sum / buf.length), peak };
      },
    };
  }
  uiBus = ctx.createGain(); uiBus.gain.value = LEVELS.ui; uiBus.connect(master);
  ambBus = ctx.createGain(); ambBus.gain.value = LEVELS.ambience; ambBus.connect(master);
  clothBus = ctx.createGain(); clothBus.gain.value = 1; clothBus.connect(master);
  buildAmbience();
  return ctx;
}

export async function setEnabled(on: boolean, o: { silent?: boolean; remember?: boolean } = {}) {
  if (on === enabled) return;
  if (o.remember !== false) {
    try { sessionStorage.setItem(KEY, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }
  if (on) {
    const c = ensure();
    await c.resume().catch(() => {});
    enabled = true;
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(LEVELS.master, c.currentTime, 0.25);
    applyWorld(world);
    if (!o.silent) play('clink', { volume: 0.7 });
  } else {
    enabled = false;
    if (ctx) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      window.clearTimeout(dripTimer);
      dripTimer = 0;
      const c = ctx;
      setTimeout(() => { if (!enabled) c.suspend().catch(() => {}); }, 500);
    }
  }
  root.classList.toggle('snd-on', on);
  dispatchEvent(new CustomEvent('portfolio:sound-state', { detail: on }));
}
export const toggle = () => setEnabled(!enabled);

const ORDER: World[] = ['studio', 'cellar', 'barber'];
export function setWorld(w: World, from?: World) {
  if (w === world) return;
  world = w;
  if (!enabled) return;
  applyWorld(w);
  const fwd = ORDER.indexOf(w) > ORDER.indexOf(from ?? 'studio');
  const c = WORLD_CUE[w][fwd ? 'forward' : 'back'];
  if (c) play(c);
}

/* ---------- Eventos de la página ---------- */
addEventListener('portfolio:world', (e) => {
  const d = (e as CustomEvent<{ world: World; from: World }>).detail;
  setWorld(d.world, d.from);
});
// Paso de un tramo fijado: adelante / atrás según el mundo activo
addEventListener('portfolio:sfx', (e) => {
  const d = (e as CustomEvent<{ cue: 'forward' | 'back' }>).detail;
  const c = STEP_CUE[world][d.cue];
  if (c) play(c, { volume: d.cue === 'back' ? 0.75 : 1 });
});
// Armado de la botella: suena al avanzar de fase
addEventListener('portfolio:build', (e) => {
  const d = (e as CustomEvent<{ phase: number; dir: 1 | -1 }>).detail;
  const c = BUILD_CUE[d.phase];
  if (c && d.dir > 0) play(c);
});

/* Estallido de la botella (entre la bodega y la barbería): crack de vidrio sintetizado (ruido agudo y astillas
   que tintinean), la copa que se quiebra y el vino que salpica. Solo hacia adelante. */
function shatter() {
  if (!enabled || !ctx || ctx.state !== 'running' || !noiseBuf) return;
  const c = ctx, t = c.currentTime;
  const n = noise();
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1700;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.42, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  n.connect(hp).connect(g).connect(uiBus);
  n.start(t);
  n.stop(t + 0.45);
  n.onended = () => { n.disconnect(); hp.disconnect(); g.disconnect(); };
  for (let i = 0; i < 9; i++) {
    const at = t + 0.015 + Math.random() * 0.38;
    const o = c.createOscillator();
    o.frequency.value = 2400 + Math.random() * 4600;
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, at);
    og.gain.exponentialRampToValueAtTime(0.035 + Math.random() * 0.04, at + 0.003);
    og.gain.exponentialRampToValueAtTime(0.0001, at + 0.1 + Math.random() * 0.22);
    o.connect(og).connect(uiBus);
    o.start(at);
    o.stop(at + 0.4);
    o.onended = () => { o.disconnect(); og.disconnect(); };
  }
  play('clink', { rate: 0.62, volume: 0.8 });
  setTimeout(() => play('pour', { rate: 1.3, volume: 0.7 }), 90);
}
/* Tecla de la botonera de habilidades: clic mecánico corto (ruido filtrado + golpe grave), muy bajo */
let lastKey = 0;
addEventListener('portfolio:key', () => {
  if (!enabled || !ctx || ctx.state !== 'running' || !noiseBuf) return;
  const now = performance.now();
  if (now - lastKey < 60) return;
  lastKey = now;
  const c = ctx, t = c.currentTime;
  const n = noise();
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2600 + Math.random() * 600;
  bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  n.connect(bp).connect(g).connect(uiBus);
  n.start(t);
  n.stop(t + 0.06);
  const o = c.createOscillator();
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.05);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.08, t + 0.003);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(og).connect(uiBus);
  o.start(t);
  o.stop(t + 0.07);
  o.onended = () => { n.disconnect(); bp.disconnect(); g.disconnect(); o.disconnect(); og.disconnect(); };
});

addEventListener('portfolio:burst', (e) => {
  if ((e as CustomEvent<{ dir: 1 | -1 }>).detail.dir > 0) shatter();
});

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {});
  else if (enabled) ctx.resume().catch(() => {});
});

/* Para la página de pruebas (/sonidos) */
export const __ready = () => !!ctx && enabled;
export { FOLEY };
