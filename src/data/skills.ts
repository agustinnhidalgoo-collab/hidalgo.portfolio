/** Botonera de habilidades técnicas: una tecla por herramienta. Cada tecla es el ícono de la app.
 *  Logos oficiales en src/assets/logos/ (descargados de Wikimedia Commons; son marcas de sus dueños, usados para
 *  nombrar la herramienta). `fit`: 1 = el ícono cubre la tecla de borde a borde; menos, el logo va sobre el color
 *  de la marca. Workspace, Astro y la tecla «AH» siguen con su trazo de simple-icons (CC0) o el monograma del sitio.
 *  Las frases son cortas y en voseo: dicen para qué uso cada programa, sin niveles
 *  de manejo ni años de experiencia (no son prueba de dominio; eso lo muestran los proyectos). */
import ai from '../assets/logos/ai.svg?url';
import ps from '../assets/logos/ps.svg?url';
import id from '../assets/logos/id.svg?url';
import figma from '../assets/logos/figma.svg?url';
import canva from '../assets/logos/canva.png?url';
import chatgpt from '../assets/logos/chatgpt.svg?url';
import claude from '../assets/logos/claude.svg?url';
import procreate from '../assets/logos/procreate.png?url';
import office from '../assets/logos/office.svg?url';
import instagram from '../assets/logos/instagram.svg?url';
import tiktok from '../assets/logos/tiktok.svg?url';
import html from '../assets/logos/html.svg?url';
import css from '../assets/logos/css.svg?url';
import vscode from '../assets/logos/vscode.svg?url';

export interface Skill {
  id: string;
  name: string;
  bg: string; // color de la tecla
  bg2?: string; // segundo color (degradado)
  fg: string; // color del ícono / monograma
  icon?: string; // trazo SVG (viewBox 0 0 24 24)
  text?: string; // monograma
  sub?: string; // rótulo chico bajo el ícono
  script?: boolean; // monograma en cursiva
  small?: boolean; // monograma largo (letra más chica)
  display?: boolean; // monograma en la tipografía del sitio
  glitch?: boolean; // desdoble cian/rojo (TikTok)
  logo?: string; // ícono oficial (URL del archivo en src/assets/logos)
  fit?: number; // 1 = cubre la tecla; < 1, tamaño del logo sobre el color de la marca
  tint?: string; // recolorear el logo (p. ej. el símbolo de OpenAI, negro, en blanco)
  desc: string;
}

export const skills: Skill[] = [
  { id: 'ai', name: 'Illustrator', bg: '#330000', fg: '#FF9A00', logo: ai, fit: 1, desc: 'Donde nacen las marcas: vectores, curvas y paciencia.' },
  { id: 'ps', name: 'Photoshop', bg: '#001E36', fg: '#31A8FF', logo: ps, fit: 1, desc: 'Retoque, montaje y texturas: lo imposible, pero creíble.' },
  { id: 'id', name: 'InDesign', bg: '#49021F', fg: '#FF3366', logo: id, fit: 1, desc: 'Para maquetar con grilla y ordenar textos largos.' },
  { id: 'figma', name: 'Figma', bg: '#1E1E1E', fg: '#FFFFFF', logo: figma, fit: 0.5, desc: 'Para pensar pantallas y armar presentaciones.' },
  { id: 'canva', name: 'Canva', bg: '#00C4CC', bg2: '#7D2AE8', fg: '#FFFFFF', logo: canva, fit: 0.74, desc: 'Piezas rápidas para redes, sin perder el criterio.' },
  { id: 'chatgpt', name: 'ChatGPT', bg: '#000000', fg: '#FFFFFF', logo: chatgpt, fit: 0.6, tint: '#FFFFFF', desc: 'Sparring para ideas, textos y nombres.' },
  { id: 'claude', name: 'Claude', bg: '#F0EEE6', fg: '#FFFFFF', logo: claude, fit: 0.62, desc: 'Copiloto para pensar, escribir y programar. Esta web, por ejemplo.' },
  { id: 'claude-design', name: 'Claude Design', bg: '#D97757', fg: '#D97757', sub: 'Design', logo: claude, fit: 0.5, tint: '#FFFFFF', desc: 'Para explorar variantes rápido. Decidir sigue siendo mío.' },
  { id: 'procreate', name: 'Procreate', bg: '#1C1C1C', fg: '#FFFFFF', logo: procreate, fit: 1, desc: 'Para dibujar a mano en el iPad: bocetos, trazo y textura.' },
  { id: 'workspace', name: 'Google Workspace', bg: '#FFFFFF', fg: '#4285F4', icon: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z', desc: 'Docs, Sheets y Drive: el proyecto ordenado y compartido.' },
  { id: 'office', name: 'Microsoft Office', bg: '#FFFFFF', fg: '#FFFFFF', logo: office, fit: 0.66, desc: 'Word, Excel y PowerPoint para presentar y organizar.' },
  { id: 'instagram', name: 'Instagram', bg: '#DD2A7B', bg2: '#F58529', fg: '#FFFFFF', logo: instagram, fit: 1, desc: 'Contenido, feed y comunidad: el diseño también se publica.' },
  { id: 'tiktok', name: 'TikTok', bg: '#000000', fg: '#FFFFFF', logo: tiktok, fit: 1, desc: 'Video corto: comunicar en segundos.' },
  { id: 'html', name: 'HTML', bg: '#FFFFFF', fg: '#FFFFFF', logo: html, fit: 0.62, desc: 'La estructura de todo lo que ves acá.' },
  { id: 'css', name: 'CSS', bg: '#663399', fg: '#FFFFFF', logo: css, fit: 1, desc: 'Estilos a mano: que la web se vea como la pensé.' },
  { id: 'vscode', name: 'VS Code', bg: '#1F1F1F', fg: '#FFFFFF', logo: vscode, fit: 0.62, desc: 'Mi editor para construir webs como esta.' },
  { id: 'astro', name: 'Astro', bg: '#17191E', bg2: '#BC52EE', fg: '#FFFFFF', icon: 'M8.358 20.162c-1.186-1.07-1.532-3.316-1.038-4.944.856 1.026 2.043 1.352 3.272 1.535 1.897.283 3.76.177 5.522-.678.202-.098.388-.229.608-.36.166.473.209.95.151 1.437-.14 1.185-.738 2.1-1.688 2.794-.38.277-.782.525-1.175.787-1.205.804-1.531 1.747-1.078 3.119l.044.148a3.158 3.158 0 0 1-1.407-1.188 3.31 3.31 0 0 1-.544-1.815c-.004-.32-.004-.642-.048-.958-.106-.769-.472-1.113-1.161-1.133-.707-.02-1.267.411-1.415 1.09-.012.053-.028.104-.045.165h.002zm-5.961-4.445s3.24-1.575 6.49-1.575l2.451-7.565c.092-.366.36-.614.662-.614.302 0 .57.248.662.614l2.45 7.565c3.85 0 6.491 1.575 6.491 1.575L16.088.727C15.93.285 15.663 0 15.303 0H8.697c-.36 0-.615.285-.784.727l-5.516 14.99z', desc: 'El framework de este portfolio: rápido y liviano.' },
  { id: 'ah', name: 'Agustín Hidalgo', bg: '#FF3A2A', fg: '#FFFFFF', text: 'AH', display: true, desc: 'La tecla que junta todas. Y lo que me falta aprender.' },
];
