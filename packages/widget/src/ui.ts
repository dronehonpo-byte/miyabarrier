/**
 * バッジ・チェックボックス・判定メッセージの UI。
 *
 * 貼るだけで「ちゃんとした製品」に見えることを狙っているので、見た目はここに集約する。
 * ただしホスト側のサイトの CSS を壊さないことを最優先にしており、
 * - クラス名は mb- プレフィックス
 * - スタイルは 1 度だけ注入する <style> に閉じ込める
 * - 色は CSS 変数 + prefers-color-scheme でダークモードに追従
 * という方針にしている。
 */
import type { AnalysisResult } from '@miyabarrier/core';

const STYLE_ID = 'miyabarrier-style';
export const REPO_URL = 'https://github.com/miyabarrier/miyabarrier';

const CSS = `
.mb-root{--mb-fg:#1f2933;--mb-muted:#6b7785;--mb-bg:#fff;--mb-border:#dfe3e8;--mb-accent:#2f6f4f;
--mb-warn-bg:#fff8e6;--mb-warn-border:#e8c15a;--mb-warn-fg:#7a5300;
--mb-block-bg:#fdf0ef;--mb-block-border:#e0a19b;--mb-block-fg:#8c2f26;
font-family:inherit;font-size:14px;line-height:1.6;color:var(--mb-fg);}
@media (prefers-color-scheme:dark){.mb-root{--mb-fg:#e7ebef;--mb-muted:#9aa5b1;--mb-bg:#1b1f24;--mb-border:#39414a;--mb-accent:#7fc7a4;
--mb-warn-bg:#2e2716;--mb-warn-border:#7a6427;--mb-warn-fg:#f0d79a;
--mb-block-bg:#2d1c1a;--mb-block-border:#7c3b34;--mb-block-fg:#f3b7b0;}}
.mb-check{display:flex;align-items:center;gap:.6em;margin:.9em 0;padding:.75em .9em;
border:1px solid var(--mb-border);border-radius:8px;background:var(--mb-bg);}
.mb-check input{width:1.15em;height:1.15em;margin:0;flex:0 0 auto;accent-color:var(--mb-accent);cursor:pointer;}
.mb-check label{cursor:pointer;flex:1 1 auto;}
.mb-check .mb-mark{flex:0 0 auto;font-size:.75em;color:var(--mb-muted);letter-spacing:.02em;white-space:nowrap;}
.mb-badge{display:inline-flex;align-items:center;gap:.35em;margin:.6em 0;font-size:.75rem;color:var(--mb-muted);text-decoration:none;}
.mb-badge:hover{color:var(--mb-accent);}
.mb-badge-floating{position:fixed;right:12px;bottom:12px;z-index:2147483000;padding:.4em .7em;
border:1px solid var(--mb-border);border-radius:999px;background:var(--mb-bg);box-shadow:0 2px 8px rgba(0,0,0,.12);}
.mb-panel{margin:.9em 0;padding:.9em 1em;border-radius:8px;border:1px solid var(--mb-border);background:var(--mb-bg);}
.mb-panel-review{background:var(--mb-warn-bg);border-color:var(--mb-warn-border);color:var(--mb-warn-fg);}
.mb-panel-block{background:var(--mb-block-bg);border-color:var(--mb-block-border);color:var(--mb-block-fg);}
.mb-panel-title{margin:0 0 .35em;font-weight:700;font-size:.95em;}
.mb-panel p{margin:0 0 .5em;}
.mb-reasons{margin:.4em 0 .6em;padding-left:1.2em;}
.mb-reasons li{margin:.15em 0;}
.mb-actions{display:flex;flex-wrap:wrap;gap:.5em;margin-top:.6em;}
.mb-btn{font:inherit;font-size:.85em;padding:.45em .9em;border-radius:6px;border:1px solid currentColor;
background:transparent;color:inherit;cursor:pointer;}
.mb-btn:hover{opacity:.8;}
.mb-details{margin-top:.6em;font-size:.8em;color:var(--mb-muted);}
.mb-details pre{overflow-x:auto;max-height:16em;padding:.6em;border-radius:6px;background:rgba(127,127,127,.12);}
.mb-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
`;

