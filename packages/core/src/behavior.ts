/**
 * Layer 2: 行動解析（人間らしさスコアリング）
 * Layer 2.6: 「不自然な自然さ」検知
 *
 * Layer 2 は「操作が足りない／速すぎる」ことを見る。ここは素朴な bot が引っかかる。
 * Layer 2.6 は逆に「操作を模倣しているが、揺らぎの質が人間と違う」ことを見る。
 * 人間の手の動きやタイピング間隔は大きくばらつくが、生成された軌跡・待ち時間は
 * 均一（あるいは特定の値に量子化）されやすい、という差を統計量で拾う。
 */
import type { BehaviorInput, LayerResult, LayerWeightConfig, Signal } from './types';
import {
  aboveCeiling,
  belowFloor,
  clamp01,
  coefficientOfVariation,
  diffs,
  median,
  modeRatio,
  round,
} from './util';
import { tuneNumber } from './util';

const distance = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(bx - ax, by - ay);

/** ポインタ軌跡の全長。 */
const pathLength = (samples: readonly { x: number; y: number }[]): number => {
  let total = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const previous = samples[i - 1];
    const current = samples[i];
    if (!previous || !current) continue;
    total += distance(previous.x, previous.y, current.x, current.y);
  }
  return total;
};

/** 隣接 3 点を結ぶ直線から中央の点がどれだけ外れているか（局所的な揺れの大きさ）。 */
const localDeviations = (samples: readonly { x: number; y: number }[]): number[] => {
  const result: number[] = [];
  for (let i = 1; i < samples.length - 1; i += 1) {
    const previous = samples[i - 1];
    const current = samples[i];
    const next = samples[i + 1];
    if (!previous || !current || !next) continue;
    const baseLength = distance(previous.x, previous.y, next.x, next.y);
    if (baseLength === 0) continue;
    const cross = Math.abs(
      (next.x - previous.x) * (previous.y - current.y) -
        (previous.x - current.x) * (next.y - previous.y),
    );
    result.push(cross / baseLength);
  }
  return result;
};

const stepDistances = (samples: readonly { x: number; y: number }[]): number[] => {
  const result: number[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    const previous = samples[i - 1];
    const current = samples[i];
    if (!previous || !current) continue;
    result.push(distance(previous.x, previous.y, current.x, current.y));
  }
  return result;
};

