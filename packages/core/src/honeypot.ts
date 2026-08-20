/**
 * Layer 1: ハニーポット。
 *
 * widget が画面外／display:none の入力欄と「おとりチェックボックス」を注入する。
 * 人間の目には存在しないので、値が入っていれば DOM を機械的に埋めた証拠になる。
 * 単体で決定的な証拠なので、weights.json の hardBlock に載せて即ブロックにしている。
 */
import type { HoneypotInput, LayerResult, Signal } from './types';

export const evaluateHoneypot = (input: HoneypotInput | undefined): LayerResult => {
  if (!input) {
    return {
      layer: 'honeypot',
      applicable: false,
      signals: [],
      metrics: {},
      skipped: 'ハニーポットの計測値がない',
    };
  }

  const signals: Signal[] = [];
  const filled = input.fields.filter((field) => field.value.trim().length > 0);
  const checkedDecoys = (input.decoys ?? []).filter((decoy) => decoy.checked);

  if (filled.length > 0) {
    signals.push({
      code: 'honeypot.filled',
      detail: `隠しフィールドに入力あり: ${filled.map((field) => field.name).join(', ')}`,
    });
  }

  if (checkedDecoys.length > 0) {
    signals.push({
      code: 'honeypot.decoyChecked',
      detail: `おとりチェックボックスがオン: ${checkedDecoys.map((decoy) => decoy.name).join(', ')}`,
    });
  }

  // 隠しフィールドごと消してから submit する実装（DOM を作り直す自動化）を捕まえる。
  if (
    typeof input.expectedFieldCount === 'number' &&
    input.fields.length < input.expectedFieldCount
  ) {
    signals.push({
      code: 'honeypot.fieldMissing',
      detail: `注入 ${input.expectedFieldCount} 件に対し送信時 ${input.fields.length} 件`,
    });
  }

  if (input.token) {
    if (!input.token.present) {
      signals.push({ code: 'honeypot.tokenMissing' });
    } else if (!input.token.valid) {
      signals.push({ code: 'honeypot.tokenTampered' });
    }
  }

  return {
    layer: 'honeypot',
    applicable: true,
    signals,
    metrics: {
      fieldCount: input.fields.length,
      filledCount: filled.length,
      decoyCount: (input.decoys ?? []).length,
      checkedDecoyCount: checkedDecoys.length,
      tokenPresent: input.token?.present ?? null,
      tokenValid: input.token?.valid ?? null,
    },
  };
};
