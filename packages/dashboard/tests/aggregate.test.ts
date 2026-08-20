import { describe, expect, it } from 'vitest';
import {
  byDay,
  parseLog,
  scoreHistogram,
  simulateThresholds,
  summarize,
  topPaths,
  topReasons,
  type LogEntry,
} from '../src/aggregate';

const entry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  t: '2026-08-18T10:00:00.000Z',
  verdict: 'pass',
  score: 0.1,
  reasons: [],
  form: 'contact',
  path: '/contact',
  hard: false,
  ...overrides,
});

describe('parseLog', () => {
  it('JSON 文字列とオブジェクト配列の両方を受け取る', () => {
    const list = [entry()];
    expect(parseLog(JSON.stringify(list)).entries).toHaveLength(1);
    expect(parseLog(list).entries).toHaveLength(1);
  });

  it('壊れた JSON でも例外を投げない', () => {
    expect(parseLog('{not json').entries).toEqual([]);
    expect(parseLog(null).entries).toEqual([]);
    expect(parseLog(undefined).entries).toEqual([]);
    expect(parseLog(42).entries).toEqual([]);
  });

  it('形式の合わない要素を読み飛ばして件数を報告する', () => {
    const result = parseLog([
      entry(),
      null,
      { t: 'いつか', verdict: 'block', score: 1 },
      { t: '2026-08-18T10:00:00.000Z', verdict: 'unknown', score: 1 },
      { t: '2026-08-18T10:00:00.000Z', verdict: 'block' },
      'string',
    ]);
    expect(result.entries).toHaveLength(1);
    expect(result.skipped).toBe(5);
  });

  it('欠けた任意項目を既定値で埋める', () => {
    const result = parseLog([{ t: '2026-08-18T10:00:00.000Z', verdict: 'block', score: 0.9 }]);
    expect(result.entries[0]).toMatchObject({ reasons: [], form: 'form', path: '', hard: false });
  });

  it('スコアを 0〜1 に丸める', () => {
    const result = parseLog([entry({ score: 5 }), entry({ score: -2 })]);
    expect(result.entries.map((item) => item.score)).toEqual([1, 0]);
  });

  it('時刻の昇順に並べ替える', () => {
    const result = parseLog([
      entry({ t: '2026-08-19T00:00:00.000Z' }),
      entry({ t: '2026-08-17T00:00:00.000Z' }),
      entry({ t: '2026-08-18T00:00:00.000Z' }),
    ]);
    expect(result.entries.map((item) => item.t.slice(8, 10))).toEqual(['17', '18', '19']);
  });

  it('reasons の非文字列要素を除去する', () => {
    const result = parseLog([{ ...entry(), reasons: ['理由', 1, null, '別の理由'] }]);
    expect(result.entries[0]?.reasons).toEqual(['理由', '別の理由']);
  });
});

describe('summarize', () => {
  it('空のログでも 0 を返す（NaN にしない）', () => {
    const summary = summarize([]);
    expect(summary).toMatchObject({ total: 0, blockRate: 0, flaggedRate: 0, averageScore: 0 });
    expect(summary.days).toBe(1);
    expect(summary.firstAt).toBeNull();
  });

  it('判定ごとの件数と比率を出す', () => {
    const summary = summarize([
      entry({ verdict: 'pass', score: 0.1 }),
      entry({ verdict: 'block', score: 0.9 }),
      entry({ verdict: 'review', score: 0.5 }),
      entry({ verdict: 'block', score: 0.7 }),
    ]);
    expect(summary.counts).toEqual({ pass: 1, review: 1, block: 2 });
    expect(summary.blockRate).toBe(0.5);
    expect(summary.flaggedRate).toBe(0.75);
    expect(summary.averageScore).toBeCloseTo(0.55, 5);
  });

  it('観測期間の日数を数える', () => {
    const summary = summarize([
      entry({ t: '2026-08-01T00:00:00.000Z' }),
      entry({ t: '2026-08-08T00:00:00.000Z' }),
    ]);
    expect(summary.days).toBe(7);
  });
});

