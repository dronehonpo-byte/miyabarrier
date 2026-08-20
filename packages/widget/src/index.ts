/**
 * Miyabarrier widget — スクリプトタグ 1 行で動くエントリーポイント。
 *
 * 役割分担:
 *   inject.ts    … DOM への注入と値の取り出し
 *   telemetry.ts … 操作の計測
 *   ui.ts        … 見た目
 *   ここ         … 設定の解決、submit のフック、公開 API
 *
 * 判定は @miyabarrier/core の analyze() に全部任せる。ネットワークアクセスは一切しない。
 */
import {
  analyze,
  defaultNgWords,
  defaultWeights,
  evaluateAiText,
  evaluateContent,
  mergeNgWords,
  mergeWeights,
  scoreLayers,
  type AnalysisResult,
  type NgWordList,
  type WeightConfig,
} from '@miyabarrier/core';
import { collectFormValues, findForms, injectHoneypot, type InjectedHoneypot } from './inject';
import { FormTelemetry } from './telemetry';
import { appendLog, clearLog as clearStoredLog, readLog, type LogEntry } from './log';
import {
  buildCounterMail,
  clearCounterQueue,
  defaultCounterOptions,
  queueCounterMail,
  readCounterQueue,
  shouldCounter,
  type CounterMail,
  type CounterOptions,
} from './counter';
import { markSvg } from '@miyabarrier/design/logo';
import { createBadge, createCheckbox, createPanel, ensureStyles, setGuardState } from './ui';

declare const __MIYABARRIER_VERSION__: string;

export const VERSION =
  typeof __MIYABARRIER_VERSION__ === 'string' ? __MIYABARRIER_VERSION__ : '0.0.0';

export { LOG_STORAGE_KEY, type LogEntry } from './log';

export type WidgetMode = 'block' | 'warn' | 'report';
export type BadgeMode = false | 'inline' | 'floating';

export interface MiyabarrierOptions {
  /** block: しきい値超えを止める / warn: 警告して確認を求める / report: 止めずに記録だけ。 */
  mode: WidgetMode;
  /** 保護対象フォームの CSS セレクタ。未指定なら自由記述欄を持つフォームを自動検出。 */
  selector?: string;
  /** Layer 3 のチェックボックス UI を出すか。 */
  checkbox: boolean;
  checkboxLabel: string;
  /** Layer 1 のハニーポットを注入するか。 */
  honeypot: boolean;
  badge: BadgeMode;
  blockMessage: string;
  reviewMessage: string;
  formLanguage: 'ja' | 'en' | 'auto';
  /** しきい値の上書き（weights.thresholds へのショートカット）。 */
  thresholds?: { review?: number; block?: number };
  /** weights.json への部分的な上書き。 */
  weights?: unknown;
  /** NG ワードリストへの追記。 */
  ngWords?: Partial<NgWordList>;
  /** 判定内訳を画面に表示する。 */
  debug: boolean;
  /** 判定結果を localStorage に残す（本文は保存しない）。 */
  log: boolean;
  /** localStorage に保持する判定結果の件数。dashboard での観察期間に合わせて増やせる。 */
  logLimit: number;
  /** スクリプト読み込み時にフォームを自動検出して保護するか。 */
  autoInit: boolean;
  /**
   * お返しの営業（カウンターピッチ）。営業と判定したときに自社の営業文を作る。
   * **自動送信はしない**。送信箱に溜め、ダッシュボードから人間が送る。
   */
  counter: CounterOptions;
  /** お返しの営業を作ったときのフック。自前のエンドポイントへ渡したい場合に使う。 */
  onCounter?: (mail: CounterMail, context: { form: HTMLFormElement }) => void;
  /** 判定後のフック。false を返すと、その回のブロックを取り消す。 */
  onVerdict?: (result: AnalysisResult, context: { form: HTMLFormElement }) => boolean | void;
}

