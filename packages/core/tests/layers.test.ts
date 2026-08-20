import { describe, expect, it } from 'vitest';
import { evaluateHoneypot } from '../src/honeypot';
import { evaluateBehavior, evaluateMimicry } from '../src/behavior';
import { evaluateEnvironment } from '../src/environment';
import { evaluateCheckbox } from '../src/checkbox';
import { defaultWeights } from '../src/patterns.data';
import type { LayerResult } from '../src/types';
import {
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

const codes = (result: LayerResult): string[] => result.signals.map((signal) => signal.code);
const behaviorConfig = defaultWeights.layers.behavior;
const mimicryConfig = defaultWeights.layers.mimicry;
const environmentConfig = defaultWeights.layers.environment;
const checkboxConfig = defaultWeights.layers.checkbox;

describe('Layer 1: ハニーポット', () => {
  it('計測値がなければ判定対象外になる', () => {
    const result = evaluateHoneypot(undefined);
    expect(result.applicable).toBe(false);
    expect(result.signals).toHaveLength(0);
  });

  it('空のままならシグナルを出さない', () => {
    expect(codes(evaluateHoneypot(cleanHoneypot()))).toEqual([]);
  });

  it('隠しフィールドが埋まっていれば検知する', () => {
    const result = evaluateHoneypot(trippedHoneypot());
    expect(codes(result)).toContain('honeypot.filled');
    expect(codes(result)).toContain('honeypot.decoyChecked');
    expect(result.signals[0]?.detail).toContain('mb_website');
  });

  it('空白だけの入力は検知しない', () => {
    const input = cleanHoneypot();
    input.fields[0]!.value = '   ';
    expect(codes(evaluateHoneypot(input))).toEqual([]);
  });

  it('注入したフィールドが消されていれば検知する', () => {
    const result = evaluateHoneypot({ ...cleanHoneypot(), fields: [], expectedFieldCount: 2 });
    expect(codes(result)).toContain('honeypot.fieldMissing');
  });

  it('トークンの欠落と改ざんを区別する', () => {
    expect(
      codes(evaluateHoneypot({ ...cleanHoneypot(), token: { present: false, valid: false } })),
    ).toContain('honeypot.tokenMissing');
    expect(
      codes(evaluateHoneypot({ ...cleanHoneypot(), token: { present: true, valid: false } })),
    ).toContain('honeypot.tokenTampered');
  });
});

describe('Layer 2: 行動解析', () => {
  it('人間らしい操作ではシグナルを出さない', () => {
    const result = evaluateBehavior(humanBehavior(), behaviorConfig);
    expect(codes(result)).toEqual([]);
    expect(result.metrics.elapsedMs).toBe(62_000);
  });

  it('操作なしの即時送信を検知する', () => {
    const result = evaluateBehavior(naiveBotBehavior(), behaviorConfig);
    expect(codes(result)).toContain('behavior.instantSubmit');
    expect(codes(result)).toContain('behavior.noMouseActivity');
    expect(codes(result)).toContain('behavior.noFocusEvents');
    expect(codes(result)).toContain('behavior.noKeystrokes');
  });

  it('送信までの時間が短いほど強度が上がる', () => {
    const at = (elapsed: number) =>
      evaluateBehavior({ ...humanBehavior(), submittedAt: T0 + elapsed }, behaviorConfig);
    const fast = at(3_000).signals.find((signal) => signal.code === 'behavior.fastSubmit');
    const faster = at(1_800).signals.find((signal) => signal.code === 'behavior.fastSubmit');
    expect(fast?.intensity).toBeGreaterThan(0);
    expect(faster?.intensity).toBeGreaterThan(fast!.intensity!);
  });

  it('instantSubmit と fastSubmit を二重には数えない', () => {
    const result = evaluateBehavior({ ...humanBehavior(), submittedAt: T0 + 200 }, behaviorConfig);
    expect(codes(result)).toContain('behavior.instantSubmit');
    expect(codes(result)).not.toContain('behavior.fastSubmit');
  });

  it('人間には不可能な入力速度を検知する', () => {
    // 400 文字を 2.4 秒で入力（= 約 1 万文字/分）。
    const keys = Array.from({ length: 60 }, (_, index) => ({ t: T0 + 1_000 + index * 40 }));
    const result = evaluateBehavior(
      { ...humanBehavior(), keys, typedChars: 400, submittedAt: T0 + 8_000 },
      behaviorConfig,
    );
    expect(codes(result)).toContain('behavior.impossibleTypingSpeed');
  });

  it('貼り付けは検知するが、貼り付け分は打鍵速度から除外する', () => {
    const base = humanBehavior();
    const result = evaluateBehavior(
      {
        ...base,
        pastes: [{ field: 'message', t: T0 + 5_000, length: 800 }],
        typedChars: base.typedChars + 800,
      },
      behaviorConfig,
    );
    expect(codes(result)).toContain('behavior.pastedBody');
    expect(codes(result)).not.toContain('behavior.impossibleTypingSpeed');
  });

  it('長時間放置されたフォームを弱いシグナルにする', () => {
    const result = evaluateBehavior(
      { ...humanBehavior(), submittedAt: T0 + 20_000_000 },
      behaviorConfig,
    );
    expect(codes(result)).toContain('behavior.staleForm');
  });

  it('タッチ操作しかない端末をマウス無しとして誤検知しない', () => {
    const result = evaluateBehavior(
      { ...humanBehavior(), pointer: [], touchEventCount: 4 },
      behaviorConfig,
    );
    expect(codes(result)).not.toContain('behavior.noMouseActivity');
  });
});

describe('Layer 2.6: 不自然な自然さ', () => {
  it('人間らしい軌跡と打鍵ではシグナルを出さない', () => {
    const result = evaluateMimicry(humanBehavior(), mimicryConfig);
    expect(codes(result)).toEqual([]);
    expect(result.applicable).toBe(true);
  });

  it('シードを変えても人間らしい操作は誤検知しない', () => {
    for (const seed of [1, 7, 42, 1234, 99991]) {
      const result = evaluateMimicry(humanBehavior({ seed }), mimicryConfig);
      expect(codes(result), `seed=${seed}`).toEqual([]);
    }
  });

  it('等速・直線・等間隔の模倣操作を検知する', () => {
    const result = evaluateMimicry(mimicBehavior(), mimicryConfig);
    expect(codes(result)).toContain('mimicry.uniformMouseSpeed');
    expect(codes(result)).toContain('mimicry.straightMousePath');
    expect(codes(result)).toContain('mimicry.noJitter');
    expect(codes(result)).toContain('mimicry.uniformKeyIntervals');
    expect(codes(result)).toContain('mimicry.quantizedKeyIntervals');
    expect(codes(result)).toContain('mimicry.uniformFieldTransitions');
  });

  it('サンプルが少なすぎるときは判定対象外にする', () => {
    const result = evaluateMimicry(naiveBotBehavior(), mimicryConfig);
    expect(result.applicable).toBe(false);
    expect(result.skipped).toBeTruthy();
  });

  it('ポインタだけ十分にあれば打鍵が無くても判定する', () => {
    const base = mimicBehavior();
    const result = evaluateMimicry({ ...base, keys: [], focus: [] }, mimicryConfig);
    expect(result.applicable).toBe(true);
    expect(codes(result)).toContain('mimicry.uniformMouseSpeed');
    expect(codes(result)).not.toContain('mimicry.uniformKeyIntervals');
  });
});

describe('Layer 2.5: 実行環境', () => {
  it('通常のブラウザではシグナルを出さない', () => {
    expect(codes(evaluateEnvironment(humanEnvironment(), environmentConfig))).toEqual([]);
  });

  it('headless ブラウザの痕跡をまとめて検知する', () => {
    const result = evaluateEnvironment(headlessEnvironment(), environmentConfig);
    expect(codes(result)).toContain('env.webdriver');
    expect(codes(result)).toContain('env.headlessUserAgent');
    expect(codes(result)).toContain('env.noPlugins');
    expect(codes(result)).toContain('env.chromeObjectMissing');
    expect(codes(result)).toContain('env.noLanguages');
    expect(codes(result)).toContain('env.viewportEqualsScreen');
    expect(codes(result)).toContain('env.zeroOuterWindow');
    expect(codes(result)).toContain('env.permissionsInconsistency');
  });

  it('HTTP クライアントの User-Agent を検知する', () => {
    const result = evaluateEnvironment({ userAgent: 'python-requests/2.32.3' }, environmentConfig);
    expect(codes(result)).toContain('env.botUserAgent');
  });

  it('"bot" を含む端末名を bot と誤判定しない', () => {
    const result = evaluateEnvironment(
      {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Cubot Note 40) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
        maxTouchPoints: 5,
        isChromium: true,
        hasChromeObject: true,
        languages: ['ja'],
      },
      environmentConfig,
    );
    expect(codes(result)).not.toContain('env.botUserAgent');
  });

  it('iOS Safari のプラグイン 0 件を誤検知しない', () => {
    const result = evaluateEnvironment(
      {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        pluginCount: 0,
        isChromium: false,
        languages: ['ja-JP'],
        maxTouchPoints: 5,
      },
      environmentConfig,
    );
    expect(codes(result)).toEqual([]);
  });

  it('モバイル UA なのにタッチ非対応という矛盾を検知する', () => {
    const result = evaluateEnvironment(
      {
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
        maxTouchPoints: 0,
        isChromium: true,
        hasChromeObject: true,
        languages: ['ja'],
      },
      environmentConfig,
    );
    expect(codes(result)).toContain('env.touchInconsistency');
  });
});

