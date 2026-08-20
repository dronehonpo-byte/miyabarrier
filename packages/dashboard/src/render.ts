/**
 * 描画層。依存を増やさないため、グラフは素の SVG を組み立てる。
 * 集計は aggregate.ts の純関数に任せ、ここは値を DOM に置くだけ。
 *
 * 見た目の規約は packages/design の CSS（mb-* クラス）に寄せてあり、
 * このファイルには色やサイズのリテラルを書かない。
 */
import { markSvg } from '@miyabarrier/design/logo';
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

/** 積み上げの順序。危険度の高いものを上に積む。 */
const STACK: Verdict[] = ['pass', 'review', 'block'];

const SVG_NS = 'http://www.w3.org/2000/svg';

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

const svg = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
  text?: string,
): SVGElementTagNameMap[K] => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};

const percent = (value: number, digits = 1): string => `${(value * 100).toFixed(digits)}%`;

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** 空状態。ロゴを薄く置いて「壊れている」ように見せない。 */
const empty = (message: string): HTMLElement => {
  const box = el('div', 'mb-empty');
  const mark = el('div');
  mark.innerHTML = markSvg({ idPrefix: `empty-${Math.random().toString(36).slice(2, 7)}` });
  const svgNode = mark.firstElementChild;
  if (svgNode) box.append(svgNode);
  box.append(el('p', undefined, message));
  return box;
};

/** ロゴマークを任意の要素に流し込む（トップバー・フッター用）。 */
export const mountMark = (host: HTMLElement | null, idPrefix: string): void => {
  if (!host) return;
  host.innerHTML = markSvg({ idPrefix });
};

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

export const renderSummary = (host: HTMLElement, summary: Summary): void => {
  const share = (count: number) => (summary.total === 0 ? 0 : count / summary.total);

  const cards: Array<{
    tone: string;
    label: string;
    value: string;
    unit?: string;
    note: string;
  }> = [
    {
      tone: 'mb-stat--block',
      label: 'ブロック',
      value: `${summary.counts.block}`,
      unit: '件',
      note: `全体の ${percent(share(summary.counts.block))}`,
    },
    {
      tone: 'mb-stat--review',
      label: '確認（要判断）',
      value: `${summary.counts.review}`,
      unit: '件',
      note: `全体の ${percent(share(summary.counts.review))}`,
    },
    {
      tone: 'mb-stat--pass',
      label: '通過',
      value: `${summary.counts.pass}`,
      unit: '件',
      note: `全体の ${percent(share(summary.counts.pass))}`,
    },
    {
      tone: 'mb-stat--brand',
      label: '総送信数',
      value: `${summary.total}`,
      unit: '件',
      note:
        summary.total === 0
          ? '記録なし'
          : `${summary.days} 日間 / 1 日 ${(summary.total / summary.days).toFixed(1)} 件`,
    },
  ];

  host.replaceChildren(
    ...cards.map((card) => {
      const node = el('div', `mb-stat ${card.tone}`);
      node.append(el('span', 'mb-stat__label', card.label));
      const value = el('b', 'mb-stat__value', card.value);
      if (card.unit) value.append(el('span', 'mb-stat__unit', card.unit));
      node.append(value, el('span', 'mb-stat__note', card.note));
      return node;
    }),
  );
};

// ---------------------------------------------------------------------------
// 日別の積み上げ棒グラフ
// ---------------------------------------------------------------------------

export const renderDaily = (host: HTMLElement, buckets: DailyBucket[]): void => {
  if (buckets.length === 0) {
    host.replaceChildren(empty('まだ記録がありません。'));
    return;
  }

  const width = 100;
  const height = 34;
  const padTop = 2;
  const padBottom = 6;
  const padLeft = 5;
  const plot = height - padTop - padBottom;
  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const slot = (width - padLeft) / buckets.length;
  const barWidth = Math.min(slot * 0.62, 3.2);

  const chart = svg('svg', {
    class: 'mb-chart',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': `日別の判定件数（最大 ${max} 件）`,
  });
  chart.style.height = '150px';

  // 目盛りは 0 と最大値だけ。線を増やさない
  for (const value of [0, max]) {
    const y = padTop + plot - (value / max) * plot;
    chart.append(
      svg('line', {
        x1: padLeft,
        y1: y,
        x2: width,
        y2: y,
        class: value === 0 ? 'mb-axis mb-axis--strong' : 'mb-axis',
        'vector-effect': 'non-scaling-stroke',
      }),
    );
    const tick = svg(
      'text',
      { x: 1.2, y: y - 1, class: 'mb-tick', 'text-anchor': 'start' },
      `${value}`,
    );
    tick.style.fontSize = '3px';
    chart.append(tick);
  }

  const step = Math.ceil(buckets.length / 8);
  buckets.forEach((bucket, index) => {
    const x = padLeft + index * slot + (slot - barWidth) / 2;
    let top = padTop + plot;

    for (const verdict of STACK) {
      const count = bucket.counts[verdict];
      if (count === 0) continue;
      const barHeight = (count / max) * plot;
      top -= barHeight;
      const rect = svg('rect', {
        x,
        y: top,
        width: barWidth,
        height: barHeight,
        class: `mb-bar--${verdict}`,
        rx: 0.4,
      });
      rect.append(svg('title', {}, `${bucket.date} ${VERDICT_LABEL[verdict]} ${count} 件`));
      chart.append(rect);
    }

    if (index % step === 0) {
      const label = svg(
        'text',
        { x: x + barWidth / 2, y: height - 1.2, class: 'mb-tick', 'text-anchor': 'middle' },
        bucket.date.slice(5).replace('-', '/'),
      );
      label.style.fontSize = '3px';
      chart.append(label);
    }
  });

  host.replaceChildren(chart);
};

