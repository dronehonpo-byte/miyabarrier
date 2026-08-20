# @miyabarrier/widget

[Miyabarrier](https://github.com/miyabarrier/miyabarrier) のブラウザ側。スクリプトタグ 1 行で問い合わせフォームを保護します。

## スクリプトタグ

```html
<script
  src="https://cdn.jsdelivr.net/gh/miyabarrier/miyabarrier@v0.2.0/packages/widget/dist/miyabarrier.min.js"
  data-mode="block"
  defer
></script>
```

読み込むだけで、ページ内の問い合わせフォームを自動検出して保護します。`data-*` 属性の一覧は [README](https://github.com/miyabarrier/miyabarrier#1-スクリプトタグ推奨) を参照してください。

## npm

```bash
npm install @miyabarrier/widget
```

```js
import { protect, analyzeText, getLog } from '@miyabarrier/widget';

const guard = protect('#contact-form', {
  mode: 'warn',
  onVerdict: (result) => console.log(result.verdict, result.reasons),
});

guard.analyze(); // 送信せずに現在の状態を判定する
guard.destroy(); // 注入物とイベントを片付ける
```

`window.Miyabarrier` には `protect` / `protectAll` / `analyzeText` / `getLog` / `clearLog` / `destroyAll` / `instances` が入ります。

## 成果物

| ファイル                  | 用途                         |
| ------------------------- | ---------------------------- |
| `dist/miyabarrier.min.js` | 本番用（IIFE、gzip 約 21KB） |
| `dist/miyabarrier.js`     | 中身を読める非圧縮版         |
| `dist/miyabarrier.esm.js` | バンドラから `import` する用 |

MIT License
