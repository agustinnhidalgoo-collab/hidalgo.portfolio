# Créditos de sonido

Grabaciones reales. Casi todas son de [Freesound](https://freesound.org) con licencia **CC0 1.0** (dominio público: uso libre, también comercial, sin obligación de atribución); el ringtone es de [Mixkit](https://mixkit.co/license/#sfxFree) (licencia libre de efectos de sonido: uso comercial sin atribución, dentro de un proyecto propio, no redistribuible suelto). Igual se acredita a sus autores.

Los archivos de esta carpeta son las fuentes (previsualizaciones o fragmentos de los originales); `scripts/process-sounds.mjs` los recorta, iguala y exporta a `public/audio/foley/` según `sounds.json`.

| Sonido en la web | Grabación | Autor | Licencia | Fuente |
|---|---|---|---|---|
| `key` | MECH-KEYBOARD-01.wav | newagesoup | CC0 1.0 | [348239](https://freesound.org/people/newagesoup/sounds/348239/) |
| `pencil` | Pencil_lines.aif | tmkappelt | CC0 1.0 | [85702](https://freesound.org/people/tmkappelt/sounds/85702/) |
| `glass` | put_down_a_glass.wav | 14FPanskaKremenakova_Marie | CC0 1.0 | [418521](https://freesound.org/people/14FPanskaKremenakova_Marie/sounds/418521/) |
| `label` | Paper slide | Kingofgamers_cz | CC0 1.0 | [352914](https://freesound.org/people/Kingofgamers_cz/sounds/352914/) |
| `cork` | bottlepop44.wav | ahill86 | CC0 1.0 | [206152](https://freesound.org/people/ahill86/sounds/206152/) |
| `pour` | bottlepour44.wav | ahill86 | CC0 1.0 | [206154](https://freesound.org/people/ahill86/sounds/206154/) |
| `shatter` | Breaking a glass bottle | dasebr | CC0 1.0 | [212698](https://freesound.org/people/dasebr/sounds/212698/) |
| `splash` | Quick Splash Champagne into Wine Glass FF343.aif | martinimeniscus | CC0 1.0 | [199437](https://freesound.org/people/martinimeniscus/sounds/199437/) |
| `cape` | Foley_Whoosh_Clothes.wav | Nox_Sound | CC0 1.0 | [495390](https://freesound.org/people/Nox_Sound/sounds/495390/) |
| `tube` | Faulty Fluorescent Light Starter & Hum.wav | EverydaySounds | CC0 1.0 | [125064](https://freesound.org/people/EverydaySounds/sounds/125064/) |
| `scissors` | Scissors.wav | mmg67 | CC0 1.0 | [567933](https://freesound.org/people/mmg67/sounds/567933/) |
| `cellar` | Ambient Unfinished Basement.wav | more7859 | CC0 1.0 | [489401](https://freesound.org/people/more7859/sounds/489401/) |
| `ring` | Marimba ringtone | Mixkit | Mixkit Sound Effects Free License | [1359](https://mixkit.co/free-sound-effects/phone/) |

El fragmento de Mixkit (`ring-mixkit1359-fragmento.mp3`) no se versiona: su licencia no permite redistribuirlo suelto. Para regenerar `ring`, descargar el original desde https://assets.mixkit.co/active_storage/sfx/1359/1359.wav y guardar sus primeros 4 s con ese nombre.

Regenerar (requiere un ffmpeg con codificador MP3):

```bash
node scripts/process-sounds.mjs scripts/sound-sources/sounds.json scripts/sound-sources public/audio/foley
```

En Windows sin ffmpeg en el PATH: `FFMPEG=<ruta a ffmpeg.exe> MP3_ENCODER=mp3_mf`.
