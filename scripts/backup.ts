/**
 * Copia de seguridad local: base de datos + archivos subidos.
 *   npm run backup
 * Crea backups/AAAA-MM-DD_HHMMSS/ con hidalgo.db y la carpeta media/.
 * Con una base remota (Turso) usá además: turso db shell <db> .dump > backup.sql
 */
import fs from "node:fs/promises";
import path from "node:path";
import { getRawClient } from "../src/lib/db";
import { mediaDir } from "../src/lib/media";

async function main() {
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "");
  const dir = path.resolve("backups", stamp);
  await fs.mkdir(dir, { recursive: true });

  const url = process.env.DATABASE_URL || "file:./data/hidalgo.db";
  if (url.startsWith("file:")) {
    const target = path.join(dir, "hidalgo.db").replace(/'/g, "''");
    await getRawClient().execute(`VACUUM INTO '${target}'`);
    console.log("✓ Base de datos →", path.join(dir, "hidalgo.db"));
  } else {
    console.log("! Base remota: exportala con `turso db shell <nombre> .dump > backup.sql`");
  }

  try {
    await fs.cp(mediaDir(), path.join(dir, "media"), { recursive: true });
    console.log("✓ Archivos →", path.join(dir, "media"));
  } catch {
    console.log("! No hay carpeta de medios para copiar.");
  }
  console.log("\nListo. Guardá esta carpeta fuera de la computadora (disco externo o nube).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
