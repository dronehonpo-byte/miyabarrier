/**
 * patterns/*.json の整合性テスト。
 *
 * このリポジトリは「パターンはコミュニティが育てる」前提なので、
 * 語やしきい値の編集で壊れやすいところをここで機械的に守る。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultNgWords, defaultWeights } from '../src/patterns.data';
import { SIGNAL_CODES, SIGNAL_LABELS } from '../src/signals';
import { scoreNgWords } from '../src/content';

const patternsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'patterns');
const readJson = (name: string): unknown =>
  JSON.parse(readFileSync(join(patternsDir, name), 'utf8'));

describe('生成物の同期', () => {
  it('patterns.data.ts が patterns/*.json と一致している（npm run gen 忘れの検出）', () => {
    expect(defaultNgWords).toEqual(readJson('ng-words.json'));
    expect(defaultWeights).toEqual(readJson('weights.json'));
  });
});

describe('weights.json', () => {
  it('すべてのレイヤーが group を持ち、グループ内の weight 合計が 1.0 になる', () => {
    const sums = new Map<string, number>();
    for (const [id, layer] of Object.entries(defaultWeights.layers)) {
      expect(layer.group, `layers.${id}.group`).toBeDefined();
      const group = layer.group ?? 'automation';
      expect(defaultWeights.groups?.[group], `groups.${group}`).toBeDefined();
      sums.set(group, (sums.get(group) ?? 0) + layer.weight);
    }
    expect(sums.size).toBeGreaterThan(1);
    for (const [group, sum] of sums) {
      expect(sum, `group ${group}`).toBeCloseTo(1, 3);
    }
  });

  it('しきい値が review <= block になっている', () => {
    expect(defaultWeights.thresholds.review).toBeLessThanOrEqual(defaultWeights.thresholds.block);
    expect(defaultWeights.thresholds.block).toBeLessThanOrEqual(1);
  });

  it('saturation が正の数である', () => {
    for (const [id, layer] of Object.entries(defaultWeights.layers)) {
      expect(layer.saturation, `layers.${id}.saturation`).toBeGreaterThan(0);
    }
  });

  it('hardBlock の code が実在する', () => {
    for (const code of defaultWeights.hardBlock ?? []) {
      expect(SIGNAL_CODES, code).toContain(code);
    }
  });

  it('points の code とラベル定義が 1:1 で対応している', () => {
    const configured = new Set<string>();
    for (const layer of Object.values(defaultWeights.layers)) {
      for (const code of Object.keys(layer.points)) configured.add(code);
    }
    // weights.json 側にあってラベルが無い = signals.ts への追記漏れ
    expect([...configured].filter((code) => !(code in SIGNAL_LABELS))).toEqual([]);
    // ラベルはあるが配点が無い = weights.json への追記漏れ（0 点で黙って無視されるのを防ぐ）
    expect(SIGNAL_CODES.filter((code) => !configured.has(code))).toEqual([]);
  });

  it('1 レイヤーの最大加点が saturation に届く（到達不能な満点を作らない）', () => {
    for (const [id, layer] of Object.entries(defaultWeights.layers)) {
      const total = Object.values(layer.points).reduce((sum, points) => sum + points, 0);
      expect(total, `layers.${id}`).toBeGreaterThanOrEqual(layer.saturation);
    }
  });
});

describe('ng-words.json', () => {
  it('id が kebab-case かつ一意である', () => {
    const ids = defaultNgWords.categories.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('cap の符号が score と一致し、1 語以上加点できる', () => {
    for (const category of defaultNgWords.categories) {
      expect(Math.sign(category.cap), category.id).toBe(Math.sign(category.score));
      expect(Math.abs(category.cap), category.id).toBeGreaterThanOrEqual(Math.abs(category.score));
    }
  });

  it('terms は小文字・半角で書かれている', () => {
    for (const category of defaultNgWords.categories) {
      for (const term of category.terms) {
        expect(term, `${category.id}: ${term}`).toBe(term.toLowerCase().normalize('NFKC'));
      }
    }
  });

  it('正規化後に同じになる語が重複登録されていない（二重加点・死んだ項目の防止）', () => {
    const owner = new Map<string, string>();
    const duplicates: string[] = [];
    for (const category of defaultNgWords.categories) {
      for (const rawTerm of category.terms) {
        const term = rawTerm.toLowerCase().normalize('NFKC');
        const previous = owner.get(term);
        if (previous) duplicates.push(`${term} (${previous} / ${category.id})`);
        else owner.set(term, category.id);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('正規表現がすべてコンパイルできる', () => {
    for (const category of defaultNgWords.categories) {
      for (const source of category.patterns ?? []) {
        expect(() => new RegExp(source, 'gi'), `${category.id}: ${source}`).not.toThrow();
      }
    }
  });

  it('allowlist の語は、打ち消す対象の NG ワードを実際に含んでいる', () => {
    const terms = defaultNgWords.categories
      .filter((category) => category.score > 0)
      .flatMap((category) => category.terms);
    for (const phrase of defaultNgWords.allowlist?.terms ?? []) {
      const normalized = phrase.toLowerCase().normalize('NFKC');
      expect(
        terms.some((term) => normalized.includes(term)),
        `allowlist "${phrase}" はどの NG ワードも含んでいない（無意味な項目）`,
      ).toBe(true);
    }
  });

  it('日常的な問い合わせ文でスコアが立たない', () => {
    const harmless = [
      '営業時間を教えてください。',
      '駐車場はありますか。子どもと一緒に行きたいです。',
      '先週注文した品がまだ届きません。追跡番号を知りたいです。',
      'サイズ交換をお願いしたいのですが、送料はどちら負担になりますか。',
      '取材のご依頼でご連絡しました。詳細をメールでお送りします。',
      '求人に応募したいのですが、応募フォームが見つかりません。',
    ];
    for (const text of harmless) {
      expect(scoreNgWords(text, defaultNgWords).score, text).toBeLessThanOrEqual(0);
    }
  });
});
