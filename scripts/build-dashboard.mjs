#!/usr/bin/env node
/**
 * dashboard を 1 ファイルにバンドルする。
 *
 * index.html から `./dist/dashboard.js` を読むだけの静的ページなので、
 * ビルド結果をサイトに置けばそのまま動く（サーバー不要）。
 * widget からは localStorage のキーだけを import しているため、
 * ツリーシェイキング後もサイズはごく小さい。
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dashboard = join(root, 'packages', 'dashboard');
const outfile = join(dashboard, 'dist', 'dashboard.js');

await esbuild.build({
  entryPoints: [join(dashboard, 'src', 'index.ts')],
  outfile,
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  charset: 'utf8',
  legalComments: 'none',
  define: { __MIYABARRIER_VERSION__: JSON.stringify('dashboard') },
  alias: {
    '@miyabarrier/core': join(root, 'packages', 'core', 'src', 'index.ts'),
    '@miyabarrier/design/logo': join(root, 'packages', 'design', 'src', 'logo.ts'),
    '@miyabarrier/design/tokens': join(root, 'packages', 'design', 'src', 'tokens.ts'),
    '@miyabarrier/widget/log': join(root, 'packages', 'widget', 'src', 'log.ts'),
  },
  banner: { js: '/*! Miyabarrier dashboard | MIT License */' },
  logLevel: 'warning',
});

const bytes = statSync(outfile).size;
const gzipped = gzipSync(readFileSync(outfile)).length;
console.log(
  `packages/dashboard/dist/dashboard.js       ${(bytes / 1024).toFixed(1)} KB (gzip ${(gzipped / 1024).toFixed(1)} KB)`,
);
