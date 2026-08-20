/**
 * お返しの営業（カウンターピッチ）。
 *
 * 「営業と判定したら、こちらの営業文を送り返す」ための仕組み。
 *
 * ■ なぜ自動送信しないのか（重要）
 * フォームに入力されたアドレスへ広告メールを自動送信するのは、次の 3 点で危険なので
 * **既定では送信しない**。生成した文面は「送信箱」（localStorage）に溜まるだけで、
 * 送るかどうかは人間が宛先を見て決める（Miyabarrier.getCounterQueue() で取り出す）。
 *
 * 1. 法令: 日本の特定電子メール法は広告メールを原則オプトイン（事前同意）としている。
 *    フォームに入力された直後のアドレスは同意を得た宛先ではない。
 * 2. なりすまし: 入力されたアドレスは検証されていない。bot が第三者のアドレスを
 *    書き込めば、こちらが無関係な人へスパムを送る加害者になる（バックスキャッタ）。
 * 3. 配信評価: 自動返信の連鎖や苦情で、自社ドメインの送信評価が落ちる。
 *
 * サーバー側で自動送信したい場合は onCounter フックから自分のエンドポイントへ
 * 渡せるようにしてある。そこから先は運用者の判断。
 */

/** 送信箱の localStorage キー。 */
export const COUNTER_STORAGE_KEY = 'miyabarrier:counter';

export interface CounterOptions {
  /** お返しの営業を作るか。既定は false（文面を用意しないと意味がないため）。 */
  enabled: boolean;
  /** これ以上の「営業らしさ」スコアで作る（0〜1）。 */
  minSalesScore: number;
  /** 件名。プレースホルダを使える。 */
  subject: string;
  /** 本文。プレースホルダを使える。 */
  body: string;
  /** ブロック画面にも文面を出すか（相手にその場で読ませる）。 */
  showOnScreen: boolean;
  /** 送信箱に溜める上限件数。 */
  queueLimit: number;
}

export const defaultCounterOptions: CounterOptions = {
  enabled: false,
  minSalesScore: 0.6,
  subject: 'ご連絡ありがとうございます（{{site}} より）',
  body: `{{name}} 様

お問い合わせフォームよりご連絡いただきありがとうございます。
いただいた内容は営業・勧誘のご案内と判断したため、恐れ入りますが対応いたしかねます。

せっかくのご縁ですので、こちらからもご案内をお送りいたします。
（ここに自社のサービス紹介を書いてください）

{{site}}
`,
  showOnScreen: true,
  queueLimit: 50,
};

export interface CounterContext {
  /** 入力されたメールアドレス。 */
  email: string;
  /** 入力された氏名。空なら「ご担当者」を使う。 */
  name: string;
  /** 総合スコア。 */
  score: number;
  /** 営業らしさのスコア。 */
  salesScore: number;
  /** 判定理由（先頭のいくつか）。 */
  reasons: string[];
  /** サイトのホスト名。 */
  site: string;
  /** 送信されたページのパス。 */
  path: string;
  /** ISO 8601 の時刻。 */
  at: string;
}

export interface CounterMail {
  to: string;
  subject: string;
  body: string;
  /** 生成の根拠（送信箱で確認できるように残す）。 */
  context: CounterContext;
}

/** ざっくりしたメールアドレスの形式チェック。宛先が壊れていたら作らない。 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

export const isPlausibleEmail = (value: string): boolean =>
  value.length <= 254 && EMAIL_PATTERN.test(value.trim());

export interface CounterDecision {
  ok: boolean;
  /** 作らなかった理由（デバッグ表示用）。 */
  reason?: string;
}

/**
 * お返しの営業を作るべきか。
 * 「営業らしさ」が十分に高いときだけにする。bot らしさ（automation）が理由で
 * 止まった送信は、相手が人間の営業とは限らないため対象にしない。
 */
export const shouldCounter = (
  options: CounterOptions,
  input: { verdict: string; salesApplicable: boolean; salesScore: number; email: string },
): CounterDecision => {
  if (!options.enabled) return { ok: false, reason: '無効' };
  if (input.verdict === 'pass') return { ok: false, reason: '通過した送信' };
  if (!input.salesApplicable) return { ok: false, reason: '文面が判定対象外（短すぎるなど）' };
  if (input.salesScore < options.minSalesScore) {
    return { ok: false, reason: `営業らしさ ${input.salesScore.toFixed(2)} がしきい値未満` };
  }
  if (!isPlausibleEmail(input.email)) return { ok: false, reason: '有効なメールアドレスがない' };
  return { ok: true };
};

/** プレースホルダを埋める。未知のプレースホルダは空文字にする。 */
export const renderTemplate = (template: string, context: CounterContext): string =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    switch (key) {
      case 'name':
        return context.name || 'ご担当者';
      case 'email':
        return context.email;
      case 'score':
        return context.score.toFixed(2);
      case 'salesScore':
        return context.salesScore.toFixed(2);
      case 'reasons':
        return context.reasons.join('\n');
      case 'site':
        return context.site;
      case 'path':
        return context.path;
      case 'date':
        return context.at.slice(0, 10);
      default:
        return '';
    }
  });

export const buildCounterMail = (
  options: CounterOptions,
  context: CounterContext,
): CounterMail => ({
  to: context.email.trim(),
  subject: renderTemplate(options.subject, context).replace(/\s+/g, ' ').trim(),
  body: renderTemplate(options.body, context),
  context,
});

// ---------------------------------------------------------------------------
// 送信箱（localStorage）
// ---------------------------------------------------------------------------

export const readCounterQueue = (): CounterMail[] => {
  try {
    const raw = localStorage.getItem(COUNTER_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CounterMail[]) : [];
  } catch {
    return [];
  }
};

/**
 * 送信箱に積む。同じ宛先が既に入っていれば積まない
 * （同じ相手に何通も溜まると、うっかり連投する事故につながる）。
 */
export const queueCounterMail = (
  mail: CounterMail,
  limit: number,
): 'queued' | 'duplicate' | 'failed' => {
  try {
    const queue = readCounterQueue();
    if (queue.some((entry) => entry.to.toLowerCase() === mail.to.toLowerCase())) return 'duplicate';
    const next = [...queue, mail].slice(-Math.max(1, limit));
    localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(next));
    return 'queued';
  } catch {
    return 'failed';
  }
};

/** 送信箱から 1 件だけ取り除く（送った / 送らないと決めた宛先）。 */
export const removeCounterMail = (to: string): void => {
  try {
    const next = readCounterQueue().filter((entry) => entry.to.toLowerCase() !== to.toLowerCase());
    localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
};

export const clearCounterQueue = (): void => {
  try {
    localStorage.removeItem(COUNTER_STORAGE_KEY);
  } catch {
    /* noop */
  }
};

/**
 * mailto: の URL。運用者自身のメールソフトで開いて、人間が確認して送るための導線。
 * Miyabarrier.counterMailtoUrl(mail) として公開している。
 */
export const mailtoUrl = (mail: CounterMail): string =>
  `mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
