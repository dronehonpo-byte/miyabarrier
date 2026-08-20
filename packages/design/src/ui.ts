/**
 * dashboard と demo が共有するコンポーネント層。
 *
 * widget は埋め込み先サイトの CSS を壊さないために独自の最小 CSS を持つ（ui.ts は使わない）。
 * ここは「自分たちのページ」用のスタイルなので、レイアウトや表組みまで面倒を見る。
 *
 * 見た目の方針:
 * - 構造は「1px の線」で作り、影はほぼ使わない。浮かせるのは本当に浮くものだけ
 * - 余白を広く取り、要素の数を減らす。情報は色ではなく配置と階層で示す
 * - 数字は等幅（tabular-nums）。ダッシュボードの数値が桁で揺れないようにする
 * - セクション見出しは小さく・字間を広く。主役は数字とグラフ
 */

export const baseCss = `
*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  background: var(--mb-canvas);
  color: var(--mb-ink-900);
  font-family: var(--mb-font);
  font-size: 15px;
  line-height: 1.7;
  font-feature-settings: 'palt' 1;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--mb-brand-600); text-decoration: none; }
a:hover { text-decoration: underline; text-underline-offset: 3px; }

h1, h2, h3, h4 { margin: 0; font-weight: 620; letter-spacing: -0.02em; line-height: 1.35; }
h1 { font-size: clamp(1.6rem, 3.4vw, 2.1rem); }
h2 { font-size: 1.05rem; }
h3 { font-size: 0.95rem; }
p { margin: 0; }

code, kbd, .mb-mono { font-family: var(--mb-mono); font-size: 0.86em; font-variant-ligatures: none; }
code { background: var(--mb-surface-inset); padding: 0.15em 0.4em; border-radius: var(--mb-r-sm); }

pre {
  margin: 0;
  padding: 1rem 1.1rem;
  background: var(--mb-surface-inset);
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-md);
  overflow-x: auto;
  font-family: var(--mb-mono);
  font-size: 0.78rem;
  line-height: 1.65;
}
pre code { background: none; padding: 0; }

/* ---------- レイアウト ---------- */

.mb-shell { max-width: 1120px; margin: 0 auto; padding: 0 1.5rem 5rem; }
.mb-shell--narrow { max-width: 900px; }

.mb-topbar {
  position: sticky;
  isolation: isolate;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.5rem;
  margin-bottom: 2.5rem;
  background: color-mix(in srgb, var(--mb-surface) 82%, transparent);
  backdrop-filter: saturate(1.4) blur(12px);
  border-bottom: 1px solid var(--mb-line);
}
/* ブランド色のヘアラインを 1 本だけ引く（面で塗らずに存在感を出す） */
.mb-topbar::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, var(--mb-brand-600), var(--mb-brand-400) 22%, transparent 55%);
  opacity: 0.55;
}
.mb-topbar__logo { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.mb-topbar__logo svg { width: 30px; height: 30px; flex: 0 0 auto; }
.mb-topbar__name { font-weight: 640; letter-spacing: -0.03em; font-size: 1.02rem; white-space: nowrap; }
.mb-topbar__sep { width: 1px; height: 20px; background: var(--mb-line-strong); flex: 0 0 auto; }
.mb-topbar__ctx { font-size: 0.85rem; color: var(--mb-ink-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mb-topbar__actions { margin-left: auto; display: flex; gap: 0.5rem; flex: 0 0 auto; }

.mb-hstack { display: flex; align-items: center; gap: 0.6rem; }
.mb-vstack { display: flex; flex-direction: column; gap: 0.35rem; }
.mb-spread { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.mb-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.mb-grid { display: grid; gap: 1rem; }
.mb-grid--2 { grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); }
.mb-grid--3 { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
.mb-grid--4 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }

.mb-section { margin-top: 2.25rem; }
.mb-section__head { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.9rem; }
.mb-eyebrow {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--mb-ink-400);
}
.mb-lede { color: var(--mb-ink-500); font-size: 0.92rem; max-width: 68ch; }
.mb-note { color: var(--mb-ink-500); font-size: 0.82rem; }
.mb-muted { color: var(--mb-ink-500); }

/* ---------- カード ---------- */

.mb-card {
  background: var(--mb-surface);
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-lg);
  padding: 1.25rem 1.35rem;
}
.mb-card--flush { padding: 0; overflow: hidden; }
.mb-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.mb-card__body { padding: 1.25rem 1.35rem; }
.mb-card__foot {
  padding: 0.75rem 1.35rem;
  border-top: 1px solid var(--mb-line);
  background: var(--mb-surface-2);
  font-size: 0.82rem;
  color: var(--mb-ink-500);
}

/* ---------- KPI ---------- */

.mb-stat {
  position: relative;
  background: var(--mb-surface);
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-md);
  padding: 1rem 1.1rem 1.05rem;
  overflow: hidden;
}
/* 左端の細い帯だけで意味色を示す（面で塗らない） */
.mb-stat::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--mb-line-strong);
}
.mb-stat--block::before { background: var(--mb-block); }
.mb-stat--review::before { background: var(--mb-review); }
.mb-stat--pass::before { background: var(--mb-pass); }
.mb-stat--brand::before { background: var(--mb-brand-600); }
.mb-stat__label { font-size: 0.78rem; color: var(--mb-ink-500); }
.mb-stat__value {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.85rem;
  font-weight: 620;
  letter-spacing: -0.035em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.mb-stat__unit { font-size: 0.9rem; font-weight: 500; color: var(--mb-ink-400); margin-left: 0.15em; }
.mb-stat__note { font-size: 0.76rem; color: var(--mb-ink-400); font-variant-numeric: tabular-nums; }

/* ---------- ピル・タグ ---------- */

.mb-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  padding: 0.1em 0.6em;
  border-radius: var(--mb-r-full);
  border: 1px solid currentColor;
  font-size: 0.72rem;
  font-weight: 560;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.mb-pill--pass { color: var(--mb-pass); background: var(--mb-pass-soft); }
.mb-pill--review { color: var(--mb-review); background: var(--mb-review-soft); }
.mb-pill--block { color: var(--mb-block); background: var(--mb-block-soft); }
.mb-pill--ghost { color: var(--mb-ink-400); border-color: var(--mb-line-strong); }
.mb-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: 0 0 auto; }

.mb-tag {
  display: inline-block;
  padding: 0.12em 0.55em;
  border-radius: var(--mb-r-sm);
  background: var(--mb-brand-050);
  color: var(--mb-brand-700);
  border: 1px solid var(--mb-brand-100);
  font-size: 0.75rem;
  font-family: var(--mb-mono);
}

/* ---------- バー ---------- */

.mb-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 4.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.42rem 0;
  border-bottom: 1px solid var(--mb-line);
  font-size: 0.87rem;
}
.mb-row:last-child { border-bottom: 0; }
.mb-row__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mb-row__meta {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--mb-ink-500);
  font-size: 0.82rem;
}
.mb-track {
  height: 6px;
  border-radius: var(--mb-r-full);
  background: var(--mb-surface-inset);
  overflow: hidden;
}
.mb-track__fill {
  height: 100%;
  border-radius: var(--mb-r-full);
  background: var(--mb-brand-500);
  transition: width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.mb-track__fill--pass { background: var(--mb-pass); }
.mb-track__fill--review { background: var(--mb-review); }
.mb-track__fill--block { background: var(--mb-block); }

/* ---------- 表 ---------- */

.mb-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
.mb-table th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--mb-ink-400);
  padding: 0.55rem 0.9rem;
  border-bottom: 1px solid var(--mb-line);
  white-space: nowrap;
}
.mb-table td {
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--mb-line);
  vertical-align: middle;
}
.mb-table tr:last-child td { border-bottom: 0; }
.mb-table tbody tr:hover { background: var(--mb-surface-2); }
.mb-table .mb-num { text-align: right; font-variant-numeric: tabular-nums; }
.mb-table .mb-nowrap { white-space: nowrap; }
.mb-scroll { overflow-x: auto; }

/* ---------- 操作系 ---------- */

.mb-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 520;
  padding: 0.42rem 0.85rem;
  border-radius: var(--mb-r-sm);
  border: 1px solid var(--mb-line-strong);
  background: var(--mb-surface);
  color: var(--mb-ink-700);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.mb-btn:hover { border-color: var(--mb-brand-400); color: var(--mb-brand-700); }
.mb-btn:focus-visible { outline: none; box-shadow: var(--mb-ring); border-color: var(--mb-brand-500); }
.mb-btn--primary {
  background: var(--mb-brand-600);
  border-color: var(--mb-brand-600);
  color: #fff;
  font-weight: 560;
  padding: 0.55rem 1.15rem;
  font-size: 0.9rem;
}
.mb-btn--primary:hover { background: var(--mb-brand-700); border-color: var(--mb-brand-700); color: #fff; }
.mb-btn--ghost { background: transparent; border-color: transparent; color: var(--mb-ink-500); }
.mb-btn--ghost:hover { background: var(--mb-surface-inset); color: var(--mb-ink-900); }
.mb-btn--danger:hover { border-color: var(--mb-block); color: var(--mb-block); }
.mb-btn[disabled] { opacity: 0.5; cursor: default; }

.mb-field { display: block; }
.mb-field__label { display: block; font-size: 0.8rem; color: var(--mb-ink-500); margin-bottom: 0.3rem; }
.mb-input, .mb-textarea {
  width: 100%;
  font: inherit;
  font-size: 0.92rem;
  padding: 0.55rem 0.75rem;
  color: var(--mb-ink-900);
  background: var(--mb-surface);
  border: 1px solid var(--mb-line-strong);
  border-radius: var(--mb-r-sm);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.mb-input:focus, .mb-textarea:focus { outline: none; border-color: var(--mb-brand-500); box-shadow: var(--mb-ring); }
.mb-textarea { min-height: 11rem; resize: vertical; line-height: 1.75; }
.mb-textarea--mono { font-family: var(--mb-mono); font-size: 0.78rem; min-height: 7rem; }

.mb-range { -webkit-appearance: none; appearance: none; width: 100%; height: 22px; background: none; cursor: pointer; }
.mb-range::-webkit-slider-runnable-track { height: 4px; border-radius: var(--mb-r-full); background: var(--mb-surface-inset); }
.mb-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px; height: 16px; margin-top: -6px;
  border-radius: 50%;
  background: var(--mb-surface);
  border: 2px solid var(--mb-brand-600);
  box-shadow: var(--mb-shadow-sm);
}
.mb-range::-moz-range-track { height: 4px; border-radius: var(--mb-r-full); background: var(--mb-surface-inset); }
.mb-range::-moz-range-thumb {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--mb-surface); border: 2px solid var(--mb-brand-600);
}
.mb-range:focus-visible { outline: none; }
.mb-range:focus-visible::-webkit-slider-thumb { box-shadow: var(--mb-ring); }

/* ---------- 状態表示 ---------- */

.mb-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.7rem 0.95rem;
  border-radius: var(--mb-r-md);
  border: 1px solid var(--mb-line);
  background: var(--mb-surface);
  font-size: 0.85rem;
  color: var(--mb-ink-700);
}
.mb-banner--info { border-color: var(--mb-brand-100); background: var(--mb-brand-050); color: var(--mb-brand-800); }
.mb-banner--warn { border-color: var(--mb-review-line); background: var(--mb-review-soft); color: var(--mb-review); }

.mb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.25rem 1rem;
  text-align: center;
  color: var(--mb-ink-400);
  font-size: 0.86rem;
}
.mb-empty svg { width: 42px; height: 42px; opacity: 0.35; }

/* ---------- グラフ共通 ---------- */

.mb-chart { width: 100%; display: block; overflow: visible; }
.mb-chart .mb-axis { stroke: var(--mb-line); stroke-width: 1; }
.mb-chart .mb-axis--strong { stroke: var(--mb-line-strong); }
.mb-chart .mb-tick { fill: var(--mb-ink-400); font-size: 10px; font-family: var(--mb-font); }
.mb-chart .mb-bar--pass { fill: var(--mb-pass); }
.mb-chart .mb-bar--review { fill: var(--mb-review); }
.mb-chart .mb-bar--block { fill: var(--mb-block); }
.mb-chart .mb-bar--brand { fill: var(--mb-brand-500); }
.mb-chart .mb-threshold { stroke: var(--mb-ink-300); stroke-width: 1; stroke-dasharray: 3 3; }

.mb-legend { display: flex; flex-wrap: wrap; gap: 0.9rem; font-size: 0.76rem; color: var(--mb-ink-500); }
.mb-legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
.mb-legend i { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }

/* ---------- フッター ---------- */

.mb-foot {
  margin-top: 3rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--mb-line);
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  align-items: center;
  font-size: 0.8rem;
  color: var(--mb-ink-400);
}
.mb-foot__brand { display: inline-flex; align-items: center; gap: 0.45rem; }
.mb-foot__brand svg { width: 18px; height: 18px; }

.mb-sr {
  position: absolute !important;
  width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (max-width: 640px) {
  .mb-topbar { padding: 0.75rem 1rem; }
  .mb-topbar__ctx, .mb-topbar__sep { display: none; }
  .mb-shell { padding: 0 1rem 4rem; }
  .mb-card { padding: 1.05rem 1.1rem; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
`;
