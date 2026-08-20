# 🛡️ Miyabarrier

**問い合わせフォームに 1 行貼るだけで、営業目的の送信・bot・AI エージェントによる自動送信をブロックする OSS ライブラリ。**

サーバー不要・API キー不要・外部通信ゼロ。判定はすべて閲覧者のブラウザ内で完結します。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
![dependencies: none](https://img.shields.io/badge/dependencies-none-brightgreen)
![gzip](https://img.shields.io/badge/gzip-about%2021KB-blue)

```html
<script
  src="https://cdn.jsdelivr.net/gh/dronehonpo-byte/miyabarrier@v0.2.0/packages/widget/dist/miyabarrier.min.js"
  defer
></script>
```

これだけで、ページ内の問い合わせフォームが自動的に保護されます。設置後の設定作業はありません。

👉 **[デモページで試す](https://dronehonpo-byte.github.io/miyabarrier/examples/demo.html)**（営業文を貼ると警告が出ます。bot の動きも再現できます）

---

## なぜ作ったか

問い合わせフォームに届く迷惑送信は、いま 3 種類に分かれています。

1. **素朴な bot** — フォームを機械的に埋めて送るだけ。CAPTCHA でだいたい止まる。
2. **人力の営業** — 人間が手で打ち込む売り込み。CAPTCHA では止まらない。
3. **AI エージェント** — マウスを動かし、人間らしい速度で入力し、CAPTCHA も解く。

Miyabarrier は 3 つすべてを対象にします。「機械かどうか」だけでなく「営業・勧誘の文面かどうか」も独立して判定するため、人間が手打ちした営業メールも止まります。

## 特徴

- **1 行で導入完了** — サーバー、API キー、アカウント登録、どれも不要。
- **外部通信ゼロ** — 入力内容が第三者のサーバーに送られることは一切ありません。オフラインでも動きます。
- **多層防御** — ハニーポット・行動解析・自動化痕跡・「不自然な自然さ」・チェックボックス・文面判定・AI 生成文判定の 7 レイヤー。
- **AI 自動化に対応** — 等速のマウス移動や等間隔の打鍵といった、生成された操作の「揺らぎの不自然さ」を統計量で検出します。
- **誤検知への逃げ道** — 判定理由を必ず画面に出し、`warn` モードでは利用者が送信を続行できます。
- **コミュニティで育てられる** — NG ワードとスコア重みは [`patterns/`](./patterns) の JSON。コードを読まずに追記・調整できます。
- **依存パッケージなし** — ランタイム依存 0。gzip 約 21KB の 1 ファイル。

## 仕組み

判定は 7 つのレイヤーに分かれています。各レイヤーは「シグナル」を出すだけで、点数は持ちません。配点は [`patterns/weights.json`](./patterns/weights.json) に集約されています。

| レイヤー                         | 見ているもの             | 例                                                                              |
| -------------------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| **Layer 1** ハニーポット         | 人間には見えない罠       | 隠しフィールドへの入力、おとりチェックボックス、埋め込みトークンの改ざん        |
| **Layer 2** 行動解析             | 操作が足りない・速すぎる | 表示から送信までの時間、マウス／タッチの有無、人間には不可能な入力速度          |
| **Layer 2.5** 自動化痕跡         | 実行環境の矛盾           | `navigator.webdriver`、headless の UA、`window.chrome` の欠落、通知許可の矛盾   |
| **Layer 2.6** 不自然な自然さ     | 揺らぎの質               | マウス速度の変動係数、軌跡の直線度、手ぶれの有無、打鍵間隔の量子化              |
| **Layer 3** チェックボックス認証 | チェックのされ方         | スクリプトからのクリック（`isTrusted`）、表示直後のチェック、ポインタ操作の不在 |
| **Layer 4** 営業文面判定         | 文面の内容               | 営業定型句のスコアリング、URL 数、冒頭の法人格つき自己紹介、署名ブロック        |
| **Layer 6** AI 生成文判定        | 文体の統計               | 文長のばらつき、定型丁寧表現の密度、リズムの揺らぎ、崩れの無さ                  |

### スコアの組み立て

レイヤーは 2 つの**独立した疑い**に分かれます。

- `automation` グループ … これは機械が送っているか？（Layer 1 / 2 / 2.5 / 2.6 / 3）
- `sales` グループ … これは営業・勧誘の文面か？（Layer 4 / 6）

```
レイヤースコア = clamp(シグナルの加点合計 / saturation, 0, 1)
グループスコア = Σ(レイヤースコア × weight) / Σ(判定できたレイヤーの weight)
総合スコア     = 1 − Π(1 − グループスコア)        ← noisy-or
```

7 レイヤーをまとめて平均しないのが要点です。人が手打ちした営業メールでは automation 側のシグナルが 1 つも立たないため、単純平均では文面の証拠が薄まって埋もれてしまいます。グループを分けて noisy-or で合成することで、**どちらか一方の疑いだけでもしきい値に到達**できます。

判定できなかったレイヤーは母数から外れます（スマホでポインタ軌跡が取れないだけでスコアが動かないようにするため）。またハニーポットは「引っかかれば決定的な証拠、無反応なら何の情報でもない」ため、無反応のときは母数に入りません（`evidenceOnly`）。

しきい値を超えると `review`（確認）→ `block`（ブロック）になります。ハニーポットに引っかかった送信は、他のスコアに関係なく即ブロックです。

詳細は [docs/how-it-works.md](./docs/how-it-works.md) を参照してください。

## 導入方法

### 1. スクリプトタグ（推奨）

```html
<script
  src="https://cdn.jsdelivr.net/gh/dronehonpo-byte/miyabarrier@v0.2.0/packages/widget/dist/miyabarrier.min.js"
  data-mode="block"
  data-badge="inline"
  defer
></script>
```

`data-*` 属性で主要な設定ができます。

| 属性                    | 既定値       | 説明                                                                |
| ----------------------- | ------------ | ------------------------------------------------------------------- |
| `data-mode`             | `block`      | `block`（止める） / `warn`（警告して続行可） / `report`（記録のみ） |
| `data-selector`         | （自動検出） | 保護対象フォームの CSS セレクタ                                     |
| `data-checkbox`         | `true`       | 「営業目的ではありません」チェックボックスを出すか                  |
| `data-checkbox-label`   | 既定文言     | チェックボックスの文言                                              |
| `data-honeypot`         | `true`       | ハニーポットを注入するか                                            |
| `data-badge`            | `inline`     | `inline` / `floating` / `false`                                     |
| `data-block-threshold`  | `0.62`       | ブロックのしきい値                                                  |
| `data-review-threshold` | `0.4`        | 確認のしきい値                                                      |
| `data-form-language`    | `ja`         | `ja` / `en` / `auto`                                                |
| `data-debug`            | `false`      | 判定内訳を画面とコンソールに出す                                    |
| `data-log`              | `true`       | 判定結果を localStorage に残す（本文は保存しません）                |
| `data-auto-init`        | `true`       | 自動でフォームを探して保護するか                                    |
| `data-log-limit`        | `200`        | localStorage に保持する判定結果の件数                               |

保護したくないフォームには `data-miyabarrier="off"` を付けてください。パスワード欄を含むフォーム（ログイン・登録）と、自由記述欄のないフォーム（検索など）は自動検出の対象外です。

### 2. バンドラ・フレームワークから使う

npm にはまだ公開していません（→ [ロードマップ](#ロードマップ)）。当面は CDN の ESM ビルドを
そのまま import できます。

```js
import {
  protect,
  protectAll,
  analyzeText,
} from 'https://cdn.jsdelivr.net/gh/dronehonpo-byte/miyabarrier@v0.2.0/packages/widget/dist/miyabarrier.esm.js';

// 個別に保護する
protect('#contact-form', {
  mode: 'warn',
  onVerdict(result, { form }) {
    console.log(result.verdict, result.score, result.reasons);
    if (isKnownCustomer(form)) return false; // false を返すとブロックを取り消す
  },
});
```

判定ロジックだけが必要なら core をリポジトリから直接使えます。DOM もネットワークも触らない純関数なので、
サーバー側の検証にも流用できます（`git clone` して `packages/core` を参照するか、`npm run build` の
出力 `packages/core/lib` を取り込んでください）。

```js
import { analyze, scoreNgWords, defaultNgWords } from '@miyabarrier/core';

const result = analyze({ content: { text: message } });
console.log(result.verdict, result.reasons);
console.log(scoreNgWords(message, defaultNgWords).matches);
```

## 動作モードと誤検知への配慮

自動判定に誤りはつきものなので、**問い合わせを取りこぼさない**ことを優先した設計にしています。

- `block`（既定）: `block` 判定は止めます。`review` 判定は警告を出し、利用者が「それでも送信する」で続行できます。
- `warn`: 止めません。警告を出して確認を求めるだけ。導入直後の観察に向いています。
- `report`: UI も出さず、`onVerdict` と localStorage への記録だけを行います。しきい値を決めるための実測に使ってください。

**まず `report` で 1〜2 週間ログを取り、自分のサイトに届く問い合わせの分布を見てからしきい値を決めるのがおすすめです。**

```js
// 溜まったログを見る
window.Miyabarrier.getLog();
```

また、単独ではブロックに届かないよう意図的に配点を抑えているシグナルがあります。たとえば Layer 2.6（不自然な自然さ）は最大でもブロックに届きません。支援デバイス（視線入力・スイッチ入力など）の利用者は操作が機械的に均一になりうるため、統計的な均一さだけで送信を止めない設計です。

## ダッシュボード（判定ログの可視化）

`packages/dashboard/` は、溜まった判定ログを見るための静的ページです。サーバーもビルドも不要で、
`index.html` と `dist/dashboard.js` を置くだけで動きます（gzip 4KB）。

- 判定の内訳・日別の件数・スコアの分布・多かった判定理由・ページ別の集計
- **しきい値シミュレーター** — 過去のログを別のしきい値で再判定し、「この設定なら何件の判定が変わるか」を表示します

```bash
npm run demo   # http://localhost:4173/packages/dashboard/index.html
```

**localStorage はオリジンごとに分かれている**ため、自動で読み込めるのは
**保護対象サイトと同じオリジンに置いたときだけ**です。別の場所で開く場合は、サイト側のコンソールで

```js
JSON.stringify(Miyabarrier.getLog());
```

の結果をコピーし、ダッシュボードの「読み込み・書き出し」欄に貼り付けてください。

しきい値を決める流れは次のとおりです。

1. `data-mode="report"` で 1〜2 週間、判定だけを記録する（送信は止まりません）
2. ダッシュボードでスコアの分布を見る
3. シミュレーターでしきい値を動かし、正当な問い合わせが `pass` に収まる位置を探す
4. 決めた値を `data-block-threshold` / `data-review-threshold` に書いて `block` モードへ

観察期間を長く取るなら `data-log-limit` を増やしてください（既定 200 件）。

## カスタマイズ

### しきい値と重み

```html
<script>
  window.MIYABARRIER_CONFIG = {
    thresholds: { review: 0.5, block: 0.7 },
    weights: {
      layers: {
        content: { weight: 0.85 }, // 文面判定を重くする
        aiText: { weight: 0.15 },
      },
    },
  };
</script>
<script src="…/miyabarrier.min.js" defer></script>
```

`weights` は [`patterns/weights.json`](./patterns/weights.json) への部分的な上書きです。オブジェクトは再帰的にマージされるので、変えたい値だけ書けば足ります。`layers[].weight` はグループ内で合計 1.0 になるように調整してください。

調整の順番は **しきい値 → レイヤーの重み → 個別の配点** が目安です。

### NG ワード

サイト固有の売り込み文句を足したいとき、あるいは自分の業種では普通の言葉が誤検知になるときは、`ngWords` で追記できます。

```js
window.MIYABARRIER_CONFIG = {
  ngWords: {
    categories: [
      {
        id: 'site-specific',
        label: '当サイト固有の売り込み',
        score: 4,
        cap: 12,
        terms: ['相互リンク', 'アフィリエイト提携'],
      },
      // 既存カテゴリと同じ id にすると terms が追記される
      {
        id: 'legit-inquiry',
        label: '正当な問い合わせ',
        score: -3,
        cap: -12,
        terms: ['受講したい'],
      },
    ],
    allowlist: { terms: ['貴社製品の不具合'] },
  },
};
```

`score` に負の値を書くと**減点**として働きます（`legit-inquiry` カテゴリがこれです）。「見積」「不具合」「修理」といった正当な問い合わせの語で営業スコアを打ち消す仕組みで、これが誤検知を抑える主力になっています。

本体のリストへの追加は [`patterns/ng-words.json`](./patterns/ng-words.json) への PR を歓迎します。詳しくは [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## プライバシー

- 入力内容・判定結果を外部に送信することは**一切ありません**。ネットワークアクセスのコードそのものが存在しません。
- 計測するのは操作のタイミングと軌跡の形だけで、押されたキーの内容は記録しません。
- `data-log="true"`（既定）のとき、判定結果を localStorage に最大 50 件保存します。保存されるのはスコア・判定・理由・時刻・パスのみで、**本文は保存しません**。`data-log="false"` で無効にできます。
- Cookie は使いません。

## 限界（正直に書いておきます）

- **クライアントサイドの判定です。** スクリプトを読み込まずに HTTP で直接 POST する相手には無力です。決定的な防御が必要なら、サーバー側の検証（レート制限、認証、`@miyabarrier/core` を使ったサーバー側スコアリング）と併用してください。
- JavaScript が無効な環境では判定されません（フォーム自体は通常どおり送信されます）。
- `form.submit()` をスクリプトから直接呼ぶ実装は `submit` イベントを発火しないため、フックできません。その場合は `protect()` の戻り値の `analyze()` を送信処理から呼んでください。
- ハニーポットの `name` や重み設定は公開情報なので、Miyabarrier を知っている相手は回避を試みられます。多層にしているのは、そのうちの 1 つを避けても他が残るようにするためです。
- 文面判定は日本語と英語のみを想定しています。

## 開発

```bash
npm install          # 開発依存のインストール
npm test             # ユニットテスト（vitest, 143 件）
npm run typecheck    # 型チェック
npm run lint         # ESLint
npm run build        # patterns の生成 + core のビルド + widget のバンドル
npm run demo         # http://localhost:4173 でデモを起動
npm run verify       # 上記すべて（CI と同じ内容）
```

CI のワークフロー定義は [.github/ci-templates/](./.github/ci-templates) にあります（作成時のトークンに
`workflow` スコープが無く push できなかったため。有効化手順は同ディレクトリの README を参照）。

構成:

```
packages/core/      判定レイヤーとスコアリング（DOM・ネットワーク非依存）
packages/widget/    DOM への注入・計測・UI・スクリプトタグのエントリーポイント
packages/dashboard/ 判定ログを可視化する静的ページ
patterns/           NG ワードとスコア重み（JSON。ここが編集の入口）
scripts/            patterns → TS の生成、バンドル、デモサーバー
examples/demo.html  デモページ
```

`patterns/*.json` は `scripts/build-patterns.mjs` が `packages/core/src/patterns.data.ts` に埋め込みます（外部 fetch なしで動かすため）。JSON を編集したら `npm run gen` を実行してください。忘れてもテストが検出します。

## ロードマップ

- [x] `packages/dashboard` — localStorage のログを可視化する静的ページ（v0.2.0 で追加）
- [ ] npm への公開（`@miyabarrier/core` / `@miyabarrier/widget`）
- [ ] NG ワードの多言語対応
- [ ] サーバーサイド検証のサンプル（`@miyabarrier/core` を Node で使う）
- [ ] WordPress / Contact Form 7 向けの導入手順

## ライセンス

MIT — 詳細は [LICENSE](./LICENSE) を参照してください。
