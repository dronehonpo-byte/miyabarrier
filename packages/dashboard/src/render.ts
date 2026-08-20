/**
 * 描画。依存を増やさないため、グラフは素の SVG を組み立てる。
 * 集計は aggregate.ts の純関数に任せ、ここは値を DOM に置くだけ。
 */
import type {
  DailyBucket,
  HistogramBin,
  LogEntry,
  Ranked,
  Summary,
  ThresholdSimulation,
  Verdict,
} from './aggregate';

export const VERDICT_LABEL: Record<Verdict, string> = {
  pass: '通過',
  review: '確認',
  block: 'ブロック',
};

const VERDICT_ORDER: Verdict[] = ['block', 'review', 'pass'];

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const svgEl = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, String(value));
  }
  return node;
};

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// ---------------------------------------------------------------------------

export const renderSummary = (host: HTMLElement, summary: Summary): void => {
  host.replaceChildren();
  const cards: Array<[string, string, string]> = [
    [
      '総送信数',
      `${summary.total}`,
      `${summary.days} 日間 / 1 日あたり ${(summary.total / summary.days).toFixed(1)} 件`,
    ],
    ['ブロック', `${summary.counts.block}`, percent(summary.blockRate)],
    [
      '確認',
      `${summary.counts.review}`,
      percent(summary.total === 0 ? 0 : summary.counts.review / summary.total),
    ],
    [
      '通過',
      `${summary.counts.pass}`,
      percent(summary.total === 0 ? 0 : summary.counts.pass / summary.total),
    ],
    [
      '平均スコア',
      summary.averageScore.toFixed(2),
      summary.lastAt ? `最終 ${formatDateTime(summary.lastAt)}` : '—',
    ],
  ];

  for (const [label, value, note] of cards) {
    const card = el('div', 'stat');
    card.append(
      el('span', 'stat-label', label),
      el('b', 'stat-value', value),
      el('span', 'stat-note', note),
    );
    host.append(card);
  }
};

export const renderDaily = (host: HTMLElement, buckets: DailyBucket[]): void => {
  host.replaceChildren();
  if (buckets.length === 0) {
    host.append(el('p', 'empty', 'まだ記録がありません。'));
    return;
  }

  const width = Math.max(320, buckets.length * 34);
  const height = 160;
  const padding = { top: 8, right: 8, bottom: 24, left: 28 };
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const barWidth = (width - padding.left - padding.right) / buckets.length;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': '日別の判定件数',
  });
  svg.style.width = '100%';
  svg.style.height = `${height}px`;

  // 目盛り（0 と最大値だけ。細かい格子より値が読めることを優先）
  for (const [value, label] of [
    [0, '0'],
    [max, `${max}`],
  ] as Array<[number, string]>) {
    const y = padding.top + plotHeight - (value / max) * plotHeight;
    svg.append(
      svgEl('line', { x1: padding.left, y1: y, x2: width - padding.right, y2: y, class: 'axis' }),
    );
    const tick = svgEl('text', { x: 0, y: y + 4, class: 'tick' });
    tick.textContent = label;
    svg.append(tick);
  }

  buckets.forEach((bucket, index) => {
    const x = padding.left + index * barWidth;
    let stackTop = padding.top + plotHeight;
    for (const verdict of VERDICT_ORDER.slice().reverse()) {
      const count = bucket.counts[verdict];
      if (count === 0) continue;
      const barHeight = (count / max) * plotHeight;
      stackTop -= barHeight;
      const rect = svgEl('rect', {
        x: x + barWidth * 0.15,
        y: stackTop,
        width: barWidth * 0.7,
        height: barHeight,
        class: `bar bar-${verdict}`,
        rx: 2,
      });
      const title = svgEl('title');
      title.textContent = `${bucket.date} ${VERDICT_LABEL[verdict]} ${count} 件`;
      rect.append(title);
      svg.append(rect);
    }

    // ラベルは間引く（日数が増えても潰れないように）
    const step = Math.ceil(buckets.length / 10);
    if (index % step === 0) {
      const label = svgEl('text', {
        x: x + barWidth / 2,
        y: height - 8,
        class: 'tick',
        'text-anchor': 'middle',
      });
      label.textContent = bucket.date.slice(5);
      svg.append(label);
    }
  });

  host.append(svg);
};

