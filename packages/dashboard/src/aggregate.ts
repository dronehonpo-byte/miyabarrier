/**
 * 判定ログの集計。DOM に触らない純関数だけを置く（テスト対象）。
 *
 * ログは localStorage という「利用者がいつでも壊せる場所」から来るので、
 * 入口の parseLog で徹底的に疑ってから通す。壊れた 1 件で画面全体が落ちるより、
 * 読める分だけ表示して「N 件を読み飛ばした」と言うほうが役に立つ。
 */

export type Verdict = 'pass' | 'review' | 'block';

export interface LogEntry {
  t: string;
  verdict: Verdict;
  score: number;
  reasons: string[];
  form: string;
  path: string;
  /** 即時ブロック（ハニーポット）だったか。v0.1.0 のログには無いので既定 false。 */
  hard: boolean;
}

export interface ParseResult {
  entries: LogEntry[];
  /** 形式が合わずに読み飛ばした件数。 */
  skipped: number;
}

const VERDICTS: readonly string[] = ['pass', 'review', 'block'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 未知の入力を LogEntry に正規化する。1 件でも欠けていれば読み飛ばす。 */
export const parseLog = (raw: unknown): ParseResult => {
  const source = typeof raw === 'string' ? safeJsonParse(raw) : raw;
  if (!Array.isArray(source)) return { entries: [], skipped: 0 };

  const entries: LogEntry[] = [];
  let skipped = 0;

  for (const item of source) {
    if (!isRecord(item)) {
      skipped += 1;
      continue;
    }
    const { t, verdict, score } = item;
    const timestamp = typeof t === 'string' ? t : '';
    const parsedTime = Date.parse(timestamp);
    if (
      !Number.isFinite(parsedTime) ||
      typeof verdict !== 'string' ||
      !VERDICTS.includes(verdict) ||
      typeof score !== 'number' ||
      !Number.isFinite(score)
    ) {
      skipped += 1;
      continue;
    }
    entries.push({
      t: timestamp,
      verdict: verdict as Verdict,
      score: Math.min(1, Math.max(0, score)),
      reasons: Array.isArray(item.reasons)
        ? item.reasons.filter((reason): reason is string => typeof reason === 'string')
        : [],
      form: typeof item.form === 'string' ? item.form : 'form',
      path: typeof item.path === 'string' ? item.path : '',
      hard: item.hard === true,
    });
  }

  // 古い順に並べる（localStorage は追記順だが、取り込んだ JSON は保証がない）。
  entries.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
  return { entries, skipped };
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------

export interface VerdictCounts {
  pass: number;
  review: number;
  block: number;
}

export interface Summary {
  total: number;
  counts: VerdictCounts;
  /** block の割合（0〜1）。 */
  blockRate: number;
  /** pass 以外の割合（0〜1）。 */
  flaggedRate: number;
  averageScore: number;
  firstAt: string | null;
  lastAt: string | null;
  /** 観測期間の日数（1 日未満は 1 とする）。 */
  days: number;
}

export const summarize = (entries: readonly LogEntry[]): Summary => {
  const counts: VerdictCounts = { pass: 0, review: 0, block: 0 };
  let scoreTotal = 0;

  for (const entry of entries) {
    counts[entry.verdict] += 1;
    scoreTotal += entry.score;
  }

  const first = entries[0]?.t ?? null;
  const last = entries[entries.length - 1]?.t ?? null;
  const spanMs = first && last ? Date.parse(last) - Date.parse(first) : 0;

  return {
    total: entries.length,
    counts,
    blockRate: entries.length === 0 ? 0 : counts.block / entries.length,
    flaggedRate: entries.length === 0 ? 0 : (counts.block + counts.review) / entries.length,
    averageScore: entries.length === 0 ? 0 : scoreTotal / entries.length,
    firstAt: first,
    lastAt: last,
    days: Math.max(1, Math.ceil(spanMs / 86_400_000)),
  };
};

export interface DailyBucket {
  /** YYYY-MM-DD（ローカルタイム）。 */
  date: string;
  counts: VerdictCounts;
  total: number;
}

const localDateKey = (iso: string): string => {
  const date = new Date(iso);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** 日別の件数。データが無い日は 0 で埋めるので、そのまま棒グラフにできる。 */
export const byDay = (entries: readonly LogEntry[]): DailyBucket[] => {
  if (entries.length === 0) return [];

  const buckets = new Map<string, VerdictCounts>();
  for (const entry of entries) {
    const key = localDateKey(entry.t);
    const bucket = buckets.get(key) ?? { pass: 0, review: 0, block: 0 };
    bucket[entry.verdict] += 1;
    buckets.set(key, bucket);
  }

  const keys = [...buckets.keys()].sort();
  const firstKey = keys[0];
  const lastKey = keys[keys.length - 1];
  if (!firstKey || !lastKey) return [];

  const result: DailyBucket[] = [];
  const cursor = new Date(`${firstKey}T00:00:00`);
  const end = new Date(`${lastKey}T00:00:00`);
  // 空白の日を詰めずに並べる（「静かな日」も情報なので）。
  while (cursor.getTime() <= end.getTime()) {
    const month = `${cursor.getMonth() + 1}`.padStart(2, '0');
    const day = `${cursor.getDate()}`.padStart(2, '0');
    const key = `${cursor.getFullYear()}-${month}-${day}`;
    const counts = buckets.get(key) ?? { pass: 0, review: 0, block: 0 };
    result.push({ date: key, counts, total: counts.pass + counts.review + counts.block });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
};

export interface Ranked {
  label: string;
  count: number;
}

/** 判定理由の出現回数。理由は「ラベル（詳細）」の形なので、括弧の前で丸めて集約する。 */
export const topReasons = (entries: readonly LogEntry[], limit = 10): Ranked[] => {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const reason of entry.reasons) {
      const label = reason.split('（')[0]?.trim() || reason;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return rank(counts, limit);
};

export const topPaths = (entries: readonly LogEntry[], limit = 10): Ranked[] => {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.verdict === 'pass') continue; // 問題のあった送信がどこに来ているかを見たい
    const key = `${entry.path || '/'} (${entry.form})`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return rank(counts, limit);
};

const rank = (counts: Map<string, number>, limit: number): Ranked[] =>
  [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);

export interface HistogramBin {
  /** 下限（含む）。 */
  from: number;
  /** 上限（最終ビンのみ含む）。 */
  to: number;
  count: number;
}

/** スコアの分布。しきい値をどこに置くべきかを目で見るための材料。 */
export const scoreHistogram = (entries: readonly LogEntry[], bins = 10): HistogramBin[] => {
  const width = 1 / bins;
  const result: HistogramBin[] = Array.from({ length: bins }, (_, index) => ({
    from: index * width,
    to: (index + 1) * width,
    count: 0,
  }));
  for (const entry of entries) {
    const index = Math.min(bins - 1, Math.floor(entry.score / width));
    const bin = result[index];
    if (bin) bin.count += 1;
  }
  return result;
};

export interface ThresholdSimulation {
  review: number;
  block: number;
  counts: VerdictCounts;
  /** 現在のログの判定と比べて、判定が変わる件数。 */
  changed: number;
}

/**
 * 「しきい値をこう変えたら、過去のログはどう判定されたか」を再計算する。
 * ログにはスコアが入っているので、しきい値だけを差し替えれば後追いで検証できる。
 * report モードで溜めたログからしきい値を決める、というのがこのツールの主目的。
 *
 * 即時ブロック（ハニーポット）はスコアと無関係に block になるため、
 * `hard` が立っている記録はどのしきい値でも block のままとする。
 */
export const simulateThresholds = (
  entries: readonly LogEntry[],
  review: number,
  block: number,
): ThresholdSimulation => {
  const counts: VerdictCounts = { pass: 0, review: 0, block: 0 };
  let changed = 0;

  for (const entry of entries) {
    const verdict: Verdict = entry.hard
      ? 'block'
      : entry.score >= block
        ? 'block'
        : entry.score >= review
          ? 'review'
          : 'pass';
    counts[verdict] += 1;
    if (verdict !== entry.verdict) changed += 1;
  }

  return { review, block, counts, changed };
};