export const defaultOptions: MiyabarrierOptions = {
  mode: 'block',
  checkbox: true,
  checkboxLabel: '営業・勧誘目的の送信ではありません',
  honeypot: true,
  badge: 'inline',
  blockMessage:
    '営業・勧誘目的の送信、または自動送信の可能性が高いと判定したため送信をブロックしました。お心当たりのない場合は、内容を見直して再度お試しください。',
  reviewMessage:
    '営業・勧誘目的の可能性がある内容が含まれています。お問い合わせ内容であれば、そのまま送信してください。',
  formLanguage: 'ja',
  debug: false,
  log: true,
  logLimit: 200,
  autoInit: true,
  counter: defaultCounterOptions,
};

// ---------------------------------------------------------------------------
// 設定の解決
// ---------------------------------------------------------------------------

const scriptElement =
  typeof document === 'undefined' ? null : (document.currentScript as HTMLScriptElement | null);

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value !== 'false' && value !== '0' && value !== 'off';
};

const parseNumber = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** script タグの data-* 属性から設定を読む（ビルドツールを使わない導入のため）。 */
const readScriptConfig = (script: HTMLScriptElement | null): Partial<MiyabarrierOptions> => {
  if (!script) return {};
  const data = script.dataset;
  const config: Partial<MiyabarrierOptions> = {};

  if (data.mode === 'block' || data.mode === 'warn' || data.mode === 'report')
    config.mode = data.mode;
  if (data.selector) config.selector = data.selector;
  if (data.checkbox !== undefined) config.checkbox = parseBoolean(data.checkbox, true);
  if (data.checkboxLabel) config.checkboxLabel = data.checkboxLabel;
  if (data.honeypot !== undefined) config.honeypot = parseBoolean(data.honeypot, true);
  if (data.badge !== undefined) {
    config.badge =
      data.badge === 'floating' ? 'floating' : parseBoolean(data.badge, true) ? 'inline' : false;
  }
  if (data.blockMessage) config.blockMessage = data.blockMessage;
  if (data.reviewMessage) config.reviewMessage = data.reviewMessage;
  if (data.formLanguage === 'ja' || data.formLanguage === 'en' || data.formLanguage === 'auto') {
    config.formLanguage = data.formLanguage;
  }
  if (data.debug !== undefined) config.debug = parseBoolean(data.debug, false);
  if (data.log !== undefined) config.log = parseBoolean(data.log, true);
  if (data.autoInit !== undefined) config.autoInit = parseBoolean(data.autoInit, true);
  const logLimit = parseNumber(data.logLimit);
  if (logLimit !== undefined) config.logLimit = logLimit;

  const review = parseNumber(data.reviewThreshold);
  const block = parseNumber(data.blockThreshold);
  if (review !== undefined || block !== undefined) {
    config.thresholds = {
      ...(review !== undefined ? { review } : {}),
      ...(block !== undefined ? { block } : {}),
    };
  }
  return config;
};

const globalConfig = (): Partial<MiyabarrierOptions> => {
  const candidate = (globalThis as { MIYABARRIER_CONFIG?: Partial<MiyabarrierOptions> })
    .MIYABARRIER_CONFIG;
  return candidate && typeof candidate === 'object' ? candidate : {};
};

const resolveOptions = (...overrides: Partial<MiyabarrierOptions>[]): MiyabarrierOptions =>
  overrides.reduce<MiyabarrierOptions>(
    (accumulated, override) => ({ ...accumulated, ...override }),
    { ...defaultOptions },
  );

const buildWeights = (options: MiyabarrierOptions): WeightConfig => {
  let weights = defaultWeights;
  if (options.weights) weights = mergeWeights(weights, options.weights);
  if (options.thresholds) {
    weights = mergeWeights(weights, {
      thresholds: { ...weights.thresholds, ...options.thresholds },
    });
  }
  return weights;
};

// ---------------------------------------------------------------------------
// 1 フォーム分の保護
// ---------------------------------------------------------------------------

