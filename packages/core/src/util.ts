/** 数値・統計・テキスト正規化のヘルパー。各レイヤーから共通で使う。 */

export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

export const clamp01 = (value: number): number => clamp(value, 0, 1);

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const round = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

export const stdev = (values: readonly number[]): number => {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

/** 変動係数。値の「ばらつきの少なさ」を平均で正規化して見るために使う。 */
export const coefficientOfVariation = (values: readonly number[]): number => {
  const average = mean(values);
  if (average === 0) return 0;
  return stdev(values) / Math.abs(average);
};

export const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

/** 連続する値の差分列。 */
export const diffs = (values: readonly number[]): number[] => {
  const result: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    result.push((values[i] ?? 0) - (values[i - 1] ?? 0));
  }
  return result;
};

/**
 * 「floor を下回るほど怪しい」指標を 0〜1 の強度に変換する。
 * value=floor で 0、value=0 で 1。
 */
export const belowFloor = (value: number, floor: number): number => {
  if (floor <= 0) return 0;
  return clamp01((floor - value) / floor);
};

/**
 * 「ceiling を上回るほど怪しい」指標を 0〜1 の強度に変換する。
 * value=ceiling で 0、value=max で 1。
 */
export const aboveCeiling = (value: number, ceiling: number, max = 1): number => {
  if (max <= ceiling) return value > ceiling ? 1 : 0;
  return clamp01((value - ceiling) / (max - ceiling));
};

/** 同じ値が何回現れたかを数え、最頻値の比率を返す（量子化＝機械的な等間隔の検出用）。 */
export const modeRatio = (values: readonly number[], quantum = 1): number => {
  if (values.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const value of values) {
    const bucket = Math.round(value / quantum);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let top = 0;
  for (const count of counts.values()) if (count > top) top = count;
  return top / values.length;
};

// ---------------------------------------------------------------------------
// テキスト
// ---------------------------------------------------------------------------

/**
 * 全角英数の半角化・小文字化・空白の圧縮。NG ワード照合の前処理。
 * 全角スペース(U+3000)は NFKC で半角スペースになるので、ここで個別に扱う必要はない。
 * 改行は残す（署名ブロックや箇条書きの行単位の判定で使うため）。
 */
export const normalizeText = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\t ]+/g, ' ');

export const countOccurrences = (haystack: string, needle: string): number => {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
};

/**
 * 日本語・英語の文末で分割する。空文は落とす。
 * 英文のピリオドは、後ろに空白か行末が続くときだけ文末とみなす（小数や URL で割らないため）。
 */
export const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[。！？!?])|(?<=\.)(?=\s|$)|\n+/g)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

const JAPANESE_PATTERN = /[぀-ヿ㐀-䶿一-鿿]/;

export const containsJapanese = (text: string): boolean => JAPANESE_PATTERN.test(text);

export const countUrls = (text: string): number =>
  (text.match(/\b(?:https?:\/\/|www\.)[^\s<>"'）)]{3,}/gi) ?? []).length;

// ---------------------------------------------------------------------------
// tuning（JSON 由来なので型がない）へのアクセサ
// ---------------------------------------------------------------------------

export const tuneNumber = (
  tuning: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number => {
  const value = tuning?.[key];
  return isFiniteNumber(value) ? value : fallback;
};

export const tuneStrings = (
  tuning: Record<string, unknown> | undefined,
  key: string,
  fallback: readonly string[],
): string[] => {
  const value = tuning?.[key];
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value as string[];
  }
  return [...fallback];
};
