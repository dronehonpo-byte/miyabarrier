/**
 * バッジ・チェックボックス・判定パネルの UI。
 *
 * 埋め込み先サイトの CSS を壊さないことが最優先なので、
 * - すべてのクラス名を mb- で始める
 * - スタイルは 1 度だけ注入する <style> に閉じ込める
 * - **トークンは :root ではなく .mb-root に定義する**（相手サイトの変数を汚さない）
 * - 継承で崩れやすいプロパティ（font, line-height, color, text-align など）は
 *   ルート要素で明示的に指定し直す
 * という方針をとる。
 *
 * 見た目の方針は demo と共通（packages/design のトークン）。
 * 警告は「面で塗らない」— 左端 3px の帯、細いバー、小さなピルだけで示す。
 */
import { markSvg, COMPACT } from '@miyabarrier/design/logo';
import { scopedTokensCss } from '@miyabarrier/design/tokens';
import type { AnalysisResult, ScoredLayer } from '@miyabarrier/core';

const STYLE_ID = 'miyabarrier-style';
export const REPO_URL = 'https://github.com/dronehonpo-byte/miyabarrier';

/** widget 専用のコンポーネント CSS（dashboard / demo の共通 CSS は使わない）。 */
const COMPONENT_CSS = `
.mb-root {
  font-family: var(--mb-font);
  font-size: 14px;
  line-height: 1.7;
  color: var(--mb-ink-900);
  text-align: left;
  letter-spacing: normal;
  font-feature-settings: 'palt' 1;
  box-sizing: border-box;
}
.mb-root *, .mb-root *::before, .mb-root *::after { box-sizing: border-box; }
.mb-root svg { display: block; }

/* ---------- Layer 3: 確認チェックボックス ---------- */

.mb-guard {
  display: flex;
  align-items: center;
  gap: 0.7em;
  margin: 0.9em 0;
  padding: 0.8em 0.95em;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-md);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-sm);
}
.mb-guard__check {
  display: flex;
  align-items: center;
  gap: 0.6em;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  cursor: pointer;
  font-size: 0.95em;
  color: var(--mb-ink-900);
}
.mb-guard__box {
  appearance: none;
  -webkit-appearance: none;
  flex: 0 0 auto;
  width: 1.15em;
  height: 1.15em;
  margin: 0;
  border: 1.5px solid var(--mb-line-strong);
  border-radius: 4px;
  background: var(--mb-surface);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.mb-guard__box:hover { border-color: var(--mb-brand-400); }
.mb-guard__box:checked {
  border-color: var(--mb-brand-600);
  background-color: var(--mb-brand-600);
  /* チェックマークは data URI で描く（外部リソースを増やさない） */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.4l2.2 2.2 4.8-5' fill='none' stroke='%23fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 100% 100%;
}
.mb-guard__box:focus-visible { outline: none; box-shadow: var(--mb-ring); }
.mb-guard__brand {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.35em;
  font-size: 0.72em;
  letter-spacing: 0.02em;
  color: var(--mb-ink-400);
  white-space: nowrap;
}
.mb-guard__brand svg { width: 1.35em; height: 1.35em; }

/* 送信できたとき / 止めたときに、この行の見た目でも状態を伝える */
.mb-guard--verified { border-color: var(--mb-pass-line); background: var(--mb-pass-soft); }
.mb-guard--flagged { border-color: var(--mb-review-line); background: var(--mb-review-soft); }
.mb-guard--blocked { border-color: var(--mb-block-line); background: var(--mb-block-soft); }
.mb-guard__state {
  flex: 0 0 auto;
  display: none;
  align-items: center;
  gap: 0.3em;
  font-size: 0.78em;
  font-weight: 560;
  white-space: nowrap;
}
.mb-guard--verified .mb-guard__state,
.mb-guard--flagged .mb-guard__state,
.mb-guard--blocked .mb-guard__state { display: flex; }
.mb-guard--verified .mb-guard__state { color: var(--mb-pass); }
.mb-guard--flagged .mb-guard__state { color: var(--mb-review); }
.mb-guard--blocked .mb-guard__state { color: var(--mb-block); }
/* 状態が出たらブランド表記は引っ込める（横幅を食い合わないように） */
.mb-guard--verified .mb-guard__brand span,
.mb-guard--flagged .mb-guard__brand span,
.mb-guard--blocked .mb-guard__brand span { display: none; }
.mb-guard__state svg { width: 1.1em; height: 1.1em; }

/* ---------- バッジ ---------- */

/* 送信ボタンと同じ行に並ばないよう、通常のバッジは行を独立させる */
.mb-badge {
  display: flex;
  width: -moz-fit-content;
  width: fit-content;
  align-items: center;
  gap: 0.4em;
  margin: 0.6em 0;
  font-size: 0.75em;
  color: var(--mb-ink-400);
  text-decoration: none;
  letter-spacing: 0.01em;
}
.mb-badge:hover { color: var(--mb-brand-600); text-decoration: none; }
.mb-badge svg { width: 1.25em; height: 1.25em; }
.mb-badge--floating {
  display: inline-flex;
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 2147483000;
  margin: 0;
  padding: 0.45em 0.8em;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-full);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-md);
}

/* ---------- 判定パネル ---------- */

.mb-panel {
  position: relative;
  margin: 1em 0;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-lg);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-md);
  overflow: hidden;
}
/* 意味色は左端の帯だけ（面で塗らない） */
.mb-panel::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
}
.mb-panel--block::before { background: var(--mb-block); }
.mb-panel--review::before { background: var(--mb-review); }

.mb-panel__head {
  display: flex;
  align-items: flex-start;
  gap: 0.75em;
  padding: 1em 1.1em 0.85em 1.2em;
}
.mb-panel__icon {
  flex: 0 0 auto;
  width: 2em;
  height: 2em;
  display: grid;
  place-items: center;
  border-radius: var(--mb-r-sm);
  border: 1px solid var(--mb-line);
  background: var(--mb-surface-2);
}
.mb-panel__icon svg { width: 1.35em; height: 1.35em; }
.mb-panel__heading { flex: 1 1 auto; min-width: 0; }
.mb-panel__title {
  margin: 0;
  font-size: 0.95em;
  font-weight: 620;
  letter-spacing: -0.01em;
  line-height: 1.5;
}
.mb-panel--block .mb-panel__title { color: var(--mb-block); }
.mb-panel--review .mb-panel__title { color: var(--mb-review); }
.mb-panel__message {
  margin: 0.2em 0 0;
  font-size: 0.86em;
  color: var(--mb-ink-500);
  line-height: 1.65;
}
.mb-panel__score {
  flex: 0 0 auto;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mb-panel__score b {
  display: block;
  font-size: 1.2em;
  font-weight: 620;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.mb-panel__score span {
  font-size: 0.68em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mb-ink-400);
}

/* 疑いの内訳（自動化 / 営業文面） */
.mb-panel__groups {
  display: grid;
  gap: 0.5em;
  padding: 0 1.1em 0.9em 1.2em;
}
.mb-meter {
  display: grid;
  grid-template-columns: 7.5em 1fr 2.4em;
  align-items: center;
  gap: 0.6em;
  font-size: 0.8em;
}
.mb-meter__name {
  color: var(--mb-ink-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mb-meter__track {
  height: 5px;
  border-radius: var(--mb-r-full);
  background: var(--mb-surface-inset);
  overflow: hidden;
}
.mb-meter__fill {
  height: 100%;
  border-radius: var(--mb-r-full);
  background: var(--mb-brand-500);
}
.mb-meter__fill--block { background: var(--mb-block); }
.mb-meter__fill--review { background: var(--mb-review); }
.mb-meter__fill--pass { background: var(--mb-pass); }
.mb-meter__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--mb-ink-700);
}
.mb-meter--muted .mb-meter__value { color: var(--mb-ink-300); }

/* 理由 */
.mb-panel__reasons {
  margin: 0;
  padding: 0.85em 1.1em 0.9em 1.2em;
  list-style: none;
  border-top: 1px solid var(--mb-line);
  background: var(--mb-surface-2);
}
.mb-panel__reasons li {
  display: flex;
  gap: 0.55em;
  font-size: 0.84em;
  color: var(--mb-ink-700);
  line-height: 1.6;
}
.mb-panel__reasons li + li { margin-top: 0.35em; }
.mb-panel__reasons li::before {
  content: '';
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  margin-top: 0.62em;
  border-radius: 50%;
  background: var(--mb-ink-300);
}
.mb-panel--block .mb-panel__reasons li:first-child::before { background: var(--mb-block); }

/* お返しの営業（相手にその場で読ませる文面） */
.mb-counter {
  border-top: 1px solid var(--mb-line);
  padding: 0.9em 1.1em 1em 1.2em;
  background: var(--mb-brand-050);
}
.mb-counter__head {
  display: flex;
  align-items: center;
  gap: 0.45em;
  font-size: 0.8em;
  font-weight: 600;
  color: var(--mb-brand-800);
  margin-bottom: 0.45em;
}
.mb-counter__head svg { width: 1.1em; height: 1.1em; }
.mb-counter__subject {
  font-size: 0.84em;
  font-weight: 560;
  color: var(--mb-ink-900);
  margin: 0 0 0.3em;
}
.mb-counter__body {
  margin: 0;
  font-family: inherit;
  font-size: 0.82em;
  line-height: 1.75;
  color: var(--mb-ink-700);
  white-space: pre-wrap;
  max-height: 11em;
  overflow-y: auto;
}
.mb-counter__note {
  margin: 0.5em 0 0;
  font-size: 0.74em;
  color: var(--mb-ink-400);
}

/* 操作 */
.mb-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  padding: 0.85em 1.1em 1em 1.2em;
  border-top: 1px solid var(--mb-line);
}
.mb-btn {
  font: inherit;
  font-size: 0.84em;
  font-weight: 520;
  padding: 0.45em 0.9em;
  border-radius: var(--mb-r-sm);
  border: 1px solid var(--mb-line-strong);
  background: var(--mb-surface);
  color: var(--mb-ink-700);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.mb-btn:hover { border-color: var(--mb-brand-400); color: var(--mb-brand-700); }
.mb-btn:focus-visible { outline: none; box-shadow: var(--mb-ring); }
.mb-btn--primary {
  background: var(--mb-brand-600);
  border-color: var(--mb-brand-600);
  color: #fff;
}
.mb-btn--primary:hover {
  background: var(--mb-brand-700);
  border-color: var(--mb-brand-700);
  color: #fff;
}

/* 内訳（data-debug="true" のとき） */
.mb-panel__debug {
  border-top: 1px solid var(--mb-line);
  font-size: 0.82em;
}
.mb-panel__debug > summary {
  padding: 0.7em 1.1em 0.7em 1.2em;
  cursor: pointer;
  color: var(--mb-ink-500);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.mb-panel__debug > summary::-webkit-details-marker { display: none; }
.mb-panel__debug > summary::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 4px solid currentColor;
  border-top: 3.5px solid transparent;
  border-bottom: 3.5px solid transparent;
  transition: transform 0.15s;
}
.mb-panel__debug[open] > summary::before { transform: rotate(90deg); }
.mb-panel__debug > summary:hover { color: var(--mb-ink-900); }
.mb-debug {
  display: grid;
  gap: 0.55em;
  padding: 0 1.1em 1em 1.2em;
}
.mb-debug__row { display: grid; gap: 0.3em; }
.mb-debug__signals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25em;
  padding-left: 8.1em;
}
.mb-debug__chip {
  font-family: var(--mb-mono);
  font-size: 0.82em;
  padding: 0.05em 0.4em;
  border-radius: 4px;
  background: var(--mb-surface-inset);
  border: 1px solid var(--mb-line);
  color: var(--mb-ink-500);
}
.mb-debug__note {
  padding-top: 0.4em;
  font-size: 0.9em;
  color: var(--mb-ink-400);
  line-height: 1.6;
}

.mb-sr {
  position: absolute !important;
  width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .mb-root * { transition: none !important; }
}
`;

