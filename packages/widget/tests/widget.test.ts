/**
 * @vitest-environment jsdom
 *
 * widget の DOM 周りのテスト。
 * 判定ロジックは core 側でテストしているので、ここでは
 * 「注入したものが正しく読めるか」「送信を止められるか」に集中する。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectFormValues, findForms, injectHoneypot } from '../src/inject';
import { FormTelemetry, readEnvironment } from '../src/telemetry';
import { ProtectedForm } from '../src/index';
import { SALES_PITCH } from '../../core/tests/fixtures';

const CONTACT_FORM = `
  <form id="contact">
    <input type="text" name="name" placeholder="お名前" />
    <input type="email" name="email" />
    <input type="url" name="site" />
    <textarea name="message"></textarea>
    <button type="submit">送信する</button>
  </form>
`;

/** パスワード欄を含むフォーム（ログイン系として除外されることの確認用）。 */
const FORM_WITH_PASSWORD = CONTACT_FORM.replace(
  '<textarea name="message"></textarea>',
  '<input type="password" name="unused" /><textarea name="message"></textarea>',
);

const setup = (html = CONTACT_FORM): HTMLFormElement => {
  document.body.innerHTML = html;
  return document.querySelector('form')!;
};

const fill = (form: HTMLFormElement, values: Record<string, string>): void => {
  for (const [name, value] of Object.entries(values)) {
    const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (field) field.value = value;
  }
};

/**
 * 人間の操作を再現する。ポインタの揺らぎ・打鍵間隔のばらつき・欄移動を
 * 実イベントとして流し、偽タイマーで時間を進める。
 * （fill() のように value を代入するだけでは、widget からは bot と区別できない）
 */
const typeLikeHuman = (form: HTMLFormElement, values: Record<string, string>): void => {
  let state = 20260819;
  const random = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  let x = 400;
  let y = 300;
  for (let i = 0; i < 40; i += 1) {
    const burst = random() < 0.25 ? 30 : 5;
    x += (random() - 0.5) * burst * 2 + (random() - 0.5) * 4;
    y += (random() - 0.5) * burst * 2 + (random() - 0.5) * 4;
    document.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: Math.round(x),
        clientY: Math.round(y),
        bubbles: true,
      }),
    );
    vi.advanceTimersByTime(45 + Math.floor(random() * 120));
  }

  for (const [name, value] of Object.entries(values)) {
    const field = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (!field) continue;
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(400 + Math.floor(random() * 2_000));

    for (const character of value) {
      field.value += character;
      field.dispatchEvent(new KeyboardEvent('keydown', { key: character, bubbles: true }));
      const pause = random() < 0.08 ? 700 + random() * 2_000 : 80 + random() * 200;
      vi.advanceTimersByTime(Math.round(pause));
    }
  }
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('ハニーポットの注入', () => {
  it('隠しフィールドを注入し、空なら何も報告しない', () => {
    const form = setup();
    const honeypot = injectHoneypot(form);
    const state = honeypot.state();

    expect(honeypot.names.length).toBeGreaterThan(0);
    expect(state.fields.every((field) => field.value === '')).toBe(true);
    expect(state.decoys?.[0]?.checked).toBe(false);
    expect(state.token?.valid).toBe(true);
  });

  it('画面から隠され、支援技術からも隠されている', () => {
    const form = setup();
    injectHoneypot(form);
    const container = form.querySelector('[data-miyabarrier="honeypot"]')!;
    expect(container.getAttribute('aria-hidden')).toBe('true');
    expect(container.getAttribute('style')).toContain('position:absolute');
    for (const input of container.querySelectorAll('input')) {
      expect(input.getAttribute('aria-hidden')).toBe('true');
    }
    for (const input of container.querySelectorAll('input[type="text"]')) {
      expect((input as HTMLInputElement).tabIndex).toBe(-1);
    }
  });

  it('隠しフィールドが埋められたら報告する', () => {
    const form = setup();
    const honeypot = injectHoneypot(form);
    const hidden = form.querySelector<HTMLInputElement>('input[name="mb_website"]')!;
    hidden.value = 'https://spam.example.com';
    expect(honeypot.state().fields.some((field) => field.value !== '')).toBe(true);
  });

  it('トークンを書き換えると改ざんとして検出される', () => {
    const form = setup();
    const honeypot = injectHoneypot(form);
    const token = form.querySelector<HTMLInputElement>('input[name="mb_t"]')!;
    token.value = `${Date.now()}.deadbeef`;
    const state = honeypot.state();
    expect(state.token?.present).toBe(true);
    expect(state.token?.valid).toBe(false);
  });

  it('destroy で痕跡を残さない', () => {
    const form = setup();
    const honeypot = injectHoneypot(form);
    honeypot.destroy();
    expect(form.querySelector('[data-miyabarrier="honeypot"]')).toBeNull();
  });
});