const pointerSpeeds = (samples: readonly { x: number; y: number; t: number }[]): number[] => {
  const result: number[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    const previous = samples[i - 1];
    const current = samples[i];
    if (!previous || !current) continue;
    const dt = current.t - previous.t;
    if (dt <= 0) continue;
    result.push(distance(previous.x, previous.y, current.x, current.y) / dt);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Layer 2
// ---------------------------------------------------------------------------

export const evaluateBehavior = (
  input: BehaviorInput | undefined,
  config?: LayerWeightConfig,
): LayerResult => {
  if (!input) {
    return {
      layer: 'behavior',
      applicable: false,
      signals: [],
      metrics: {},
      skipped: '行動の計測値がない',
    };
  }

  const tuning = config?.tuning;
  const instantSubmitMs = tuneNumber(tuning, 'instantSubmitMs', 1500);
  const fastSubmitMs = tuneNumber(tuning, 'fastSubmitMs', 5000);
  const staleFormMs = tuneNumber(tuning, 'staleFormMs', 7_200_000);
  const maxCharsPerMinute = tuneNumber(tuning, 'maxPlausibleCharsPerMinute', 1200);
  const minMouseSamples = tuneNumber(tuning, 'minMouseSamples', 3);
  const pastedCharsThreshold = tuneNumber(tuning, 'pastedCharsThreshold', 120);

  const signals: Signal[] = [];
  const elapsedMs = Math.max(0, input.submittedAt - input.renderedAt);
  const pastedChars = input.pastes.reduce((sum, paste) => sum + paste.length, 0);
  const touchCount = input.touchEventCount ?? 0;
  const keyTimes = input.keys.map((key) => key.t).sort((a, b) => a - b);

  if (elapsedMs < instantSubmitMs) {
    signals.push({
      code: 'behavior.instantSubmit',
      intensity: belowFloor(elapsedMs, instantSubmitMs),
      detail: `表示から送信まで ${elapsedMs}ms`,
    });
  } else if (elapsedMs < fastSubmitMs) {
    signals.push({
      code: 'behavior.fastSubmit',
      intensity: belowFloor(elapsedMs, fastSubmitMs),
      detail: `表示から送信まで ${elapsedMs}ms`,
    });
  } else if (elapsedMs > staleFormMs) {
    // 放置されたタブからの送信。単体では弱いが、他のシグナルと重なると効く。
    signals.push({
      code: 'behavior.staleForm',
      intensity: clamp01((elapsedMs - staleFormMs) / staleFormMs),
      detail: `表示から送信まで ${Math.round(elapsedMs / 60000)} 分`,
    });
  }

  if (input.pointer.length < minMouseSamples && touchCount === 0) {
    signals.push({
      code: 'behavior.noMouseActivity',
      intensity: belowFloor(input.pointer.length, minMouseSamples),
      detail: `ポインタ観測 ${input.pointer.length} 件 / タッチ ${touchCount} 件`,
    });
  }

  if (input.focus.length === 0) {
    signals.push({ code: 'behavior.noFocusEvents' });
  }

  if (input.typedChars > 0 && keyTimes.length === 0 && pastedChars === 0) {
    // 入力欄に値はあるのに、キー入力も貼り付けも観測されていない = value を直接代入した。
    signals.push({ code: 'behavior.noKeystrokes' });
  }

  // 貼り付け分を除いた「手打ち文字数」で速度を見る。
  const typedByHand = Math.max(0, input.typedChars - pastedChars);
  const typingWindowMs =
    keyTimes.length >= 2 ? (keyTimes[keyTimes.length - 1] ?? 0) - (keyTimes[0] ?? 0) : 0;
  let charsPerMinute: number | null = null;
  if (keyTimes.length >= 5 && typingWindowMs >= 200) {
    charsPerMinute = typedByHand / (typingWindowMs / 60000);
    if (charsPerMinute > maxCharsPerMinute) {
      signals.push({
        code: 'behavior.impossibleTypingSpeed',
        intensity: aboveCeiling(charsPerMinute, maxCharsPerMinute, maxCharsPerMinute * 3),
        detail: `${Math.round(charsPerMinute)} 文字/分`,
      });
    }
  }

  if (pastedChars >= pastedCharsThreshold) {
    signals.push({
      code: 'behavior.pastedBody',
      intensity: aboveCeiling(pastedChars, pastedCharsThreshold, pastedCharsThreshold * 4),
      detail: `貼り付け ${pastedChars} 文字`,
    });
  }

  return {
    layer: 'behavior',
    applicable: true,
    signals,
    metrics: {
      elapsedMs,
      pointerSamples: input.pointer.length,
      touchEventCount: touchCount,
      keyCount: keyTimes.length,
      focusCount: input.focus.length,
      typedChars: input.typedChars,
      pastedChars,
      charsPerMinute: charsPerMinute === null ? null : round(charsPerMinute, 1),
    },
  };
};

// ---------------------------------------------------------------------------
// Layer 2.6
// ---------------------------------------------------------------------------

export const evaluateMimicry = (
  input: BehaviorInput | undefined,
  config?: LayerWeightConfig,
): LayerResult => {
  if (!input) {
    return {
      layer: 'mimicry',
      applicable: false,
      signals: [],
      metrics: {},
      skipped: '行動の計測値がない',
    };
  }

  const tuning = config?.tuning;
  const minMouseSamples = tuneNumber(tuning, 'minMouseSamples', 12);
  const minKeyIntervals = tuneNumber(tuning, 'minKeyIntervals', 8);
  const minFieldTransitions = tuneNumber(tuning, 'minFieldTransitions', 3);
  const mouseSpeedCvFloor = tuneNumber(tuning, 'mouseSpeedCvFloor', 0.18);
  const keyIntervalCvFloor = tuneNumber(tuning, 'keyIntervalCvFloor', 0.22);
  const fieldTransitionCvFloor = tuneNumber(tuning, 'fieldTransitionCvFloor', 0.12);
  const straightnessCeiling = tuneNumber(tuning, 'straightnessCeiling', 0.985);
  const quantizedRatioCeiling = tuneNumber(tuning, 'quantizedRatioCeiling', 0.6);
  const jitterFloorPx = tuneNumber(tuning, 'jitterFloorPx', 0.75);

  const signals: Signal[] = [];
  const metrics: Record<string, number | string | boolean | null> = {};

  const pointer = [...input.pointer].sort((a, b) => a.t - b.t);
  const analysablePointer = pointer.length >= minMouseSamples;

  if (analysablePointer) {
    const speeds = pointerSpeeds(pointer);
    const speedCv = coefficientOfVariation(speeds);
    metrics.pointerSpeedCv = round(speedCv);
    if (speeds.length >= 3 && speedCv < mouseSpeedCvFloor) {
      signals.push({
        code: 'mimicry.uniformMouseSpeed',
        intensity: belowFloor(speedCv, mouseSpeedCvFloor),
        detail: `速度の変動係数 ${round(speedCv)}`,
      });
    }

    const first = pointer[0];
    const last = pointer[pointer.length - 1];
    const total = pathLength(pointer);
    const straightness =
      first && last && total > 0 ? distance(first.x, first.y, last.x, last.y) / total : 0;
    metrics.straightness = round(straightness);
    if (total > 0 && straightness > straightnessCeiling) {
      signals.push({
        code: 'mimicry.straightMousePath',
        intensity: aboveCeiling(straightness, straightnessCeiling),
        detail: `直線度 ${round(straightness)}`,
      });
    }

    const steps = stepDistances(pointer).filter((step) => step > 0);
    const stepModeRatio = modeRatio(steps, 1);
    metrics.stepModeRatio = round(stepModeRatio);
    if (steps.length >= 5 && stepModeRatio > quantizedRatioCeiling) {
      signals.push({
        code: 'mimicry.quantizedMouseSteps',
        intensity: aboveCeiling(stepModeRatio, quantizedRatioCeiling),
        detail: `同一移動量の比率 ${round(stepModeRatio)}`,
      });
    }

    const jitter = median(localDeviations(pointer));
    metrics.jitterPx = round(jitter);
    if (jitter < jitterFloorPx) {
      signals.push({
        code: 'mimicry.noJitter',
        intensity: belowFloor(jitter, jitterFloorPx),
        detail: `局所的な揺れの中央値 ${round(jitter)}px`,
      });
    }
  }

  const keyTimes = input.keys.map((key) => key.t).sort((a, b) => a - b);
  const keyIntervals = diffs(keyTimes).filter((interval) => interval >= 0);
  const analysableKeys = keyIntervals.length >= minKeyIntervals;

  if (analysableKeys) {
    const keyCv = coefficientOfVariation(keyIntervals);
    metrics.keyIntervalCv = round(keyCv);
    metrics.keyIntervalMedianMs = round(median(keyIntervals), 1);
    if (keyCv < keyIntervalCvFloor) {
      signals.push({
        code: 'mimicry.uniformKeyIntervals',
        intensity: belowFloor(keyCv, keyIntervalCvFloor),
        detail: `打鍵間隔の変動係数 ${round(keyCv)}`,
      });
    }

    // 5ms バケットに丸めて最頻値が支配的なら、待ち時間が定数で作られている。
    const keyModeRatio = modeRatio(keyIntervals, 5);
    metrics.keyIntervalModeRatio = round(keyModeRatio);
    if (keyModeRatio > quantizedRatioCeiling) {
      signals.push({
        code: 'mimicry.quantizedKeyIntervals',
        intensity: aboveCeiling(keyModeRatio, quantizedRatioCeiling),
        detail: `同一打鍵間隔の比率 ${round(keyModeRatio)}`,
      });
    }
  }

  const focusTimes = input.focus.map((focus) => focus.t).sort((a, b) => a - b);
  const transitions = diffs(focusTimes).filter((interval) => interval >= 0);
  const analysableFocus = transitions.length >= minFieldTransitions;

  if (analysableFocus) {
    const transitionCv = coefficientOfVariation(transitions);
    metrics.fieldTransitionCv = round(transitionCv);
    if (transitionCv < fieldTransitionCvFloor) {
      signals.push({
        code: 'mimicry.uniformFieldTransitions',
        intensity: belowFloor(transitionCv, fieldTransitionCvFloor),
        detail: `欄移動間隔の変動係数 ${round(transitionCv)}`,
      });
    }
  }

  const applicable = analysablePointer || analysableKeys || analysableFocus;

  return {
    layer: 'mimicry',
    applicable,
    signals,
    metrics: {
      ...metrics,
      pointerSamples: pointer.length,
      keyIntervals: keyIntervals.length,
      fieldTransitions: transitions.length,
    },
    ...(applicable ? {} : { skipped: '統計判定に足るサンプル数がない' }),
  };
};
