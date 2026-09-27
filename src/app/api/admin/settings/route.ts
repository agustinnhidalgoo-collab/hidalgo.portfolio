import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/content";
import { siteSettingsSchema } from "@/lib/types";
import { badRequest, readJson, zodMessage } from "@/lib/api";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const body = await readJson<{ settings?: unknown }>(req);
  const parsed = siteSettingsSchema.safeParse(body?.settings);
  if (!parsed.success) return badRequest(zodMessage(parsed.error));
  const s = parsed.data;
  if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return badRequest("El email no es válido.");
  for (const l of s.links) {
    if (!/^(https?:\/\/|mailto:)/i.test(l.url)) return badRequest(`El enlace “${l.label}” debe empezar con https://`);
  }
  try {
    new Intl.DateTimeFormat("es", { timeZone: s.timezone });
  } catch {
    return badRequest("Zona horaria inválida (ej.: America/Argentina/Buenos_Aires).");
  }
  await saveSettings(s);
  return NextResponse.json({ settings: s });
}
