# custom-review

レビューの入口。
実際に起きた問題から蓄積した観点と、レビュー系の skill を差分に当てる。

## 解決する課題

一般的なレビューは、どのリポジトリにも通じる観点で見る。
実際に起きた問題、例えば失敗を握りつぶす hook、既定ブランチしか返さない一覧の取得、UTC で切った日付は、
その観点からは漏れやすく、別々の人や agent が同じ問題を繰り返す。

## 概要

- 観点は `perspectives/` にファイルの種類ごとに置く
- 差分のファイルごとに、ファイル名・拡張子・置き場所で観点ファイルとレビュー系の skill を選ぶ
- 差分を1行ずつ見て、各観点の when に合致したら then を当てる
- 各観点には実際に起きた事例が付いていて、当て方の例として読む
- 新しい問題が起きたら、事例として観点ファイルに足して蓄積する
- 1つのリポジトリでしか通じない観点は、共通の観点ファイルではなく、そのリポジトリの直下の `review-perspectives.md` に置ける

## 利用場面

差分を作ったとき。あらゆるレビュー。
実際に起きた問題を観点として足すとき。

## 依存

`skill-review`（同 package）。手順書の観点（`procedures.md`）が参照する。
`document-minimization-review`、`documentation-review`、`imitation-review`（以上、同 package）、`harness-placement`（`harness-dev-plugin`）、`writing-docs`（`agent-base-plugin`）。振り分け表（`routing.md`）が案内する。