export const renderHistogram = (
  host: HTMLElement,
  bins: HistogramBin[],
  thresholds: { review: number; block: number },
): void => {
  host.replaceChildren();
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (total === 0) {
    host.append(el('p', 'empty', 'まだ記録がありません。'));
    return;
  }

  const max = Math.max(1, ...bins.map((bin) => bin.count));
  const table = el('div', 'hist');
  for (const bin of bins) {
    const row = el('div', 'hist-row');
    const label = el('span', 'hist-label', `${bin.from.toFixed(1)}–${bin.to.toFixed(1)}`);
    const track = el('div', 'hist-track');
    // しきい値がビンの内側に落ちることがあるので、中央値で区分を決める。
    const center = (bin.from + bin.to) / 2;
    const zone =
      center >= thresholds.block ? 'block' : center >= thresholds.review ? 'review' : 'pass';
    const fill = el('div', `hist-fill hist-fill-${zone}`);
    fill.style.width = `${(bin.count / max) * 100}%`;
    track.append(fill);
    row.append(label, track, el('span', 'hist-count', `${bin.count}`));
    table.append(row);
  }
  host.append(table);
};

export const renderRanked = (host: HTMLElement, items: Ranked[], emptyText: string): void => {
  host.replaceChildren();
  if (items.length === 0) {
    host.append(el('p', 'empty', emptyText));
    return;
  }
  const max = Math.max(...items.map((item) => item.count));
  const list = el('ol', 'ranked');
  for (const item of items) {
    const row = el('li');
    const label = el('span', 'ranked-label', item.label);
    const track = el('div', 'hist-track');
    const fill = el('div', 'hist-fill hist-fill-review');
    fill.style.width = `${(item.count / max) * 100}%`;
    track.append(fill);
    row.append(label, track, el('span', 'hist-count', `${item.count}`));
    list.append(row);
  }
  host.append(list);
};

export const renderSimulation = (
  host: HTMLElement,
  simulation: ThresholdSimulation,
  current: Summary,
): void => {
  host.replaceChildren();
  /** 増えたときに「厳しくなった」と読める向きか。色の意味を判定ごとに反転させる。 */
  const rows: Array<{ label: string; before: number; after: number; stricter: 'up' | 'down' }> = [
    {
      label: 'ブロック',
      before: current.counts.block,
      after: simulation.counts.block,
      stricter: 'up',
    },
    {
      label: '確認',
      before: current.counts.review,
      after: simulation.counts.review,
      stricter: 'up',
    },
    { label: '通過', before: current.counts.pass, after: simulation.counts.pass, stricter: 'down' },
  ];

  const table = el('table', 'sim');
  const head = el('tr');
  head.append(el('th', undefined, '判定'), el('th', 'num', '記録時'), el('th', 'num', 'この設定'));
  table.append(head);

  for (const { label, before, after, stricter } of rows) {
    const row = el('tr');
    const delta = after - before;
    const afterCell = el(
      'td',
      'num',
      `${after}${delta === 0 ? '' : delta > 0 ? ` (+${delta})` : ` (${delta})`}`,
    );
    if (delta !== 0) {
      // 「判定が厳しくなる向き」を警告色、「緩くなる向き」を安全色にする。
      const strict = delta > 0 ? stricter === 'up' : stricter === 'down';
      afterCell.classList.add(strict ? 'up' : 'down');
    }
    row.append(el('td', undefined, label), el('td', 'num', `${before}`), afterCell);
    table.append(row);
  }

  host.append(table);
  host.append(
    el(
      'p',
      'note',
      simulation.changed === 0
        ? '記録時と同じ判定になります。'
        : `${simulation.changed} 件の判定が変わります（全 ${current.total} 件中）。`,
    ),
  );
};

export const renderTable = (host: HTMLElement, entries: readonly LogEntry[], limit = 50): void => {
  host.replaceChildren();
  if (entries.length === 0) {
    host.append(el('p', 'empty', 'まだ記録がありません。'));
    return;
  }

  const table = el('table', 'log');
  const head = el('tr');
  for (const [label, className] of [
    ['時刻', ''],
    ['判定', ''],
    ['スコア', 'num'],
    ['理由', ''],
    ['フォーム', ''],
  ] as Array<[string, string]>) {
    head.append(el('th', className || undefined, label));
  }
  table.append(head);

  // 新しい順に見たいので逆順で表示する。
  for (const entry of [...entries].reverse().slice(0, limit)) {
    const row = el('tr');
    const verdict = el('td');
    const badge = el('span', `pill pill-${entry.verdict}`, VERDICT_LABEL[entry.verdict]);
    verdict.append(badge);
    if (entry.hard) verdict.append(el('span', 'pill pill-hard', '即時'));

    row.append(
      el('td', 'nowrap', formatDateTime(entry.t)),
      verdict,
      el('td', 'num', entry.score.toFixed(2)),
      el('td', 'reasons', entry.reasons.slice(0, 2).join(' / ') || '—'),
      el('td', 'nowrap', `${entry.path || '/'} (${entry.form})`),
    );
    table.append(row);
  }

  host.append(table);
  if (entries.length > limit) {
    host.append(el('p', 'note', `直近 ${limit} 件を表示しています（全 ${entries.length} 件）。`));
  }
};