export const ensureStyles = (doc: Document): void => {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  // トークンは .mb-root に閉じ込める（埋め込み先の :root を汚さない）
  style.textContent = scopedTokensCss('.mb-root') + COMPONENT_CSS;
  doc.head.append(style);
};

const el = <K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** ロゴマークを持つ span を作る。小さく使うので簡略プリセットを当てる。 */
const mark = (doc: Document, idPrefix: string): HTMLSpanElement => {
  const host = el(doc, 'span');
  host.innerHTML = markSvg({ ...COMPACT, idPrefix });
  return host;
};

// ---------------------------------------------------------------------------
// Layer 3: 確認チェックボックス
// ---------------------------------------------------------------------------

export interface CheckboxUi {
  wrapper: HTMLElement;
  input: HTMLInputElement;
}

export const createCheckbox = (doc: Document, label: string, name: string): CheckboxUi => {
  const wrapper = el(doc, 'div', 'mb-root mb-guard');

  const field = el(doc, 'label', 'mb-guard__check');
  const input = el(doc, 'input', 'mb-guard__box');
  input.type = 'checkbox';
  input.name = name;
  input.id = `${name}-${Math.random().toString(36).slice(2, 8)}`;
  field.htmlFor = input.id;
  field.append(input, el(doc, 'span', 'mb-guard__label', label));

  const state = el(doc, 'span', 'mb-guard__state');
  state.setAttribute('aria-live', 'polite');

  const brand = el(doc, 'span', 'mb-guard__brand');
  brand.title = 'Miyabarrier が送信内容を端末内で検証します（外部送信なし）';
  brand.append(mark(doc, 'guard'), el(doc, 'span', undefined, 'Miyabarrier'));

  wrapper.append(field, state, brand);
  return { wrapper, input };
};

