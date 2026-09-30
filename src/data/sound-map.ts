/**
 * Mapa de sonidos (todo lo que suena se ajusta acá).
 *
 * Criterio: menos, pero con sentido. No hay sonidos de clic ni de hover. Suena lo que pasa en escena:
 *   · Bodega → vino: brindis de copas, descorche, vino que se sirve, etiqueta que se desliza.
 *   · Barbería → la capa que se sacude y abre, tijera.
 *   · Ambiente: aire de bodega con gotas lejanas; en la barbería, la capa que roza al desplazarte.
 *
 * Los archivos de public/audio/foley son propios, sintetizados con scripts/make-sounds.py
 * (sin muestras ni autoría de terceros). Para escucharlos: /sonidos (página interna, sin enlazar).
 */

export type World = 'studio' | 'cellar' | 'barber';

/** Cada sonido: archivo, volumen base (1 = nivel del archivo, ya normalizado a −3 dBFS) y descripción. */
export const FOLEY = {
  clink: { vol: 0.34, what: 'Brindis: dos copas de cristal' },
  cork: { vol: 0.42, what: 'Descorche: fricción, pop y resonancia de la botella' },
  pour: { vol: 0.3, what: 'Vino servido en una copa' },
  glug: { vol: 0.34, what: 'Un glug de botella al inclinarse' },
  scan: { vol: 0.3, what: 'Etiqueta que se dibuja (papel deslizándose)' },
  'cape-on': { vol: 0.38, what: 'Vuelo de la capa, latigazo al abrirse y roce' },
  'cape-flap': { vol: 0.32, what: 'Sacudida breve de la capa' },
  snip: { vol: 0.3, what: 'Tijera: dos cortes' },
} as const;
export type Cue = keyof typeof FOLEY;

/** Sonido de cada paso del tramo fijado, según el mundo (adelante / atrás). */
export const STEP_CUE: Record<World, { forward?: Cue; back?: Cue }> = {
  studio: {},
  cellar: { forward: 'clink', back: 'glug' },
  barber: { forward: 'snip', back: 'cape-flap' },
};

/** Sonido al entrar / volver de un mundo. */
export const WORLD_CUE: Record<World, { forward?: Cue; back?: Cue }> = {
  studio: {},
  cellar: { forward: 'pour', back: undefined },
  barber: { forward: 'cape-on', back: 'cape-flap' },
};

/** Fases del armado de la botella al desplazarse (solo suenan hacia adelante). */
export const BUILD_CUE: Partial<Record<number, Cue>> = {
  2: 'clink', // el vidrio toma cuerpo
  3: 'scan', // la etiqueta se dibuja
  4: 'cork', // terminada: se descorcha
};

/** Volúmenes generales (0–1). Bajos a propósito: el sonido acompaña, no protagoniza. */
export const LEVELS = {
  master: 0.9,
  ui: 1,
  ambience: 0.14, // fondo: muy por debajo de los efectos
  cloth: 0.26, // roce de la capa al desplazarse por la barbería (bus propio)
};

export const AUDIO_BASE = '/audio/foley';