export class ProtectedForm {
  readonly options: MiyabarrierOptions;
  private readonly weights: WeightConfig;
  private readonly ngWords: NgWordList;
  private readonly telemetry: FormTelemetry;
  private honeypot?: InjectedHoneypot;
  private checkboxInput?: HTMLInputElement;
  private checkboxRow?: HTMLElement;
  private checkedAt: number | null = null;
  private trustedClick: boolean | undefined;
  private pointerSamplesBeforeCheck = 0;
  private toggleCount = 0;
  private panel?: HTMLElement;
  private allowNextSubmit = false;
  private readonly cleanups: Array<() => void> = [];

  lastResult?: AnalysisResult;

  constructor(
    readonly form: HTMLFormElement,
    options: Partial<MiyabarrierOptions> = {},
  ) {
    this.options = resolveOptions(options);
    this.weights = buildWeights(this.options);
    this.ngWords = mergeNgWords(defaultNgWords, this.options.ngWords);
    this.telemetry = new FormTelemetry(form);

    const doc = form.ownerDocument;
    ensureStyles(doc);

    if (this.options.honeypot) this.honeypot = injectHoneypot(form);
    if (this.options.checkbox) this.mountCheckbox(doc);
    if (this.options.badge) this.mountBadge(doc);

    // 入力が変わったら前回の判定結果の表示は捨てる。
    // チェックボックス UI の有無に関係なく必要なので、ここで登録する
    // （mountCheckbox の中に置くと data-checkbox="false" のサイトで残り続ける）。
    const onInput = (): void => this.clearVerdictUi();
    form.addEventListener('input', onInput, { passive: true });
    this.cleanups.push(() => form.removeEventListener('input', onInput));

    const onSubmit = (event: Event): void => this.handleSubmit(event);
    form.addEventListener('submit', onSubmit, true);
    this.cleanups.push(() => form.removeEventListener('submit', onSubmit, true));

    form.setAttribute('data-miyabarrier-protected', 'true');
  }

  /** 送信ボタンの直前に差し込む。見つからなければフォーム末尾に追加する。 */
  private insertBeforeSubmit(node: HTMLElement): void {
    const submitButton = this.form.querySelector<HTMLElement>(
      'button[type="submit"], input[type="submit"], button:not([type])',
    );
    if (submitButton?.parentElement) {
      submitButton.parentElement.insertBefore(node, submitButton);
    } else {
      this.form.append(node);
    }
  }

  private mountCheckbox(doc: Document): void {
    const { wrapper, input } = createCheckbox(doc, this.options.checkboxLabel, 'mb_confirm');
    this.checkboxInput = input;
    this.checkboxRow = wrapper;

    input.addEventListener('click', (event) => {
      this.toggleCount += 1;
      // isTrusted=false は「スクリプトからのクリック」。人間のクリックでは必ず true。
      this.trustedClick = event.isTrusted;
      if (input.checked) {
        this.checkedAt = Date.now();
        this.pointerSamplesBeforeCheck = this.telemetry.pointerSampleCount();
      } else {
        this.checkedAt = null;
      }
    });
    this.insertBeforeSubmit(wrapper);
    this.cleanups.push(() => wrapper.remove());
  }

  private mountBadge(doc: Document): void {
    const badge = createBadge(doc, this.options.badge === 'floating');
    if (this.options.badge === 'floating') {
      // フローティングバッジはページに 1 つだけ。
      if (!doc.querySelector('.mb-badge-floating')) doc.body.append(badge);
      else return;
    } else {
      this.form.append(badge);
    }
    this.cleanups.push(() => badge.remove());
  }

  /** 現在のフォーム状態で判定する（送信をせずに結果だけ欲しいときにも使える）。 */
  analyze(): AnalysisResult {
    const values = collectFormValues(this.form);
    return analyze(
      {
        honeypot: this.honeypot?.state(),
        behavior: this.telemetry.behavior(values.typedChars),
        environment: this.telemetry.environment(),
        checkbox: {
          present: Boolean(this.checkboxInput),
          checked: this.checkboxInput?.checked ?? false,
          renderedAt: this.telemetry.renderedAt,
          checkedAt: this.checkedAt,
          trustedClick: this.trustedClick,
          pointerSamplesBeforeCheck: this.pointerSamplesBeforeCheck,
          toggleCount: this.toggleCount,
        },
        content: {
          text: values.text,
          senderName: values.senderName,
          formLanguage: this.options.formLanguage,
        },
      },
      { weights: this.weights, ngWords: this.ngWords },
    );
  }