describe('フォームの値の取り出し', () => {
  it('本文・氏名・文字数を取り出す', () => {
    const form = setup();
    fill(form, {
      name: '山田太郎',
      email: 'taro@example.com',
      message: 'これは問い合わせ本文です。',
    });
    const values = collectFormValues(form);
    // 本文は自由記述欄とテキスト欄の連結（1 欄しかないフォームにも対応するため）。
    expect(values.text).toBe('山田太郎\nこれは問い合わせ本文です。');
    expect(values.senderName).toBe('山田太郎');
    expect(values.typedChars).toBe('山田太郎'.length + 'taro@example.com'.length + 13);
  });

  it('URL 欄の値を本文に混ぜない（URL スパム誤検知の防止）', () => {
    const form = setup();
    fill(form, { site: 'https://example.com', message: '在庫について教えてください。' });
    const values = collectFormValues(form);
    expect(values.text).not.toContain('https://example.com');
    expect(values.typedChars).toBeGreaterThan('在庫について教えてください。'.length);
  });

  it('パスワード欄と自分が注入した欄を除外する', () => {
    const form = setup(FORM_WITH_PASSWORD);
    injectHoneypot(form);
    fill(form, { unused: 'secret-password', message: '本文' });
    form.querySelector<HTMLInputElement>('input[name="mb_website"]')!.value = 'spam';
    const values = collectFormValues(form);
    expect(values.text).not.toContain('secret-password');
    expect(values.text).not.toContain('spam');
    expect(values.text).toBe('本文');
  });
});

describe('保護対象フォームの検出', () => {
  it('自由記述欄を持つフォームを拾う', () => {
    setup();
    expect(findForms(document)).toHaveLength(1);
  });

  it('検索フォームやログインフォームは拾わない', () => {
    document.body.innerHTML = `
      <form id="search"><input type="search" name="q" /><button>検索</button></form>
      <form id="login"><input type="text" name="user" /><input type="password" name="pw" /><button>login</button></form>
    `;
    expect(findForms(document)).toHaveLength(0);
  });

  it('パスワード欄があるフォームは対象外にする', () => {
    setup(FORM_WITH_PASSWORD);
    expect(findForms(document)).toHaveLength(0);
  });

  it('data-miyabarrier="off" のフォームを除外する', () => {
    document.body.innerHTML = CONTACT_FORM.replace(
      '<form id="contact">',
      '<form id="contact" data-miyabarrier="off">',
    );
    expect(findForms(document)).toHaveLength(0);
  });

  it('セレクタ指定を尊重する', () => {
    document.body.innerHTML = `${CONTACT_FORM}<form id="other"><textarea name="t"></textarea></form>`;
    expect(findForms(document, '#other')).toHaveLength(1);
  });
});

