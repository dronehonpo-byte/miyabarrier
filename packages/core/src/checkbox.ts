/**
 * Layer 3: 独自チェックボックス認証。
 *
 * 「営業目的ではありません」のチェック自体は 1 クリックで済む軽い操作だが、
 * その裏で「いつ・どうやってチェックされたか」を見る。
 * 画像認証のような追加負荷を人間に課さずに、機械的なクリックだけを弾くのが狙い。
 */
import type { CheckboxInput, LayerResult, LayerWeightConfig, Signal } from './types';
import { belowFloor, tuneNumber } from './util';

export const evaluateCheckbox = (
  input: CheckboxInput | undefined,
  config?: LayerWeightConfig,
): LayerResult => {
  if (!input || !input.present) {
    return {
      layer: 'checkbox',
      applicable: false,
      signals: [],
      metrics: {},
      skipped: input ? 'チェックボックス UI が無効' : 'チェックボックスの計測値がない',
    };
  }

  const tuning = config?.tuning;
  const instantCheckMs = tuneNumber(tuning, 'instantCheckMs', 250);
  const minPointerTrail = tuneNumber(tuning, 'minPointerTrail', 2);
  const maxToggles = tuneNumber(tuning, 'maxToggles', 6);

  const signals: Signal[] = [];
  const elapsedToCheck =
    input.checked && typeof input.checkedAt === 'number'
      ? input.checkedAt - input.renderedAt
      : null;
  const toggleCount = input.toggleCount ?? (input.checked ? 1 : 0);
  const pointerSamples = input.pointerSamplesBeforeCheck ?? 0;

  if (!input.checked) {
    signals.push({ code: 'checkbox.unchecked' });
  } else {
    // isTrusted=false は「スクリプトからの .click()」を意味する。
    if (input.trustedClick === false) {
      signals.push({ code: 'checkbox.programmaticCheck' });
    }

    if (elapsedToCheck !== null && elapsedToCheck < instantCheckMs) {
      signals.push({
        code: 'checkbox.instantCheck',
        intensity: belowFloor(Math.max(elapsedToCheck, 0), instantCheckMs),
        detail: `表示から ${Math.max(elapsedToCheck, 0)}ms でチェック`,
      });
    }

    // ポインタもタッチも一切動かないままチェックが付くのは、人間の操作ではない。
    if (pointerSamples < minPointerTrail) {
      signals.push({
        code: 'checkbox.noPointerTrail',
        intensity: belowFloor(pointerSamples, minPointerTrail),
        detail: `チェック前のポインタ／タッチ観測 ${pointerSamples} 件`,
      });
    }
  }

  if (toggleCount > maxToggles) {
    signals.push({
      code: 'checkbox.excessiveToggles',
      detail: `切り替え ${toggleCount} 回`,
    });
  }

  return {
    layer: 'checkbox',
    applicable: true,
    signals,
    metrics: {
      checked: input.checked,
      elapsedToCheckMs: elapsedToCheck,
      trustedClick: input.trustedClick ?? null,
      pointerSamplesBeforeCheck: pointerSamples,
      toggleCount,
    },
  };
};
