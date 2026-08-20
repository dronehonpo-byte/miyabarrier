/**
 * シグナル code の一覧と日本語ラベル。
 *
 * ここと weights.json の layers[].points は 1:1 で対応していなければならない
 * （tests/patterns.test.ts が両方向の欠落を検査する）。
 */

export const SIGNAL_LABELS: Record<string, string> = {
  // Layer 1
  'honeypot.filled': '人間には見えない隠しフィールドに入力があった',
  'honeypot.decoyChecked': '人間なら触らないおとりのチェックボックスがオンになっていた',
  'honeypot.fieldMissing': '注入した隠しフィールドが削除されていた',
  'honeypot.tokenMissing': 'フォームに埋め込んだトークンが欠落していた',
  'honeypot.tokenTampered': 'フォームに埋め込んだトークンが改ざんされていた',

  // Layer 2
  'behavior.instantSubmit': '表示から送信までが短すぎる',
  'behavior.fastSubmit': '入力にかけた時間が不自然に短い',
  'behavior.noMouseActivity': 'マウス／タッチの操作がまったく観測されなかった',
  'behavior.noFocusEvents': '入力欄へのフォーカス操作が観測されなかった',
  'behavior.impossibleTypingSpeed': '人間には出せない速度で文字が入力された',
  'behavior.noKeystrokes': 'キー入力なしで本文が埋まっていた',
  'behavior.pastedBody': '本文がまとめて貼り付けられた',
  'behavior.staleForm': 'フォームを開いたまま長時間放置されていた',

  // Layer 2.5
  'env.webdriver': 'ブラウザ自動化フラグ (navigator.webdriver) が立っている',
  'env.headlessUserAgent': 'ヘッドレスブラウザの User-Agent',
  'env.automationUserAgent': '自動化ツールの User-Agent',
  'env.botUserAgent': 'クローラー／HTTP クライアントの User-Agent',
  'env.noPlugins': 'プラグインが 1 つも存在しない',
  'env.chromeObjectMissing': 'Chromium 系なのに window.chrome が存在しない',
  'env.noLanguages': '言語設定が空',
  'env.viewportEqualsScreen': 'ビューポートと画面解像度が完全に一致している',
  'env.zeroOuterWindow': 'ウィンドウの外形サイズが 0',
  'env.touchInconsistency': 'タッチ対応の申告と実際の操作が矛盾している',
  'env.suspiciousHardwareConcurrency': 'CPU コア数の申告が不自然',
  'env.permissionsInconsistency': '通知許可の状態に矛盾がある',

  // Layer 2.6
  'mimicry.uniformMouseSpeed': 'マウス速度のばらつきが小さすぎる',
  'mimicry.straightMousePath': 'マウス軌跡が直線的すぎる',
  'mimicry.quantizedMouseSteps': 'マウスの移動量が等間隔に量子化されている',
  'mimicry.uniformKeyIntervals': 'キー入力間隔が一定すぎる',
  'mimicry.quantizedKeyIntervals': 'キー入力間隔が特定の値に張り付いている',
  'mimicry.uniformFieldTransitions': '入力欄の移動間隔が一定すぎる',
  'mimicry.noJitter': 'ポインタの微細な揺れがない',

  // Layer 3
  'checkbox.unchecked': '確認チェックボックスがオンになっていない',
  'checkbox.programmaticCheck': 'チェックがスクリプトから操作された',
  'checkbox.instantCheck': '表示直後にチェックされた',
  'checkbox.noPointerTrail': 'チェック前のポインタ操作が観測されなかった',
  'checkbox.excessiveToggles': 'チェックの切り替え回数が異常に多い',

  // Layer 4
  'content.ngWords': '営業文面に典型的な表現が含まれている',
  'content.urlSpam': '本文に含まれる URL が多い',
  'content.companyIntroOpening': '冒頭が法人格つきの自己紹介で始まっている',
  'content.signatureBlock': '会社情報を並べた署名ブロックがある',
  'content.noJapaneseOnJapaneseForm': '日本語フォームに日本語がまったく含まれていない',

  // Layer 6
  'ai.uniformSentenceLength': '文の長さが均質すぎる',
  'ai.politeTemplateDensity': '定型的な丁寧表現の密度が高い',
  'ai.lowBurstiness': '文章のリズムに揺らぎがない',
  'ai.structuredListing': '箇条書き中心の整った構成になっている',
  'ai.noTypos': '口語的な崩れや打ち間違いがまったくない',
};

export const SIGNAL_CODES = Object.keys(SIGNAL_LABELS);

export const signalLabel = (code: string): string => SIGNAL_LABELS[code] ?? code;
