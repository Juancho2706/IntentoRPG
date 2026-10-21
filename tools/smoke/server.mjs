// ============================================================
// Servidor estático del humo (node:http, sin dependencias) — docs/paso2-implementacion.md §6 paso 1
// ============================================================
// Sirve la raíz del repo en 127.0.0.1:<puerto> sin caché. Si el puerto pedido está ocupado
// (otra corrida en paralelo, otro worktree) cae a uno libre. Anota los 404 (también los de
// la precarga del service worker, que CDP no ve desde la página).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

export const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
};

export async function startServer(root, port = 8099) {
  const misses = [];
  const server = createServer(async (req, res) => {
    let path, iso = false;
    try {
      const u = new URL(req.url, 'http://x');
      path = decodeURIComponent(u.pathname);
      // ?iso=1 en el documento: aislamiento entre orígenes (COOP + COEP credentialless) para que
      // performance.now() tenga 5 µs de resolución en vez de 100 µs (medición del tick)
      iso = u.searchParams.get('iso') === '1';
    } catch { res.writeHead(400); res.end(); return; }
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(normalize(root + sep)) && file !== normalize(root)) { res.writeHead(403); res.end(); return; }
    try {
      const st = await stat(file);
      if (!st.isFile()) throw new Error('no es un fichero');
      const body = await readFile(file);
      const head = { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' };
      if (iso && extname(file) === '.html') Object.assign(head, { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless' });
      res.writeHead(200, head);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      if (path !== '/favicon.ico') misses.push(path);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404');
    }
  });
  const listen = p => new Promise((res, rej) => {
    const onErr = e => { server.off('listening', onOk); rej(e); };
    const onOk = () => { server.off('error', onErr); res(); };
    server.once('error', onErr);
    server.once('listening', onOk);
    server.listen(p, '127.0.0.1');
  });
  try { await listen(port); } catch (e) {
    if (e.code !== 'EADDRINUSE') throw e;
    await listen(0);
  }
  const real = server.address().port;
  return {
    port: real, origin: `http://127.0.0.1:${real}`, misses,
    close: () => new Promise(r => { server.closeAllConnections?.(); server.close(() => r()); }),
  };
}
