#!/usr/bin/env node
/**
 * デモ用の静的サーバー（依存なし）。
 * examples/demo.html が ../packages/widget/dist/ を参照するので、
 * リポジトリのルートをそのまま公開する（GitHub Pages と同じ構成）。
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.map': 'application/json; charset=utf-8',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  const requested = url.pathname === '/' ? '/examples/demo.html' : decodeURIComponent(url.pathname);
  // ルート外への参照を弾く。
  const target = join(root, normalize(requested).replace(/^(\.\.[/\\])+/, ''));

  if (!target.startsWith(root) || !existsSync(target) || statSync(target).isDirectory()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('404 Not Found');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME[extname(target)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(response);
}).listen(port, () => {
  console.log(`demo: http://localhost:${port}/examples/demo.html`);
});
