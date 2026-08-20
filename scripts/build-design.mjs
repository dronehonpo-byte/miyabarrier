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

/**
 * 静的ページ用のロゴ注入スクリプト。
 * ロゴは CSS 変数で色を受けるので <img> ではダークモードに追従できない。
 * かといってロゴのために widget 全体を読み込むのは無駄なので、
 * マークを inline SVG として差し込むだけの小さなスクリプトを用意する。
 */
const logoJs = `/* 自動生成物: scripts/build-design.mjs / 編集元: packages/design/src/logo.ts */
(function () {
  var MARK = ${JSON.stringify(markSvg({ idPrefix: 'mbmark' }))};
  var COMPACT_MARK = ${JSON.stringify(markSvg({ ...COMPACT, idPrefix: 'mbmark' }))};
  var hosts = document.querySelectorAll('[data-mb-mark]');
  for (var i = 0; i < hosts.length; i += 1) {
    var svg = hosts[i].getAttribute('data-mb-mark') === 'compact' ? COMPACT_MARK : MARK;
    /* グラデーションの id が重複しないよう、要素ごとに振り直す */
    hosts[i].innerHTML = svg.replace(/mbmark-/g, 'mbmark' + i + '-');
  }
})();
`;

const files = [
  ['miyabarrier-ui.css', `${banner}\n${tokensCss}\n${baseCss}`],
  ['logo.js', logoJs],
  ['logo-mark.svg', markSvg({ idPrefix: 'mark' })],
  ['logo-mark-compact.svg', markSvg({ ...COMPACT, idPrefix: 'compact' })],
  ['logo-lockup.svg', lockupSvg({ idPrefix: 'lockup' })],
];

for (const [name, content] of files) {
  writeFileSync(join(assets, name), `${content.trim()}\n`, 'utf8');
  console.log(`assets/${name} (${(content.length / 1024).toFixed(1)} KB)`);
}
