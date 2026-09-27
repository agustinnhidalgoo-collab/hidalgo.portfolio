"use client";

import { useId } from "react";
import type { L10n } from "@/lib/types";

interface Props {
  label: string;
  value: L10n;
  onChange: (v: L10n) => void;
  multiline?: boolean;
  rows?: number;
  help?: string;
  placeholder?: string;
  required?: boolean;
}

/** Campo bilingüe: español e inglés lado a lado, con aviso si falta una traducción. */
export function L10nField({ label, value, onChange, multiline, rows = 5, help, placeholder, required }: Props) {
  const id = useId();
  const missing = (value.es.trim() === "") !== (value.en.trim() === "");
  const Input = (lang: "es" | "en") => {
    const common = {
      id: `${id}-${lang}`,
      value: value[lang],
      lang,
      placeholder: placeholder ? `${placeholder}${lang === "en" ? " (EN)" : ""}` : undefined,
      "aria-label": `${label} (${lang === "es" ? "español" : "inglés"})`,
      onChange: (e: { target: { value: string } }) => onChange({ ...value, [lang]: e.target.value }),
    };
    return (
      <div className="a-l10n__item" key={lang}>
        {multiline ? <textarea className="a-textarea" rows={rows} {...common} /> : <input className="a-input" {...common} />}
        <span className="a-l10n__tag" aria-hidden="true">
          {lang.toUpperCase()}
        </span>
      </div>
    );
  };
  return (
    <div className="a-field" role="group" aria-labelledby={`${id}-label`}>
      <div className="a-label">
        <span id={`${id}-label`}>
          {label}
          {required && " *"}
        </span>
        {missing && <span className="a-missing">Falta la traducción {value.es.trim() ? "EN" : "ES"}</span>}
      </div>
      <div className="a-l10n">
        {Input("es")}
        {Input("en")}
      </div>
      {help && <p className="a-help">{help}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  help,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  type?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="a-field">
      <label className="a-label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className="a-input" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {help && <p className="a-help">{help}</p>}
    </div>
  );
}
