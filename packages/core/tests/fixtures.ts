/**
 * テスト用のテレメトリ／文面のサンプル。
 *
 * 「人間らしい」データは乱数で作るが、テストが日によって落ちては意味がないので
 * 固定シードの線形合同法を使って毎回同じ列を生成する。
 */
import type {
  BehaviorInput,
  CheckboxInput,
  EnvironmentSnapshot,
  HoneypotInput,
} from '../src/types';

export const createRandom = (seed = 20260819) => {
  let state = seed >>> 0;
  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export const T0 = 1_770_000_000_000;

// ---------------------------------------------------------------------------
// 行動
// ---------------------------------------------------------------------------

export interface HumanBehaviorOptions {
  seed?: number;
  durationMs?: number;
  typedChars?: number;
  pointerSamples?: number;
  fields?: number;
}

/** 手ぶれ・打鍵の揺らぎ・欄移動のばらつきを含む、人間らしい操作列。 */
export const humanBehavior = (options: HumanBehaviorOptions = {}): BehaviorInput => {
  const {
    seed = 20260819,
    durationMs = 62_000,
    typedChars = 180,
    pointerSamples = 90,
    fields = 4,
  } = options;
  const random = createRandom(seed);

  const pointer = [];
  let x = 420;
  let y = 260;
  let t = T0 + 900;
  for (let i = 0; i < pointerSamples; i += 1) {
    // 大きく動く区間と、ほとんど止まっている区間が混ざるのが人間の特徴。
    const burst = random() < 0.25 ? 26 : 4;
    x += (random() - 0.5) * burst * 2 + (random() - 0.5) * 3;
    y += (random() - 0.5) * burst * 2 + (random() - 0.5) * 3;
    t += 35 + Math.floor(random() * 130);
    pointer.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, t });
  }

  const keys = [];
  let keyTime = T0 + 2_400;
  for (let i = 0; i < typedChars; i += 1) {
    const pause = random() < 0.08 ? 600 + random() * 2200 : 70 + random() * 190;
    keyTime += Math.round(pause);
    keys.push({ t: keyTime, field: `field${i % fields}` });
  }

  const focus = [];
  let focusTime = T0 + 1_800;
  for (let i = 0; i < fields; i += 1) {
    focusTime += Math.round(1_500 + random() * 12_000);
    focus.push({ field: `field${i}`, t: focusTime });
  }

  return {
    renderedAt: T0,
    submittedAt: T0 + durationMs,
    pointer,
    keys,
    focus,
    pastes: [],
    typedChars,
    touchEventCount: 0,
  };
};

/** 素朴な bot: 操作を一切せず、即座に submit する。 */
export const naiveBotBehavior = (): BehaviorInput => ({
  renderedAt: T0,
  submittedAt: T0 + 420,
  pointer: [],
  keys: [],
  focus: [],
  pastes: [],
  typedChars: 260,
  touchEventCount: 0,
});

/** 人間の操作を模倣する自動化: 動くが、揺らぎが機械的に均一。 */
export const mimicBehavior = (options: { typedChars?: number } = {}): BehaviorInput => {
  const { typedChars = 160 } = options;
  const pointer = [];
  let t = T0 + 500;
  for (let i = 0; i < 60; i += 1) {
    // 等速・等間隔で始点から終点へ移動する（ベジェ補間の典型）。
    pointer.push({ x: 300 + i * 6, y: 200 + i * 3, t });
    t += 25;
  }

  const keys = [];
  let keyTime = T0 + 3_000;
  for (let i = 0; i < typedChars; i += 1) {
    keyTime += 100; // 一定のスリープ
    keys.push({ t: keyTime, field: 'message' });
  }

  const focus = [];
  let focusTime = T0 + 2_000;
  for (let i = 0; i < 5; i += 1) {
    focusTime += 3_000; // 一定間隔で次の欄へ
    focus.push({ field: `field${i}`, t: focusTime });
  }

  return {
    renderedAt: T0,
    submittedAt: T0 + 45_000,
    pointer,
    keys,
    focus,
    pastes: [],
    typedChars,
    touchEventCount: 0,
  };
};

// ---------------------------------------------------------------------------
// 環境
// ---------------------------------------------------------------------------

export const humanEnvironment = (): EnvironmentSnapshot => ({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  webdriver: false,
  pluginCount: 5,
  languages: ['ja', 'ja-JP', 'en-US'],
  hasChromeObject: true,
  isChromium: true,
  screenWidth: 2560,
  screenHeight: 1440,
  innerWidth: 1512,
  innerHeight: 1234,
  outerWidth: 1536,
  outerHeight: 1392,
  devicePixelRatio: 1.25,
  hardwareConcurrency: 16,
  maxTouchPoints: 0,
  notificationPermission: 'default',
  permissionsQueryState: 'prompt',
});

