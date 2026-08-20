/**
 * 統合スコアリングのテスト。
 *
 * ここは同時に「しきい値の校正記録」でもある。現実に起こるシナリオを並べて、
 * 正当な問い合わせが通り、営業と自動送信が止まることを数値で固定している。
 * weights.json をいじって挙動を変えたいときは、まずこのテストを見て影響を確認する。
 */
import { describe, expect, it } from 'vitest';
import { analyze, mergeNgWords, mergeWeights } from '../src/index';
import { decideVerdict, scoreLayers } from '../src/scoring';
import { defaultWeights } from '../src/patterns.data';
import type { AnalysisInput, AnalysisResult, LayerResult } from '../src/types';
import {
  AI_SALES_PITCH,
  ENGLISH_SPAM,
  LEGIT_INQUIRY,
  SALES_PITCH,
  T0,
  cleanHoneypot,
  headlessEnvironment,
  humanBehavior,
  humanCheckbox,
  humanEnvironment,
  mimicBehavior,
  naiveBotBehavior,
  scriptedCheckbox,
  trippedHoneypot,
} from './fixtures';

const groupScore = (result: AnalysisResult, group: string): number =>
  result.groups.find((entry) => entry.group === group)?.score ?? 0;

/** 人間が普通に問い合わせを書いた状態。 */
const humanInput = (text: string, overrides: Partial<AnalysisInput> = {}): AnalysisInput => ({
  honeypot: cleanHoneypot(),
  behavior: humanBehavior(),
  environment: humanEnvironment(),
  checkbox: humanCheckbox(),
  content: { text, formLanguage: 'ja' },
  ...overrides,
});