  /**
   * 営業と判定したときに、お返しの営業文を組み立てて送信箱に積む。
   * ネットワークへは出さない（理由は counter.ts のコメント参照）。
   */
  private buildCounter(result: AnalysisResult): CounterMail | undefined {
    const options = this.options.counter;
    const sales = result.groups.find((group) => group.group === 'sales');
    const values = collectFormValues(this.form);

    const decision = shouldCounter(options, {
      verdict: result.verdict,
      salesApplicable: sales?.applicable ?? false,
      salesScore: sales?.score ?? 0,
      email: values.email,
    });
    if (!decision.ok) {
      if (this.options.debug && options.enabled) {
        console.warn('[miyabarrier] お返しの営業は作りませんでした:', decision.reason);
      }
      return undefined;
    }

    const mail = buildCounterMail(options, {
      email: values.email,
      name: values.senderName,
      score: result.score,
      salesScore: sales?.score ?? 0,
      reasons: result.reasons.slice(0, 3),
      site: typeof location === 'undefined' ? '' : location.hostname,
      path: typeof location === 'undefined' ? '' : location.pathname,
      at: new Date().toISOString(),
    });

    const queued = queueCounterMail(mail, options.queueLimit);
    if (this.options.debug) {
      console.warn('[miyabarrier] お返しの営業を送信箱に積みました:', queued, mail.to);
    }
    this.options.onCounter?.(mail, { form: this.form });
    return mail;
  }

  /**
   * 前回の判定結果の表示をすべて消す。
   *
   * 判定パネル（理由・スコア内訳・お返しの営業の文面）とチェック行の状態は
   * **必ず一緒に**消すこと。片方だけ消すと、内容を書き換えたのに古いスコアと
   * 古い理由が残り続けることになる。
   */
  private clearVerdictUi(): void {
    this.panel?.remove();
    this.panel = undefined;
    setGuardState(this.checkboxRow, 'idle');
  }

  private showPanel(
    result: AnalysisResult,
    allowOverride: boolean,
    counterMail?: CounterMail,
  ): void {
    this.panel?.remove();
    const panel = createPanel(this.form.ownerDocument, {
      message: result.verdict === 'block' ? this.options.blockMessage : this.options.reviewMessage,
      result,
      debug: this.options.debug,
      ...(counterMail && this.options.counter.showOnScreen ? { counter: counterMail } : {}),
      ...(allowOverride
        ? {
            onOverride: () => {
              this.panel?.remove();
              this.panel = undefined;
              this.submitAnyway();
            },
          }
        : {}),
      onDismiss: () => {
        this.panel?.remove();
        this.panel = undefined;
      },
    });
    this.panel = panel;
    this.insertBeforeSubmit(panel);
    // 埋め込み環境やテスト用 DOM では実装がないことがあるので、あくまで任意扱いにする。
    panel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }

  /** 利用者が「それでも送信する」を選んだときに、判定を 1 回だけ迂回して送信する。 */
  submitAnyway(): void {
    this.allowNextSubmit = true;
    if (typeof this.form.requestSubmit === 'function') this.form.requestSubmit();
    else this.form.submit();
  }

