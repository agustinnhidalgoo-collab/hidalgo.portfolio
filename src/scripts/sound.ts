/* Sonido del portfolio (Web Audio). Opcional: apagado hasta que el visitante lo activa; nunca arranca sin un gesto.
   La partitura (qué suena, cuándo y por qué) está en src/data/sound-map.ts.
   - Foley real (public/audio/foley): cada sonido responde a algo que se ve. Los narrativos suenan solo hacia adelante.
   - Ambiente: la bodega tiene su aire de sótano en bucle; se aparta durante los momentos clave.
   - Paneo según dónde está el objeto en pantalla. Se suspende con la pestaña oculta. */
import { AUDIO_BASE, BEDS, BUILD, CUES, LEVELS, POUR_AFTER_CORK_MS, REEL, STEP, type Cue, type CueDef, type World } from '../data/sound-map';

const KEY = 'portfolio:sound';
const root = document.documentElement;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

let ctx: AudioContext | null = null;
let master!: GainNode;
let sfxBus!: GainNode;
let uiBus!: GainNode;
let ambBus!: GainNode;
let duckGain!: GainNode;
let enabled = false;
let world: World = (root.dataset.world as World) || 'studio';
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<string, number>();

export const isEnabled = () => enabled;

/* ---------- Sentido del recorrido: los sonidos narrativos solo avanzan ---------- */
let lastY = scrollY;
let dir: 1 | -1 = 1;
addEventListener(
  'scroll',
  () => {
    const y = scrollY;
    if (Math.abs(y - lastY) > 2) dir = y > lastY ? 1 : -1;
    lastY = y;
  },
  { passive: true },
);
let pointerX = innerWidth / 2;
addEventListener('pointermove', (e) => (pointerX = e.clientX), { passive: true });

/** Registro de lo que suena (solo con ?qa, para pruebas). */
function log(s: string) {
  (window as unknown as { __snd?: { log: string[] } }).__snd?.log.push(`${Math.round(scrollY)} ${s}`);
}

