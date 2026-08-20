#!/usr/bin/env node
/**
 * patterns/*.json を packages/core/src/patterns.data.ts に埋め込む。
 *
 * 判定ロジックは「サーバー不要・fetch 不要」で動く必要があるため、
 * パターン定義はビルド時に TypeScript へインライン化して 1 ファイルに同梱する。
 * patterns/*.json が唯一の編集元であり、このスクリプトの出力は編集しない。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'packages', 'core', 'src', 'patterns.data.ts');

const read = (name) => JSON.parse(readFileSync(join(root, 'patterns', name), 'utf8'));

const ngWords = read('ng-words.json');
const weights = read('weights.json');

/** patterns/*.json の壊れた編集を、ビルド時点で落とす。 */
function validate() {
  const errors = [];
  const seen = new Set();
  for (const category of ngWords.categories ?? []) {
    const where = `ng-words.json / ${category.id ?? '(id なし)'}`;
    if (!category.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(category.id)) {
      errors.push(`${where}: id は kebab-case で指定してください`);
    }
    if (seen.has(category.id)) errors.push(`${where}: id が重複しています`);
    seen.add(category.id);
    if (typeof category.score !== 'number' || category.score === 0) {
      errors.push(`${where}: score は 0 以外の数値で指定してください`);
    }
    if (typeof category.cap !== 'number' || Math.sign(category.cap) !== Math.sign(category.score)) {
      errors.push(`${where}: cap は score と同じ符号で指定してください`);
    }
    if (typeof category.cap === 'number' && Math.abs(category.cap) < Math.abs(category.score)) {
      errors.push(`${where}: cap の絶対値が score より小さいと 1 語も加点できません`);
    }
    if (!Array.isArray(category.terms) || category.terms.length === 0) {
      errors.push(`${where}: terms を 1 語以上指定してください`);
    }
    for (const term of category.terms ?? []) {
      if (term !== term.toLowerCase())
        errors.push(`${where}: terms は小文字で記述してください (${term})`);
    }
    for (const source of category.patterns ?? []) {
      try {
        new RegExp(source, 'gi');
      } catch (error) {
        errors.push(`${where}: 正規表現が不正です (${source}): ${error.message}`);
      }
    }
  }

  const groupWeightSums = {};
  for (const [id, layer] of Object.entries(weights.layers ?? {})) {
    const where = `weights.json / layers.${id}`;
    const group = layer.group ?? 'automation';
    if (!weights.groups?.[group]) errors.push(`${where}: group "${group}" が groups に未定義です`);
    groupWeightSums[group] = (groupWeightSums[group] ?? 0) + (layer.weight ?? 0);
    if (typeof layer.weight !== 'number' || layer.weight < 0)
      errors.push(`${where}: weight が不正です`);
    if (typeof layer.saturation !== 'number' || layer.saturation <= 0) {
      errors.push(`${where}: saturation は正の数で指定してください`);
    }
    for (const [code, points] of Object.entries(layer.points ?? {})) {
      if (typeof points !== 'number') errors.push(`${where}: points.${code} が数値ではありません`);
    }
  }
  // グループ内の weight は相対値なので、合計が 1.0 でないとチューニングの意味が読めなくなる。
  for (const [group, sum] of Object.entries(groupWeightSums)) {
    if (Math.abs(sum - 1) > 0.001) {
      errors.push(
        `weights.json / layers: group "${group}" の weight 合計が ${sum.toFixed(3)} です (1.0 にしてください)`,
      );
    }
  }

  const { review, block } = weights.thresholds ?? {};
  if (!(typeof review === 'number' && typeof block === 'number' && review <= block)) {
    errors.push('weights.json / thresholds: review <= block を満たす数値を指定してください');
  }

  if (errors.length > 0) {
    console.error('patterns の検証に失敗しました:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
}

validate();

const banner = `/**
 * このファイルは scripts/build-patterns.mjs による自動生成物です。直接編集しないでください。
 * 編集元: patterns/ng-words.json, patterns/weights.json
 * 再生成: npm run gen
 */`;

const body = `${banner}
import type { NgWordList, WeightConfig } from './types';

export const defaultNgWords: NgWordList = ${JSON.stringify(ngWords, null, 2)};

export const defaultWeights: WeightConfig = ${JSON.stringify(weights, null, 2)};
`;

writeFileSync(outFile, body.replace(/\r\n/g, '\n'), 'utf8');
console.log(
  `patterns.data.ts を生成しました (categories: ${ngWords.categories.length}, layers: ${Object.keys(weights.layers).length})`,
);
