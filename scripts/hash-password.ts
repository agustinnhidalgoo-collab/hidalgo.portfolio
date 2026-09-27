/**
 * Genera el hash de la contraseña del panel para ADMIN_PASSWORD_HASH.
 *   npm run admin:hash -- "mi-contraseña-segura"
 */
import { hashPassword } from "../src/lib/auth";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Uso: npm run admin:hash -- "contraseña-de-al-menos-10-caracteres"');
  process.exit(1);
}
console.log("\nCopiá esta línea en tu .env.local:\n");
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}\n`);
