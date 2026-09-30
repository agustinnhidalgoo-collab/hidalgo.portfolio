/* Sonido del portfolio (Web Audio). Opcional: apagado hasta que el visitante lo activa.
   - Efectos de interfaz: archivos CC0 (public/audio), un pack distinto en cada mundo.
   - Ambiente de cada mundo y roce de la capa: sintetizados aquí (sin archivos).
   - Se suspende con la pestaña oculta y nunca arranca sin un gesto del usuario. */
import { AUDIO_BASE, CINEMATIC, CUE_VOLUME, LEVELS, WORLD_PACK, type World } from '../data/sound-map';

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
  pack?: string;
  volume?: number;
  rate?: number;
  big?: boolean; // transiciones entre mundos: usa el pack cinematic si el cue existe ahí
  force?: boolean; // ignora el límite de repetición (página de pruebas)
}

export async function play(cue: string, o: PlayOpts = {}) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const now = performance.now();
  const min = cue === 'hover' ? 110 : 60;
  if (!o.force && now - (lastPlayed.get(cue) ?? -1e9) < min) return;
  lastPlayed.set(cue, now);
  const pack = o.pack ?? (o.big && CINEMATIC.has(cue) ? 'cinematic' : WORLD_PACK[world]);
  const buf = await load(`${AUDIO_BASE}/${pack}/${cue}.mp3`);
  if (!buf || !ctx || !enabled) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() - 0.5) * 0.04); // leve variación: evita el efecto «ametralladora»
  const g = ctx.createGain();
  g.gain.value = (CUE_VOLUME[cue] ?? 0.18) * (o.volume ?? 1) * (o.big ? 1.25 : 1);
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
  (Object.keys(WORLD_PACK) as World[]).forEach((w) => {
    beds[w] = c.createGain();
    beds[w].gain.value = 0;
    beds[w].connect(ambBus);
  });

  // Estudio: aire suave y un acorde grave muy bajo
  {
    const out = beds.studio;
    const n = noise(), lp = c.createBiquadFilter(), ng = c.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 520; ng.gain.value = 0.35;
    n.connect(lp).connect(ng).connect(out); n.start();
    [98, 146.83, 196].forEach((f, i) => {
      const o = osc('sine', f, (i - 1) * 4), g = c.createGain();
      g.gain.value = 0.05 / (i + 1);
      lfo(g.gain, 0.05 + i * 0.03, 0.012);
      o.connect(g).connect(out); o.start();
    });
  }
  // Bodega: bordón grave, aire de sótano que respira y gotas lejanas
  {
    const out = beds.cellar;
    const n = noise(), lp = c.createBiquadFilter(), ng = c.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 260; ng.gain.value = 0.55;
    lfo(ng.gain, 0.045, 0.22);
    n.connect(lp).connect(ng).connect(out); n.start();
    [55, 82.41, 110].forEach((f, i) => {
      const o = osc('sine', f, (i - 1) * 6), g = c.createGain();
      g.gain.value = 0.09 / (i + 1);
      lfo(g.gain, 0.04 + i * 0.02, 0.02);
      o.connect(g).connect(out); o.start();
    });
  }
  // Barbería: zumbido de tubo fluorescente, tono de sala y la capa (el roce sube con el desplazamiento)
  {
    const out = beds.barber;
    const n = noise(), bp = c.createBiquadFilter(), ng = c.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.35; ng.gain.value = 0.22;
    n.connect(bp).connect(ng).connect(out); n.start();
    const hum = osc('sine', 60), hg = c.createGain();
    hg.gain.value = 0.035;
    hum.connect(hg).connect(out); hum.start();
    // Capa de barbero: roce de tela; se agita con el desplazamiento (ruido filtrado con pulsos lentos)
    buzzFilter = c.createBiquadFilter();
    buzzFilter.type = 'bandpass'; buzzFilter.frequency.value = 900; buzzFilter.Q.value = 0.6;
    buzzGain = c.createGain();
    buzzGain.gain.value = 0;
    const am = c.createGain(); am.gain.value = 0.6;
    lfo(am.gain, 5.5, 0.4); // flameo
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
  g.gain.linearRampToValueAtTime(0.06, t + 0.004);
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
  buzzGain.gain.setTargetAtTime(LEVELS.buzz * k, t, 0.06);
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
    if (!o.silent) play('toggle-on');
  } else {
    if (!o.silent) play('toggle-off');
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

export function setWorld(w: World, from?: World) {
  if (w === world) return;
  world = w;
  if (enabled) {
    applyWorld(w);
    // Transición entre mundos: impacto cinematográfico corto (hacia adelante) o deslizamiento (de regreso)
    const order: World[] = ['studio', 'cellar', 'barber'];
    const fwd = order.indexOf(w) > order.indexOf(from ?? 'studio');
    play(fwd ? (w === 'barber' ? 'checkpoint' : 'unlock') : 'swipe', { big: true });
  }
}

/* ---------- Eventos de la página ---------- */
addEventListener('portfolio:world', (e) => {
  const d = (e as CustomEvent<{ world: World; from: World }>).detail;
  setWorld(d.world, d.from);
});
addEventListener('portfolio:sfx', (e) => {
  const d = (e as CustomEvent<{ cue: string; big?: boolean }>).detail;
  play(d.cue, { big: d.big });
});

let lastHover: Element | null = null;
document.addEventListener(
  'pointerover',
  (e) => {
    if (!enabled || (e as PointerEvent).pointerType !== 'mouse') return;
    const t = (e.target as Element).closest('a[href], button');
    if (!t || t === lastHover || t.closest('[data-no-sound]')) return;
    lastHover = t;
    play('hover');
  },
  { passive: true },
);
document.addEventListener('pointerout', (e) => {
  if (!(e.relatedTarget as Element | null)?.closest?.('a[href], button')) lastHover = null;
});
document.addEventListener(
  'click',
  (e) => {
    if (!enabled) return;
    const a = (e.target as Element).closest<HTMLElement>('a[href], button');
    if (!a || a.classList.contains('snd-btn')) return;
    if (a.closest('[data-no-sound]')) return;
    if (a.hasAttribute('data-menu-open')) return play('open');
    if (a.hasAttribute('data-menu-close')) return; // el cierre suena desde el evento «close» del diálogo
    if (a.closest('#index-dialog')) return;
    const href = a.getAttribute('href') ?? '';
    if (a.hasAttribute('download')) return play('success');
    if (/^(mailto:|https:\/\/wa\.me|https:\/\/www\.instagram)/.test(href)) return play('send');
    if (href.startsWith('#')) return play('select');
    play('press');
  },
  { passive: true },
);
document.getElementById('index-dialog')?.addEventListener('close', () => play('close'));

// Pasos de sección: un toque suave al entrar en cada capítulo
if ('IntersectionObserver' in window) {
  const seen = new Set<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting && en.intersectionRatio > 0.5) {
          if (!seen.has(en.target)) {
            seen.add(en.target);
            play('progress-step');
          }
        } else if (!en.isIntersecting) seen.delete(en.target);
      }
    },
    { threshold: [0, 0.5] },
  );
  document.querySelectorAll('[data-snd-section]').forEach((s) => io.observe(s));
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {});
  else if (enabled) ctx.resume().catch(() => {});
});

/* Para la página de pruebas (/sonidos) */
export const __ready = () => !!ctx && enabled;