describe('byDay', () => {
  it('記録のない日も 0 件として埋める', () => {
    const buckets = byDay([
      entry({ t: '2026-08-10T03:00:00.000Z', verdict: 'block' }),
      entry({ t: '2026-08-13T03:00:00.000Z', verdict: 'pass' }),
    ]);
    expect(buckets).toHaveLength(4);
    expect(buckets[1]?.total).toBe(0);
    expect(buckets[0]?.counts.block).toBe(1);
    expect(buckets[3]?.counts.pass).toBe(1);
  });

  it('空のログでは空配列を返す', () => {
    expect(byDay([])).toEqual([]);
  });
});

describe('topReasons / topPaths', () => {
  it('理由を括弧の前で丸めて集約する', () => {
    const ranked = topReasons([
      entry({ reasons: ['営業文面に典型的な表現が含まれている（営業スコア 62 / ...）'] }),
      entry({ reasons: ['営業文面に典型的な表現が含まれている（営業スコア 20 / ...）'] }),
      entry({ reasons: ['表示から送信までが短すぎる（200ms）'] }),
    ]);
    expect(ranked[0]).toEqual({ label: '営業文面に典型的な表現が含まれている', count: 2 });
    expect(ranked).toHaveLength(2);
  });

  it('件数の多い順に並べ、上限で切る', () => {
    const entries = [
      ...Array.from({ length: 3 }, () => entry({ reasons: ['A'] })),
      ...Array.from({ length: 5 }, () => entry({ reasons: ['B'] })),
      entry({ reasons: ['C'] }),
    ];
    expect(topReasons(entries, 2)).toEqual([
      { label: 'B', count: 5 },
      { label: 'A', count: 3 },
    ]);
  });

  it('pass はページ集計に含めない（問題のあった送信だけを見る）', () => {
    const ranked = topPaths([
      entry({ verdict: 'pass', path: '/a' }),
      entry({ verdict: 'block', path: '/b' }),
      entry({ verdict: 'review', path: '/b' }),
    ]);
    expect(ranked).toEqual([{ label: '/b (contact)', count: 2 }]);
  });
});

describe('scoreHistogram', () => {
  it('指定数のビンを返し、境界値を正しい側に入れる', () => {
    const bins = scoreHistogram(
      [entry({ score: 0 }), entry({ score: 0.1 }), entry({ score: 0.99 }), entry({ score: 1 })],
      10,
    );
    expect(bins).toHaveLength(10);
    expect(bins[0]?.count).toBe(1);
    expect(bins[1]?.count).toBe(1);
    // 1.0 は最終ビンに含める（範囲外にこぼさない）
    expect(bins[9]?.count).toBe(2);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(4);
  });
});

describe('simulateThresholds', () => {
  const logged = [
    entry({ verdict: 'pass', score: 0.2 }),
    entry({ verdict: 'review', score: 0.5 }),
    entry({ verdict: 'block', score: 0.8 }),
  ];

  it('記録時と同じしきい値なら判定が変わらない', () => {
    const simulation = simulateThresholds(logged, 0.4, 0.62);
    expect(simulation.counts).toEqual({ pass: 1, review: 1, block: 1 });
    expect(simulation.changed).toBe(0);
  });

  it('しきい値を下げると block が増え、変化件数を報告する', () => {
    const simulation = simulateThresholds(logged, 0.15, 0.45);
    expect(simulation.counts).toEqual({ pass: 0, review: 1, block: 2 });
    expect(simulation.changed).toBe(2);
  });

  it('しきい値を上げると通過が増える', () => {
    const simulation = simulateThresholds(logged, 0.85, 0.95);
    expect(simulation.counts).toEqual({ pass: 3, review: 0, block: 0 });
    expect(simulation.changed).toBe(2);
  });

  it('即時ブロックはどのしきい値でも block のまま', () => {
    const simulation = simulateThresholds(
      [entry({ verdict: 'block', score: 0.12, hard: true })],
      0.9,
      0.99,
    );
    expect(simulation.counts.block).toBe(1);
    expect(simulation.changed).toBe(0);
  });

  it('空のログでも落ちない', () => {
    expect(simulateThresholds([], 0.4, 0.62).counts).toEqual({ pass: 0, review: 0, block: 0 });
  });
});