/** チェック行の状態表示。判定のあとに呼ぶ。 */
export type GuardState = 'idle' | 'verified' | 'review' | 'blocked';

const GUARD_STATE_TEXT: Record<Exclude<GuardState, 'idle'>, string> = {
  verified: '確認しました',
  review: '確認が必要です',
  blocked: '送信を止めました',
};

export const setGuardState = (wrapper: HTMLElement | undefined, next: GuardState): void => {
  if (!wrapper) return;
  wrapper.classList.remove('mb-guard--verified', 'mb-guard--flagged', 'mb-guard--blocked');
  const state = wrapper.querySelector('.mb-guard__state');
  if (!state) return;

  if (next === 'idle') {
    state.textContent = '';
    return;
  }
  wrapper.classList.add(
    next === 'verified'
      ? 'mb-guard--verified'
      : next === 'review'
        ? 'mb-guard--flagged'
        : 'mb-guard--blocked',
  );
  state.textContent = GUARD_STATE_TEXT[next];
};

// ---------------------------------------------------------------------------
// バッジ
// ---------------------------------------------------------------------------

export const createBadge = (doc: Document, floating: boolean): HTMLAnchorElement => {
  const badge = el(doc, 'a', `mb-root mb-badge${floating ? ' mb-badge--floating' : ''}`);
  badge.href = REPO_URL;
  badge.target = '_blank';
  badge.rel = 'noopener noreferrer';
  badge.append(mark(doc, floating ? 'badge-float' : 'badge'));
  badge.append(el(doc, 'span', undefined, 'Miyabarrier で保護されています'));
  return badge;
};

