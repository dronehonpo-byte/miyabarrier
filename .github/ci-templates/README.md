# CI ワークフローのテンプレート

このディレクトリの YAML は、そのまま `.github/workflows/` に置けば動く GitHub Actions の定義です。
**リポジトリ作成時のトークンに `workflow` スコープが無く、`.github/workflows/` へ直接 push できなかったため**、
ここに置いてあります（GitHub は `workflow` スコープの無いトークンによるワークフローの作成・更新を拒否します）。

## 有効化のしかた

### 方法 A: GitHub の Web UI（トークンの設定を変えなくて済む）

1. リポジトリの **Add file → Create new file** を開く
2. ファイル名に `.github/workflows/ci.yml` と入力（`/` を打つとディレクトリになる）
3. [ci.yml](./ci.yml) の内容を貼り付けてコミット
4. [pages.yml](./pages.yml) も同様に `.github/workflows/pages.yml` として作成

### 方法 B: `workflow` スコープを与えて push する

```bash
gh auth refresh -h github.com -s workflow   # または workflow スコープ付きの PAT を用意する
git mv .github/ci-templates/ci.yml .github/workflows/ci.yml
git mv .github/ci-templates/pages.yml .github/workflows/pages.yml
git commit -m "ci: ワークフローを有効化"
git push
```

## 中身

| ファイル                 | 役割                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| [ci.yml](./ci.yml)       | push / PR で `format:check` → `lint` → `typecheck` → `test` → `build` を実行し、生成物（`patterns.data.ts`）が最新かも検査する |
| [pages.yml](./pages.yml) | GitHub Actions 経由でデモを Pages に公開する                                                                                   |

`pages.yml` は、Pages の設定が **Deploy from a branch**（`main` / `/`）のままなら不要です。
現状はブランチ配信で公開されているため、Actions 経由に切り替えたい場合だけ使ってください。
