/**
 * Miyabee のマークを SVG として組み立てる。
 *
 * 画像を同梱せずに済ませるため、ロゴの構造を再構成している。
 * 構造は「120 度ずつ配置した 3 つの輪」で、各輪は同心楕円のワイヤーフレーム。
 * 内側の（小さい）楕円を外へずらすことで輪の穴が外側に寄り、
 * 3 つの輪が中心付近で重なって密になる — というのが元のロゴの見え方。
 *
 * ラスタ画像を持たないので、どのサイズでも鮮明で、色はトークンから差し替えられる。
 * 公式のロゴファイルに差し替える場合は、markSvg() の戻り値をその内容に置き換えるだけでよい。
 */

export interface MarkOptions {
  /** ワイヤーフレームの線幅（viewBox 100 基準）。 */
  strokeWidth?: number;
  /** 輪 1 つあたりの楕円の本数。多いほど密になる。 */
  rings?: number;
  /** 輪の中心を原点からどれだけ離すか。 */
  offset?: number;
  /** 最大の楕円の長半径。 */
  radius?: number;
  /** 最小の楕円の長半径（輪の穴の大きさ）。 */
  innerRadius?: number;
  /** 長半径に対する短半径の比。1 に近いほど円に近い。 */
  flatten?: number;
  /** 楕円の傾き（度）。輪の向きを決める。 */
  tilt?: number;
  /** 小さい楕円を外側へどれだけ逃がすか（穴の位置）。 */
  drift?: number;
  /** グラデーションの id 接頭辞（同一ページで複数使うときの衝突回避）。 */
  idPrefix?: string;
  /** currentColor の単色で描く（バッジなど）。 */
  monochrome?: boolean;
}

const LOBES = 3;

type Resolved = Required<Omit<MarkOptions, 'idPrefix' | 'monochrome'>>;

const DEFAULTS: Resolved = {
  strokeWidth: 0.8,
  rings: 14,
  offset: 16,
  radius: 33,
  innerRadius: 12,
  flatten: 0.64,
  tilt: 116,
  drift: 11,
};

/**
 * 24px 以下で使うための簡略版。
 * ワイヤーフレームは小さくすると線が潰れて団子になるので、
 * 輪の本数を減らして線を太くし、3 枚羽のシルエットだけが残るようにする。
 */
export const COMPACT: MarkOptions = { rings: 5, strokeWidth: 2.2, innerRadius: 16, drift: 6 };

/** 輪 1 つ ＝ 中心を少しずつ外へずらした同心楕円の集合。 */
const ring = (angle: number, o: Resolved): string => {
  const parts: string[] = [];
  const radians = (angle * Math.PI) / 180;
  for (let i = 0; i < o.rings; i += 1) {
    const t = o.rings === 1 ? 1 : i / (o.rings - 1);
    const rx = o.innerRadius + (o.radius - o.innerRadius) * t;
    const ry = rx * o.flatten;
    // 小さい楕円ほど外側へ逃がす → 穴が外寄りになり、中心側が密になる
    const distance = o.offset + (1 - t) * o.drift;
    const cx = Math.cos(radians) * distance;
    const cy = Math.sin(radians) * distance;
    const rotation = angle + o.tilt;
    const opacity = (0.45 + 0.55 * (1 - t * 0.55)).toFixed(3);
    parts.push(
      `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" transform="rotate(${rotation.toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})" opacity="${opacity}"/>`,
    );
  }
  return parts.join('');
};

/** マーク単体。viewBox は -50 -50 100 100。 */
export const markSvg = (options: MarkOptions = {}): string => {
  const o: Resolved = { ...DEFAULTS, ...options };
  const prefix = options.idPrefix ?? 'mb-logo';
  const stroke = options.monochrome ? 'currentColor' : `url(#${prefix}-grad)`;
  const core = options.monochrome ? 'currentColor' : `url(#${prefix}-core)`;

  const rings = Array.from({ length: LOBES }, (_, index) =>
    ring(index * (360 / LOBES) - 96, o),
  ).join('');

  const defs = options.monochrome
    ? ''
    : `<defs>
<linearGradient id="${prefix}-grad" x1="-38" y1="-42" x2="34" y2="44" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="var(--mb-brand-400, #5b8df0)"/>
<stop offset="0.5" stop-color="var(--mb-brand-600, #2a5bd7)"/>
<stop offset="1" stop-color="var(--mb-brand-700, #1e46ad)"/>
</linearGradient>
<radialGradient id="${prefix}-core" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="var(--mb-brand-700, #1e46ad)"/>
<stop offset="1" stop-color="var(--mb-brand-600, #2a5bd7)" stop-opacity="0"/>
</radialGradient></defs>`;

  return `<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">${defs}<g stroke="${stroke}" stroke-width="${o.strokeWidth}">${rings}</g><ellipse cx="-2" cy="1" rx="12" ry="10" fill="${core}" opacity="${options.monochrome ? 0.5 : 0.85}"/></svg>`;
};

const MARK_OPEN =
  '<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';

/** マーク + ワードマークの横並びロックアップ。ヘッダー用。 */
export const lockupSvg = (options: MarkOptions = {}): string => {
  const inner = markSvg({ ...options, idPrefix: options.idPrefix ?? 'mb-lockup' })
    .replace(MARK_OPEN, '')
    .replace('</svg>', '');
  return `<svg viewBox="0 0 264 64" xmlns="http://www.w3.org/2000/svg" fill="none" role="img" aria-label="Miyabarrier">
<g transform="translate(30 32) scale(0.56)">${inner}</g>
<text x="66" y="41" font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="27" font-weight="640" letter-spacing="-0.8" fill="var(--mb-ink-900, #0c1220)">Miyabarrier</text>
</svg>`;
};
