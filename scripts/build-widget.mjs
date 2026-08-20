#!/usr/bin/env node
/**
 * widget を 1 ファイルにバンドルする。
 *
 * 配布形態は jsDelivr 経由の <script> 1 行なので、成果物は
 *   dist/miyabarrier.min.js … 本番用(IIFE, minify)
 *   dist/miyabarrier.js     … 中身を読める非圧縮版
 *   dist/miyabarrier.esm.js … バンドラから import する用
 * の 3 つ。core は npm のリンクに頼らずソースを直接 alias で解決する（Windows や
 * 権限制限下でも npm workspaces のシンボリックリンクなしにビルドできるようにするため）。
 */
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const widget = join(root, 'packages', 'widget');
const version = JSON.parse(readFileSync(join(widget, 'package.json'), 'utf8')).version;

// patterns/*.json の変更をバンドルに確実に反映させる。
execFileSync(process.execPath, [join(root, 'scripts', 'build-patterns.mjs')], {
  stdio: 'inherit',
});

const banner = `/*! Miyabarrier v${version} | MIT License | https://github.com/dronehonpo-byte/miyabarrier */`;

const shared = {
  entryPoints: [join(widget, 'src', 'index.ts')],
  bundle: true,
  target: ['es2019'],
  charset: 'utf8',
  legalComments: 'none',
  define: { __MIYABARRIER_VERSION__: JSON.stringify(version) },
  alias: { '@miyabarrier/core': join(root, 'packages', 'core', 'src', 'index.ts') },
  banner: { js: banner },
  logLevel: 'warning',
};

const builds = [
  { outfile: join(widget, 'dist', 'miyabarrier.min.js'), format: 'iife', minify: true },
  { outfile: join(widget, 'dist', 'miyabarrier.js'), format: 'iife', minify: false },
  { outfile: join(widget, 'dist', 'miyabarrier.esm.js'), format: 'esm', minify: true },
];

for (const build of builds) {
  await esbuild.build({ ...shared, ...build });
  const bytes = statSync(build.outfile).size;
  const gzipped = gzipSync(readFileSync(build.outfile)).length;
  const name = build.outfile.slice(root.length + 1).replace(/\\/g, '/');
  console.log(
    `${name.padEnd(38)} ${(bytes / 1024).toFixed(1)} KB (gzip ${(gzipped / 1024).toFixed(1)} KB)`,
  );
}
