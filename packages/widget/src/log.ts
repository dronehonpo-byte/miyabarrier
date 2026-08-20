/**
 * 判定ログの localStorage 入出力。
 *
 * 判定結果は Miyabarrier.getLog() で取り出せる。しきい値を決めるときは
 * このログを書き出して使う。**このモジュールに副作用を持たせないこと**（キーだけを
 * 使いたい側が index.ts を読み込むと、自動初期化まで走ってしまう）。
 */

/** 判定ログの localStorage キー。 */
export const LOG_STORAGE_KEY = 'miyabarrier:log';

export interface LogEntry {
  /** ISO 8601 の判定時刻。 */
  t: string;
  verdict: string;
  score: number;
  reasons: string[];
  /** フォームの id / name。 */
  form: string;
  path: string;
  /** ハニーポット等による即時ブロックだったか。しきい値の後追い検証で必要。 */
  hard: boolean;
}

export const readLog = (): LogEntry[] => {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LogEntry[]) : [];
  } catch {
    return [];
  }
};

export const appendLog = (entry: LogEntry, limit: number): void => {
  try {
    const entries = [...readLog(), entry].slice(-Math.max(1, limit));
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* プライベートモードや容量超過では黙って諦める */
  }
};

export const clearLog = (): void => {
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch {
    /* noop */
  }
};
