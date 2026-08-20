/**
 * フォームへの注入と、フォームからの値の取り出し。
 *
 * ハニーポットは「人間には見えないが、DOM を機械的に読む相手には魅力的に見える」ことが命なので、
 * name には url / website / company といった、自動入力が狙いやすい語をあえて残している。
 * 一方でスクリーンリーダー利用者に読まれてはいけないので aria-hidden と tabindex=-1 を必ず付ける。
 */
import type { HoneypotInput } from '@miyabarrier/core';

/** 隠しフィールドの見た目を殺すインラインスタイル（サイト側 CSS に負けないよう !important）。 */
const HIDDEN_STYLE = [
  'position:absolute !important',
  'left:-9999px !important',
  'top:auto !important',
  'width:1px !important',
  'height:1px !important',
  'overflow:hidden !important',
  'opacity:0 !important',
  'pointer-events:none !important',
].join(';');

/** 依存なしの軽量ハッシュ（FNV-1a）。秘密は JS のクロージャ内にしか存在しない。 */
const hash = (input: string): string => {
  let value = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(36);
};

export interface InjectedHoneypot {
  /** 注入したフィールド名（デバッグ表示用）。 */
  readonly names: string[];
  /** 送信時点の状態を core の入力形式で返す。 */
  state(): HoneypotInput;
  destroy(): void;
}

export interface HoneypotOptions {
  prefix?: string;
  /** おとりチェックボックスを混ぜるか。 */
  decoy?: boolean;
}

export const injectHoneypot = (
  form: HTMLFormElement,
  options: HoneypotOptions = {},
): InjectedHoneypot => {
  const doc = form.ownerDocument;
  const prefix = options.prefix ?? 'mb';
  const renderedAt = Date.now();
  // セッションごとのソルト。ページを読み込んだ JS の中にしか無いので、
  // DOM だけを書き換える相手はトークンを再計算できない。
  const salt = `${Math.random().toString(36).slice(2)}${renderedAt.toString(36)}`;

  const container = doc.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.setAttribute('data-miyabarrier', 'honeypot');
  container.setAttribute('style', HIDDEN_STYLE);

  const textFieldNames = [`${prefix}_website`, `${prefix}_company_url`];
  const decoyName = `${prefix}_sales_optin`;
  const tokenName = `${prefix}_t`;

  for (const name of textFieldNames) {
    const input = doc.createElement('input');
    input.type = 'text';
    input.name = name;
    input.tabIndex = -1;
    input.autocomplete = 'off';
    input.setAttribute('aria-hidden', 'true');
    // ラベルらしきテキストを添えて、DOM を読む相手には「本物の欄」に見えるようにする。
    const label = doc.createElement('label');
    label.textContent = name.includes('url') ? 'Company URL' : 'Website';
    label.setAttribute('aria-hidden', 'true');
    container.append(label, input);
  }

  let decoy: HTMLInputElement | undefined;
  if (options.decoy !== false) {
    decoy = doc.createElement('input');
    decoy.type = 'checkbox';
    decoy.name = decoyName;
    decoy.tabIndex = -1;
    decoy.setAttribute('aria-hidden', 'true');
    const decoyLabel = doc.createElement('label');
    decoyLabel.textContent = '営業目的の連絡を希望します';
    decoyLabel.setAttribute('aria-hidden', 'true');
    container.append(decoy, decoyLabel);
  }

  const token = doc.createElement('input');
  token.type = 'hidden';
  token.name = tokenName;
  token.setAttribute('aria-hidden', 'true');
  token.value = `${renderedAt}.${hash(`${renderedAt}${salt}`)}`;
  container.append(token);

  form.append(container);

  const names = [...textFieldNames, ...(decoy ? [decoyName] : [])];

  return {
    names,
    state(): HoneypotInput {
      const fields = textFieldNames.map((name) => {
        const element = container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        return { name, value: element?.value ?? '' };
      });
      const presentCount = textFieldNames.filter((name) =>
        container.querySelector(`input[name="${name}"]`),
      ).length;

      const tokenElement = container.querySelector<HTMLInputElement>(`input[name="${tokenName}"]`);
      const rawToken = tokenElement?.value ?? '';
      const [stamp, signature] = rawToken.split('.');
      const tokenValid =
        Boolean(stamp) && signature === hash(`${stamp}${salt}`) && Number(stamp) === renderedAt;

      return {
        fields,
        decoys: decoy ? [{ name: decoyName, checked: decoy.checked }] : [],
        expectedFieldCount: presentCount === 0 ? textFieldNames.length : presentCount,
        token: { present: rawToken.length > 0, valid: tokenValid },
      };
    },
    destroy(): void {
      container.remove();
    },
  };
};

// ---------------------------------------------------------------------------
// フォームの探索と値の取り出し
// ---------------------------------------------------------------------------

const NAME_FIELD_PATTERN = /(name|氏名|お名前|担当|company|会社|法人|organization)/i;
const SKIP_TYPES = new Set([
  'password',
  'hidden',
  'submit',
  'button',
  'reset',
  'file',
  'image',
  'checkbox',
  'radio',
  'range',
  'color',
]);
/** 本文としては扱わないが、文字数には数える型（URL 欄の値を URL スパム判定に混ぜないため）。 */
const NON_BODY_TYPES = new Set(['email', 'tel', 'url', 'number', 'date', 'time', 'datetime-local']);

export interface FormValues {
  text: string;
  senderName: string;
  /** 入力されたメールアドレス（お返しの営業の宛先に使う）。 */
  email: string;
  typedChars: number;
}

/**
 * ユーザーが入力した値を集める。
 * Miyabarrier 自身が注入した欄（data-miyabarrier 配下）は必ず除外する。
 */
export const collectFormValues = (form: HTMLFormElement): FormValues => {
  const bodyParts: string[] = [];
  let senderName = '';
  let email = '';
  let typedChars = 0;

  const elements = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');

  for (const element of elements) {
    if (element.closest('[data-miyabarrier]')) continue;
    if (element instanceof HTMLInputElement && SKIP_TYPES.has(element.type)) continue;
    const value = element.value ?? '';
    if (value.length === 0) continue;

    typedChars += value.length;

    const type = element instanceof HTMLInputElement ? element.type : 'textarea';
    const identity = `${element.name} ${element.id} ${element.getAttribute('placeholder') ?? ''}`;

    if (!senderName && NAME_FIELD_PATTERN.test(identity)) senderName = value;
    if (!email && (type === 'email' || /mail/i.test(identity))) email = value.trim();
    if (NON_BODY_TYPES.has(type)) continue;

    bodyParts.push(value);
  }

  return { text: bodyParts.join('\n'), senderName, email, typedChars };
};

/**
 * 保護対象のフォームを探す。
 * 検索欄やログインを誤って掴まないよう、既定では自由記述欄を持つフォームだけを対象にする。
 */
export const findForms = (doc: Document, selector?: string): HTMLFormElement[] => {
  if (selector) return [...doc.querySelectorAll<HTMLFormElement>(selector)];

  return [...doc.querySelectorAll('form')].filter((form) => {
    if (form.getAttribute('data-miyabarrier') === 'off') return false;
    if (form.querySelector('input[type="password"]')) return false;
    const hasTextarea = form.querySelector('textarea') !== null;
    const hasLongText =
      form.querySelectorAll('input[type="text"], input[type="email"], input:not([type])').length >=
      2;
    return hasTextarea || hasLongText;
  });
};
