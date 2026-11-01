# タップで切り替える2つの文脈（tap-context-switch）

## 場面

1つの画面で、性質の違う2種類の中身を見せるとき。
例: 相手に頼む作業と、相手に決めてもらうこと。

混ぜて並べると、どちらの文脈で読めばよいかが分からない。
スワイプで切り替えると、カード送りなど他の移動とぶつかる。

## 作り方

- 2種類を切り替える部品を置き、タップで切り替える
  - 同じ対象の見方を切り替えるなら segmented control
  - 画面の行き先を切り替えるなら tab bar
- それぞれの数を badge で出す
- 相手の手を待っている方（頼む作業があるならそちら）を先に開く
- スワイプは、カード送りなどの別の移動に残す

## 使わない場面

- 2つを同時に見比べる必要があるとき。
  1画面に並べる

## 根拠

- Apple HIG Segmented controls: "Use a segmented control to provide closely related choices that affect an object, state, or view."
  （訳: 対象・状態・表示に効く、密接に関係した選択肢を出すときに segmented control を使う。）
  https://developer.apple.com/design/human-interface-guidelines/segmented-controls
- Apple HIG Tab bars: "Use a tab bar to support navigation, not to provide actions."
  （訳: tab bar は移動のために使い、操作を出すためには使わない。）
  https://developer.apple.com/tutorials/data/design/human-interface-guidelines/tab-bars.json

## 事例

- 画面の上に2種類の切り替えを置いた見本は通った
- 後で、切り替えを画面下の tab bar に移した形も通った（[thumb-bottom-bar](thumb-bottom-bar.md)）

## 確かめた回数

- 使って通った: 2回
- 前例: 2件
