/**
 * Miyabarrier dashboard — 判定ログの可視化。
 *
 * localStorage はオリジンごとに分かれているため、このページを**保護対象サイトと同じオリジン**に
 * 置いたときだけ自動でログを読める。別のオリジン（GitHub Pages など）で開く場合は、
 * サイト側で `JSON.stringify(Miyabarrier.getLog())` の結果を貼り付けて読み込む。
 *
 * サーバーには何も送らない。読み込んだログはこのページの中だけで処理される。
 */
// widget の index ではなく log モジュールだけを読む（index は自動初期化の副作用を持つ）。
import { LOG_STORAGE_KEY } from '@miyabarrier/widget/log';
import {
  clearCounterQueue,
  readCounterQueue,
  removeCounterMail,
  type CounterMail,
} from '@miyabarrier/widget/counter';
import {
  byDay,
  parseLog,
  scoreHistogram,
  simulateThresholds,
  summarize,
  topPaths,
  topReasons,
  type LogEntry,
} from './aggregate';
import {
  mountMark,
  renderCounterQueue,
  renderDaily,
  renderHistogram,
  renderRanked,
  renderSimulation,
  renderSummary,
  renderTable,
} from './render';

const $ = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} が見つかりません`);
  return node;
};

let entries: LogEntry[] = [];

const readThresholds = (): { review: number; block: number } => {
  const reviewInput = document.getElementById('review') as HTMLInputElement;
  const blockInput = document.getElementById('block') as HTMLInputElement;
  const block = Number(blockInput.value);
  const review = Math.min(Number(reviewInput.value), block);
  // 追い越しを抑えた値をスライダーにも書き戻す（つまみと表示値がずれないように）。
  if (Number(reviewInput.value) !== review) reviewInput.value = String(review);
  return { review, block };
};

const renderAll = (): void => {
  const summary = summarize(entries);
  const thresholds = readThresholds();

  $('review-value').textContent = thresholds.review.toFixed(2);
  $('block-value').textContent = thresholds.block.toFixed(2);

  renderSummary($('summary'), summary);
  renderDaily($('daily'), byDay(entries));
  renderHistogram($('histogram'), scoreHistogram(entries), thresholds);
  renderRanked($('reasons'), topReasons(entries), 'まだ理由の記録がありません。', {
    total: entries.length,
  });
  renderRanked($('paths'), topPaths(entries), 'ブロック・確認になった送信はまだありません。', {
    total: summary.counts.block + summary.counts.review,
    tone: 'block',
  });
  renderSimulation(
    $('simulation'),
    simulateThresholds(entries, thresholds.review, thresholds.block),
    summary,
  );
  renderTable($('log'), entries);
  renderCounter();

  const origin = typeof location === 'undefined' ? '' : location.origin;
  $('topbar-context').textContent =
    entries.length === 0 ? `検知ログ · ${origin}` : `${entries.length} 件の記録 · ${origin}`;
};

/** お返しの営業の一覧を描き直す。 */
const renderCounter = (): void => {
  const queue = readCounterQueue();
  $('counter-count').textContent = queue.length === 0 ? '0 件' : `${queue.length} 件`;
  renderCounterQueue($('counter'), queue, {
    onRemove: (to) => {
      removeCounterMail(to);
      renderCounter();
    },
    onCopy: (mail: CounterMail) => {
      const text = `To: ${mail.to}
Subject: ${mail.subject}

${mail.body}`;
      void navigator.clipboard?.writeText(text).then(
        () => setStatus('文面をコピーしました。'),
        () => setStatus('コピーできませんでした。手動で選択してください。', 'warn'),
      );
    },
  });
};

const setStatus = (message: string, tone: 'info' | 'warn' = 'info'): void => {
  const status = $('status');
  status.textContent = message;
  status.className = `mb-banner mb-banner--${tone}`;
};

const load = (raw: unknown, source: string): void => {
  const result = parseLog(raw);
  entries = result.entries;
  if (entries.length === 0) {
    setStatus(
      `${source}: 読み込める記録がありませんでした。保護対象サイトと同じオリジンで開くか、JSON を貼り付けてください。`,
      'warn',
    );
  } else {
    const skipped = result.skipped > 0 ? `（${result.skipped} 件は形式が合わず読み飛ばし）` : '';
    setStatus(`${source}から ${entries.length} 件の記録を読み込みました${skipped}`);
  }
  renderAll();
};

/** 同一オリジンの localStorage から読む。 */
const loadFromStorage = (): void => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LOG_STORAGE_KEY);
  } catch {
    setStatus('localStorage を読めませんでした（プライベートモードの可能性があります）。', 'warn');
    return;
  }
  if (raw === null) {
    setStatus(
      `このオリジンには記録がありません（キー: ${LOG_STORAGE_KEY}）。保護対象サイトと同じオリジンに置くか、下の欄に JSON を貼り付けてください。`,
      'warn',
    );
    renderAll();
    return;
  }
  load(raw, 'localStorage');
};

const bind = (): void => {
  mountMark(document.getElementById('brand-mark'), 'brand');
  mountMark(document.getElementById('foot-mark'), 'foot');

  for (const id of ['review', 'block']) {
    $(id).addEventListener('input', renderAll);
  }

  $('reload').addEventListener('click', () => {
    loadFromStorage();
    renderCounter();
  });

  $('counter-clear').addEventListener('click', () => {
    if (!confirm('お返しの営業の下書きをすべて削除します。続けますか？')) return;
    clearCounterQueue();
    renderCounter();
  });

  $('import').addEventListener('click', () => {
    const textarea = document.getElementById('import-json') as HTMLTextAreaElement;
    const text = textarea.value.trim();
    if (text.length === 0) {
      setStatus('貼り付ける JSON が空です。', 'warn');
      return;
    }
    load(text, '貼り付けた JSON');
  });

  $('export').addEventListener('click', () => {
    const textarea = document.getElementById('import-json') as HTMLTextAreaElement;
    textarea.value = JSON.stringify(entries, null, 2);
    setStatus(`読み込み済みの ${entries.length} 件を下の欄に書き出しました。`);
  });

  $('clear').addEventListener('click', () => {
    // 破棄は取り消せないので必ず確認する。
    if (!confirm('このオリジンの判定ログを削除します。取り消せません。続けますか？')) return;
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
      entries = [];
      setStatus('localStorage の判定ログを削除しました。');
      renderAll();
    } catch {
      setStatus('localStorage を操作できませんでした。', 'warn');
    }
  });
};

bind();
loadFromStorage();
