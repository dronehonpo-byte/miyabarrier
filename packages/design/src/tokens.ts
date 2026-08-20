/**
 * デザイントークン。widget（JS から style 注入）と dashboard / demo（静的 CSS）で
 * **同じ定義を共有する唯一の場所**。ここを直せば 4 つの画面すべてに反映される。
 *
 * 方針:
 * - Miyabee のブルーを主役にする。警告色は「点」で使い、面で使わない
 *   （黄×黒の警告テープ感を避け、上品さと信頼感を優先する）
 * - 色は必ずトークン経由。生の hex をコンポーネント側に書かない
 * - ライト / ダークは同じトークン名で値だけ差し替える
 * - Web フォントは使わない（外部通信ゼロという製品の性質を崩さないため）。
 *   代わりにシステムフォントのスタックと字送り・数字の等幅化で品を作る
 */

/** ライト／ダーク両方の CSS カスタムプロパティ。:root に一度だけ入れる。 */
const LIGHT = `
  color-scheme: light dark;

  /* Miyabee ブルー */
  --mb-brand-050: #eef3fe;
  --mb-brand-100: #dbe6fc;
  --mb-brand-200: #bcd0f8;
  --mb-brand-400: #5b8df0;
  --mb-brand-500: #3b72e8;
  --mb-brand-600: #2a5bd7;
  --mb-brand-700: #1e46ad;
  --mb-brand-800: #17357f;

  /* 面と線（わずかに青を含ませて、無彩色のグレーにしない） */
  --mb-canvas: #f6f8fc;
  --mb-surface: #ffffff;
  --mb-surface-2: #fbfcfe;
  --mb-surface-inset: #f2f5fa;
  --mb-line: #e3e8f1;
  --mb-line-strong: #cfd7e6;

  /* 文字 */
  --mb-ink-900: #0c1220;
  --mb-ink-700: #26314a;
  --mb-ink-500: #5b6780;
  --mb-ink-400: #7c879c;
  --mb-ink-300: #a3adbf;

  /* 判定の意味色。彩度を抑え、面ではなく点・細い帯で使う */
  --mb-block: #c0413a;
  --mb-block-soft: #fdf2f1;
  --mb-block-line: #f0cfcc;
  --mb-review: #9a6a12;
  --mb-review-soft: #fdf6e9;
  --mb-review-line: #ecdcba;
  --mb-pass: #1f7a5c;
  --mb-pass-soft: #eff8f4;
  --mb-pass-line: #c6e5d8;

  /* 高さ（影は極薄に留め、境界線で構造を作る） */
  --mb-shadow-sm: 0 1px 2px rgba(12, 18, 32, 0.04);
  --mb-shadow-md: 0 4px 16px -4px rgba(12, 18, 32, 0.1), 0 1px 2px rgba(12, 18, 32, 0.04);
  --mb-shadow-lg: 0 18px 48px -12px rgba(12, 18, 32, 0.22), 0 2px 6px rgba(12, 18, 32, 0.06);
  --mb-ring: 0 0 0 3px rgba(42, 91, 215, 0.16);

  /* 角丸・間隔 */
  --mb-r-sm: 6px;
  --mb-r-md: 10px;
  --mb-r-lg: 14px;
  --mb-r-full: 999px;

  /* 書体 */
  --mb-font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans',
    'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic UI', sans-serif;
  --mb-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Mono', Menlo, Consolas, monospace;`;

const DARK = `
  --mb-brand-050: #101a2e;
  --mb-brand-100: #16233d;
  --mb-brand-200: #24365c;
  --mb-brand-400: #6f9bf5;
  --mb-brand-500: #5b8df0;
  --mb-brand-600: #7aa6f7;
  --mb-brand-700: #9dbdfa;
  --mb-brand-800: #c3d6fc;

  --mb-canvas: #080b12;
  --mb-surface: #0f141f;
  --mb-surface-2: #131926;
  --mb-surface-inset: #161d2c;
  --mb-line: #212a3b;
  --mb-line-strong: #2f3a4f;

  --mb-ink-900: #eef1f6;
  --mb-ink-700: #ccd3e0;
  --mb-ink-500: #93a0b6;
  --mb-ink-400: #7a8699;
  --mb-ink-300: #5d6878;

  --mb-block: #f18a82;
  --mb-block-soft: #24161a;
  --mb-block-line: #4a2a28;
  --mb-review: #e0b45c;
  --mb-review-soft: #231c10;
  --mb-review-line: #453a1e;
  --mb-pass: #62c69f;
  --mb-pass-soft: #10201b;
  --mb-pass-line: #23453a;

  --mb-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --mb-shadow-md: 0 4px 16px -4px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4);
  --mb-shadow-lg: 0 18px 48px -12px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.5);
  --mb-ring: 0 0 0 3px rgba(122, 166, 247, 0.22);
`;

/** 判定 3 値に対応するトークン名。widget / dashboard で同じ色になるように使う。 */
export const VERDICT_TOKENS = {
  pass: { fg: 'var(--mb-pass)', soft: 'var(--mb-pass-soft)', line: 'var(--mb-pass-line)' },
  review: { fg: 'var(--mb-review)', soft: 'var(--mb-review-soft)', line: 'var(--mb-review-line)' },
  block: { fg: 'var(--mb-block)', soft: 'var(--mb-block-soft)', line: 'var(--mb-block-line)' },
} as const;

/** :root に一度だけ入れる形（dashboard / demo 用）。 */
export const tokensCss = `
:root {${LIGHT}}
@media (prefers-color-scheme: dark) {
  :root {${DARK}}
}
`;

/**
 * 任意のセレクタに閉じ込めた形（widget 用）。
 * 埋め込み先サイトの :root にカスタムプロパティを撒かないため、
 * widget は自分のルート要素（.mb-root）にだけトークンを定義する。
 */
export const scopedTokensCss = (selector: string): string => `
${selector} {${LIGHT}}
@media (prefers-color-scheme: dark) {
  ${selector} {${DARK}}
}
`;
