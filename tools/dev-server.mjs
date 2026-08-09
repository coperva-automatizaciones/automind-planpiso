/* Automind · Plan Piso — Servidor de desarrollo local
 *
 *   node tools/dev-server.mjs        → http://localhost:3000
 *
 * Sirve el repositorio como archivos estáticos, con UNA excepción:
 * intercepta /config.js y devuelve credenciales del Supabase local
 * (`npx supabase start`) en lugar de las de producción.
 *
 * El config.js del repositorio NO se modifica ni se lee para esto, así que el
 * archivo que se despliega a Vercel queda idéntico byte por byte. Cero riesgo
 * de tocar producción.
 *
 * Sin dependencias: solo módulos nativos de Node.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ   = normalize(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const PUERTO = Number(process.env.PORT) || 3000;

// Anon key de demostración del CLI de Supabase: idéntica en toda instalación
// local, sin ningún valor fuera de esta máquina.
const CONFIG_LOCAL = `/* Generado por tools/dev-server.mjs — entorno LOCAL */
window.SUPABASE_URL  = "http://127.0.0.1:54321";
window.SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
console.info("[Automind] Entorno LOCAL — Supabase en", window.SUPABASE_URL);
`;

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".jsx":  "text/babel; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".map":  "application/json; charset=utf-8",
};

const servidor = createServer(async (req, res) => {
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("URL inválida");
    return;
  }

  // ── La única intercepción ────────────────────────────────────────────────
  if (ruta === "/config.js") {
    res.writeHead(200, {
      "Content-Type":  TIPOS[".js"],
      "Cache-Control": "no-store",
    });
    res.end(CONFIG_LOCAL);
    return;
  }

  if (ruta === "/") ruta = "/index.html";

  // Impedir salir de la raíz del repositorio
  const destino = normalize(join(RAIZ, ruta));
  if (!destino.startsWith(RAIZ + sep) && destino !== RAIZ) {
    res.writeHead(403).end("Prohibido");
    return;
  }

  try {
    const info = await stat(destino);
    if (info.isDirectory()) {
      res.writeHead(404).end("No encontrado");
      return;
    }
    const cuerpo = await readFile(destino);
    res.writeHead(200, {
      "Content-Type":  TIPOS[extname(destino).toLowerCase()] || "application/octet-stream",
      // Sin caché: el proyecto versiona los .jsx con ?v= a mano, y en local
      // eso solo estorba.
      "Cache-Control": "no-store",
    });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("No encontrado: " + ruta);
  }
});

servidor.listen(PUERTO, () => {
  console.log(`
  Automind · Plan Piso — desarrollo local

    App        http://localhost:${PUERTO}
    Supabase   http://127.0.0.1:54321
    Studio     http://127.0.0.1:54323
    Correos    http://127.0.0.1:54324

    Cuentas (contraseña: automind123)
      director@local.test    gerente@local.test
      vendedor1@local.test   vendedor2@local.test
      owner@local.test       super@local.test

    config.js se sirve con credenciales locales.
    El archivo del repositorio no se toca.
`);
});
