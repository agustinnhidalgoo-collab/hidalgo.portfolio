"use client";

import { useEffect, useState } from "react";

/** Hora local de Hidalgo en su zona horaria. */
export function Clock({ timezone, locale }: { timezone: string; locale: string }) {
  const [parts, setParts] = useState<{ h: string; m: string; zone: string } | null>(null);

  useEffect(() => {
    let fmt: Intl.DateTimeFormat;
    try {
      fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone, timeZoneName: "short" });
    } catch {
      return;
    }
    const update = () => {
      const p = fmt.formatToParts(new Date());
      const get = (type: string) => p.find((x) => x.type === type)?.value ?? "";
      setParts({ h: get("hour"), m: get("minute"), zone: get("timeZoneName") });
    };
    update();
    const id = window.setInterval(update, 10_000);
    return () => window.clearInterval(id);
  }, [timezone, locale]);

  if (!parts) return <span className="clock">--:--</span>;
  return (
    <span className="clock">
      {parts.h}
      <span className="clock__colon">:</span>
      {parts.m} <span className="muted">{parts.zone}</span>
    </span>
  );
}