// ---------------------------------------------------------------------------
// 判定パネル
// ---------------------------------------------------------------------------

const GROUP_LABEL: Record<string, string> = {
  automation: '自動化・bot',
  sales: '営業・勧誘の文面',
};

/**
 * 内訳表示用の短いレイヤー名。
 * 正式名（'Layer 2.5 自動化ブラウザの痕跡'）は狭い列で省略されてしまうため、
 * 番号 + 一語に詰めて全部読めるようにする。
 */
const LAYER_SHORT: Record<string, string> = {
  honeypot: 'L1 ハニーポット',
  behavior: 'L2 行動',
  environment: 'L2.5 環境',
  mimicry: 'L2.6 揺らぎ',
  checkbox: 'L3 チェック',
  content: 'L4 文面',
  aiText: 'L6 AI文',
};

type Tone = 'block' | 'review' | 'pass' | 'brand';

/** ラベル + バー + 数値の 1 行。パネル本体と内訳で同じ形を使う。 */
const meter = (
  doc: Document,
  name: string,
  score: number | null,
  tone: Tone,
  title?: string,
): HTMLElement => {
  const row = el(doc, 'div', `mb-meter${score === null ? ' mb-meter--muted' : ''}`);
  const label = el(doc, 'span', 'mb-meter__name', name);
  if (title) label.title = title;
  const track = el(doc, 'div', 'mb-meter__track');
  const fill = el(
    doc,
    'div',
    `mb-meter__fill${tone === 'brand' ? '' : ` mb-meter__fill--${tone}`}`,
  );
  fill.style.width = `${Math.round((score ?? 0) * 100)}%`;
  track.append(fill);
  row.append(
    label,
    track,
    el(doc, 'span', 'mb-meter__value', score === null ? '—' : score.toFixed(2)),
  );
  return row;
};