/* ---------- Carga ---------- */
function load(file: string) {
  let p = buffers.get(file);
  if (!p) {
    p = fetch(`${AUDIO_BASE}/${file}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((b) => ctx!.decodeAudioData(b))
      .catch(() => null);
    buffers.set(file, p);
  }
  return p;
}
/** Precarga lo que esta página puede necesitar, para que nada llegue tarde a su momento. */
function preload() {
  const home = !!document.getElementById('gl');
  const list: string[] = [];
  if (document.querySelector('.skills')) list.push(CUES.key.file);
  if (document.getElementById('contacto')) list.push(CUES.ring.file);
  if (document.querySelector('[data-zine]')) list.push(CUES.page.file);
  const rc = REEL[world];
  if (document.querySelector('[data-rl]') && rc) list.push(CUES[rc].file);
  if (home) (Object.keys(CUES) as Cue[]).forEach((c) => list.push(CUES[c].file));
  Object.values(BEDS).forEach((b) => b && (home || world !== 'studio') && list.push(b.file));
  [...new Set(list)].forEach(load);
}

/** Paneo (−1 izquierda … 1 derecha) según el primer elemento visible del selector. */
function panOf(sel?: string) {
  if (!sel) return 0;
  for (const el of document.querySelectorAll<HTMLElement>(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.bottom > 0 && r.top < innerHeight) return clamp(((r.left + r.width / 2) / innerWidth) * 2 - 1, -1, 1) * LEVELS.pan;
  }
  return 0;
}

/* ---------- Reproducir ---------- */
interface PlayOpts {
  volume?: number;
  pan?: number;
  delay?: number; // s
  force?: boolean; // ignora el límite de repetición (página de pruebas)
}
export async function play(cue: Cue, o: PlayOpts = {}) {
  const def: CueDef = CUES[cue];
  if (!enabled || !ctx || ctx.state !== 'running' || !def) return;
  const now = performance.now();
  if (!o.force && now - (lastPlayed.get(cue) ?? -1e9) < (def.cooldown ?? 120)) return;
  lastPlayed.set(cue, now);
  const pan = o.pan ?? panOf(def.from);
  const buf = await load(def.file);
  if (!buf || !ctx || !enabled) return;
  log(`  ▶ ${cue}${o.delay ? ` (+${o.delay}s)` : ""} pan ${pan.toFixed(2)}`);
  const t = ctx.currentTime + (o.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const vary = def.vary ?? 0;
  src.playbackRate.value = (def.rate ?? 1) * (1 + (Math.random() * 2 - 1) * vary);
  const g = ctx.createGain();
  g.gain.value = def.vol * (o.volume ?? 1);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  src.connect(g).connect(p).connect(sfxBus);
  src.start(t);
  if (def.hero) duck(t, buf.duration);
  src.onended = () => {
    src.disconnect();
    g.disconnect();
    p.disconnect();
  };
}

/** Momento clave: el ambiente se aparta y vuelve despacio. */
function duck(at: number, dur: number) {
  const gp = duckGain.gain;
  gp.cancelScheduledValues(at);
  gp.setTargetAtTime(LEVELS.duck, at, 0.03);
  gp.setTargetAtTime(1, at + Math.min(dur, 1.2), 0.6);
}

/* ---------- Tonos de interfaz (lo único sintetizado: activar el sonido y «email copiado») ----------
   Mismo timbre para los dos: nota suave tipo marimba (fundamental + parcial 4× que se apaga rápido). */
function tone(freqs: number[], gap = 0.07, vol = 1) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime + 0.02;
  freqs.forEach((f, i) => {
    const t = t0 + i * gap;
    [
      [1, 0.22, 0.32],
      [4, 0.05, 0.06],
    ].forEach(([mul, amp, dec]) => {
      const o = ctx!.createOscillator();
      o.frequency.value = f * mul;
      const g = ctx!.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp * vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(uiBus);
      o.start(t);
      o.stop(t + dec + 0.05);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    });
  });
}
const toneOn = () => (log("  ♪ tono activar"), tone([659.25, 987.77])); // mi5 → si5: sube, se lee como «encendido»
const toneDone = () => (log("  ♪ tono copiado"), tone([1318.5], 0, 0.7)); // mi6: una sola nota corta, «listo»

/* ---------- Ambiente ---------- */
let bedSrc: AudioBufferSourceNode | null = null;
let bedGain: GainNode | null = null;
let bedName = '';

async function setBed(w: World | 'none') {
  const def = w === 'none' ? undefined : BEDS[w];
  const name = def ? def.file : '';
  if (!ctx || name === bedName) return;
  bedName = name;
  log(`  ≈ ambiente: ${name || "silencio"}`);
  // el anterior se funde y se libera
  if (bedSrc && bedGain) {
    const s = bedSrc, g = bedGain;
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    setTimeout(() => {
      try { s.stop(); } catch { /* ya detenido */ }
      s.disconnect();
      g.disconnect();
    }, 2500);
    bedSrc = bedGain = null;
  }
  if (!def) return;
  const buf = await load(def.file);
  if (!buf || !ctx || bedName !== name || !enabled) return;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  const g = ctx.createGain();
  g.gain.value = 0;
  s.connect(g).connect(duckGain);
  s.start(ctx.currentTime, Math.random() * buf.duration); // cada visita entra en un punto distinto del bucle
  g.gain.setTargetAtTime(def.vol, ctx.currentTime, 0.8);
  bedSrc = s;
  bedGain = g;
}

/* Qué ambiente corresponde. Durante el estallido seguimos en la bodega hasta que la botella se rompe. */
let broken = false;
function inBurst() {
  const b = document.getElementById('estallido');
  if (!b) return false;
  const r = b.getBoundingClientRect();
  return r.top < innerHeight / 2 && r.bottom > innerHeight / 2;
}
function bedFor(w: World): World | 'none' {
  if (w === 'studio' && inBurst()) return broken ? 'none' : 'cellar';
  return BEDS[w] ? w : 'none';
}

/* ---------- Activar / desactivar ---------- */
function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: 'interactive' });
  master = ctx.createGain();
  master.gain.value = 0;
  // Techo de seguridad: casi transparente, solo actúa si dos sonidos fuertes coinciden
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -6; lim.knee.value = 4; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.15;
  master.connect(lim).connect(ctx.destination);
  if (location.search.includes('qa')) {
    // Gancho de medición para pruebas (?qa): nivel de salida sin necesidad de escuchar
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    lim.connect(an);
    const buf = new Float32Array(an.fftSize);
    (window as unknown as { __snd: unknown }).__snd = {
      level: () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0, peak = 0;
        for (const v of buf) { sum += v * v; peak = Math.max(peak, Math.abs(v)); }
        return { rms: Math.sqrt(sum / buf.length), peak };
      },
      log: [] as string[],
      state: () => ({ ctx: ctx?.state, enabled, hidden: document.hidden }),
    };
  }
  sfxBus = ctx.createGain(); sfxBus.gain.value = LEVELS.sfx; sfxBus.connect(master);
  uiBus = ctx.createGain(); uiBus.gain.value = LEVELS.ui; uiBus.connect(master);
  ambBus = ctx.createGain(); ambBus.gain.value = LEVELS.ambience; ambBus.connect(master);
  duckGain = ctx.createGain(); duckGain.connect(ambBus);
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
    master.gain.setTargetAtTime(LEVELS.master, c.currentTime, 0.15);
    preload();
    bedName = '';
    setBed(bedFor(world));
    if (!o.silent) toneOn();
  } else {
    enabled = false;
    if (ctx) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      const c = ctx;
      setTimeout(() => {
        if (enabled) return;
        setBed('none');
        c.suspend().catch(() => {});
      }, 500);
    }
  }
  root.classList.toggle('snd-on', on);
  dispatchEvent(new CustomEvent('portfolio:sound-state', { detail: on }));
}
export const toggle = () => setEnabled(!enabled);

export function setWorld(w: World) {
  world = w;
  if (!enabled) return;
  setBed(bedFor(w));
  // El tubo de la barbería arranca cada vez que se entra (se ve parpadear): el sonido acompaña lo que se ve
  if (w === 'barber' && document.getElementById('gl')) play('tube', { pan: -0.15 });
}

/* ---------- Eventos de la página ---------- */
addEventListener('portfolio:world', (e) => {
  const d = (e as CustomEvent<{ world: World; from: World }>).detail;
  log(`world ${d.from}→${d.world}`);
  setWorld(d.world);
});
// Paso 2 de un mundo (la pieza gira): solo hacia adelante
addEventListener('portfolio:sfx', (e) => {
  const d = (e as CustomEvent<{ cue: 'forward' | 'back' }>).detail;
  const c = STEP[world];
  log(`step ${d.cue} ${c ?? '-'}`);
  if (c && d.cue === 'forward') play(c);
});
// Armado de la botella: si el scroll saltea fases, suena solo la última alcanzada (nunca una ráfaga)
addEventListener('portfolio:build', (e) => {
  const d = (e as CustomEvent<{ phase: number; from: number }>).detail;
  log(`build ${d.from}→${d.phase}`);
  if (d.phase <= d.from || dir < 0) return;
  const c = BUILD[d.phase];
  if (!c) return;
  play(c);
  if (c === 'cork') play('pour', { delay: POUR_AFTER_CORK_MS / 1000 });
});
// Estallido: la botella se rompe y el vino salpica; al rebobinar, silencio (y vuelve el aire de la bodega)
addEventListener('portfolio:burst', (e) => {
  const d = (e as CustomEvent<{ dir: 1 | -1 }>).detail.dir;
  broken = d > 0;
  log(`burst ${d}`);
  if (enabled) setBed(bedFor(world));
  if (d > 0) {
    play('shatter');
    play('splash', { delay: 0.09, pan: 0.1 });
  }
});
// La capa se forma a partir del vino
addEventListener('portfolio:cape', (e) => {
  const d = (e as CustomEvent<{ dir: 1 | -1 }>).detail.dir;
  log(`cape ${d}`);
  if (d > 0) play('cape');
});
// Fanzine: cada hoja que cae hacia adelante suena (la tapa, más grave); al volver, silencio
addEventListener('portfolio:page', (e) => {
  const d = (e as CustomEvent<{ i: number; dir: 1 | -1 }>).detail;
  log(`page ${d.i} ${d.dir}`);
  if (d.dir > 0) play(d.i === 0 ? 'cover' : 'page');
});
// Pasos de un mundo (página del proyecto): cada pieza que entra suena según el mundo; al volver, silencio
addEventListener('portfolio:reel', (e) => {
  const d = (e as CustomEvent<{ i: number; dir: 1 | -1 }>).detail;
  log(`reel ${d.i} ${d.dir}`);
  const c = REEL[world];
  if (c && d.dir > 0) play(c);
});
// Tecla del teclado de herramientas: sale del lado donde está el puntero
addEventListener('portfolio:key', () => play('key', { pan: clamp((pointerX / innerWidth) * 2 - 1, -1, 1) * LEVELS.pan }));
// Contacto: el teléfono suena al señalar WhatsApp; confirmación suave al copiar el email
addEventListener('portfolio:ring', () => play('ring'));
addEventListener('portfolio:copied', () => enabled && ctx?.state === 'running' && toneDone());

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {});
  else if (enabled) ctx.resume().catch(() => {});
});

/* Para la página de pruebas (/sonidos) */
export const __ready = () => !!ctx && enabled;
export const __tones = { on: () => toneOn(), done: () => toneDone() };
export { CUES };
