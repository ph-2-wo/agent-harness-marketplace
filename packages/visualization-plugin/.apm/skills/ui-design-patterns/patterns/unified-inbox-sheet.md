# 全部を1か所に、絞り込みは下のシート（unified-inbox-sheet）

## 場面

見る範囲（リポジトリ・プロジェクト・セッションなど）が複数あるとき。

範囲ごとに画面を分けると、どこに何が溜まっているかを探して回ることになる。

## 作り方

- 既定では、全範囲の項目を1か所に並べる
- 各項目に、どの範囲のものかを出す
- 絞り込みは、下から出るシートで範囲を選ぶ。
  シートには範囲ごとの数を出す
- 「次の項目」の案内は、絞り込んだ後の並びから作る

## 使わない場面

- 見る範囲が1つだけのとき

## 根拠

- GitHub Docs の notifications inbox のページ: すべてのリポジトリの通知を1か所に出し、`repo:` で絞る。
- Apple HIG Sheets: medium detent で段階的に開く。
  https://developer.apple.com/tutorials/data/design/human-interface-guidelines/sheets.json

## 事例

- 全範囲を1か所に並べ、シートで絞る見本は、基本の形として通った。
  操作の置き方は別に直した（[thumb-bottom-bar](thumb-bottom-bar.md)）

## 確かめた回数

- 使って通った: 1回
- 前例: 2件