const toneFor = (score: number, thresholds: { review: number; block: number }): Tone =>
  score >= thresholds.block ? 'block' : score >= thresholds.review ? 'review' : 'pass';

export interface PanelOptions {
  message: string;
  result: AnalysisResult;
  debug: boolean;
  /** お返しの営業。渡すとパネル内に文面を表示する。 */
  counter?: { to: string; subject: string; body: string };
  /** 「それでも送信する」を出す場合のハンドラ。 */
  onOverride?: () => void;
  overrideLabel?: string;
  onDismiss?: () => void;
}

export const createPanel = (doc: Document, options: PanelOptions): HTMLElement => {
  const { result } = options;
  const level = result.verdict === 'block' ? 'block' : 'review';
  const panel = el(doc, 'div', `mb-root mb-panel mb-panel--${level}`);
  panel.setAttribute('role', 'alert');
  panel.setAttribute('aria-live', 'assertive');

  // --- 見出し（何が起きたか / 総合スコア）
  const head = el(doc, 'div', 'mb-panel__head');
  const icon = el(doc, 'div', 'mb-panel__icon');
  icon.append(mark(doc, 'panel'));

  const heading = el(doc, 'div', 'mb-panel__heading');
  heading.append(
    el(
      doc,
      'p',
      'mb-panel__title',
      result.verdict === 'block' ? '送信をブロックしました' : '送信内容の確認をお願いします',
    ),
    el(doc, 'p', 'mb-panel__message', options.message),
  );

  const score = el(doc, 'div', 'mb-panel__score');
  score.append(
    el(doc, 'b', undefined, result.score.toFixed(2)),
    el(doc, 'span', undefined, 'score'),
  );
  score.title = `ブロックのしきい値 ${result.thresholds.block.toFixed(2)} / 確認 ${result.thresholds.review.toFixed(2)}`;

  head.append(icon, heading, score);
  panel.append(head);

  // --- 疑いの内訳（なぜ止まったのかを 2 本のバーで示す）
  const groups = el(doc, 'div', 'mb-panel__groups');
  for (const group of result.groups) {
    groups.append(
      meter(
        doc,
        GROUP_LABEL[group.group] ?? group.label,
        group.applicable ? group.score : null,
        group.applicable ? toneFor(group.score, result.thresholds) : 'pass',
        group.applicable ? undefined : '判定に必要な情報が足りないため対象外',
      ),
    );
  }
  panel.append(groups);

  // --- 理由
  if (result.reasons.length > 0) {
    const list = el(doc, 'ul', 'mb-panel__reasons');
    for (const reason of result.reasons.slice(0, 3)) {
      list.append(el(doc, 'li', undefined, reason));
    }
    panel.append(list);
  }

  // --- お返しの営業（その場で読ませる）
  if (options.counter) {
    const counter = el(doc, 'div', 'mb-counter');
    const head = el(doc, 'div', 'mb-counter__head');
    head.append(mark(doc, 'counter'), el(doc, 'span', undefined, 'こちらからのご案内'));
    counter.append(
      head,
      el(doc, 'p', 'mb-counter__subject', options.counter.subject),
      el(doc, 'p', 'mb-counter__body', options.counter.body),
      el(doc, 'p', 'mb-counter__note', `${options.counter.to} 宛の返信文を控えました。`),
    );
    panel.append(counter);
  }

  // --- 操作
  const actions = el(doc, 'div', 'mb-panel__actions');
  if (options.onOverride) {
    const button = el(
      doc,
      'button',
      'mb-btn mb-btn--primary',
      options.overrideLabel ?? 'それでも送信する',
    );
    button.type = 'button';
    button.addEventListener('click', options.onOverride);
    actions.append(button);
  }
  if (options.onDismiss) {
    const button = el(doc, 'button', 'mb-btn', '閉じる');
    button.type = 'button';
    button.addEventListener('click', options.onDismiss);
    actions.append(button);
  }
  if (actions.childElementCount > 0) panel.append(actions);

  // --- レイヤー別の内訳（debug のみ）
  if (options.debug) panel.append(createDebugSection(doc, result));

  return panel;
};

