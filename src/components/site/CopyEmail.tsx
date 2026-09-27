"use client";

import { useState } from "react";

/** Email grande: clic para escribir y botón para copiarlo al portapapeles. */
export function CopyEmail({ email, labels }: { email: string; labels: { copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {}
  };
  return (
    <div className="copy-row">
      <a href={`mailto:${email}`} className="big-email" data-cursor="link">
        {email}
      </a>
      <button type="button" className="btn" onClick={copy} data-magnetic>
        <span aria-live="polite">{copied ? labels.copied : labels.copy}</span>
      </button>
    </div>
  );
}