// ---------------------------------------------------------------------------
// スコア分布（しきい値の位置を重ねる）
// ---------------------------------------------------------------------------

export const renderHistogram = (
  host: HTMLElement,
  bins: HistogramBin[],
  thresholds: { review: number; block: number },
): void => {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (total === 0) {
    host.replaceChildren(empty('まだ記録がありません。'));
    return;
  }

  const width = 100;
  const height = 40;
  const padTop = 3;
  const padBottom = 7;
  const plot = height - padTop - padBottom;
  const max = Math.max(1, ...bins.map((bin) => bin.count));
  const slot = width / bins.length;

  const chart = svg('svg', {
    class: 'mb-chart',
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: 'none',
    role: 'img',
    'aria-label': 'スコアの分布',
  });
  chart.style.height = '160px';

  chart.append(
    svg('line', {
      x1: 0,
      y1: padTop + plot,
      x2: width,
      y2: padTop + plot,
      class: 'mb-axis mb-axis--strong',
      'vector-effect': 'non-scaling-stroke',
    }),
  );

  for (const bin of bins) {
    const center = (bin.from + bin.to) / 2;
    const zone: Verdict =
      center >= thresholds.block ? 'block' : center >= thresholds.review ? 'review' : 'pass';
    const barHeight = (bin.count / max) * plot;
    const x = bin.from * width + slot * 0.12;
    const rect = svg('rect', {
      x,
      y: padTop + plot - barHeight,
      width: slot * 0.76,
      height: Math.max(barHeight, bin.count > 0 ? 0.4 : 0),
      class: `mb-bar--${zone}`,
      rx: 0.4,
    });
    rect.append(
      svg(
        'title',
        {},
        `スコア ${bin.from.toFixed(1)}〜${bin.to.toFixed(1)}: ${bin.count} 件（${VERDICT_LABEL[zone]}）`,
      ),
    );
    chart.append(rect);
  }

  // しきい値の位置を破線で示す
  for (const [value, label] of [
    [thresholds.review, '確認'],
    [thresholds.block, 'ブロック'],
  ] as Array<[number, string]>) {
    const x = value * width;
    chart.append(
      svg('line', {
        x1: x,
        y1: padTop,
        x2: x,
        y2: padTop + plot + 1.5,
        class: 'mb-threshold',
        'vector-effect': 'non-scaling-stroke',
      }),
    );
    const anchor = x > width * 0.72 ? 'end' : 'start';
    const text = svg(
      'text',
      {
        x: anchor === 'end' ? x - 0.8 : x + 0.8,
        y: padTop - 0.6,
        class: 'mb-tick',
        'text-anchor': anchor,
      },
      `${label} ${value.toFixed(2)}`,
    );
    text.style.fontSize = '3px';
    chart.append(text);
  }

  for (const value of [0, 0.5, 1]) {
    const tick = svg(
      'text',
      {
        x: value * width,
        y: height - 1.5,
        class: 'mb-tick',
        'text-anchor': value === 0 ? 'start' : value === 1 ? 'end' : 'middle',
      },
      value.toFixed(1),
    );
    tick.style.fontSize = '3px';
    chart.append(tick);
  }

  // 縦軸の目盛りは置かず、最大値だけ言葉で添える（グラフの線を増やさない）
  const caption = el('p', 'mb-note');
  caption.textContent = `横軸はスコア、縦軸は件数（最大 ${max} 件）`;
  caption.style.marginTop = '0.4rem';

  host.replaceChildren(chart, caption);
};

// ---------------------------------------------------------------------------
// ランキング（検知理由・ページ別）
// ---------------------------------------------------------------------------

export const renderRanked = (
  host: HTMLElement,
  items: Ranked[],
  emptyText: string,
  options: { total?: number; tone?: Verdict } = {},
): void => {
  if (items.length === 0) {
    host.replaceChildren(empty(emptyText));
    return;
  }

  const max = Math.max(...items.map((item) => item.count));
  const denominator = options.total && options.total > 0 ? options.total : max;
  const list = el('div');

  for (const item of items) {
    const row = el('div', 'mb-row');
    const left = el('div', 'mb-vstack');
    left.append(el('span', 'mb-row__label', item.label));
    const track = el('div', 'mb-track');
    const fill = el(
      'div',
      `mb-track__fill${options.tone ? ` mb-track__fill--${options.tone}` : ''}`,
    );
    fill.style.width = `${Math.max((item.count / max) * 100, 2)}%`;
    track.append(fill);
    left.append(track);

    const meta = el('div', 'mb-row__meta');
    meta.append(el('div', undefined, `${item.count} 件`));
    meta.append(el('div', 'mb-note', percent(item.count / denominator, 0)));

    row.append(left, meta);
    list.append(row);
  }

  host.replaceChildren(list);
};

