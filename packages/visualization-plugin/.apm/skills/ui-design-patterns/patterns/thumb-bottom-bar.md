# 内容は中央、操作は下の薄い1段（thumb-bottom-bar）

## 場面

スマホで操作する画面に、操作（切り替え・コメント・絞り込みなど）を置くとき。

操作を上下に散らしたり段を重ねたりすると、内容に使える場所が減り、指も届きにくい。

## 作り方

- 内容は画面の中央に置く
- 操作は画面の下に、薄い1段（高さ 44px 程度）にまとめる
- 操作は線の SVG アイコンだけにする。
  絵文字は使わない。
  意味が2通りに読める記号（↩ など）は使わない
- 頼まれていない操作を足さない。
  複数の操作を1つにまとめる新しいボタンも、頼まれていなければ足さない
- 重要度の低い操作はメニューに畳む
- 取り返しのつかない操作は、よく押す操作から離す

## 使わない場面

- 操作の無い、読むだけの画面
- PC のように幅も高さもある画面。
  置き方を別に考える

## 根拠

- Hoober 2017: 人は画面の中央を見て中央を触る。
  主要な内容は中央、二次の操作は上下の端、三次は角のメニュー、危険な操作は離す。
  よく見かける親指の届く範囲の図は誤り。
  https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php
- Apple HIG Toolbars: "Prefer simple, recognizable symbols for items instead of text."
  （訳: 項目には文字より、単純で見て分かる記号を使う。）
  詰め込まず、重要度の低いものは More のメニューに畳む。
  https://developer.apple.com/tutorials/data/design/human-interface-guidelines/toolbars.json
- 食い違う前例: Apple HIG Tab bars は "Supply a symbol and a text label for each tab."（訳: タブには記号と文字のラベルを両方付ける。）、NN/g は "Icons Need a Text Label"（訳: アイコンには文字のラベルが要る）とする。
  移動のタブにも文字を付けないのは前例と食い違う。
  これは「共通の決まり」の「絵や記号で分かる所に文字を付けない」に合わせたもの。
  https://developer.apple.com/tutorials/data/design/human-interface-guidelines/tab-bars.json
  https://www.nngroup.com/articles/icon-usability/

## 事例

- 画面下に操作を3段重ねた見本は、下をこんなに空けなくてよいとして差し戻された
- 段を1つにしても、大きな丸いボタンと余白を残した見本は、また差し戻された
- 選択肢とコメントを1つにまとめる返事のボタンを足した見本は、頼まれていないボタンとして差し戻された
- 絵文字のアイコンと ↩ の記号を使った見本は差し戻された
- 44px の1段に線の SVG アイコンだけを置いた見本は通った

## 確かめた回数

- 使って通った: 1回
- 前例: 2件（アイコンに文字を付けない点は、前例2件と食い違う）
