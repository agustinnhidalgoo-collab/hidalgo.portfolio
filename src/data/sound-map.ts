/**
 * Partitura del sitio: qué suena, cuándo y por qué. Todo lo que suena se ajusta acá.
 *
 * Criterio (investigado: guías de sonido de interfaz de Material Design, buenas prácticas de sonido web):
 *   · Cada sonido responde a algo que se VE en pantalla. Si no hay un hecho visible, no suena nada.
 *   · El recorrido es una historia que avanza: los sonidos narrativos solo suenan hacia adelante (bajando).
 *     Al rebobinar (subiendo) no se repite nada; solo los ambientes acompañan dónde estás.
 *   · Jerarquía: momentos clave (descorche, estallido, capa) más presentes; detalles (lápiz, papel, tecla) por debajo;
 *     ambiente muy por debajo, y se aparta (ducking) cuando suena un momento clave.
 *   · Un solo lenguaje: grabaciones reales para lo físico (vidrio, vino, tela, tijera, tecla) y un ringtone de marimba para el teléfono y dos tonos
 *     sintetizados, suaves y del mismo timbre, solo para lo abstracto (activar el sonido, email copiado).
 *   · El sonido sale del lado de la pantalla donde está el objeto (paneo leve, nunca extremo).
 *
 * Archivos: public/audio/foley/*.mp3, procesados con scripts/process-sounds.mjs desde grabaciones CC0 de
 * Freesound y una de Mixkit (fuentes y créditos en scripts/sound-sources/). Para escucharlos: /sonidos (página interna).
 */

export type World = 'studio' | 'cellar' | 'barber' | 'aquarium';

export interface CueDef {
  /** Archivo en public/audio/foley (sin extensión). */
  file: string;
  /** Volumen relativo (los archivos ya vienen igualados por rol: 1 = nivel de su rol). */
  vol: number;
  /** Variación aleatoria de afinación (±, en proporción): evita que un sonido repetido suene idéntico. */
  vary?: number;
  /** Velocidad base de reproducción (1 = original; más alto, más corto y agudo). */
  rate?: number;
  /** Tiempo mínimo entre dos disparos (ms). */
  cooldown?: number;
  /** Momento clave: aparta el ambiente mientras suena. */
  hero?: boolean;
  /** Elemento del que sale el sonido (paneo según su posición en pantalla). */
  from?: string;
  what: string;
}

export const CUES = {
  // Habilidades
  key: { file: 'key', vol: 0.55, vary: 0.07, cooldown: 55, what: 'Tecla mecánica que se hunde (teclado de herramientas)' },
  // Armado de la botella: 01 trazo · 02 volumen · 03 etiqueta · 04 terminada
  pencil: { file: 'pencil', vol: 0.75, from: '[data-slot="preview"], [data-slot="b1"]', what: 'Lápiz sobre papel: la botella se dibuja' },
  glass: { file: 'glass', vol: 0.6, from: '[data-slot="preview"], [data-slot="b1"]', what: 'Vidrio que se apoya: la botella toma cuerpo' },
  label: { file: 'label', vol: 0.8, from: '[data-slot="preview"], [data-slot="b1"]', what: 'Etiqueta que se pega' },
  cork: { file: 'cork', vol: 1, hero: true, from: '[data-slot="b1"], [data-slot="preview"]', what: 'Descorche: la botella terminada se abre' },
  pour: { file: 'pour', vol: 0.75, hero: true, from: '[data-slot="b1"], [data-slot="preview"]', what: 'El vino cae en la copa' },
  // Estallido: la botella se rompe y el vino se vuelve la capa
  shatter: { file: 'shatter', vol: 0.85, hero: true, what: 'La botella estalla' },
  splash: { file: 'splash', vol: 0.7, what: 'El vino salpica' },
  cape: { file: 'cape', vol: 0.9, hero: true, from: '[data-slot="c1"]', what: 'La capa se abre: vuelo de tela' },
  // Barbería
  tube: { file: 'tube', vol: 0.5, cooldown: 6000, what: 'Tubo fluorescente que arranca al entrar' },
  scissors: { file: 'scissors', vol: 1.25, from: '[data-slot="c1"]', what: 'Tijera: la capa gira' },
  // Acuario: el fanzine se hojea (la misma grabación de papel, más rápida: una hoja que pasa)
  page: { file: 'label', vol: 0.7, rate: 1.35, vary: 0.08, cooldown: 140, from: '.zb', what: 'Una hoja del fanzine que pasa' },
  cover: { file: 'label', vol: 0.85, rate: 0.85, vary: 0.04, cooldown: 300, from: '.zb', what: 'Se abre la tapa del fanzine' },
  // Contacto
  ring: { file: 'ring', vol: 0.35, cooldown: 2600, from: '.contact__avatar', what: 'El teléfono suena (marimba) al señalar WhatsApp' },
} satisfies Record<string, CueDef>;
export type Cue = keyof typeof CUES;

/** Ambiente en bucle por mundo (o ninguno). La barbería es silencio de salón: la escena la cuentan el tubo y la tijera.
 *  El acuario también es silencio: suenan solo las hojas que pasan. */
export const BEDS: Partial<Record<World, { file: string; vol: number }>> = {
  cellar: { file: 'cellar', vol: 0.75 },
};

/** Fases del armado de la botella → sonido (solo hacia adelante). En la 4, el vino se sirve tras el descorche. */
export const BUILD: Partial<Record<number, Cue>> = { 1: 'pencil', 2: 'glass', 3: 'label', 4: 'cork' };
export const POUR_AFTER_CORK_MS = 520;

/** Paso 2 de cada mundo (la pieza gira), solo hacia adelante. La botella gira en silencio; en la barbería, tijera. */
export const STEP: Partial<Record<World, Cue>> = { barber: 'scissors' };

/** Página del proyecto: cada pieza que entra en el recorrido (solo hacia adelante). Bodega: papel que se rasga
 *  (la etiqueta se desgarra); barbería: la tijera (el corte). */
export const REEL: Partial<Record<World, Cue>> = { cellar: 'label', barber: 'scissors' };

/** Niveles generales (0–1). El sonido acompaña, no protagoniza. */
export const LEVELS = {
  master: 0.8,
  sfx: 1,
  ui: 0.4, // tonos de interfaz (activar, copiado)
  ambience: 0.5,
  duck: 0.4, // a cuánto baja el ambiente durante un momento clave
  pan: 0.45, // paneo máximo (0 = centro, 1 = un solo lado)
};

export const AUDIO_BASE = '/audio/foley';