export const headlessEnvironment = (): EnvironmentSnapshot => ({
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36',
  webdriver: true,
  pluginCount: 0,
  languages: [],
  hasChromeObject: false,
  isChromium: true,
  screenWidth: 1280,
  screenHeight: 720,
  innerWidth: 1280,
  innerHeight: 720,
  outerWidth: 0,
  outerHeight: 0,
  devicePixelRatio: 1,
  hardwareConcurrency: 1,
  maxTouchPoints: 0,
  notificationPermission: 'denied',
  permissionsQueryState: 'prompt',
});

// ---------------------------------------------------------------------------
// ハニーポット・チェックボックス
// ---------------------------------------------------------------------------

export const cleanHoneypot = (): HoneypotInput => ({
  fields: [
    { name: 'mb_website', value: '' },
    { name: 'mb_company_url', value: '' },
  ],
  decoys: [{ name: 'mb_sales_optin', checked: false }],
  expectedFieldCount: 2,
  token: { present: true, valid: true },
});

export const trippedHoneypot = (): HoneypotInput => ({
  fields: [
    { name: 'mb_website', value: 'https://example-sales.co.jp' },
    { name: 'mb_company_url', value: '' },
  ],
  decoys: [{ name: 'mb_sales_optin', checked: true }],
  expectedFieldCount: 2,
  token: { present: true, valid: true },
});

export const humanCheckbox = (): CheckboxInput => ({
  present: true,
  checked: true,
  renderedAt: T0,
  checkedAt: T0 + 38_000,
  trustedClick: true,
  pointerSamplesBeforeCheck: 64,
  toggleCount: 1,
});

export const scriptedCheckbox = (): CheckboxInput => ({
  present: true,
  checked: true,
  renderedAt: T0,
  checkedAt: T0 + 90,
  trustedClick: false,
  pointerSamplesBeforeCheck: 0,
  toggleCount: 1,
});

// ---------------------------------------------------------------------------
// 文面
// ---------------------------------------------------------------------------

/** 実際に届く「まっとうな問い合わせ」。 */
export const LEGIT_INQUIRY = `先日そちらで購入したコンロなんですが、点火ボタンを押しても火がつかないことが増えてきました。
保証期間内だと思うので修理をお願いできますか。あと、もし有償になる場合の見積もりも知りたいです。
週末しか家にいないので、土日に来てもらえると助かります。よろしくお願いします。`;

/** 典型的なコールドアプローチ営業。 */
export const SALES_PITCH = `突然のご連絡失礼いたします。株式会社サンプルマーケティングの田中と申します。
貴社ホームページを拝見し、ぜひご提案させていただきたくご連絡いたしました。
弊社では中小企業様向けにSEO対策とホームページ制作を提供しており、導入実績は300社を超えております。
検索順位の改善による集客力の向上と、業務効率化によるコスト削減を同時に実現できます。
初期費用0円のキャンペーン中で、まずは無料診断からお試しいただけます。
つきましては、30分ほどオンライン面談のお時間をいただけないでしょうか。ご都合のよい候補日をお知らせください。
なお、本メールは営業目的でお送りしております。ご不要でしたら配信停止のご連絡をお願いいたします。
--------------------
株式会社サンプルマーケティング 営業部 田中太郎
〒150-0001 東京都渋谷区サンプル1-2-3
TEL: 03-1234-5678 / FAX: 03-1234-5679
https://example-sales.co.jp`;

/** AI に書かせたような、均質で崩れのない営業文。 */
export const AI_SALES_PITCH = `お世話になっております。この度は貴社の事業内容を拝見しご連絡いたしました。
弊社では業務効率化を支援するサービスを提供しております。導入により生産性向上が期待できます。
主なメリットは以下の通りです。
・定型業務の工数削減を実現できます
・部門横断でのデータ連携が可能になります
・段階的な導入によりリスクを抑えられます
ご検討いただける場合は、詳細な資料をお送りいたします。
つきましては、一度お打ち合わせのお時間をいただけますと幸いです。
ご確認のほど、何卒よろしくお願い申し上げます。`;

/** 英語のスパム。 */
export const ENGLISH_SPAM = `Dear Sir or Madam,

I hope this email finds you well. We are a leading digital agency and we specialize in SEO services
that will get you on the first page of Google. We can also provide high quality backlinks and link building.

Let me know if you are interested and we can book a call. It is a free audit with no obligation.

Best regards,
John`;
