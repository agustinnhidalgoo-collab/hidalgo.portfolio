/**
 * Mapa de sonidos (todo lo que suena se ajusta acá).
 *
 * Los efectos de interfaz son archivos CC0 de la biblioteca «uisfx» (ver public/audio/CREDITS.txt).
 * El ambiente de cada mundo y el roce de la capa se sintetizan en el navegador (src/scripts/sound.ts).
 *
 * Para probar cada sonido y cada pack: abrir /sonidos (página interna, sin enlazar).
 */

/** Mundo activo → pack de sonidos de interfaz. */
export const WORLD_PACK = {
  studio: 'studio', // apertura, sobre mí, introducción: precisión de edición, cálido y contenido
  cellar: 'organic', // bodega (Cordero con piel de lobo): madera, piedra, aire
  barber: 'mechanical', // barbería (Be Fresh): interruptores, relés, pasos firmes
} as const;
export type World = keyof typeof WORLD_PACK;

/** Volumen de cada cue (valores recomendados por la biblioteca). 1 = nivel del archivo. */
export const CUE_VOLUME: Record<string, number> = {
  hover: 0.12,
  press: 0.2,
  open: 0.18,
  close: 0.17,
  forward: 0.17,
  back: 0.17,
  'progress-step': 0.12,
  swipe: 0.14,
  'toggle-on': 0.2,
  'toggle-off': 0.18,
  success: 0.23,
  send: 0.2,
  checkpoint: 0.18,
  snap: 0.2,
  unlock: 0.2,
  expand: 0.16,
  collapse: 0.15,
  select: 0.2,
};

/** Cues que se toman del pack «cinematic» (impactos de transición entre mundos). */
export const CINEMATIC = new Set(['checkpoint', 'unlock', 'swipe']);

/** Volúmenes generales (0–1). Bajos a propósito: el sonido acompaña, no protagoniza. */
export const LEVELS = {
  master: 0.9,
  ui: 1,
  ambience: 0.17, // fondo: unos 15 dB por debajo de los efectos
  buzz: 0.23, // roce de la capa al desplazarse por la barbería (bus propio, no se atenúa con el ambiente)
};

export const AUDIO_BASE = '/audio';
