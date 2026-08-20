/**
 * Miyabarrier core の型定義。
 *
 * core は DOM にもネットワークにも触らない。widget 側が計測した「スナップショット」を
 * 受け取って判定するだけの純関数群なので、そのまま Node 上でユニットテストできる。
 */

export type LayerId =
  'honeypot' | 'behavior' | 'environment' | 'mimicry' | 'checkbox' | 'content' | 'aiText';

/** 各レイヤーが出力する「疑わしさの根拠」1 件。 */
export interface Signal {
  /** weights.json の layers[].points のキーと対応する識別子。 */
  code: string;
  /** 0〜1。加点は points * intensity になる。省略時は 1。 */
  intensity?: number;
  /** 人間向けの補足（デバッグ表示・ダッシュボード用）。 */
  detail?: string;
}

export type MetricValue = number | string | boolean | null;

/** 1 レイヤーの判定結果。 */
export interface LayerResult {
  layer: LayerId;
  /** 判定に必要なデータが揃っていたか。false のレイヤーは加重平均の母数から外れる。 */
  applicable: boolean;
  signals: Signal[];
  /** 判定の根拠になった生の計測値（しきい値調整・デバッグ用）。 */
  metrics: Record<string, MetricValue>;
  /** applicable が false のときの理由。 */
  skipped?: string;
}

// ---------------------------------------------------------------------------
// Layer 1: ハニーポット
// ---------------------------------------------------------------------------

export interface HoneypotField {
  name: string;
  /** 人間には見えないフィールドなので、常に空であるべき。 */
  value: string;
}

export interface HoneypotDecoy {
  name: string;
  /** 「営業目的です」等の反転チェックボックス。人間なら触らない。 */
  checked: boolean;
}

export interface HoneypotInput {
  fields: HoneypotField[];
  decoys?: HoneypotDecoy[];
  /** widget が注入したはずのフィールド数。実数と合わなければ DOM 改変を疑う。 */
  expectedFieldCount?: number;
  /** 描画時刻を埋め込んだトークン。欠落・改ざんは自動化の痕跡。 */
  token?: { present: boolean; valid: boolean };
}

// ---------------------------------------------------------------------------
// Layer 2 / 2.6: 行動解析
// ---------------------------------------------------------------------------

export interface PointerSample {
  x: number;
  y: number;
  /** ページ読み込みからの相対時刻ではなく、epoch ミリ秒で揃える。 */
  t: number;
}

export interface KeySample {
  t: number;
  field?: string;
}

export interface FocusSample {
  field: string;
  t: number;
}

export interface PasteSample {
  field: string;
  t: number;
  length: number;
}

export interface BehaviorInput {
  /** フォームが操作可能になった時刻。 */
  renderedAt: number;
  /** submit がトリガーされた時刻。 */
  submittedAt: number;
  pointer: PointerSample[];
  keys: KeySample[];
  focus: FocusSample[];
  pastes: PasteSample[];
  /** 実際にフォームへ入力された文字数の合計。 */
  typedChars: number;
  /** タッチ操作の有無（モバイルではポインタ軌跡が取れないため）。 */
  touchEventCount?: number;
}

// ---------------------------------------------------------------------------
// Layer 2.5: 実行環境
// ---------------------------------------------------------------------------

export interface EnvironmentSnapshot {
  userAgent: string;
  webdriver?: boolean;
  pluginCount?: number;
  languages?: string[];
  hasChromeObject?: boolean;
  /** UA から判定した Chromium 系かどうか。window.chrome の欠落判定に使う。 */
  isChromium?: boolean;
  screenWidth?: number;
  screenHeight?: number;
  innerWidth?: number;
  innerHeight?: number;
  outerWidth?: number;
  outerHeight?: number;
  devicePixelRatio?: number;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
  /** Notification の許可状態。'denied' かつ Notification.permission が 'default' 等の矛盾を見る。 */
  notificationPermission?: string;
  /** headless Chrome は permissions.query が prompt を返しつつ permission は denied になりやすい。 */
  permissionsQueryState?: string;
}

// ---------------------------------------------------------------------------
// Layer 3: チェックボックス認証
// ---------------------------------------------------------------------------

export interface CheckboxInput {
  /** サイト運営者がチェックボックス UI を無効化している場合は false。 */
  present: boolean;
  checked: boolean;
  renderedAt: number;
  checkedAt?: number | null;
  /** イベントの isTrusted。false ならスクリプトによるクリック。 */
  trustedClick?: boolean;
  /** チェック直前までに観測できたポインタ／タッチのサンプル数。 */
  pointerSamplesBeforeCheck?: number;
  toggleCount?: number;
}