describe('Layer 3: チェックボックス', () => {
  it('UI が無効なら判定対象外', () => {
    const result = evaluateCheckbox({ present: false, checked: false, renderedAt: T0 });
    expect(result.applicable).toBe(false);
  });

  it('人間のチェックではシグナルを出さない', () => {
    expect(codes(evaluateCheckbox(humanCheckbox(), checkboxConfig))).toEqual([]);
  });

  it('未チェックを検知する', () => {
    const result = evaluateCheckbox(
      { ...humanCheckbox(), checked: false, checkedAt: null },
      checkboxConfig,
    );
    expect(codes(result)).toEqual(['checkbox.unchecked']);
  });

  it('スクリプトによるクリックを検知する', () => {
    const result = evaluateCheckbox(scriptedCheckbox(), checkboxConfig);
    expect(codes(result)).toContain('checkbox.programmaticCheck');
    expect(codes(result)).toContain('checkbox.instantCheck');
    expect(codes(result)).toContain('checkbox.noPointerTrail');
  });

  it('切り替えが多すぎる場合を検知する', () => {
    const result = evaluateCheckbox({ ...humanCheckbox(), toggleCount: 20 }, checkboxConfig);
    expect(codes(result)).toEqual(['checkbox.excessiveToggles']);
  });
});
