# @miyabarrier/core

[Miyabarrier](https://github.com/miyabarrier/miyabarrier) の判定エンジン。DOM もネットワークも触らない純関数の集まりなので、ブラウザでもサーバー（Node）でも同じ判定ができます。

```bash
npm install @miyabarrier/core
```

```js
import { analyze, scoreNgWords, defaultNgWords } from '@miyabarrier/core';

// 文面だけを判定する（サーバー側の検証にも使えます）
const result = analyze({ content: { text: message, formLanguage: 'ja' } });
console.log(result.verdict); // 'pass' | 'review' | 'block'
console.log(result.score); // 0〜1
console.log(result.reasons); // 判定理由（日本語）

// NG ワードの内訳を取り出す
console.log(scoreNgWords(message, defaultNgWords).matches);
```

計測値を渡せば、行動・環境・ハニーポット・チェックボックスのレイヤーも評価されます。渡さなかったレイヤーは自動的に母数から外れます。

```js
const result = analyze({
  honeypot: { fields: [{ name: 'trap', value: '' }] },
  behavior: { renderedAt, submittedAt, pointer, keys, focus, pastes, typedChars },
  environment: { userAgent, webdriver, pluginCount /* … */ },
  checkbox: { present: true, checked: true, renderedAt, checkedAt, trustedClick },
  content: { text },
});
```

## 主なエクスポート

| 名前                                                                                                                                            | 説明                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `analyze(input, options?)`                                                                                                                      | 全レイヤーを実行して総合判定を返す     |
| `scoreLayers(results, weights)`                                                                                                                 | レイヤー結果から総合スコアを組み立てる |
| `evaluateHoneypot` / `evaluateBehavior` / `evaluateMimicry` / `evaluateEnvironment` / `evaluateCheckbox` / `evaluateContent` / `evaluateAiText` | 各レイヤー単体                         |
| `scoreNgWords(text, list)`                                                                                                                      | NG ワードのスコアと一致内訳            |
| `mergeWeights(base, override)` / `mergeNgWords(base, extra)`                                                                                    | 設定の部分的な上書き                   |
| `defaultWeights` / `defaultNgWords`                                                                                                             | `patterns/*.json` の内容               |
| `decideVerdict(score, thresholds, hardBlocked?)`                                                                                                | しきい値の適用のみ                     |

判定の考え方は [docs/how-it-works.md](https://github.com/miyabarrier/miyabarrier/blob/main/docs/how-it-works.md) を参照してください。

MIT License
