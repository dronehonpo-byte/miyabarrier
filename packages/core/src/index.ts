/**
 * @miyabarrier/core — 判定レイヤーとスコアリングの本体。
 *
 * DOM もネットワークも触らないので、そのまま Node でテストできる。
 * widget 側は「計測してスナップショットを作る」責務だけを持ち、判定はここに委譲する。
 */
import { evaluateBehavior, evaluateMimicry } from './behavior';
import { evaluateCheckbox } from './checkbox';
import { evaluateAiText, evaluateContent } from './content';
import { evaluateEnvironment } from './environment';
import { evaluateHoneypot } from './honeypot';
import { defaultNgWords, defaultWeights } from './patterns.data';
import { scoreLayers } from './scoring';
import type {
  AnalysisInput,
  AnalysisResult,
  AnalyzeOptions,
  LayerResult,
  NgWordCategory,
  NgWordList,
  WeightConfig,
} from './types';

export * from './types';
export { defaultNgWords, defaultWeights } from './patterns.data';
export { evaluateHoneypot } from './honeypot';
export { evaluateBehavior, evaluateMimicry } from './behavior';
export { evaluateEnvironment } from './environment';
export { evaluateCheckbox } from './checkbox';
export { evaluateAiText, evaluateContent, scoreNgWords } from './content';
export type { NgWordMatch, NgWordScore } from './content';
export { decideVerdict, scoreLayers } from './scoring';
export { SIGNAL_CODES, SIGNAL_LABELS, signalLabel } from './signals';
export * as stats from './util';

/** 全レイヤーを実行して統合スコアを返す。データのないレイヤーは自動的に母数から外れる。 */
export const analyze = (input: AnalysisInput, options: AnalyzeOptions = {}): AnalysisResult => {
  const weights = options.weights ?? defaultWeights;
  const ngWords = options.ngWords ?? defaultNgWords;

  const results: LayerResult[] = [
    evaluateHoneypot(input.honeypot),
    evaluateBehavior(input.behavior, weights.layers.behavior),
    evaluateEnvironment(input.environment, weights.layers.environment),
    evaluateMimicry(input.behavior, weights.layers.mimicry),
    evaluateCheckbox(input.checkbox, weights.layers.checkbox),
    evaluateContent(input.content, weights.layers.content, ngWords),
    evaluateAiText(input.content, weights.layers.aiText),
  ];

  return scoreLayers(results, weights);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * weights.json への部分的な上書きをマージする。
 * サイト運営者が `thresholds` だけ、`layers.content.weight` だけを変えられるようにするため、
 * オブジェクトは再帰的にマージし、配列はまるごと置き換える。
 */
export const mergeWeights = (base: WeightConfig, override: unknown): WeightConfig => {
  const merge = (target: unknown, patch: unknown): unknown => {
    if (!isPlainObject(patch)) return patch === undefined ? target : patch;
    const result: Record<string, unknown> = isPlainObject(target) ? { ...target } : {};
    for (const [key, value] of Object.entries(patch)) {
      result[key] = merge(result[key], value);
    }
    return result;
  };
  return merge(base, override) as WeightConfig;
};

/**
 * NG ワードリストへの追記をマージする。
 * 同じ id のカテゴリは terms / patterns を足し込み、score と cap は上書きされたものを優先する。
 */
export const mergeNgWords = (base: NgWordList, extra?: Partial<NgWordList>): NgWordList => {
  if (!extra) return base;
  const byId = new Map<string, NgWordCategory>(
    base.categories.map((category) => [category.id, { ...category }]),
  );

  for (const category of extra.categories ?? []) {
    const existing = byId.get(category.id);
    if (!existing) {
      byId.set(category.id, category);
      continue;
    }
    byId.set(category.id, {
      ...existing,
      ...category,
      terms: [...new Set([...existing.terms, ...(category.terms ?? [])])],
      patterns: [...new Set([...(existing.patterns ?? []), ...(category.patterns ?? [])])],
    });
  }

  return {
    ...base,
    ...extra,
    categories: [...byId.values()],
    allowlist: {
      ...base.allowlist,
      ...extra.allowlist,
      terms: [...new Set([...(base.allowlist?.terms ?? []), ...(extra.allowlist?.terms ?? [])])],
    },
  };
};
