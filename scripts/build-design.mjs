#!/usr/bin/env node
/**
 * デザイントークンとロゴを静的アセットとして書き出す。
 *
 * widget は TypeScript から直接 import してバンドルに埋め込むが、
 * dashboard / demo は素の HTML なので CSS と SVG のファイルが必要になる。
 * どちらも packages/design が唯一の定義元で、ここはその写しを作るだけ。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { markSvg, lockupSvg, COMPACT } from '../packages/design/src/logo.ts';
import { tokensCss } from '../packages/design/src/tokens.ts';
import { baseCss } from '../packages/design/src/ui.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
mkdirSync(assets, { recursive: true });

const banner = `/* このファイルは scripts/build-design.mjs による自動生成物です。直接編集しないでください。
   編集元: packages/design/src/{tokens,ui}.ts / 再生成: npm run gen */`;

const files = [
  ['miyabarrier-ui.css', `${banner}\n${tokensCss}\n${baseCss}`],
  ['logo-mark.svg', markSvg({ idPrefix: 'mark' })],
  ['logo-mark-compact.svg', markSvg({ ...COMPACT, idPrefix: 'compact' })],
  ['logo-lockup.svg', lockupSvg({ idPrefix: 'lockup' })],
];

for (const [name, content] of files) {
  writeFileSync(join(assets, name), `${content.trim()}\n`, 'utf8');
  console.log(`assets/${name} (${(content.length / 1024).toFixed(1)} KB)`);
}