const describeLayer = (layer: ScoredLayer): string => {
  if (layer.skipped) return `${layer.label} — 判定対象外: ${layer.skipped}`;
  if (!layer.counted) {
    return `${layer.label} — 加点がないため集計対象外（沈黙は証拠として扱わない）`;
  }
  return `${layer.label} — ${layer.points} / ${layer.saturation} 点 · グループ内の重み ${layer.weight}`;
};

/** レイヤーごとのスコアバーとシグナル名。しきい値調整のための表示。 */
const createDebugSection = (doc: Document, result: AnalysisResult): HTMLElement => {
  const details = el(doc, 'details', 'mb-panel__debug');
  const summary = el(doc, 'summary');
  summary.append(doc.createTextNode('レイヤー別の内訳を見る'));
  details.append(summary);

  const body = el(doc, 'div', 'mb-debug');
  for (const layer of result.layers) {
    const row = el(doc, 'div', 'mb-debug__row');
    row.append(
      meter(
        doc,
        LAYER_SHORT[layer.layer] ?? layer.label,
        layer.counted ? layer.score : null,
        layer.counted ? toneFor(layer.score, result.thresholds) : 'pass',
        describeLayer(layer),
      ),
    );

    if (layer.signals.length > 0) {
      const chips = el(doc, 'div', 'mb-debug__signals');
      for (const signal of layer.signals) {
        const chip = el(doc, 'span', 'mb-debug__chip', signal.code.split('.')[1] ?? signal.code);
        chip.title = `${signal.label}（+${signal.points}）${signal.detail ? ` — ${signal.detail}` : ''}`;
        chips.append(chip);
      }
      row.append(chips);
    }
    body.append(row);
  }

  body.append(
    el(
      doc,
      'p',
      'mb-debug__note',
      `総合 ${result.score.toFixed(2)} ／ ブロックは ${result.thresholds.block.toFixed(2)} 以上・確認は ${result.thresholds.review.toFixed(2)} 以上${result.hardBlocked ? ' ／ ハニーポット検知による即時ブロック' : ''}`,
    ),
  );

  if (result.warnings.length > 0) {
    body.append(el(doc, 'p', 'mb-debug__note', `設定の警告: ${result.warnings.join(' / ')}`));
  }

  details.append(body);
  return details;
};