describe('入力方式ごとの計測', () => {
  /** 実際の Chrome では、日本語 IME 中の keydown は key='Process' になる。 */
  const imeType = (field: HTMLTextAreaElement, text: string): void => {
    for (const character of text) {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Process', bubbles: true }));
      field.value += character;
      field.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
  };

  it('IME 経由の日本語入力を打鍵として数える', () => {
    const form = setup();
    const telemetry = new FormTelemetry(form);
    const field = form.querySelector<HTMLTextAreaElement>('[name="message"]')!;
    imeType(field, 'こんにちは。修理をお願いします。');

    const behavior = telemetry.behavior(field.value.length);
    expect(behavior.keys.length).toBeGreaterThanOrEqual(field.value.length);
    expect(behavior.pastes).toHaveLength(0);
    telemetry.destroy();
  });

  it('IME 入力だけの送信を bot 扱いしない', () => {
    const form = setup();
    const guard = new ProtectedForm(form, { log: false });
    const field = form.querySelector<HTMLTextAreaElement>('[name="message"]')!;
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    imeType(field, '在庫と納期を教えてください。よろしくお願いします。');

    const codes =
      guard
        .analyze()
        .layers.find((layer) => layer.layer === 'behavior')
        ?.signals.map((signal) => signal.code) ?? [];
    expect(codes).not.toContain('behavior.noKeystrokes');
    expect(codes).not.toContain('behavior.noFocusEvents');
  });

  it('一度に大量の文字が入る入力は貼り付け相当として扱う', () => {
    const form = setup();
    const telemetry = new FormTelemetry(form);
    const field = form.querySelector<HTMLTextAreaElement>('[name="message"]')!;
    field.value = SALES_PITCH; // CDP の insertText や value 代入 + input 発火に相当
    field.dispatchEvent(new InputEvent('input', { bubbles: true }));

    const behavior = telemetry.behavior(field.value.length);
    expect(behavior.pastes).toHaveLength(1);
    expect(behavior.pastes[0]?.length).toBe(SALES_PITCH.length);
    telemetry.destroy();
  });

  it('paste イベントと input を二重に数えない', () => {
    const form = setup();
    const telemetry = new FormTelemetry(form);
    const field = form.querySelector<HTMLTextAreaElement>('[name="message"]')!;
    // jsdom には DataTransfer が無いので clipboardData を差し込む。
    const pasteEvent = new Event('paste', { bubbles: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => SALES_PITCH },
    });
    field.dispatchEvent(pasteEvent);
    field.value = SALES_PITCH;
    field.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(telemetry.behavior(field.value.length).pastes).toHaveLength(1);
    telemetry.destroy();
  });

  it('クリックもポインタ操作として数える（マウスを動かさない人向け）', () => {
    const form = setup();
    const telemetry = new FormTelemetry(form);
    document.dispatchEvent(
      new MouseEvent('pointerdown', { clientX: 10, clientY: 20, bubbles: true }),
    );
    expect(telemetry.pointerSampleCount()).toBe(1);
    telemetry.destroy();
  });
});

describe('環境スナップショット', () => {
  it('jsdom でも例外を出さずに読み取れる', () => {
    const snapshot = readEnvironment(window as unknown as Window & typeof globalThis);
    expect(snapshot.userAgent).toContain('jsdom');
    expect(snapshot.webdriver).toBe(false);
    expect(typeof snapshot.innerWidth).toBe('number');
  });

  it('window が無い環境でも落ちない', () => {
    expect(() => readEnvironment(undefined)).not.toThrow();
  });
});