// ---------------------------------------------------------------------------
// Layer 4 / 6: テキスト内容
// ---------------------------------------------------------------------------

export interface ContentInput {
  /** 本文（複数フィールドを結合したもの）。 */
  text: string;
  /** 氏名・会社名など、本文とは別に取れた値。会社紹介パターンの判定に使う。 */
  senderName?: string;
  /** フォームの想定言語。'ja' のとき日本語をまったく含まない本文を弱いシグナルにする。 */
  formLanguage?: 'ja' | 'en' | 'auto';
}

// ---------------------------------------------------------------------------
// パターン定義（patterns/*.json と 1:1）
// ---------------------------------------------------------------------------

export interface NgWordCategory {
  id: string;
  label: string;
  /** 1 語ヒットごとの加点。負値は減点。 */
  score: number;
  /** このカテゴリ単体の加点上限（score が負なら下限）。 */
  cap: number;
  terms: string[];
  patterns?: string[];
}

export interface NgWordList {
  $schema?: string;
  version: number;
  updated?: string;
  locale?: string[];
  notes?: string[];
  categories: NgWordCategory[];
  allowlist?: { notes?: string; terms?: string[] };
}

/** レイヤーが属する疑いのグループ。 */
export type GroupId = 'automation' | 'sales';

export interface LayerWeightConfig {
  label?: string;
  /** 所属グループ。省略時は 'automation' として扱う。 */
  group?: GroupId;
  /** グループ内での相対的な重み。 */
  weight: number;
  /**
   * true にすると、加点があるときだけ加重平均の母数に入る。
   * ハニーポットのような「引っかかれば証拠、無反応なら何の情報でもない」レイヤー用。
   * （正直な利用者もハニーポットを知っている bot も、どちらも無反応になる。
   * 無反応を『人間らしさ』として平均に混ぜると、他レイヤーの証拠を薄めてしまう。）
   */
  evidenceOnly?: boolean;
  /** このレイヤーが 1.0 になる加点の合計。 */
  saturation: number;
  points: Record<string, number>;
  tuning?: Record<string, unknown>;
}

export interface GroupConfig {
  label?: string;
  /** グループスコアの効き方。1 で等倍。 */
  weight: number;
}

export interface WeightConfig {
  $schema?: string;
  version: number;
  updated?: string;
  notes?: string[];
  thresholds: { review: number; block: number };
  /** グループスコアの合成方法。既定は noisy-or。 */
  combine?: 'noisy-or' | 'weighted-mean';
  groups?: Record<string, GroupConfig>;
  hardBlock?: string[];
  layers: Record<string, LayerWeightConfig>;
}

// ---------------------------------------------------------------------------
// 統合判定
// ---------------------------------------------------------------------------

export type VerdictLevel = 'pass' | 'review' | 'block';

export interface ScoredSignal {
  code: string;
  intensity: number;
  points: number;
  label: string;
  detail?: string;
}

export interface ScoredLayer {
  layer: LayerId;
  label: string;
  group: GroupId;
  weight: number;
  applicable: boolean;
  /** グループスコアの計算に実際に算入されたか。 */
  counted: boolean;
  /** 0〜1 に正規化したレイヤースコア。 */
  score: number;
  points: number;
  saturation: number;
  signals: ScoredSignal[];
  metrics: Record<string, MetricValue>;
  skipped?: string;
}

export interface ScoredGroup {
  group: GroupId;
  label: string;
  weight: number;
  /** グループ内の判定できたレイヤーの加重平均。 */
  score: number;
  applicable: boolean;
}

export interface AnalysisResult {
  /** 0〜1 の総合スコア。1 に近いほど営業／bot の疑いが強い。 */
  score: number;
  /** グループ別のスコア。どちらの疑いで引っかかったのかを説明するために使う。 */
  groups: ScoredGroup[];
  verdict: VerdictLevel;
  /** hardBlock シグナルによる即時ブロックだったか。 */
  hardBlocked: boolean;
  thresholds: { review: number; block: number };
  layers: ScoredLayer[];
  /** スコアへの寄与が大きい順に並べた説明文。 */
  reasons: string[];
  /** weights.json に未登録の code など、設定側の問題。 */
  warnings: string[];
}

export interface AnalysisInput {
  honeypot?: HoneypotInput;
  behavior?: BehaviorInput;
  environment?: EnvironmentSnapshot;
  checkbox?: CheckboxInput;
  content?: ContentInput;
}

export interface AnalyzeOptions {
  weights?: WeightConfig;
  ngWords?: NgWordList;
}
