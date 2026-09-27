import { Fragment, type ReactNode } from "react";

/**
 * Formato de texto mínimo y seguro para los bloques de texto:
 *   párrafos separados por línea en blanco, **negrita**, *cursiva*,
 *   [enlace](https://...) y saltos de línea simples.
 * Se construyen elementos React —nunca HTML crudo—, así que no hay forma de
 * inyectar scripts desde el contenido.
 */

const SAFE_URL = /^(https?:\/\/|mailto:|\/)/i;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[2]) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[4]) out.push(<em key={key}>{m[4]}</em>);
    else if (m[6] && m[7]) {
      const href = m[7];
      if (SAFE_URL.test(href)) {
        const external = /^https?:/i.test(href);
        out.push(
          <a key={key} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} data-cursor="link">
            {m[6]}
          </a>,
        );
      } else out.push(m[6]);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return null;
  return (
    <div className={className}>
      {paragraphs.map((p, pi) => (
        <p key={pi}>
          {p.split("\n").map((line, li, arr) => (
            <Fragment key={li}>
              {inline(line, `${pi}-${li}`)}
              {li < arr.length - 1 && <br />}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