export const ensureStyles = (doc: Document): void => {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.append(style);
};

export interface CheckboxUi {
  wrapper: HTMLElement;
  input: HTMLInputElement;
}

export const createCheckbox = (doc: Document, label: string, name: string): CheckboxUi => {
  const wrapper = doc.createElement('div');
  wrapper.className = 'mb-root mb-check';

  const input = doc.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.id = `${name}-${Math.random().toString(36).slice(2, 8)}`;

  const labelEl = doc.createElement('label');
  labelEl.htmlFor = input.id;
  labelEl.textContent = label;

  const mark = doc.createElement('span');
  mark.className = 'mb-mark';
  mark.textContent = 'Miyabarrier';
  mark.title = 'Miyabarrier が送信内容を端末内で検証します（外部送信なし）';

  wrapper.append(input, labelEl, mark);
  return { wrapper, input };
};

export const createBadge = (doc: Document, floating: boolean): HTMLAnchorElement => {
  const badge = doc.createElement('a');
  badge.className = `mb-root mb-badge${floating ? ' mb-badge-floating' : ''}`;
  badge.href = REPO_URL;
  badge.target = '_blank';
  badge.rel = 'noopener noreferrer';
  badge.textContent = '🛡️ Miyabarrier で保護されています';
  return badge;
};

export interface PanelOptions {
  message: string;
  result: AnalysisResult;
  debug: boolean;
  /** 「それでも送信する」を出す場合のハンドラ。 */
  onOverride?: () => void;
  overrideLabel?: string;
  onDismiss?: () => void;
}

export const createPanel = (doc: Document, options: PanelOptions): HTMLElement => {
  const { result } = options;
  const panel = doc.createElement('div');
  const level = result.verdict === 'block' ? 'block' : 'review';
  panel.className = `mb-root mb-panel mb-panel-${level}`;
  panel.setAttribute('role', 'alert');
  panel.setAttribute('aria-live', 'assertive');

  const title = doc.createElement('p');
  title.className = 'mb-panel-title';
  title.textContent =
    result.verdict === 'block' ? '送信をブロックしました' : '送信内容の確認をお願いします';
  panel.append(title);

  const message = doc.createElement('p');
  message.textContent = options.message;
  panel.append(message);

  if (result.reasons.length > 0) {
    const heading = doc.createElement('p');
    heading.textContent = '判定の理由:';
    const list = doc.createElement('ul');
    list.className = 'mb-reasons';
    for (const reason of result.reasons.slice(0, 4)) {
      const item = doc.createElement('li');
      item.textContent = reason;
      list.append(item);
    }
    panel.append(heading, list);
  }

  const actions = doc.createElement('div');
  actions.className = 'mb-actions';
  if (options.onOverride) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'mb-btn';
    button.textContent = options.overrideLabel ?? 'それでも送信する';
    button.addEventListener('click', options.onOverride);
    actions.append(button);
  }
  if (options.onDismiss) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'mb-btn';
    button.textContent = '閉じる';
    button.addEventListener('click', options.onDismiss);
    actions.append(button);
  }
  if (actions.childElementCount > 0) panel.append(actions);

  if (options.debug) {
    const details = doc.createElement('details');
    details.className = 'mb-details';
    const summary = doc.createElement('summary');
    summary.textContent = `内訳を見る（総合スコア ${result.score} / block しきい値 ${result.thresholds.block}）`;
    const pre = doc.createElement('pre');
    pre.textContent = JSON.stringify(
      {
        score: result.score,
        verdict: result.verdict,
        hardBlocked: result.hardBlocked,
        layers: result.layers.map((layer) => ({
          layer: layer.layer,
          score: layer.score,
          weight: layer.weight,
          applicable: layer.applicable,
          skipped: layer.skipped,
          signals: layer.signals.map((signal) => `${signal.code} +${signal.points}`),
          metrics: layer.metrics,
        })),
        warnings: result.warnings,
      },
      null,
      2,
    );
    details.append(summary, pre);
    panel.append(details);
  }

  return panel;
};