describe('現実のシナリオ', () => {
  it('正当な問い合わせは通す', () => {
    const result = analyze(humanInput(LEGIT_INQUIRY));
    expect(result.verdict).toBe('pass');
    expect(result.score).toBeLessThan(0.2);
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('チェックボックス未チェックだけでは止めない', () => {
    const result = analyze(
      humanInput(LEGIT_INQUIRY, {
        checkbox: { ...humanCheckbox(), checked: false, checkedAt: null },
      }),
    );
    expect(result.verdict).toBe('pass');
  });

  it('チェックボックス UI を出していないサイトでも通す', () => {
    const result = analyze(
      humanInput(LEGIT_INQUIRY, {
        checkbox: { present: false, checked: false, renderedAt: T0 },
      }),
    );
    expect(result.verdict).toBe('pass');
    expect(result.layers.find((layer) => layer.layer === 'checkbox')?.applicable).toBe(false);
  });

  it('スマホからの問い合わせ（ポインタ軌跡なし・タッチのみ）を通す', () => {
    const base = humanBehavior();
    const result = analyze(
      humanInput(LEGIT_INQUIRY, {
        behavior: { ...base, pointer: [], touchEventCount: 6 },
        environment: {
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
          pluginCount: 0,
          languages: ['ja-JP'],
          maxTouchPoints: 5,
          isChromium: false,
          innerWidth: 390,
          innerHeight: 664,
          screenWidth: 390,
          screenHeight: 844,
          outerWidth: 390,
          outerHeight: 664,
        },
      }),
    );
    expect(result.verdict).toBe('pass');
  });

  it('メモから貼り付けただけの問い合わせを通す', () => {
    const base = humanBehavior();
    const result = analyze(
      humanInput(LEGIT_INQUIRY, {
        behavior: {
          ...base,
          pastes: [{ field: 'message', t: T0 + 9_000, length: 400 }],
          typedChars: base.typedChars + 400,
        },
      }),
    );
    expect(result.verdict).toBe('pass');
  });

  it('人が手打ちした営業メールを止める（automation 側は無反応でも）', () => {
    const result = analyze(humanInput(SALES_PITCH));
    expect(result.verdict).toBe('block');
    expect(groupScore(result, 'automation')).toBeLessThan(0.2);
    expect(groupScore(result, 'sales')).toBeGreaterThan(0.75);
  });

  it('AI が書いた営業文を止める', () => {
    const result = analyze(humanInput(AI_SALES_PITCH));
    expect(result.verdict).toBe('block');
  });

  it('英語のスパムを止める', () => {
    const result = analyze(humanInput(ENGLISH_SPAM));
    expect(result.verdict).toBe('block');
  });

  it('ハニーポットに引っかかった送信は即ブロックする', () => {
    const result = analyze({
      honeypot: trippedHoneypot(),
      behavior: humanBehavior(),
      environment: humanEnvironment(),
      checkbox: humanCheckbox(),
      content: { text: LEGIT_INQUIRY },
    });
    expect(result.hardBlocked).toBe(true);
    expect(result.verdict).toBe('block');
    // 理由の先頭はハードブロックの根拠であること。
    expect(result.reasons[0]).toContain('隠しフィールド');
  });

  it('headless ブラウザによる自動送信を止める（営業文でなくても）', () => {
    const result = analyze({
      honeypot: cleanHoneypot(),
      behavior: naiveBotBehavior(),
      environment: headlessEnvironment(),
      checkbox: scriptedCheckbox(),
      content: { text: 'test test test test test test test test test' },
    });
    expect(result.verdict).toBe('block');
    expect(groupScore(result, 'automation')).toBeGreaterThan(0.7);
  });

  it('人間の操作を模倣する自動化を、少なくとも確認扱いにする', () => {
    const result = analyze({
      honeypot: cleanHoneypot(),
      behavior: mimicBehavior(),
      environment: { ...humanEnvironment(), webdriver: true },
      checkbox: humanCheckbox(),
      content: { text: 'お問い合わせフォームのテスト送信です。動作の確認をしています。' },
    });
    expect(result.verdict).not.toBe('pass');
    expect(result.layers.find((layer) => layer.layer === 'mimicry')?.score).toBe(1);
  });

  it('模倣する自動化が営業文を送ってきたら止める', () => {
    const result = analyze({
      honeypot: cleanHoneypot(),
      behavior: mimicBehavior(),
      environment: { ...humanEnvironment(), webdriver: true },
      checkbox: humanCheckbox(),
      content: { text: SALES_PITCH },
    });
    expect(result.verdict).toBe('block');
  });
});

describe('スコアの組み立て', () => {
  it('グループは独立して評価され、片方だけでもしきい値に届く', () => {
    const salesOnly = analyze(humanInput(SALES_PITCH));
    const automationOnly = analyze({
      honeypot: cleanHoneypot(),
      behavior: naiveBotBehavior(),
      environment: headlessEnvironment(),
      checkbox: scriptedCheckbox(),
      content: { text: 'aaaa bbbb cccc dddd eeee ffff gggg' },
    });
    expect(salesOnly.verdict).toBe('block');
    expect(automationOnly.verdict).toBe('block');
    expect(groupScore(salesOnly, 'automation')).toBeLessThan(0.2);
    expect(groupScore(automationOnly, 'sales')).toBe(0);
  });

  it('無反応なハニーポットは母数に入らない（沈黙を無罪の証拠にしない）', () => {
    const silentHoneypot: LayerResult = {
      layer: 'honeypot',
      applicable: true,
      signals: [],
      metrics: {},
    };
    const botBehavior: LayerResult = {
      layer: 'behavior',
      applicable: true,
      signals: [{ code: 'behavior.instantSubmit' }, { code: 'behavior.noKeystrokes' }],
      metrics: {},
    };

    const withHoneypot = scoreLayers([silentHoneypot, botBehavior], defaultWeights);
    const withoutHoneypot = scoreLayers([botBehavior], defaultWeights);

    expect(withHoneypot.layers.find((layer) => layer.layer === 'honeypot')?.counted).toBe(false);
    expect(withHoneypot.score).toBe(withoutHoneypot.score);
    expect(withHoneypot.score).toBeGreaterThan(0.9);
  });

  it('引っかかったハニーポットは母数に入る', () => {
    const result = scoreLayers(
      [
        {
          layer: 'honeypot',
          applicable: true,
          signals: [{ code: 'honeypot.tokenTampered' }],
          metrics: {},
        },
      ],
      defaultWeights,
    );
    expect(result.layers[0]?.counted).toBe(true);
    expect(result.score).toBeCloseTo(0.75, 2);
  });

  it('操作なしの即時送信はブロックまで届く', () => {
    const result = analyze({
      honeypot: cleanHoneypot(),
      behavior: naiveBotBehavior(),
      environment: humanEnvironment(),
      checkbox: scriptedCheckbox(),
      content: { text: 'テスト送信です。動作の確認をしています。よろしくお願いします。' },
    });
    expect(result.verdict).toBe('block');
  });

  it('判定不能なレイヤーは母数から外れる', () => {
    const result = scoreLayers(
      [
        { layer: 'honeypot', applicable: false, signals: [], metrics: {}, skipped: 'なし' },
        {
          layer: 'behavior',
          applicable: true,
          signals: [{ code: 'behavior.noFocusEvents' }],
          metrics: {},
        },
      ],
      defaultWeights,
    );
    // behavior だけが有効なので、automation グループ = behavior のスコアそのもの。
    const behaviorLayer = result.layers.find((layer) => layer.layer === 'behavior');
    expect(behaviorLayer?.score).toBeCloseTo(2 / 6, 3);
    expect(groupScore(result, 'automation')).toBeCloseTo(2 / 6, 2);
  });

  it('未知のシグナル code は 0 点として警告する', () => {
    const layer: LayerResult = {
      layer: 'behavior',
      applicable: true,
      signals: [{ code: 'behavior.typoInCode' }],
      metrics: {},
    };
    const result = scoreLayers([layer], defaultWeights);
    expect(result.score).toBe(0);
    expect(result.warnings[0]).toContain('behavior.typoInCode');
  });

  it('intensity が加点に比例する', () => {
    const build = (intensity: number) =>
      scoreLayers(
        [
          {
            layer: 'behavior',
            applicable: true,
            signals: [{ code: 'behavior.instantSubmit', intensity }],
            metrics: {},
          },
        ],
        defaultWeights,
      );
    expect(build(0.5).layers[0]?.points).toBe(2);
    expect(build(1).layers[0]?.points).toBe(4);
    // 範囲外の intensity は 0〜1 に丸める。
    expect(build(9).layers[0]?.points).toBe(4);
  });

  it('レイヤースコアは 1.0 で飽和する', () => {
    const codes = [
      'env.webdriver',
      'env.headlessUserAgent',
      'env.noLanguages',
      'env.zeroOuterWindow',
    ];
    const points = defaultWeights.layers.environment?.points ?? {};
    const expected = codes.reduce((sum, code) => sum + (points[code] ?? 0), 0);
    const result = scoreLayers(
      [
        {
          layer: 'environment',
          applicable: true,
          signals: codes.map((code) => ({ code })),
          metrics: {},
        },
      ],
      defaultWeights,
    );
    expect(expected).toBeGreaterThan(defaultWeights.layers.environment!.saturation);
    expect(result.layers[0]?.points).toBe(expected);
    expect(result.layers[0]?.score).toBe(1);
  });

  it('weighted-mean に切り替えるとグループの平均になる', () => {
    const weights = mergeWeights(defaultWeights, { combine: 'weighted-mean' });
    const noisyOr = analyze(humanInput(SALES_PITCH));
    const mean = analyze(humanInput(SALES_PITCH), { weights });
    expect(mean.score).toBeLessThan(noisyOr.score);
    expect(mean.score).toBeCloseTo(
      (groupScore(mean, 'automation') + groupScore(mean, 'sales')) / 2,
      2,
    );
  });

  it('decideVerdict はしきい値の境界を含む', () => {
    const thresholds = { review: 0.4, block: 0.62 };
    expect(decideVerdict(0.39, thresholds)).toBe('pass');
    expect(decideVerdict(0.4, thresholds)).toBe('review');
    expect(decideVerdict(0.62, thresholds)).toBe('block');
    expect(decideVerdict(0, thresholds, true)).toBe('block');
  });
});

describe('設定の上書き', () => {
  it('しきい値を上書きできる', () => {
    const strict = mergeWeights(defaultWeights, { thresholds: { review: 0.05, block: 0.1 } });
    // 既定では pass になる「チェックボックス未チェックだけ」の状態。
    const input = humanInput(LEGIT_INQUIRY, {
      checkbox: { ...humanCheckbox(), checked: false, checkedAt: null },
    });
    expect(analyze(input).verdict).toBe('pass');
    const result = analyze(input, { weights: strict });
    expect(result.verdict).not.toBe('pass');
    // 元の定義を壊していないこと。
    expect(defaultWeights.thresholds.block).toBe(0.62);
  });

  it('レイヤーの重みを部分的に上書きできる', () => {
    const weights = mergeWeights(defaultWeights, { layers: { content: { weight: 0.1 } } });
    expect(weights.layers.content?.weight).toBe(0.1);
    expect(weights.layers.content?.saturation).toBe(defaultWeights.layers.content?.saturation);
    expect(weights.layers.content?.points['content.ngWords']).toBeDefined();
  });

  it('NG ワードを追記できる', () => {
    const list = mergeNgWords(
      { version: 1, categories: [{ id: 'a', label: 'A', score: 2, cap: 4, terms: ['既存'] }] },
      { categories: [{ id: 'a', label: 'A', score: 2, cap: 4, terms: ['追加'] }] },
    );
    expect(list.categories[0]?.terms).toEqual(['既存', '追加']);
  });

  it('サイト固有の NG ワードで判定が変わる', () => {
    const text = 'ドローンスクールの受講について、次回開催の日程を教えてください。';
    const base = analyze(humanInput(text));
    const tuned = analyze(humanInput(text), {
      ngWords: mergeNgWords(
        { version: 1, categories: [] },
        {
          categories: [
            {
              id: 'site-specific',
              label: 'サイト固有',
              score: 4,
              cap: 12,
              terms: ['ドローンスクール'],
            },
          ],
        },
      ),
    });
    expect(base.verdict).toBe('pass');
    expect(tuned.layers.find((layer) => layer.layer === 'content')?.score).toBeGreaterThan(0);
  });
});
