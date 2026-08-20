/**
 * 校正表の出力。docs/how-it-works.md のスコア表がずれていないかを目で確認するためのもの。
 * アサーションは「代表シナリオの判定が変わっていないこと」だけに絞っている。
 */
import { describe, expect, it } from 'vitest';
import { analyze } from '../src/index';
import type { AnalysisInput, VerdictLevel } from '../src/types';
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

const human = (text: string, overrides: Partial<AnalysisInput> = {}): AnalysisInput => ({
  honeypot: cleanHoneypot(),
  behavior: humanBehavior(),
  environment: humanEnvironment(),
  checkbox: humanCheckbox(),
  content: { text, formLanguage: 'ja' },
  ...overrides,
});

const SCENARIOS: Array<{ name: string; input: AnalysisInput; expected: VerdictLevel }> = [
  { name: '正当な問い合わせ（人間・PC）', input: human(LEGIT_INQUIRY), expected: 'pass' },
  {
    name: '同・チェックボックス未チェック',
    input: human(LEGIT_INQUIRY, {
      checkbox: { ...humanCheckbox(), checked: false, checkedAt: null },
    }),
    expected: 'pass',
  },
  {
    name: '同・スマホ（ポインタ軌跡なし）',
    input: human(LEGIT_INQUIRY, {
      behavior: { ...humanBehavior(), pointer: [], touchEventCount: 6 },
    }),
    expected: 'pass',
  },
  {
    name: '同・メモから貼り付け',
    input: human(LEGIT_INQUIRY, {
      behavior: {
        ...humanBehavior(),
        pastes: [{ field: 'message', t: T0 + 9_000, length: 400 }],
        typedChars: humanBehavior().typedChars + 400,
      },
    }),
    expected: 'pass',
  },
  {
    name: 'チェックボックス UI なし・正当な問い合わせ',
    input: human(LEGIT_INQUIRY, { checkbox: { present: false, checked: false, renderedAt: T0 } }),
    expected: 'pass',
  },
  { name: '人が手打ちした営業メール', input: human(SALES_PITCH), expected: 'block' },
  { name: 'AI が書いた営業文', input: human(AI_SALES_PITCH), expected: 'block' },
  { name: '英語のスパム', input: human(ENGLISH_SPAM), expected: 'block' },
  {
    name: 'ハニーポット反応',
    input: human(LEGIT_INQUIRY, { honeypot: trippedHoneypot() }),
    expected: 'block',
  },
  {
    name: 'headless ブラウザの自動送信',
    input: {
      honeypot: cleanHoneypot(),
      behavior: naiveBotBehavior(),
      environment: headlessEnvironment(),
      checkbox: scriptedCheckbox(),
      content: { text: 'test test test test test test test' },
    },
    expected: 'block',
  },
  {
    name: '操作なしの即時送信（通常ブラウザ）',
    input: {
      honeypot: cleanHoneypot(),
      behavior: naiveBotBehavior(),
      environment: humanEnvironment(),
      checkbox: scriptedCheckbox(),
      content: { text: 'テスト送信です。動作の確認をしています。よろしくお願いします。' },
    },
    expected: 'block',
  },
  {
    name: '同・チェックボックス UI なし',
    input: {
      honeypot: cleanHoneypot(),
      behavior: naiveBotBehavior(),
      environment: humanEnvironment(),
      checkbox: { present: false, checked: false, renderedAt: T0 },
      content: { text: 'テスト送信です。動作の確認をしています。よろしくお願いします。' },
    },
    expected: 'review',
  },
  {
    name: '操作を模倣する自動化（文面は中立）',
    input: {
      honeypot: cleanHoneypot(),
      behavior: mimicBehavior(),
      environment: { ...humanEnvironment(), webdriver: true },
      checkbox: humanCheckbox(),
      content: { text: 'お問い合わせフォームのテスト送信です。動作の確認をしています。' },
    },
    expected: 'review',
  },
  {
    name: '模倣する自動化 + 営業文',
    input: {
      honeypot: cleanHoneypot(),
      behavior: mimicBehavior(),
      environment: { ...humanEnvironment(), webdriver: true },
      checkbox: humanCheckbox(),
      content: { text: SALES_PITCH },
    },
    expected: 'block',
  },
];

describe('しきい値の校正', () => {
  it('代表シナリオの判定が期待どおりである', () => {
    const rows: string[] = [];
    const failures: string[] = [];

    for (const scenario of SCENARIOS) {
      const result = analyze(scenario.input);
      const automation = result.groups.find((group) => group.group === 'automation');
      const sales = result.groups.find((group) => group.group === 'sales');
      rows.push(
        [
          scenario.name.padEnd(34, '　'),
          `total ${result.score.toFixed(2)}`,
          `automation ${automation?.applicable ? automation.score.toFixed(2) : '  — '}`,
          `sales ${sales?.applicable ? sales.score.toFixed(2) : '  — '}`,
          result.hardBlocked ? `${result.verdict}(即時)` : result.verdict,
        ].join('  '),
      );
      if (result.verdict !== scenario.expected) {
        failures.push(`${scenario.name}: expected ${scenario.expected}, got ${result.verdict}`);
      }
    }

    // 校正表として読めるように、常に出力する。
    console.log(
      [
        '',
        `しきい値: review ${analyze({}).thresholds.review} / block ${analyze({}).thresholds.block}`,
        ...rows,
        '',
      ].join('\n'),
    );

    expect(failures).toEqual([]);
  });
});
