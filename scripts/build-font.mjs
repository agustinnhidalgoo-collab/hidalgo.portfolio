/* Genera src/assets/3d/anton-subset.json (typeface de Three.js) con los glifos del nombre en 3D.
   Uso: npm run font   (solo hace falta si cambian las letras que se modelan en 3D)
   Fuente: Anton (licencia OFL). */
import fs from 'node:fs';
import opentype from 'opentype.js';

const chars = ' ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ';
const buf = fs.readFileSync('scripts/anton-latin-400-normal.woff');
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
const round = Math.round;

function reverse(commands) {
  const paths = []; let path;
  commands.forEach((c) => {
    if (c.type.toLowerCase() === 'm') { path = [c]; paths.push(path); }
    else if (c.type.toLowerCase() !== 'z') path.push(c);
  });
  const out = [];
  paths.forEach((p) => {
    out.push({ type: 'm', x: p[p.length - 1].x, y: p[p.length - 1].y });
    for (let i = p.length - 1; i > 0; i--) {
      const c = p[i]; const r = { type: c.type };
      if (c.x2 !== undefined && c.y2 !== undefined) { r.x1 = c.x2; r.y1 = c.y2; r.x2 = c.x1; r.y2 = c.y1; }
      else if (c.x1 !== undefined && c.y1 !== undefined) { r.x1 = c.x1; r.y1 = c.y1; }
      r.x = p[i - 1].x; r.y = p[i - 1].y; out.push(r);
    }
  });
  return out;
}

const glyphs = {};
for (const ch of chars) {
  const g = font.charToGlyph(ch);
  const tok = { ha: round(g.advanceWidth * scale), x_min: round((g.xMin ?? 0) * scale), x_max: round((g.xMax ?? 0) * scale), o: '' };
  for (const c of reverse(g.path.commands)) {
    const t = c.type.toLowerCase() === 'c' ? 'b' : c.type.toLowerCase();
    tok.o += t + ' ';
    if (c.x !== undefined) tok.o += round(c.x * scale) + ' ' + round(c.y * scale) + ' ';
    if (c.x1 !== undefined) tok.o += round(c.x1 * scale) + ' ' + round(c.y1 * scale) + ' ';
    if (c.x2 !== undefined) tok.o += round(c.x2 * scale) + ' ' + round(c.y2 * scale) + ' ';
  }
  glyphs[ch] = tok;
}
fs.writeFileSync('src/assets/3d/anton-subset.json', JSON.stringify({
  glyphs, familyName: 'Anton', ascender: round(font.ascender * scale), descender: round(font.descender * scale),
  underlinePosition: -100, underlineThickness: 50,
  boundingBox: { yMin: font.tables.head.yMin, xMin: font.tables.head.xMin, yMax: font.tables.head.yMax, xMax: font.tables.head.xMax },
  resolution: 1000,
}));
console.log('glifos', Object.keys(glyphs).length);