  private handleSubmit(event: Event): void {
    if (this.allowNextSubmit) {
      this.allowNextSubmit = false;
      return;
    }

    const result = this.analyze();
    this.lastResult = result;

    if (this.options.log) {
      appendLog(
        {
          t: new Date().toISOString(),
          verdict: result.verdict,
          score: result.score,
          hard: result.hardBlocked,
          reasons: result.reasons,
          form: this.form.id || this.form.name || 'form',
          path: typeof location === 'undefined' ? '' : location.pathname,
        },
        this.options.logLimit,
      );
    }

    const hookResult = this.options.onVerdict?.(result, { form: this.form });
    const overriddenByHook = hookResult === false;

    if (this.options.debug) {
      console.warn('[miyabarrier]', result.verdict, result.score, result.reasons, result);
    }

    const counterMail = this.buildCounter(result);

    // チェック行にも結果を出す。送信が通ったことが分かる場所がないと、
    // 利用者は「押したのに何も起きていない」と感じる。
    setGuardState(
      this.checkboxRow,
      result.verdict === 'pass' ? 'verified' : result.verdict === 'review' ? 'review' : 'blocked',
    );

    if (this.options.mode === 'report' || overriddenByHook || result.verdict === 'pass') {
      this.panel?.remove();
      this.panel = undefined;
      return;
    }

    // 誤検知の逃げ道: warn モードでは常に、block モードでも review 判定なら送信を続行できる。
    const allowOverride = this.options.mode === 'warn' || result.verdict === 'review';

    event.preventDefault();
    event.stopImmediatePropagation();
    this.showPanel(result, allowOverride, counterMail);
  }

  destroy(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.length = 0;
    this.honeypot?.destroy();
    this.telemetry.destroy();
    this.panel?.remove();
    this.form.removeAttribute('data-miyabarrier-protected');
  }
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

const protectedForms = new Map<HTMLFormElement, ProtectedForm>();

export const protect = (
  target: HTMLFormElement | string,
  options: Partial<MiyabarrierOptions> = {},
): ProtectedForm | undefined => {
  const form =
    typeof target === 'string' ? document.querySelector<HTMLFormElement>(target) : target;
  if (!(form instanceof HTMLFormElement)) return undefined;
  const existing = protectedForms.get(form);
  if (existing) return existing;
  const protectedForm = new ProtectedForm(form, options);
  protectedForms.set(form, protectedForm);
  return protectedForm;
};

export const protectAll = (options: Partial<MiyabarrierOptions> = {}): ProtectedForm[] => {
  const resolved = resolveOptions(globalConfig(), readScriptConfig(scriptElement), options);
  return findForms(document, resolved.selector)
    .map((form) => protect(form, resolved))
    .filter((instance): instance is ProtectedForm => instance !== undefined);
};

/**
 * テキストだけを判定する（デモページや管理画面のプレビュー用）。
 * 行動・環境レイヤーは判定不能として扱われるため、スコアは Layer 4 / 6 の加重平均になる。
 */
export const analyzeText = (
  text: string,
  options: Partial<MiyabarrierOptions> = {},
): AnalysisResult => {
  const resolved = resolveOptions(options);
  const weights = buildWeights(resolved);
  const ngWords = mergeNgWords(defaultNgWords, resolved.ngWords);
  const content = { text, formLanguage: resolved.formLanguage };
  return scoreLayers(
    [
      evaluateContent(content, weights.layers.content, ngWords),
      evaluateAiText(content, weights.layers.aiText),
    ],
    weights,
  );
};

export const getLog = (): LogEntry[] => readLog();

export const clearLog = (): void => clearStoredLog();

export const destroyAll = (): void => {
  for (const instance of protectedForms.values()) instance.destroy();
  protectedForms.clear();
};

export const api = {
  version: VERSION,
  protect,
  protectAll,
  analyzeText,
  getLog,
  clearLog,
  getCounterQueue: readCounterQueue,
  clearCounterQueue,
  destroyAll,
  defaultOptions,
  defaultWeights,
  markSvg,
  defaultNgWords,
  instances: protectedForms,
};

export type MiyabarrierApi = typeof api;

if (typeof window !== 'undefined') {
  (window as unknown as { Miyabarrier: MiyabarrierApi }).Miyabarrier = api;

  const autoInit = (): void => {
    const resolved = resolveOptions(globalConfig(), readScriptConfig(scriptElement));
    if (resolved.autoInit === false) return;
    protectAll();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit, { once: true });
  } else {
    autoInit();
  }
}