describe('送信のフック', () => {
  /** jsdom は実送信を実装していないので、submit の既定動作の抑止で判定する。 */
  const submitAndDetect = (form: HTMLFormElement): boolean => {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it('チェックボックスとバッジを描画する', () => {
    const form = setup();
    new ProtectedForm(form, { badge: 'inline' });
    expect(form.querySelector('input[name="mb_confirm"]')).not.toBeNull();
    expect(form.querySelector('.mb-badge')).not.toBeNull();
    expect(document.getElementById('miyabarrier-style')).not.toBeNull();
    // チェックボックスは送信ボタンの手前に置く。
    const nodes = [...form.children];
    expect(nodes.indexOf(form.querySelector('.mb-check')!)).toBeLessThan(
      nodes.indexOf(form.querySelector('button')!),
    );
  });

  it('スタイルは 1 度しか注入しない', () => {
    document.body.innerHTML = `${CONTACT_FORM}<form id="second"><textarea name="t"></textarea></form>`;
    for (const form of document.querySelectorAll('form')) new ProtectedForm(form);
    expect(document.querySelectorAll('#miyabarrier-style')).toHaveLength(1);
  });

  it('営業文面の送信をブロックし、理由を表示する', () => {
    const form = setup();
    const guard = new ProtectedForm(form, { log: false });
    fill(form, { name: '田中', message: SALES_PITCH });

    expect(submitAndDetect(form)).toBe(true);
    expect(guard.lastResult?.verdict).toBe('block');
    const panel = form.querySelector('.mb-panel');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('alert');
    expect(panel?.querySelectorAll('.mb-reasons li').length).toBeGreaterThan(0);
  });

  it('ハニーポットが埋まっていれば内容に関係なくブロックする', () => {
    const form = setup();
    const guard = new ProtectedForm(form, { log: false });
    fill(form, { message: '在庫と納期を教えてください。修理の見積もりもお願いします。' });
    form.querySelector<HTMLInputElement>('input[name="mb_website"]')!.value =
      'https://spam.example';

    expect(submitAndDetect(form)).toBe(true);
    expect(guard.lastResult?.hardBlocked).toBe(true);
  });

  it('report モードでは止めずに記録だけする', () => {
    const form = setup();
    const onVerdict = vi.fn();
    const guard = new ProtectedForm(form, { mode: 'report', log: false, onVerdict });
    fill(form, { message: SALES_PITCH });

    expect(submitAndDetect(form)).toBe(false);
    expect(onVerdict).toHaveBeenCalledOnce();
    expect(guard.lastResult?.verdict).toBe('block');
  });

  it('onVerdict が false を返せばブロックを取り消せる', () => {
    const form = setup();
    new ProtectedForm(form, { log: false, onVerdict: () => false });
    fill(form, { message: SALES_PITCH });
    expect(submitAndDetect(form)).toBe(false);
  });

  it('「それでも送信する」で 1 回だけ判定を迂回する', () => {
    const form = setup();
    const guard = new ProtectedForm(form, { mode: 'warn', log: false });
    fill(form, { message: SALES_PITCH });
    expect(submitAndDetect(form)).toBe(true);

    const override = [...form.querySelectorAll<HTMLButtonElement>('.mb-btn')].find(
      (button) => button.textContent === 'それでも送信する',
    );
    expect(override).toBeDefined();

    // jsdom の requestSubmit は submit イベントを発火しないので、
    // 「迂回フラグが立った状態での submit は素通りし、その次は再び判定される」ことを見る。
    const requestSubmit = vi.fn();
    form.requestSubmit = requestSubmit as unknown as HTMLFormElement['requestSubmit'];
    override!.click();
    expect(requestSubmit).toHaveBeenCalledOnce();
    expect(form.querySelector('.mb-panel')).toBeNull();

    expect(submitAndDetect(form)).toBe(false); // 迂回が消費される
    expect(submitAndDetect(form)).toBe(true); // 迂回は 1 回限り
    expect(guard.lastResult?.verdict).toBe('block');
  });

  it('値を直接代入しただけの送信は自動化として扱う', () => {
    // 操作イベントを一切伴わない入力は、実際の bot の挙動そのもの。
    const form = setup();
    const guard = new ProtectedForm(form, { log: false });
    fill(form, { message: '在庫と納期について教えてください。よろしくお願いします。' });

    expect(submitAndDetect(form)).toBe(true);
    expect(guard.lastResult?.layers.find((layer) => layer.layer === 'behavior')?.score).toBe(1);
  });

  it('人間の操作を伴う正当な問い合わせは通す', () => {
    vi.useFakeTimers({ now: 1_770_000_000_000 });
    try {
      const form = setup();
      const guard = new ProtectedForm(form, { log: false });
      typeLikeHuman(form, {
        name: '鈴木',
        email: 'suzuki@example.com',
        message:
          '先週購入した製品が動作しません。保証期間内だと思うので修理をお願いできますか。有償になる場合の見積もりも知りたいです。',
      });

      expect(submitAndDetect(form)).toBe(false);
      expect(form.querySelector('.mb-panel')).toBeNull();
      expect(guard.lastResult?.verdict).toBe('pass');
      // 行動・模倣レイヤーが「人間らしい」と判断していること。
      expect(guard.lastResult?.layers.find((layer) => layer.layer === 'behavior')?.score).toBe(0);
      expect(guard.lastResult?.layers.find((layer) => layer.layer === 'mimicry')?.score).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('destroy で注入物とイベントを片付ける', () => {
    const form = setup();
    const guard = new ProtectedForm(form, { log: false });
    guard.destroy();
    expect(form.querySelector('[data-miyabarrier="honeypot"]')).toBeNull();
    expect(form.querySelector('.mb-check')).toBeNull();
    expect(form.hasAttribute('data-miyabarrier-protected')).toBe(false);
    fill(form, { message: SALES_PITCH });
    expect(submitAndDetect(form)).toBe(false);
  });
});