// ---------------------------------------------------------------------------
// しきい値シミュレーター
// ---------------------------------------------------------------------------

export const renderSimulation = (
  host: HTMLElement,
  simulation: ThresholdSimulation,
  current: Summary,
): void => {
  const rows: Array<{ label: string; tone: Verdict; before: number; after: number }> = [
    {
      label: 'ブロック',
      tone: 'block',
      before: current.counts.block,
      after: simulation.counts.block,
    },
    {
      label: '確認',
      tone: 'review',
      before: current.counts.review,
      after: simulation.counts.review,
    },
    { label: '通過', tone: 'pass', before: current.counts.pass, after: simulation.counts.pass },
  ];

  const table = el('table', 'mb-table');
  const head = el('thead');
  const headRow = el('tr');
  headRow.append(
    el('th', undefined, '判定'),
    el('th', 'mb-num', '記録時'),
    el('th', 'mb-num', 'この設定'),
    el('th', 'mb-num', '差'),
  );
  head.append(headRow);
  table.append(head);

  const body = el('tbody');
  for (const row of rows) {
    const delta = row.after - row.before;
    const tr = el('tr');

    const label = el('td');
    const pill = el('span', `mb-pill mb-pill--${row.tone}`);
    pill.append(el('i', 'mb-dot'), document.createTextNode(row.label));
    label.append(pill);

    // 「厳しくなる向き」だけを注意色にする（通過が増えるのは緩む方向）
    const stricter = row.tone === 'pass' ? delta < 0 : delta > 0;
    const deltaCell = el('td', 'mb-num', delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta}`);
    if (delta !== 0) deltaCell.style.color = stricter ? 'var(--mb-block)' : 'var(--mb-pass)';

    tr.append(
      label,
      el('td', 'mb-num', `${row.before}`),
      el('td', 'mb-num', `${row.after}`),
      deltaCell,
    );
    body.append(tr);
  }
  table.append(body);

  const note = el(
    'p',
    'mb-note',
    simulation.changed === 0
      ? '記録時と同じ判定になります。'
      : `${simulation.changed} 件の判定が変わります（全 ${current.total} 件中）。`,
  );
  note.style.marginTop = '0.8rem';

  host.replaceChildren(table, note);
};

// ---------------------------------------------------------------------------
// 記録の一覧
// ---------------------------------------------------------------------------

export const renderTable = (host: HTMLElement, entries: readonly LogEntry[], limit = 40): void => {
  if (entries.length === 0) {
    host.replaceChildren(empty('まだ記録がありません。フォームが送信されるとここに並びます。'));
    return;
  }

  const table = el('table', 'mb-table');
  const head = el('thead');
  const headRow = el('tr');
  for (const [label, cls] of [
    ['時刻', 'mb-nowrap'],
    ['判定', ''],
    ['スコア', 'mb-num'],
    ['主な理由', ''],
    ['フォーム', 'mb-nowrap'],
  ] as Array<[string, string]>) {
    headRow.append(el('th', cls || undefined, label));
  }
  head.append(headRow);
  table.append(head);

  const body = el('tbody');
  for (const entry of [...entries].reverse().slice(0, limit)) {
    const row = el('tr');

    const verdict = el('td', 'mb-nowrap');
    const pill = el('span', `mb-pill mb-pill--${entry.verdict}`);
    pill.append(el('i', 'mb-dot'), document.createTextNode(VERDICT_LABEL[entry.verdict]));
    verdict.append(pill);
    if (entry.hard) {
      const hard = el('span', 'mb-pill mb-pill--ghost', '即時');
      hard.style.marginLeft = '0.3rem';
      hard.title = 'ハニーポット検知による即時ブロック（しきい値に関係なくブロックされます）';
      verdict.append(hard);
    }

    const score = el('td', 'mb-num mb-mono', entry.score.toFixed(2));
    const reason = el('td', 'mb-muted', entry.reasons[0]?.split('（')[0] ?? '—');
    if (entry.reasons.length > 1) reason.title = entry.reasons.join('\n');

    row.append(
      el('td', 'mb-nowrap mb-mono', formatDateTime(entry.t)),
      verdict,
      score,
      reason,
      el('td', 'mb-nowrap mb-note', `${entry.path || '/'}`),
    );
    body.append(row);
  }
  table.append(body);

  const wrap = el('div', 'mb-scroll');
  wrap.append(table);
  const nodes: HTMLElement[] = [wrap];
  if (entries.length > limit) {
    nodes.push(el('p', 'mb-note', `直近 ${limit} 件を表示しています（全 ${entries.length} 件）。`));
  }
  host.replaceChildren(...nodes);
};
