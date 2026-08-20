/**
 * 統合スコアリング。
 *
 * 設計の要点:
 * - 各レイヤーは「シグナル」を出すだけで、点数を知らない。配点は weights.json に集約する。
 * - レイヤーは 2 つのグループに分かれる。
 *     automation … これは機械が送っているか？（Layer 1, 2, 2.5, 2.6, 3）
 *     sales      … これは営業・勧誘の文面か？（Layer 4, 6）
 *   この 2 つは独立した疑いなので、7 レイヤーをまとめて平均すると互いを薄めてしまう。
 *   （人が手打ちした営業メールは automation 側がすべて無反応になるため、平均では埋もれる。）
 *   そこでグループ内は加重平均、グループ間は noisy-or で合成し、
 *   どちらか一方だけでもしきい値に到達できるようにしている。
 * - 判定できなかったレイヤーは加重平均の母数から外す。母数を固定にすると、モバイルで
 *   ポインタ軌跡が取れないだけでスコアが動いてしまう。
 * - 結果には必ず内訳（グループ別・レイヤー別・シグナル別の加点と生の計測値）を載せる。
 *   しきい値をコミュニティで調整する前提のライブラリなので、理由が読めないと育てられない。
 */
import type {
  AnalysisResult,
  GroupId,
  LayerId,
  LayerResult,
  ScoredGroup,
  ScoredLayer,
  ScoredSignal,
  VerdictLevel,
  WeightConfig,
} from './types';
import { signalLabel } from './signals';
import { clamp01, round } from './util';

const DEFAULT_LAYER_LABELS: Record<LayerId, string> = {
  honeypot: 'Layer 1 ハニーポット',
  behavior: 'Layer 2 行動解析',
  environment: 'Layer 2.5 自動化ブラウザの痕跡',
  mimicry: 'Layer 2.6 不自然な自然さ',
  checkbox: 'Layer 3 チェックボックス認証',
  content: 'Layer 4 営業文面判定',
  aiText: 'Layer 6 AI生成文っぽさ',
};

const DEFAULT_GROUP_LABELS: Record<GroupId, string> = {
  automation: '自動化・bot の疑い',
  sales: '営業・勧誘目的の疑い',
};

const GROUP_ORDER: GroupId[] = ['automation', 'sales'];

export const decideVerdict = (
  score: number,
  thresholds: { review: number; block: number },
  hardBlocked = false,
): VerdictLevel => {
  if (hardBlocked) return 'block';
  if (score >= thresholds.block) return 'block';
  if (score >= thresholds.review) return 'review';
  return 'pass';
};

export const scoreLayers = (
  results: readonly LayerResult[],
  weights: WeightConfig,
): AnalysisResult => {
  const warnings: string[] = [];
  const hardBlockCodes = new Set(weights.hardBlock ?? []);
  const layers: ScoredLayer[] = [];
  const accumulator = new Map<GroupId, { weighted: number; weight: number }>();
  let hardBlocked = false;

  for (const result of results) {
    const config = weights.layers[result.layer];
    if (!config) {
      warnings.push(`weights.json に layers.${result.layer} の定義がありません`);
    }
    const points = config?.points ?? {};
    const saturation = config?.saturation ?? 1;
    const weight = config?.weight ?? 0;
    const group: GroupId = config?.group ?? 'automation';

    const signals: ScoredSignal[] = result.signals.map((signal) => {
      const intensity = clamp01(signal.intensity ?? 1);
      const unitPoints = points[signal.code];
      if (unitPoints === undefined) {
        warnings.push(
          `weights.json に layers.${result.layer}.points["${signal.code}"] がありません`,
        );
      }
      if (hardBlockCodes.has(signal.code)) hardBlocked = true;
      return {
        code: signal.code,
        intensity: round(intensity),
        points: round((unitPoints ?? 0) * intensity),
        label: signalLabel(signal.code),
        ...(signal.detail ? { detail: signal.detail } : {}),
      };
    });

    const layerPoints = signals.reduce((sum, signal) => sum + signal.points, 0);
    const layerScore = clamp01(layerPoints / saturation);

    // evidenceOnly のレイヤーは、無反応なら母数に入れない（沈黙を無罪の証拠にしない）。
    const counted =
      result.applicable && weight > 0 && (config?.evidenceOnly !== true || layerPoints > 0);

    if (counted) {
      const bucket = accumulator.get(group) ?? { weighted: 0, weight: 0 };
      bucket.weighted += layerScore * weight;
      bucket.weight += weight;
      accumulator.set(group, bucket);
    }

    layers.push({
      layer: result.layer,
      label: config?.label ?? DEFAULT_LAYER_LABELS[result.layer] ?? result.layer,
      group,
      weight,
      applicable: result.applicable,
      counted,
      score: round(layerScore),
      points: round(layerPoints),
      saturation,
      signals,
      metrics: result.metrics,
      ...(result.skipped ? { skipped: result.skipped } : {}),
    });
  }

  const groupIds = [...new Set<GroupId>([...GROUP_ORDER, ...layers.map((layer) => layer.group)])];
  const groups: ScoredGroup[] = groupIds.map((group) => {
    const bucket = accumulator.get(group);
    const config = weights.groups?.[group];
    return {
      group,
      label: config?.label ?? DEFAULT_GROUP_LABELS[group] ?? group,
      weight: config?.weight ?? 1,
      score: bucket && bucket.weight > 0 ? round(bucket.weighted / bucket.weight) : 0,
      applicable: Boolean(bucket && bucket.weight > 0),
    };
  });

  const active = groups.filter((group) => group.applicable);
  let score = 0;
  if (active.length > 0) {
    if ((weights.combine ?? 'noisy-or') === 'weighted-mean') {
      const weightTotal = active.reduce((sum, group) => sum + group.weight, 0);
      score =
        weightTotal > 0
          ? active.reduce((sum, group) => sum + group.score * group.weight, 0) / weightTotal
          : 0;
    } else {
      // noisy-or: それぞれの疑いが独立だと仮定して「少なくとも一方が真」の確率をとる。
      score =
        1 -
        active.reduce((product, group) => product * (1 - clamp01(group.score * group.weight)), 1);
    }
  }
  score = round(clamp01(score));

  const verdict = decideVerdict(score, weights.thresholds, hardBlocked);

  // 説明は「加点の大きい順」。ただしハードブロックの根拠は必ず先頭に置く。
  const scored = layers
    .filter((layer) => layer.applicable)
    .flatMap((layer) => layer.signals)
    .filter((signal) => signal.points > 0 || hardBlockCodes.has(signal.code));
  const reasons = [
    ...scored.filter((signal) => hardBlockCodes.has(signal.code)),
    ...scored
      .filter((signal) => !hardBlockCodes.has(signal.code))
      .sort((a, b) => b.points - a.points),
  ]
    .slice(0, 6)
    .map((signal) => (signal.detail ? `${signal.label}（${signal.detail}）` : signal.label));

  return {
    score,
    groups,
    verdict,
    hardBlocked,
    thresholds: weights.thresholds,
    layers,
    reasons,
    warnings: [...new Set(warnings)],
  };
};
